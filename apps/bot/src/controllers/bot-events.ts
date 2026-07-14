import {Logger} from '@services/logger';
import {getDb} from '@services/database';

export type BotEventType =
    | 'startup'
    | 'ready'
    | 'shutdown'
    | 'shard_disconnect'
    | 'shard_resume'
    | 'shard_reconnecting'
    | 'shard_error'
    | 'client_error'
    | 'client_warn'
    | 'command_error';

const SHARD_ID = 0;
const MAX_DETAIL_LENGTH = 500;

export class BotEventsController {

    /**
     * Record a lifecycle/incident event. Best-effort — must never throw, so it
     * is safe to call fire-and-forget from Discord event listeners.
     */
    static async record(type: BotEventType, detail?: string): Promise<void> {
        const db = await getDb();
        if (!db) return;

        try {
            await db
                .insertInto('bot_events')
                .values({
                    shard_id: SHARD_ID,
                    timestamp: Date.now(),
                    type,
                    detail: detail ? detail.slice(0, MAX_DETAIL_LENGTH) : null,
                })
                .execute();
        } catch (err) {
            await Logger.error(`Failed to record bot event '${type}'`, err);
        }
    }

    /** Delete events older than the cutoff (retention: ~90 days). */
    static async prune(cutoffMs: number): Promise<void> {
        const db = await getDb();
        if (!db) return;

        try {
            await db
                .deleteFrom('bot_events')
                .where('timestamp', '<', cutoffMs)
                .execute();
        } catch (err) {
            await Logger.error('Failed to prune bot events', err);
        }
    }
}
