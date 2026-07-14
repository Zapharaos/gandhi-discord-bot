import {Logger} from '@services/logger';
import {getDb} from '@services/database';

export interface HeartbeatData {
    ready: boolean;
    guildCount: number;
    wsPing: number;
    startedAt: number;
}

export class BotStatusController {

    /**
     * Upsert the bot's heartbeat row. Best-effort: a failed write must never take
     * the bot down, so errors are logged and swallowed.
     */
    static async heartbeat(shardId: number, data: HeartbeatData): Promise<void> {
        const db = await getDb();
        if (!db) return;

        const row = {
            shard_id: shardId,
            updated_at: Date.now(),
            ready: data.ready ? 1 : 0,
            guild_count: data.guildCount,
            ws_ping: Math.max(0, Math.round(data.wsPing)),
            started_at: data.startedAt,
        };

        try {
            await db
                .insertInto('bot_status')
                .values(row)
                .onConflict((oc) => oc.column('shard_id').doUpdateSet(row))
                .execute();
        } catch (err) {
            await Logger.error('Failed to write bot heartbeat', err);
        }
    }
}
