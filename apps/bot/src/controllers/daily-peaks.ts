import {sql} from 'kysely';
import {Logger} from '@services/logger';
import {getDb} from '@services/database';

export class DailyPeaksController {

    /**
     * Raise today's peak if the given live-session sample exceeds it. Called
     * from the bot's heartbeat (~15s) with a count from
     * StartTimestampsController.countActiveSessions(); best-effort — a failed
     * write must never take the bot down.
     */
    static async samplePeak(sessions: number): Promise<void> {
        const db = await getDb();
        if (!db) return;

        try {
            const now = Date.now();
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
