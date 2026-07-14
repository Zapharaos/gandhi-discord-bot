import type { FastifyInstance } from 'fastify';
import { requireAuth, requireBotAdmin } from '../auth/guard';
import { TIMELINE_STATS, type TimelineStat } from '../stats/service';
import { getBotAdminGuilds, getBotAdminOverview, getBotAdminTimeline } from './service';
import { getBotAdminHealth, getBotAdminHealthHistory, HEALTH_RANGES, type HealthRange } from './health-service';

export async function registerBotAdminRoutes(app: FastifyInstance): Promise<void> {
    // Bot-operator area (BOT_ADMIN_IDS): whole-database aggregates, never
    // per-user detail. Distinct from the per-guild /api/admin routes.
    const botAdminGuard = { preHandler: [requireAuth, requireBotAdmin] };

    app.get('/api/bot-admin/overview', botAdminGuard, async () => ({
        overview: await getBotAdminOverview(),
    }));

    app.get('/api/bot-admin/guilds', botAdminGuard, async () => ({
        guilds: await getBotAdminGuilds(),
    }));

    // Detailed bot health: current snapshot, availability, counters, event log.
    app.get('/api/bot-admin/health', botAdminGuard, async () => ({
        health: await getBotAdminHealth(),
    }));

    // Downsampled metric series (memory, ping, lag, sessions, commands) + daily peaks.
    app.get<{ Querystring: { range?: HealthRange } }>(
        '/api/bot-admin/health/history',
        {
            ...botAdminGuard,
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        range: { type: 'string', enum: [...HEALTH_RANGES] },
                    },
                },
            },
        },
        async (request) => ({
            history: await getBotAdminHealthHistory(request.query.range ?? '24h'),
        }),
    );

    // Whole-bot daily heatmap timeline (anonymous aggregate across every guild).
    app.get<{ Querystring: { stat?: TimelineStat; from?: number; to?: number } }>(
        '/api/bot-admin/timeline',
        {
            ...botAdminGuard,
            schema: {
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
            const { stat, from, to } = request.query;
            const points = await getBotAdminTimeline(stat ?? 'time_connected', from, to);
            return { stat: stat ?? 'time_connected', points };
        },
    );
}
