import type { FastifyInstance } from 'fastify';
import { requireAuth, requireBotAdmin } from '../auth/guard';
import { TIMELINE_STATS, type TimelineStat } from '../stats/service';
import { getBotAdminGuilds, getBotAdminOverview, getBotAdminTimeline } from './service';

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
