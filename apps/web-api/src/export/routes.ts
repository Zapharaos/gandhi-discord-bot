import type { FastifyInstance } from 'fastify';
import { buildExportPayload, exportDailyStatsToCsv } from '@gandhi/core/services/export';
import { requireAuth } from '../auth/guard';
import {
    getDailyStatsRows,
    getServersMeta,
    getStartTimestampsRows,
    getUserStatsRows,
} from '../stats/queries';

const guildIdPattern = '^[0-9]{5,25}$';

export async function registerExportRoutes(app: FastifyInstance): Promise<void> {
    // Export everything we hold about the user, as JSON (full, all tables) or CSV
    // (long-format daily stats). Scope to a single server with guildId, else all.
    app.get<{ Querystring: { guildId?: string; format?: 'json' | 'csv' } }>(
        '/api/export',
        {
            preHandler: requireAuth,
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        guildId: { type: 'string', pattern: guildIdPattern },
                        format: { type: 'string', enum: ['json', 'csv'] },
                    },
                },
            },
        },
        async (request, reply) => {
            const session = request.authSession!;
            const { guildId } = request.query;
            const format = request.query.format ?? 'json';
            const scope = guildId ? 'guild' : 'global';

            const [userStats, dailyStats, startTimestamps] = await Promise.all([
                getUserStatsRows(session.userId, guildId),
                getDailyStatsRows(session.userId, guildId),
                getStartTimestampsRows(session.userId, guildId),
            ]);

            // Resolve guild names from the bot-maintained servers table.
            const guildIds = new Set<string>();
            for (const r of userStats) if (r.guild_id) guildIds.add(r.guild_id);
            for (const r of dailyStats) if (r.guild_id) guildIds.add(r.guild_id);
            for (const r of startTimestamps) if (r.guild_id) guildIds.add(r.guild_id);
            const meta = await getServersMeta([...guildIds]);

            const payload = buildExportPayload({
                userId: session.userId,
                scope,
                userStats,
                dailyStats,
                startTimestamps,
                guildName: (gid) => meta.get(gid)?.guild_name ?? null,
            });

            const baseName = `gandhi-export-${session.userId}-${scope}`;

            if (format === 'csv') {
                return reply
                    .header('Content-Type', 'text/csv; charset=utf-8')
                    .header('Content-Disposition', `attachment; filename="${baseName}.csv"`)
                    .send(exportDailyStatsToCsv(payload));
            }

            return reply
                .header('Content-Type', 'application/json; charset=utf-8')
                .header('Content-Disposition', `attachment; filename="${baseName}.json"`)
                .send(JSON.stringify(payload, null, 2));
        },
    );
}
