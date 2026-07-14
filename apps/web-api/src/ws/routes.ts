import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { loadConfig } from '../config';
import { logger } from '../logger';
import { resolveSession } from '../auth/guard';
import { hub } from './hub';
import {
    rooms,
    type ClientMessage,
    type InternalMessage,
    type ServerMessage,
} from './protocol';

// Server-side keepalive: ping every socket, drop those that didn't pong back.
const HEARTBEAT_MS = 30_000;
// A single socket may never hold more rooms than this (defends against subscribe spam).
const MAX_ROOMS_PER_SOCKET = 200;
// Basic per-socket message rate limit.
const RATE_WINDOW_MS = 5_000;
const RATE_MAX_MSGS = 40;

type LiveSocket = WebSocket & { isAlive?: boolean; msgWindowStart?: number; msgCount?: number };

function send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === 1) socket.send(JSON.stringify(message));
}

/** Constant-time token comparison that tolerates length mismatches. */
function tokenMatches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

/** True if the socket is over its message-rate budget for the current window. */
function rateLimited(socket: LiveSocket): boolean {
    const now = Date.now();
    if (!socket.msgWindowStart || now - socket.msgWindowStart > RATE_WINDOW_MS) {
        socket.msgWindowStart = now;
        socket.msgCount = 0;
    }
    socket.msgCount = (socket.msgCount ?? 0) + 1;
    return socket.msgCount > RATE_MAX_MSGS;
}

export async function registerWsRoutes(app: FastifyInstance): Promise<void> {
    const config = loadConfig();

    // Heartbeat sweep: terminate sockets that stopped answering pings, and prune
    // them from the hub so dead connections can't leak into rooms.
    const heartbeat = setInterval(() => {
        for (const socket of hub.sockets()) {
            const s = socket as LiveSocket;
            if (s.isAlive === false) {
                hub.remove(socket);
                socket.terminate();
                continue;
            }
            s.isAlive = false;
            try {
                socket.ping();
            } catch {
                // ignore — the next sweep will terminate it
            }
        }
    }, HEARTBEAT_MS);
    app.addHook('onClose', (_instance, done) => {
        clearInterval(heartbeat);
        done();
    });

    // Browser clients. Authenticated via the session cookie. A client is
    // auto-subscribed to its own user room, the raw guild rooms it administers,
    // and the content-free public room of every guild it is a member of.
    app.get('/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
        const session = resolveSession(request);
        if (!session) {
            send(socket, { type: 'error', error: 'unauthorized' });
            socket.close(1008, 'unauthorized');
            return;
        }

        const s = socket as LiveSocket;
        s.isAlive = true;
        socket.on('pong', () => {
            s.isAlive = true;
        });

        const memberGuilds = new Set(session.guilds.map((g) => g.id));
        const adminGuilds = new Set(session.guilds.filter((g) => g.isAdmin).map((g) => g.id));

        hub.subscribe(socket, rooms.user(session.userId));
        for (const guildId of adminGuilds) hub.subscribe(socket, rooms.guild(guildId));
        for (const guildId of memberGuilds) hub.subscribe(socket, rooms.guildPublic(guildId));
        send(socket, { type: 'ready', rooms: hub.roomsOf(socket) });

        socket.on('message', (raw: Buffer) => {
            if (rateLimited(s)) {
                send(socket, { type: 'error', error: 'rate_limited' });
                return;
            }

            let msg: ClientMessage;
            try {
                msg = JSON.parse(raw.toString()) as ClientMessage;
            } catch {
                send(socket, { type: 'error', error: 'bad_message' });
                return;
            }

            if (msg.type === 'ping') {
                send(socket, { type: 'pong' });
                return;
            }

            if (msg.type === 'subscribe' || msg.type === 'unsubscribe') {
                for (const room of msg.rooms) {
                    // Authorization: own user room, an administered guild's raw room,
                    // or the public room of any guild the user is a member of.
                    const allowed =
                        room === rooms.user(session.userId) ||
                        [...adminGuilds].some((g) => room === rooms.guild(g)) ||
                        [...memberGuilds].some((g) => room === rooms.guildPublic(g));
                    if (!allowed) {
                        send(socket, { type: 'error', error: `forbidden_room:${room}` });
                        continue;
                    }
                    if (msg.type === 'subscribe') {
                        if (hub.roomCount(socket) >= MAX_ROOMS_PER_SOCKET) {
                            send(socket, { type: 'error', error: 'too_many_rooms' });
                            break;
                        }
                        hub.subscribe(socket, room);
                    } else {
                        hub.unsubscribe(socket, room);
                    }
                }
                send(socket, { type: 'ready', rooms: hub.roomsOf(socket) });
            }
        });

        socket.on('close', () => hub.remove(socket));
        socket.on('error', () => hub.remove(socket));
    });

    // Internal publisher endpoint the bot connects to. Gated by a shared token
    // (preferably via the x-internal-token header; query is accepted for
    // backwards-compatibility). MUST NOT be exposed publicly — keep it on the
    // internal Docker network only.
    app.get<{ Querystring: { token?: string } }>(
        '/internal/events',
        { websocket: true },
        (socket: WebSocket, request) => {
            const headerToken = request.headers['x-internal-token'];
            const provided =
                (Array.isArray(headerToken) ? headerToken[0] : headerToken) ?? request.query.token ?? '';
            if (!provided || !tokenMatches(provided, config.internalWsToken)) {
                socket.close(1008, 'unauthorized');
                return;
            }

            logger.info('Bot connected to /internal/events');

            socket.on('message', (raw: Buffer) => {
                let msg: InternalMessage;
                try {
                    msg = JSON.parse(raw.toString()) as InternalMessage;
                } catch {
                    return;
                }
                if (msg.kind === 'voice_event' && msg.event) {
                    const { userId, guildId } = msg.event;
                    const out: ServerMessage = { type: 'voice_event', event: msg.event };
                    // Raw event: the user themselves and admins of the guild.
                    hub.publish(rooms.user(userId), out);
                    hub.publish(rooms.guild(guildId), out);
                    // Identity-free ping: any member of the guild, to refresh lists.
                    hub.publish(rooms.guildPublic(guildId), { type: 'guild_activity', guildId });
                }
            });

            socket.on('close', () => logger.info('Bot disconnected from /internal/events'));
        },
    );
}
