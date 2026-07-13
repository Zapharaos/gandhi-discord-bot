import { computeBotHealth, type BotHealth } from '../status/service';
import { getBotStatusRow } from '../stats/queries';
import {
    getCommandTotals,
    getDailyPeaksRange,
    getEventCounts,
    getFirstSampleAt,
    getLatestMetrics,
    getLifecycleEvents,
    getMetricsRange,
    getRecentEvents,
    getSampleCount,
    type MetricBucketRow,
    type DailyPeakRow,
} from './health-queries';

// Detailed health view for the bot-operator dashboard, derived entirely from
// what the bot writes (bot_status, bot_metrics, bot_events, daily_peaks).

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type HealthRange = '24h' | '7d' | '30d';
export const HEALTH_RANGES: readonly HealthRange[] = ['24h', '7d', '30d'] as const;

const RANGE_CONFIG: Record<HealthRange, { rangeMs: number; bucketMs: number }> = {
    '24h': { rangeMs: DAY_MS, bucketMs: MINUTE_MS },
    '7d': { rangeMs: 7 * DAY_MS, bucketMs: 15 * MINUTE_MS },
    '30d': { rangeMs: 30 * DAY_MS, bucketMs: HOUR_MS },
};

export interface BotEventEntry {
    id: number;
    timestamp: number;
    type: string;
    detail: string | null;
    /** Set on 'startup' events not preceded by a graceful 'shutdown'. */
    crashed?: boolean;
}

export interface BotAdminHealth {
    bot: BotHealth;
    /** Most recent metrics sample, or null before the first one lands. */
    current: {
        sampledAt: number;
        rssBytes: number;
        heapUsedBytes: number;
        loopLagMeanMs: number;
        loopLagMaxMs: number;
        activeSessions: number;
    } | null;
    /** Sample-presence availability (%, 1 expected per minute), null before any data. */
    availability: { h24: number | null; d7: number | null };
    counters24h: {
        /** Gateway disconnect/reconnecting events. */
        reconnects: number;
        shardErrors: number;
        clientErrors: number;
        commandErrors: number;
        commandsOk: number;
    };
    events: BotEventEntry[];
    generatedAt: number;
}

export interface BotMetricPoint {
    t: number;
    wsPing: number;
    rssBytes: number;
    heapUsedBytes: number;
    loopLagMeanMs: number;
    loopLagMaxMs: number;
    activeSessions: number;
    commandsOk: number;
    commandsError: number;
    /** Average command latency inside the bucket (ms), null when no commands ran. */
    avgCommandLatencyMs: number | null;
}

export interface BotAdminHealthHistory {
    range: HealthRange;
    bucketMs: number;
    points: BotMetricPoint[];
    peaks: DailyPeakRow[];
    generatedAt: number;
}

/**
 * % of expected 1/min samples actually present in [now - rangeMs, now]. The
 * window is clamped to the first-ever sample so a fresh deployment isn't
 * reported as mostly down.
 */
async function computeAvailability(now: number, rangeMs: number, firstSampleAt: number | null): Promise<number | null> {
    if (firstSampleAt == null) return null;
    const from = Math.max(now - rangeMs, firstSampleAt);
    // Not even one full sampling interval observed yet — nothing to rate.
    const expected = Math.floor((now - from) / MINUTE_MS);
    if (expected <= 0) return null;
    const actual = await getSampleCount(from, now);
    return Math.min(100, Math.round((actual / expected) * 1000) / 10);
}

/** Timestamps of 'startup' events whose previous lifecycle event wasn't a 'shutdown'. */
function findCrashedStartups(lifecycle: { id: number; timestamp: number; type: string }[]): Set<number> {
    const crashed = new Set<number>();
    let previous: string | null = null;
    for (const event of lifecycle) {
        if (event.type === 'startup' && previous === 'startup') crashed.add(event.id);
        previous = event.type;
    }
    return crashed;
}

export async function getBotAdminHealth(): Promise<BotAdminHealth> {
    const now = Date.now();
    const dayAgo = now - DAY_MS;

    const [statusRow, current, firstSampleAt, eventCounts, commandTotals, recentEvents, lifecycle] = await Promise.all([
        getBotStatusRow().catch(() => undefined),
        getLatestMetrics(),
        getFirstSampleAt(),
        getEventCounts(dayAgo),
        getCommandTotals(dayAgo),
        getRecentEvents(50),
        getLifecycleEvents(),
    ]);

    const [h24, d7] = await Promise.all([
        computeAvailability(now, DAY_MS, firstSampleAt),
        computeAvailability(now, 7 * DAY_MS, firstSampleAt),
    ]);

    const crashedStartups = findCrashedStartups(lifecycle);
    const events: BotEventEntry[] = recentEvents.map((e) => ({
        ...e,
        ...(e.type === 'startup' && crashedStartups.has(e.id) ? { crashed: true } : {}),
    }));

    return {
        bot: computeBotHealth(statusRow, now),
        current,
        availability: { h24, d7 },
        counters24h: {
            reconnects: (eventCounts['shard_disconnect'] ?? 0) + (eventCounts['shard_reconnecting'] ?? 0),
            shardErrors: eventCounts['shard_error'] ?? 0,
            clientErrors: eventCounts['client_error'] ?? 0,
            commandErrors: eventCounts['command_error'] ?? 0,
            commandsOk: commandTotals.ok,
        },
        events,
        generatedAt: now,
    };
}

export async function getBotAdminHealthHistory(range: HealthRange): Promise<BotAdminHealthHistory> {
    const now = Date.now();
    const { rangeMs, bucketMs } = RANGE_CONFIG[range];
    const from = now - rangeMs;

    const [buckets, peaks] = await Promise.all([
        getMetricsRange(from, now, bucketMs),
        getDailyPeaksRange(new Date(from).setUTCHours(0, 0, 0, 0)),
    ]);

    const points: BotMetricPoint[] = buckets.map((b: MetricBucketRow) => {
        const commands = b.commandsOk + b.commandsError;
        return {
            t: b.t,
            wsPing: b.wsPing,
            rssBytes: b.rssBytes,
            heapUsedBytes: b.heapUsedBytes,
            loopLagMeanMs: b.loopLagMeanMs,
            loopLagMaxMs: b.loopLagMaxMs,
            activeSessions: b.activeSessions,
            commandsOk: b.commandsOk,
            commandsError: b.commandsError,
            avgCommandLatencyMs: commands > 0 ? Math.round(b.commandLatencyMsTotal / commands) : null,
        };
    });

    return { range, bucketMs, points, peaks, generatedAt: now };
}
