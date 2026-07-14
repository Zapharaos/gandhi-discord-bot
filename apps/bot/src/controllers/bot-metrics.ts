import {Logger} from '@services/logger';
import {getDb} from '@services/database';

export interface BotMetricsSample {
    ready: boolean;
    guildCount: number;
    wsPing: number;
    rssBytes: number;
    heapUsedBytes: number;
    loopLagMeanMs: number;
    loopLagMaxMs: number;
    activeSessions: number;
    commandsOk: number;
    commandsError: number;
    commandLatencyMsTotal: number;
}

export class BotMetricsController {

    /**
     * Persist one health metrics sample (called every ~60s by the heartbeat).
     * Best-effort — a failed write must never take the bot down.
     */
    static async insertSample(shardId: number, sample: BotMetricsSample): Promise<void> {
        const db = await getDb();
        if (!db) return;

        try {
            await db
                .insertInto('bot_metrics')
                .values({
                    shard_id: shardId,
                    sampled_at: Date.now(),
                    ready: sample.ready ? 1 : 0,
                    guild_count: sample.guildCount,
                    ws_ping: Math.max(0, Math.round(sample.wsPing)),
                    rss_bytes: sample.rssBytes,
                    heap_used_bytes: sample.heapUsedBytes,
                    loop_lag_mean_ms: Math.round(sample.loopLagMeanMs),
                    loop_lag_max_ms: Math.round(sample.loopLagMaxMs),
                    active_sessions: sample.activeSessions,
                    commands_ok: sample.commandsOk,
                    commands_error: sample.commandsError,
                    command_latency_ms_total: Math.round(sample.commandLatencyMsTotal),
                })
                .execute();
        } catch (err) {
            await Logger.error('Failed to insert bot metrics sample', err);
        }
    }

    /** Delete samples older than the cutoff (retention: ~14 days). */
    static async prune(cutoffMs: number): Promise<void> {
        const db = await getDb();
        if (!db) return;

        try {
            await db
                .deleteFrom('bot_metrics')
                .where('sampled_at', '<', cutoffMs)
                .execute();
        } catch (err) {
            await Logger.error('Failed to prune bot metrics', err);
        }
    }
}
