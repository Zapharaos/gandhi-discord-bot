import type { FastifyInstance } from 'fastify';
import { requireAuth, requireGuildAdmin } from '../auth/guard';
import { TIMELINE_STATS, type TimelineStat } from '../stats/service';
import { getGuildMembers, getGuildOverview, getGuildTimeline, getMemberLookup } from './service';
import { getServerSettings, updateServerSettings } from './settings';
import { getGuildRoster, setLocalAdmin } from './roster';
import { getServerOwnerId } from '../stats/queries';

const guildIdPattern = '^[0-9]{5,25}$';
const paramsSchema = {
    type: 'object',
    required: ['guildId'],
    properties: { guildId: { type: 'string', pattern: guildIdPattern } },
};

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
    // All admin routes require the caller to administer the target guild.
    const adminGuard = { preHandler: [requireAuth, requireGuildAdmin] };

    // Server-wide overview: totals (all members), leaderboard (non-private only),
    // and how many private members are hidden from the itemised views.
    app.get<{ Params: { guildId: string } }>(
        '/api/admin/guild/:guildId/overview',
        { ...adminGuard, schema: { params: paramsSchema } },
        async (request) => {
            const { guildId } = request.params;
            return { guildId, overview: await getGuildOverview(guildId) };
        },
    );

    // Per-member list (private members omitted, but counted in hiddenCount).
    app.get<{ Params: { guildId: string } }>(
        '/api/admin/guild/:guildId/members',
        { ...adminGuard, schema: { params: paramsSchema } },
        async (request) => {
            const { guildId } = request.params;
            return { guildId, ...(await getGuildMembers(guildId)) };
        },
    );

    // Look up one member's stats by Discord id (respects private mode).
    app.get<{ Params: { guildId: string; userId: string } }>(
        '/api/admin/guild/:guildId/member/:userId',
        {
            ...adminGuard,
            schema: {
                params: {
                    type: 'object',
                    required: ['guildId', 'userId'],
                    properties: {
                        guildId: { type: 'string', pattern: guildIdPattern },
                        userId: { type: 'string', pattern: guildIdPattern },
                    },
                },
            },
        },
        async (request) => {
            const { guildId, userId } = request.params;
            return getMemberLookup(guildId, userId);
        },
    );

    // Full member roster (identity, last activity, private/owner/local-admin flags).
    app.get<{ Params: { guildId: string } }>(
        '/api/admin/guild/:guildId/roster',
        { ...adminGuard, schema: { params: paramsSchema } },
        async (request) => {
            const { guildId } = request.params;
            return { guildId, ...(await getGuildRoster(guildId)) };
        },
    );

    // Grant/revoke the local "server manager" role. OWNER ONLY (not other admins).
    app.patch<{ Params: { guildId: string; userId: string }; Body: { localAdmin: boolean } }>(
        '/api/admin/guild/:guildId/member/:userId/admin',
        {
            preHandler: [requireAuth],
            schema: {
                params: {
                    type: 'object',
                    required: ['guildId', 'userId'],
                    properties: {
                        guildId: { type: 'string', pattern: guildIdPattern },
                        userId: { type: 'string', pattern: guildIdPattern },
                    },
                },
                body: {
                    type: 'object',
                    required: ['localAdmin'],
                    additionalProperties: false,
                    properties: { localAdmin: { type: 'boolean' } },
                },
            },
        },
        async (request, reply) => {
            const session = request.authSession!;
            const { guildId, userId } = request.params;
            const ownerId = await getServerOwnerId(guildId);
            if (!ownerId || session.userId !== ownerId) {
                return reply.code(403).send({ error: 'owner_only' });
            }
            await setLocalAdmin(guildId, userId, request.body.localAdmin);
            return { guildId, ...(await getGuildRoster(guildId)) };
        },
    );

    // Server-level settings (log channel + stats/logs), managed by guild admins.
    app.get<{ Params: { guildId: string } }>(
        '/api/admin/guild/:guildId/settings',
        { ...adminGuard, schema: { params: paramsSchema } },
        async (request) => {
            const { guildId } = request.params;
            return { guildId, settings: await getServerSettings(guildId) };
        },
    );

    app.patch<{
        Params: { guildId: string };
        Body: { stats?: boolean; logs?: boolean; logChannelId?: string | null };
    }>(
        '/api/admin/guild/:guildId/settings',
        {
            ...adminGuard,
            schema: {
                params: paramsSchema,
                body: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        stats: { type: 'boolean' },
                        logs: { type: 'boolean' },
                        logChannelId: { type: ['string', 'null'], maxLength: 25 },
                    },
                },
            },
        },
        async (request) => {
            const { guildId } = request.params;
            const result = await updateServerSettings(guildId, request.body);
            return { guildId, settings: result.settings, logChannelError: result.logChannelError ?? false };
        },
    );

    // Server-wide heatmap timeline (anonymous aggregate; includes everyone).
    app.get<{ Params: { guildId: string }; Querystring: { stat?: TimelineStat; from?: number; to?: number } }>(
        '/api/admin/guild/:guildId/timeline',
        {
            ...adminGuard,
            schema: {
                params: paramsSchema,
                querystring: {
                    type: 'object',
                    properties: {
                        stat: { type: 'string', enum: [...TIMELINE_STATS] },
                        from: { type: 'integer', minimum: 0 },
                        to: { type: 'integer', minimum: 0 },
                    },
                },
            },
        },
        async (request) => {
            const { guildId } = request.params;
            const { stat, from, to } = request.query;
            const points = await getGuildTimeline(guildId, stat ?? 'time_connected', from, to);
            return { guildId, stat: stat ?? 'time_connected', points };
        },
    );
}
