import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { resolveUserGuilds } from '../me/guilds';
import { TIMELINE_STATS, type TimelineStat } from '../stats/service';
import { getGuildTimeline } from '../admin/service';
import { getGuildRanking, getGuildActiveMembers } from './service';

const guildIdPattern = '^[0-9]{5,25}$';

export async function registerRankingRoutes(app: FastifyInstance): Promise<void> {
    // Server-wide activity heatmap (anonymous aggregate over every member), visible
    // to any guild member — mirrors the admin timeline but without the admin gate.
    app.get<{ Params: { guildId: string }; Querystring: { stat?: TimelineStat; from?: number; to?: number } }>(
        '/api/stats/guild/:guildId/timeline',
        {
            preHandler: requireAuth,
            schema: {
                params: {
                    type: 'object',
                    required: ['guildId'],
                    properties: { guildId: { type: 'string', pattern: guildIdPattern } },
                },
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
        async (request, reply) => {
            const session = request.authSession!;
            const { guildId } = request.params;
            const { stat, from, to } = request.query;

            const allowed = new Set((await resolveUserGuilds(session)).map((g) => g.id));
            if (!allowed.has(guildId)) {
                return reply.code(403).send({ error: 'forbidden' });
            }

            const points = await getGuildTimeline(guildId, stat ?? 'time_connected', from, to);
            return { guildId, stat: stat ?? 'time_connected', points };
        },
    );
    // Members currently in a voice channel on this guild (non-private only).
    app.get<{ Params: { guildId: string } }>(
        '/api/stats/guild/:guildId/active',
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
        async (request, reply) => {
            const session = request.authSession!;
            const { guildId } = request.params;

            const allowed = new Set((await resolveUserGuilds(session)).map((g) => g.id));
            if (!allowed.has(guildId)) {
                return reply.code(403).send({ error: 'forbidden' });
            }

            return { guildId, members: await getGuildActiveMembers(guildId) };
        },
    );

    // Server leaderboard, visible to any member who shares the guild with the bot.
    app.get<{
        Params: { guildId: string };
        Querystring: {
            stat?: TimelineStat | 'daily_streak';
            from?: number;
            to?: number;
            activeOnly?: boolean;
            sort?: 'value' | 'percent' | 'max' | 'count';
        };
    }>(
        '/api/stats/guild/:guildId/ranking',
        {
            preHandler: requireAuth,
            schema: {
                params: {
                    type: 'object',
                    required: ['guildId'],
                    properties: { guildId: { type: 'string', pattern: guildIdPattern } },
                },
                querystring: {
                    type: 'object',
                    properties: {
                        stat: { type: 'string', enum: [...TIMELINE_STATS, 'daily_streak'] },
                        // Inclusive day-timestamp bounds (ms). Omit both for all-time.
                        from: { type: 'integer', minimum: 0 },
                        to: { type: 'integer', minimum: 0 },
                        // Restrict the board to members currently in voice.
                        activeOnly: { type: 'boolean' },
                        // Order by total value, share of connected time, longest session, or session count.
                        sort: { type: 'string', enum: ['value', 'percent', 'max', 'count'] },
                    },
                },
            },
        },
        async (request, reply) => {
            const session = request.authSession!;
            const { guildId } = request.params;
            const { stat, from, to, activeOnly, sort } = request.query;

            // Only members of the guild (or users with data there) may see its ranking.
            const allowed = new Set((await resolveUserGuilds(session)).map((g) => g.id));
            if (!allowed.has(guildId)) {
                return reply.code(403).send({ error: 'forbidden' });
            }

            return {
                guildId,
                ...(await getGuildRanking(guildId, stat ?? 'time_connected', session.userId, from, to, activeOnly, sort)),
            };
        },
    );
}
