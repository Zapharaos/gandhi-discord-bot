import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { getAggregatedStats, getTimeline, isTimelineStat, type TimelineStat } from './service';

function parseIntOrUndefined(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : undefined;
}

export async function registerStatsRoutes(app: FastifyInstance): Promise<void> {
    // Aggregate stats across every server the user has data on.
    app.get('/api/stats/global', { preHandler: requireAuth }, async (request) => {
        const session = request.authSession!;
        return { scope: 'global', stats: await getAggregatedStats(session.userId) };
    });

    // Aggregate stats for a single server. Only ever returns the caller's own data.
    app.get<{ Params: { guildId: string } }>(
        '/api/stats/guild/:guildId',
        { preHandler: requireAuth },
        async (request) => {
            const session = request.authSession!;
            const { guildId } = request.params;
            return { scope: 'guild', guildId, stats: await getAggregatedStats(session.userId, guildId) };
        },
    );

    // Daily timeline for the heatmap. scope defaults to global; pass guildId to
    // scope to a single server. stat defaults to time_connected.
    app.get<{ Querystring: { guildId?: string; stat?: string; from?: string; to?: string } }>(
        '/api/timeline',
        { preHandler: requireAuth },
        async (request, reply) => {
            const session = request.authSession!;
            const { guildId, stat: statParam, from: fromParam, to: toParam } = request.query;

            const stat: TimelineStat = statParam && isTimelineStat(statParam) ? statParam : 'time_connected';
            if (statParam && !isTimelineStat(statParam)) {
                return reply.code(400).send({ error: 'invalid_stat' });
            }

            const from = parseIntOrUndefined(fromParam);
            const to = parseIntOrUndefined(toParam);

            const points = await getTimeline(session.userId, stat, guildId, from, to);
            return { scope: guildId ? 'guild' : 'global', guildId: guildId ?? null, stat, points };
        },
    );
}
