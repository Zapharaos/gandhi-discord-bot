import type { UserStats, StartTimestamps } from '@gandhi/core/types/db';
import { UserStatsModel } from '@gandhi/core/models/database/user_stats';
import {
    StartTimestampsModel,
    type StatKey as StartStatKey,
} from '@gandhi/core/models/database/start_timestamps';
import { DailyStatsModel } from '@gandhi/core/models/database/daily_stats';
import {
    getDailyStatsRows,
    getStartTimestampsRows,
    getUserStatsRows,
} from './queries';

// Daily/aggregate stat columns exposed to the web client. These match the
// time_* columns in daily_stats and their user_stats counterparts.
export const TIMELINE_STATS = [
    'time_connected',
    'time_muted',
    'time_deafened',
    'time_screen_sharing',
    'time_camera',
] as const;
export type TimelineStat = (typeof TIMELINE_STATS)[number];

export function isTimelineStat(value: string): value is TimelineStat {
    return (TIMELINE_STATS as readonly string[]).includes(value);
}

export interface AggregatedStats {
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
    max_connected: number;
    max_muted: number;
    max_deafened: number;
    max_screen_sharing: number;
    max_camera: number;
    max_daily_streak: number;
    count_connected: number;
    count_muted: number;
    count_deafened: number;
    count_screen_sharing: number;
    count_camera: number;
    count_switch: number;
    daily_streak: number;
    last_activity: number;
    /** Whether the user is currently in a voice channel (live session ongoing). */
    isLive: boolean;
}

// Build a per-guild UserStatsModel with the ongoing (live) session folded in, so
// the numbers match what the bot would report at this instant.
function buildLiveModel(
    userRow: UserStats,
    startRow: StartTimestamps | undefined,
    now: number,
): { model: UserStatsModel; isLive: boolean } {
    const model = UserStatsModel.fromUserStats(userRow);
    if (startRow) {
        const start = StartTimestampsModel.fromStartTimestamps(startRow);
        if (start.isActive()) {
            start.combineAllWithUserStats(model, now);
            return { model, isLive: true };
        }
    }
    return { model, isLive: false };
}

function emptyAggregate(): AggregatedStats {
    return {
        time_connected: 0, time_muted: 0, time_deafened: 0, time_screen_sharing: 0, time_camera: 0,
        max_connected: 0, max_muted: 0, max_deafened: 0, max_screen_sharing: 0, max_camera: 0, max_daily_streak: 0,
        count_connected: 0, count_muted: 0, count_deafened: 0, count_screen_sharing: 0, count_camera: 0, count_switch: 0,
        daily_streak: 0, last_activity: 0, isLive: false,
    };
}

// Fold a per-guild model into the running aggregate. Durations and counts sum
// across servers; "max" and streak fields take the maximum; last_activity keeps
// the most recent.
function fold(acc: AggregatedStats, m: UserStatsModel, isLive: boolean): void {
    acc.time_connected += m.time_connected;
    acc.time_muted += m.time_muted;
    acc.time_deafened += m.time_deafened;
    acc.time_screen_sharing += m.time_screen_sharing;
    acc.time_camera += m.time_camera;
    acc.count_connected += m.count_connected;
    acc.count_muted += m.count_muted;
    acc.count_deafened += m.count_deafened;
    acc.count_screen_sharing += m.count_screen_sharing;
    acc.count_camera += m.count_camera;
    acc.count_switch += m.count_switch;
    acc.max_connected = Math.max(acc.max_connected, m.max_connected);
    acc.max_muted = Math.max(acc.max_muted, m.max_muted);
    acc.max_deafened = Math.max(acc.max_deafened, m.max_deafened);
    acc.max_screen_sharing = Math.max(acc.max_screen_sharing, m.max_screen_sharing);
    acc.max_camera = Math.max(acc.max_camera, m.max_camera);
    acc.max_daily_streak = Math.max(acc.max_daily_streak, m.max_daily_streak);
    acc.daily_streak = Math.max(acc.daily_streak, m.daily_streak);
    acc.last_activity = Math.max(acc.last_activity, m.last_activity);
    acc.isLive = acc.isLive || isLive;
}

