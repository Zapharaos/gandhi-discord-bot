import {sql} from 'kysely';
import {Logger} from '@services/logger';
import {getDb} from '@services/database';

export class DailyPeaksController {

    /**
     * Sample the number of ongoing voice sessions and raise today's peak if the
     * sample exceeds it. Called from the bot's heartbeat (~15s); best-effort — a
     * failed write must never take the bot down.
     */
    static async samplePeak(): Promise<void> {
        const db = await getDb();
        if (!db) return;

        try {
            const now = Date.now();
            // Same "live session" definition as the web service: an active
            // start_timestamps row (being connected underpins every other stat).
            const row = await db
                .selectFrom('start_timestamps')
                .select(sql<number>`COALESCE(SUM(COALESCE(start_connected, 0) > 0), 0)`.as('sessions'))
                .executeTakeFirst();
            const sessions = row?.sessions ?? 0;

            // Same UTC-midnight day key as daily_stats.
            const day = new Date(now).setUTCHours(0, 0, 0, 0);
            await db
                .insertInto('daily_peaks')
                .values({ day_timestamp: day, peak_sessions: sessions, updated_at: now })
                .onConflict((oc) => oc.column('day_timestamp').doUpdateSet({
                    peak_sessions: sql<number>`MAX(daily_peaks.peak_sessions, ${sessions})`,
                    updated_at: now,
                }))
                .execute();
        } catch (err) {
            await Logger.error('Failed to sample concurrency peak', err);
        }
    }
}
