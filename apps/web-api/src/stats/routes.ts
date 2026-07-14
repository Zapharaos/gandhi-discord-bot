import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { getAggregatedStats, getSessionStats, getTimeline, TIMELINE_STATS, type TimelineStat } from './service';

// Discord snowflakes are numeric ids; constrain params/queries so malformed input
// is rejected with 400 by Fastify's validation before any handler runs.
const guildIdPattern = '^[0-9]{5,25}$';

export async function registerStatsRoutes(app: FastifyInstance): Promise<void> {
    // Aggregate stats across every server the user has data on.
    app.get('/api/stats/global', { preHandler: requireAuth }, async (request) => {
        const session = request.authSession!;
        return { scope: 'global', stats: await getAggregatedStats(session.userId) };
    });

    // The user's current voice session (live), if any.
    app.get('/api/stats/session', { preHandler: requireAuth }, async (request) => {
        const session = request.authSession!;
        const result = await getSessionStats(session.userId);
        return { scope: 'session', ...result };
    });

    // Aggregate stats for a single server. Only ever returns the caller's own data.
    app.get<{ Params: { guildId: string } }>(
        '/api/stats/guild/:guildId',
        {
            preHandler: requireAuth,
            schema: {
                params: {
                    type: 'object',
                    required: ['guildId'],
                    properties: { guildId: { type: 'string', pattern: guildIdPattern } },
                },
            },
        },
        async (request) => {
            const session = request.authSession!;
            const { guildId } = request.params;
            return { scope: 'guild', guildId, stats: await getAggregatedStats(session.userId, guildId) };
        },
    );

    // Daily timeline for the heatmap. scope defaults to global; pass guildId to
    // scope to a single server. stat defaults to time_connected.
    app.get<{ Querystring: { guildId?: string; stat?: TimelineStat; from?: number; to?: number } }>(
        '/api/timeline',
        {
            preHandler: requireAuth,
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        guildId: { type: 'string', pattern: guildIdPattern },
                        stat: { type: 'string', enum: [...TIMELINE_STATS] },
                        from: { type: 'integer', minimum: 0 },
                        to: { type: 'integer', minimum: 0 },
                    },
                },
            },
        },
        async (request) => {
            const session = request.authSession!;
            const { guildId, stat, from, to } = request.query;
            const points = await getTimeline(session.userId, stat ?? 'time_connected', guildId, from, to);
            return { scope: guildId ? 'guild' : 'global', guildId: guildId ?? null, stat: stat ?? 'time_connected', points };
        },
    );
}