/**
 * Aggregate a user's stats. When guildId is given the result is that single
 * server; otherwise it is summed across every server the user has data on.
 */
export async function getAggregatedStats(userId: string, guildId?: string): Promise<AggregatedStats> {
    const now = Date.now();
    const [userRows, startRows] = await Promise.all([
        getUserStatsRows(userId, guildId),
        getStartTimestampsRows(userId, guildId),
    ]);

    const startByGuild = new Map(startRows.map((r) => [r.guild_id, r]));
    const acc = emptyAggregate();

    for (const row of userRows) {
        const { model, isLive } = buildLiveModel(row, startByGuild.get(row.guild_id), now);
        fold(acc, model, isLive);
    }
    return acc;
}

export interface SessionStats {
    /** True when the user is currently connected to a voice channel. */
    active: boolean;
    /** Guild ids with an ongoing session (usually one). */
    guildIds: string[];
    /** Elapsed durations of the ONGOING session only (not the stored totals). */
    stats: AggregatedStats;
}

/**
 * The user's current voice session: how long they have been connected / muted /
 * … right now. Computed straight from the live start timestamps (no streak or
 * max logic, which only applies to stored totals).
 */
export async function getSessionStats(userId: string): Promise<SessionStats> {
    const now = Date.now();
    const startRows = await getStartTimestampsRows(userId);

    const acc = emptyAggregate();
    const guildIds: string[] = [];
    const elapsed = (start: number): number => (start > 0 ? Math.max(0, now - start) : 0);

    for (const row of startRows) {
        const start = StartTimestampsModel.fromStartTimestamps(row);
        if (!start.isActive()) continue;
        if (row.guild_id) guildIds.push(row.guild_id);
        acc.time_connected += elapsed(start.start_connected);
        acc.time_muted += elapsed(start.start_muted);
        acc.time_deafened += elapsed(start.start_deafened);
        acc.time_screen_sharing += elapsed(start.start_screen_sharing);
        acc.time_camera += elapsed(start.start_camera);
    }

    acc.isLive = guildIds.length > 0;
    return { active: guildIds.length > 0, guildIds, stats: acc };
}

export interface TimelinePoint {
    /** UTC-midnight timestamp (ms) of the day bucket. */
    day: number;
    /** Value of the selected stat for that day, in milliseconds. */
    value: number;
}

/**
 * Daily timeline for the GitHub-style heatmap. Sums the stored daily_stats for
 * the selected stat and folds in the ongoing session's live contribution.
 */
export async function getTimeline(
    userId: string,
    stat: TimelineStat,
    guildId?: string,
    from?: number,
    to?: number,
): Promise<TimelinePoint[]> {
    const now = Date.now();
    const [dailyRows, startRows] = await Promise.all([
        getDailyStatsRows(userId, guildId, from, to),
        getStartTimestampsRows(userId, guildId),
    ]);

    // Sum the stored per-day values for the requested stat.
    const perDay = new Map<number, number>();
    for (const row of dailyRows) {
        const model = DailyStatsModel.fromDailyStats(row);
        perDay.set(model.day_timestamp, (perDay.get(model.day_timestamp) ?? 0) + model[stat]);
    }

    // Fold in the ongoing session, split across the days it spans.
    const startCol = StartTimestampsModel.getColNameFromUserStat(stat);
    const startStatKey: StartStatKey | null = startCol ? StartTimestampsModel.getStatKey(startCol) : null;
    for (const row of startRows) {
        const start = StartTimestampsModel.fromStartTimestamps(row);
        if (!start.isActive()) continue;
        const liveMap = DailyStatsModel.fromStartTimestamps(start, startStatKey, now);
        for (const [day, model] of liveMap) {
            if (from !== undefined && day < from) continue;
            if (to !== undefined && day > to) continue;
            perDay.set(day, (perDay.get(day) ?? 0) + model[stat]);
        }
    }

    return [...perDay.entries()]
        .map(([day, value]) => ({ day, value }))
        .sort((a, b) => a.day - b.day);
}
