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

function send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === 1) socket.send(JSON.stringify(message));
}

export async function registerWsRoutes(app: FastifyInstance): Promise<void> {
    const config = loadConfig();

    // Browser clients. Authenticated via the session cookie; a client may only
    // subscribe to its own user room and to guild rooms it can administer.
    app.get('/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
        const session = resolveSession(request);
        if (!session) {
            send(socket, { type: 'error', error: 'unauthorized' });
            socket.close(1008, 'unauthorized');
            return;
        }

        const adminGuilds = new Set(session.guilds.filter((g) => g.isAdmin).map((g) => g.id));

        // Auto-subscribe to the user's own room plus every guild they administer.
        hub.subscribe(socket, rooms.user(session.userId));
        for (const guildId of adminGuilds) hub.subscribe(socket, rooms.guild(guildId));
        send(socket, { type: 'ready', rooms: hub.roomsOf(socket) });

        socket.on('message', (raw: Buffer) => {
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
                    // Enforce authorization: own user room, or an administered guild.
                    const allowed =
                        room === rooms.user(session.userId) ||
                        [...adminGuilds].some((g) => room === rooms.guild(g));
                    if (!allowed) {
                        send(socket, { type: 'error', error: `forbidden_room:${room}` });
                        continue;
                    }
                    if (msg.type === 'subscribe') hub.subscribe(socket, room);
                    else hub.unsubscribe(socket, room);
                }
                send(socket, { type: 'ready', rooms: hub.roomsOf(socket) });
            }
        });

        socket.on('close', () => hub.remove(socket));
        socket.on('error', () => hub.remove(socket));
    });

    // Internal publisher endpoint the bot connects to. Gated by a shared token so
    // only the bot can push events. Events are fanned out to the user room and the
    // guild room so both the user's own dashboard and admins see them live.
    app.get<{ Querystring: { token?: string } }>(
        '/internal/events',
        { websocket: true },
        (socket: WebSocket, request) => {
            const token = request.query.token ?? request.headers['x-internal-token'];
            if (!token || token !== config.internalWsToken) {
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
                    hub.publish(rooms.user(userId), out);
                    hub.publish(rooms.guild(guildId), out);
                }
            });

            socket.on('close', () => logger.info('Bot disconnected from /internal/events'));
        },
    );
}
