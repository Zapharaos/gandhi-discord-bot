import type { FastifyInstance } from 'fastify';
import { requireAuth, requireGuildAdmin } from '../auth/guard';
import { TIMELINE_STATS, type TimelineStat } from '../stats/service';
import { getGuildMembers, getGuildOverview, getGuildTimeline, getMemberLookup } from './service';
import { getServerSettings, updateServerSettings } from './settings';

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
            return { guildId, settings: await updateServerSettings(guildId, request.body) };
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
