import { sql } from 'kysely';
import { getDb } from '../db';

// Read-only queries over the bot's health tables (bot_metrics, bot_events),
// written by the bot's heartbeat since migration 19. Every helper tolerates the
// tables not existing yet (web-api deployed before the bot migrated) by
// returning empties, mirroring getPeakCounts.

export interface MetricBucketRow {
    /** Bucket end (max sampled_at inside the bucket, epoch ms). */
    t: number;
    wsPing: number;
    rssBytes: number;
    heapUsedBytes: number;
    loopLagMeanMs: number;
    loopLagMaxMs: number;
    activeSessions: number;
    commandsOk: number;
    commandsError: number;
    commandLatencyMsTotal: number;
    samples: number;
}

/** Downsampled metric series: one row per `bucketMs` window inside [from, to]. */
export async function getMetricsRange(from: number, to: number, bucketMs: number): Promise<MetricBucketRow[]> {
    try {
        const rows = await getDb()
            .selectFrom('bot_metrics')
            .select([
                sql<number>`MAX(sampled_at)`.as('t'),
                sql<number>`ROUND(AVG(ws_ping))`.as('wsPing'),
                sql<number>`MAX(rss_bytes)`.as('rssBytes'),
                sql<number>`MAX(heap_used_bytes)`.as('heapUsedBytes'),
                sql<number>`ROUND(AVG(loop_lag_mean_ms))`.as('loopLagMeanMs'),
                sql<number>`MAX(loop_lag_max_ms)`.as('loopLagMaxMs'),
                sql<number>`MAX(active_sessions)`.as('activeSessions'),
                sql<number>`COALESCE(SUM(commands_ok), 0)`.as('commandsOk'),
                sql<number>`COALESCE(SUM(commands_error), 0)`.as('commandsError'),
                sql<number>`COALESCE(SUM(command_latency_ms_total), 0)`.as('commandLatencyMsTotal'),
                sql<number>`COUNT(*)`.as('samples'),
            ])
            .where('sampled_at', '>=', from)
            .where('sampled_at', '<=', to)
            .groupBy(sql`sampled_at / ${sql.lit(Math.max(1, Math.floor(bucketMs)))}`)
            .orderBy('t', 'asc')
            .execute();
        return rows;
    } catch {
        return []; // bot_metrics may not exist yet (migration 19)
    }
}

export interface LatestMetricsRow {
    sampledAt: number;
    rssBytes: number;
    heapUsedBytes: number;
    loopLagMeanMs: number;
    loopLagMaxMs: number;
    activeSessions: number;
}

export async function getLatestMetrics(): Promise<LatestMetricsRow | null> {
    try {
        const row = await getDb()
            .selectFrom('bot_metrics')
            .select([
                'sampled_at as sampledAt',
                'rss_bytes as rssBytes',
                'heap_used_bytes as heapUsedBytes',
                'loop_lag_mean_ms as loopLagMeanMs',
                'loop_lag_max_ms as loopLagMaxMs',
                'active_sessions as activeSessions',
            ])
            .orderBy('sampled_at', 'desc')
            .limit(1)
            .executeTakeFirst();
        return row ?? null;
    } catch {
        return null;
    }
}

/** Timestamp of the very first metrics sample ever, to clamp availability windows. */
export async function getFirstSampleAt(): Promise<number | null> {
    try {
        const row = await getDb()
            .selectFrom('bot_metrics')
            .select(sql<number | null>`MIN(sampled_at)`.as('first'))
            .executeTakeFirst();
        return row?.first ?? null;
    } catch {
        return null;
    }
}

export async function getSampleCount(from: number, to: number): Promise<number> {
    try {
        const row = await getDb()
            .selectFrom('bot_metrics')
            .select(sql<number>`COUNT(*)`.as('count'))
            .where('sampled_at', '>=', from)
            .where('sampled_at', '<=', to)
            .executeTakeFirst();
        return row?.count ?? 0;
    } catch {
        return 0;
    }
}

export interface BotEventRow {
    id: number;
    timestamp: number;
    type: string;
    detail: string | null;
}

export async function getRecentEvents(limit = 50): Promise<BotEventRow[]> {
    try {
        return await getDb()
            .selectFrom('bot_events')
            .select(['id', 'timestamp', 'type', 'detail'])
            .orderBy('timestamp', 'desc')
            .orderBy('id', 'desc')
            .limit(limit)
            .execute();
    } catch {
        return []; // bot_events may not exist yet (migration 19)
    }
}

/**
 * Lifecycle events (startup/shutdown) in ascending order, used to infer
 * crashes: a startup whose previous lifecycle event is not a shutdown means
 * the previous run died without its SIGTERM handler.
 */
export async function getLifecycleEvents(): Promise<Pick<BotEventRow, 'id' | 'timestamp' | 'type'>[]> {
    try {
        return await getDb()
            .selectFrom('bot_events')
            .select(['id', 'timestamp', 'type'])
            .where('type', 'in', ['startup', 'shutdown'])
            .orderBy('timestamp', 'asc')
            .orderBy('id', 'asc')
            .execute();
    } catch {
        return [];
    }
}

/** Count of events per type since `from`. */
export async function getEventCounts(from: number): Promise<Record<string, number>> {
    try {
        const rows = await getDb()
            .selectFrom('bot_events')
            .select(['type', sql<number>`COUNT(*)`.as('count')])
            .where('timestamp', '>=', from)
            .groupBy('type')
            .execute();
        const counts: Record<string, number> = {};
        for (const r of rows) counts[r.type] = r.count;
        return counts;
    } catch {
        return {};
    }
}

export interface DailyPeakRow {
    day: number;
    peakSessions: number;
}

/** daily_peaks series since `from` (collected by the heartbeat since migration 18). */
export async function getDailyPeaksRange(from: number): Promise<DailyPeakRow[]> {
    try {
        return await getDb()
            .selectFrom('daily_peaks')
            .select(['day_timestamp as day', 'peak_sessions as peakSessions'])
            .where('day_timestamp', '>=', from)
            .orderBy('day_timestamp', 'asc')
            .execute();
    } catch {
        return []; // daily_peaks may not exist yet (migration 18)
    }
}

/** Sum of command counters since `from` (for the 24h counter tiles). */
export async function getCommandTotals(from: number): Promise<{ ok: number; error: number }> {
    try {
        const row = await getDb()
            .selectFrom('bot_metrics')
            .select([
                sql<number>`COALESCE(SUM(commands_ok), 0)`.as('ok'),
                sql<number>`COALESCE(SUM(commands_error), 0)`.as('error'),
            ])
            .where('sampled_at', '>=', from)
            .executeTakeFirst();
        return { ok: row?.ok ?? 0, error: row?.error ?? 0 };
    } catch {
        return { ok: 0, error: 0 };
    }
}
