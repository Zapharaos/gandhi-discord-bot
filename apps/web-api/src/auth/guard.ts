import type { FastifyReply, FastifyRequest } from 'fastify';
import { getSession, SESSION_COOKIE, type SessionData } from './sessions';
import { isUserLocalAdmin } from '../stats/queries';

// Augment Fastify's request with the resolved session so route handlers can read
// it in a typed way once requireAuth has run.
declare module 'fastify' {
    interface FastifyRequest {
        authSession?: SessionData;
    }
}

/** Resolve the signed session cookie into a SessionData, or null. */
export function resolveSession(request: FastifyRequest): SessionData | null {
    const raw = request.cookies[SESSION_COOKIE];
    if (!raw) return null;
    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return null;
    return getSession(unsigned.value);
}

/**
 * preHandler that rejects unauthenticated requests with 401. On success it
 * attaches the session to request.authSession.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const session = resolveSession(request);
    if (!session) {
        await reply.code(401).send({ error: 'unauthorized' });
        return;
    }
    request.authSession = session;
}

/**
 * preHandler (run after requireAuth) that authorizes admin-only guild routes. The
 * user must EITHER hold ADMINISTRATOR / MANAGE_GUILD (or be the owner) per Discord's
 * `guilds` OAuth scope, OR have been granted the local "server manager" role in the
 * database (see setLocalAdmin).
 */
export async function requireGuildAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const session = request.authSession ?? resolveSession(request);
    if (!session) {
        await reply.code(401).send({ error: 'unauthorized' });
        return;
    }
    request.authSession = session;

    const guildId = (request.params as { guildId?: string }).guildId;
    const guild = session.guilds.find((g) => g.id === guildId);
    if (!guild) {
        await reply.code(403).send({ error: 'forbidden' });
        return;
    }
    if (guild.isAdmin) return;
    if (guildId && (await isUserLocalAdmin(session.userId, guildId))) return;

    await reply.code(403).send({ error: 'forbidden' });
}
