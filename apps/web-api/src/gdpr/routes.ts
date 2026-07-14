import type { FastifyInstance } from 'fastify';
import { deleteUserData, resetUserStats } from '@gandhi/core/services/gdpr';
import { requireAuth } from '../auth/guard';
import { destroySession, SESSION_COOKIE } from '../auth/sessions';
import { getWriteDb } from '../db';

const guildIdPattern = '^[0-9]{5,25}$';

const scopeBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        // Optional: absent = apply globally to every server.
        guildId: { type: 'string', pattern: guildIdPattern },
    },
};

// GDPR write endpoints. Like /api/settings these use the dedicated read-write
// connection and only ever touch the caller's own rows (session.userId — never
// a user id from the request).
export async function registerGdprRoutes(app: FastifyInstance): Promise<void> {
    // Reset the caller's aggregate stats to zero (settings and daily history kept).
    app.post<{ Body: { guildId?: string } }>(
        '/api/gdpr/reset',
        { preHandler: requireAuth, schema: { body: scopeBodySchema } },
        async (request) => {
            const session = request.authSession!;
            const reset = await resetUserStats(getWriteDb(), session.userId, request.body?.guildId);
            return { reset };
        },
    );

    // Erase everything we hold about the caller (right to erasure). A global
    // erasure also ends the session — there is no account left to be signed
    // in to, and keeping the cached identity around would defeat the purge.
    app.delete<{ Body: { guildId?: string } }>(
        '/api/gdpr/data',
        { preHandler: requireAuth, schema: { body: scopeBodySchema } },
        async (request, reply) => {
            const session = request.authSession!;
            const guildId = request.body?.guildId;
            const result = await deleteUserData(getWriteDb(), session.userId, guildId);

            if (!guildId) {
                const raw = request.cookies[SESSION_COOKIE];
                const unsigned = raw ? request.unsignCookie(raw) : { valid: false, value: null };
                if (unsigned.valid && unsigned.value) destroySession(unsigned.value);
                reply.clearCookie(SESSION_COOKIE, { path: '/' });
            }

            return { deleted: result.deletedGuilds, identityPurged: result.identityPurged };
        },
    );
}
