import { sql } from 'kysely';
import type { StartTimestamps } from '@gandhi/core/types/db';
import { getDb } from '../db';
import type { TimelineStat } from '../stats/service';

// Read-only aggregation layer for the bot-operator overview. Everything here is
// a whole-database aggregate (no per-user detail), computed in SQL so the
// endpoint stays cheap even with many guilds/members.

export interface ServerCounts {
    /** Guilds ever seen (rows in `servers`). */
    total: number;
    /** Guilds the bot is currently a member of. */
    present: number;
    /** Guilds with server-level stats tracking enabled (unset defaults to ON). */
    statsEnabled: number;
    /** Guilds with server-level logs enabled (unset defaults to ON). */
    logsEnabled: number;
}

export async function getServerCounts(): Promise<ServerCounts> {
    const row = await getDb()
        .selectFrom('servers')
        .select([
            sql<number>`COUNT(*)`.as('total'),
            sql<number>`COALESCE(SUM(bot_present = 1), 0)`.as('present'),
            sql<number>`COALESCE(SUM(CASE WHEN stats IS NULL OR stats != 0 THEN 1 ELSE 0 END), 0)`.as('statsEnabled'),
            sql<number>`COALESCE(SUM(CASE WHEN logs IS NULL OR logs != 0 THEN 1 ELSE 0 END), 0)`.as('logsEnabled'),
        ])
        .executeTakeFirstOrThrow();
    return row;
}

export interface MembershipCounts {
    /** (user, guild) pairs — rows in `user_stats`. */
    memberships: number;
    /** Distinct users across every guild. */
    distinctUsers: number;
    /** Memberships with private mode enabled. */
    privateMemberships: number;
    /** Distinct users private on at least one guild. */
    privateUsers: number;
    /** Memberships that opted out of stats tracking. */
    statsOptedOut: number;
    /** Memberships that opted out of log mentions. */
    logsOptedOut: number;
}

export async function getMembershipCounts(): Promise<MembershipCounts> {
    const row = await getDb()
        .selectFrom('user_stats')
        .select([
            sql<number>`COUNT(*)`.as('memberships'),
            sql<number>`COUNT(DISTINCT user_id)`.as('distinctUsers'),
            sql<number>`COALESCE(SUM(private = 1), 0)`.as('privateMemberships'),
            sql<number>`COUNT(DISTINCT CASE WHEN private = 1 THEN user_id END)`.as('privateUsers'),
            sql<number>`COALESCE(SUM(stats = 0), 0)`.as('statsOptedOut'),
            sql<number>`COALESCE(SUM(logs = 0), 0)`.as('logsOptedOut'),
        ])
        .executeTakeFirstOrThrow();
    return row;
}

export interface GlobalTotals {
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
    count_connected: number;
    count_muted: number;
    count_deafened: number;
    count_screen_sharing: number;
    count_camera: number;
    count_switch: number;
    /** Longest single session across everyone, per stat. */
    max_connected: number;
    max_muted: number;
    max_deafened: number;
    max_screen_sharing: number;
    max_camera: number;
    max_daily_streak: number;
}

export async function getGlobalTotals(): Promise<GlobalTotals> {
    const row = await getDb()
        .selectFrom('user_stats')
        .select([
            sql<number>`COALESCE(SUM(time_connected), 0)`.as('time_connected'),
            sql<number>`COALESCE(SUM(time_muted), 0)`.as('time_muted'),
            sql<number>`COALESCE(SUM(time_deafened), 0)`.as('time_deafened'),
            sql<number>`COALESCE(SUM(time_screen_sharing), 0)`.as('time_screen_sharing'),
            sql<number>`COALESCE(SUM(time_camera), 0)`.as('time_camera'),
            sql<number>`COALESCE(SUM(count_connected), 0)`.as('count_connected'),
            sql<number>`COALESCE(SUM(count_muted), 0)`.as('count_muted'),
            sql<number>`COALESCE(SUM(count_deafened), 0)`.as('count_deafened'),
            sql<number>`COALESCE(SUM(count_screen_sharing), 0)`.as('count_screen_sharing'),
            sql<number>`COALESCE(SUM(count_camera), 0)`.as('count_camera'),
            sql<number>`COALESCE(SUM(count_switch), 0)`.as('count_switch'),
            sql<number>`COALESCE(MAX(max_connected), 0)`.as('max_connected'),
            sql<number>`COALESCE(MAX(max_muted), 0)`.as('max_muted'),
            sql<number>`COALESCE(MAX(max_deafened), 0)`.as('max_deafened'),
            sql<number>`COALESCE(MAX(max_screen_sharing), 0)`.as('max_screen_sharing'),
            sql<number>`COALESCE(MAX(max_camera), 0)`.as('max_camera'),
            sql<number>`COALESCE(MAX(max_daily_streak), 0)`.as('max_daily_streak'),
        ])
        .executeTakeFirstOrThrow();
    return row;
}

export interface UserActivityCounts {
    /** Distinct users with any activity in the last 30 days. */
    activeUsers30d: number;
    /** Distinct users with any activity in the last 90 days. */
    activeUsers90d: number;
}

export async function getUserActivityCounts(now: number): Promise<UserActivityCounts> {
    const c30 = now - 30 * 24 * 60 * 60 * 1000;
    const c90 = now - 90 * 24 * 60 * 60 * 1000;
    const row = await getDb()
        .selectFrom('user_stats')
        .select([
            sql<number>`COUNT(DISTINCT CASE WHEN last_activity >= ${c30} THEN user_id END)`.as('activeUsers30d'),
            sql<number>`COUNT(DISTINCT CASE WHEN last_activity >= ${c90} THEN user_id END)`.as('activeUsers90d'),
        ])
        .executeTakeFirstOrThrow();
    return row;
}

export interface GuildActivityRow {
    guildId: string;
    /** Members with a stats row on this guild. */
    members: number;
    /** Members with private mode enabled. */
    privateMembers: number;
    /** Most recent member activity (epoch ms), 0 when never. */
    lastActivity: number;
    /** Summed connected time across every member (ms). */
    timeConnected: number;
}

/** Per-guild aggregate over user_stats — feeds both inactivity counters and the guild table. */
export async function getGuildActivityRows(): Promise<GuildActivityRow[]> {
    const rows = await getDb()
        .selectFrom('user_stats')
        .select([
            'guild_id',
            sql<number>`COUNT(*)`.as('members'),
            sql<number>`COALESCE(SUM(private = 1), 0)`.as('privateMembers'),
            sql<number>`COALESCE(MAX(last_activity), 0)`.as('lastActivity'),
            sql<number>`COALESCE(SUM(time_connected), 0)`.as('timeConnected'),
        ])
        .groupBy('guild_id')
        .execute();
    return rows
        .filter((r) => !!r.guild_id)
        .map((r) => ({
            guildId: r.guild_id as string,
            members: r.members,
            privateMembers: r.privateMembers,
            lastActivity: r.lastActivity,
            timeConnected: r.timeConnected,
        }));
}

export interface LiveCounts {
    /** Voice sessions ongoing right now. */
    sessions: number;
    /** Distinct guilds with at least one ongoing session. */
    guilds: number;
}

export async function getLiveCounts(): Promise<LiveCounts> {
    const row = await getDb()
        .selectFrom('start_timestamps')
        .select([
            sql<number>`COALESCE(SUM(COALESCE(start_connected, 0) > 0), 0)`.as('sessions'),
            sql<number>`COUNT(DISTINCT CASE WHEN COALESCE(start_connected, 0) > 0 THEN guild_id END)`.as('guilds'),
        ])
        .executeTakeFirstOrThrow();
    return row;
}

export interface DailyActivityCounts {
    /** Distinct users seen in daily_stats over the last 1/7/30 days. */
    day: number;
    week: number;
    month: number;
    /** Earliest tracked day (epoch ms), or null when no data yet. */
    firstDay: number | null;
}

export async function getDailyActivityCounts(now: number): Promise<DailyActivityCounts> {
    const dayMs = 24 * 60 * 60 * 1000;
    const row = await getDb()
        .selectFrom('daily_stats')
        .select([
            sql<number>`COUNT(DISTINCT CASE WHEN day_timestamp >= ${now - dayMs} THEN user_id END)`.as('day'),
            sql<number>`COUNT(DISTINCT CASE WHEN day_timestamp >= ${now - 7 * dayMs} THEN user_id END)`.as('week'),
            sql<number>`COUNT(DISTINCT CASE WHEN day_timestamp >= ${now - 30 * dayMs} THEN user_id END)`.as('month'),
            sql<number | null>`MIN(day_timestamp)`.as('firstDay'),
        ])
        .executeTakeFirstOrThrow();
    return row;
}

export interface DailyAggRow {
    day: number;
    value: number;
}

/** Per-day sum of one stat across EVERY guild and user (anonymous aggregate). */
export async function getGlobalDailyAgg(stat: TimelineStat, from?: number, to?: number): Promise<DailyAggRow[]> {
    // `stat` is constrained to the TIMELINE_STATS union, so interpolating the
    // column name via sql.ref is safe.
    let query = getDb()
        .selectFrom('daily_stats')
        .select(['day_timestamp as day', sql<number>`COALESCE(SUM(${sql.ref(stat)}), 0)`.as('value')])
        .groupBy('day_timestamp')
        .orderBy('day_timestamp', 'asc');
    if (from !== undefined) query = query.where('day_timestamp', '>=', from);
    if (to !== undefined) query = query.where('day_timestamp', '<=', to);
    const rows = await query.execute();
    return rows.filter((r) => r.day != null).map((r) => ({ day: r.day as number, value: r.value }));
}

/** Every start_timestamps row (to fold ongoing sessions into the global timeline). */
export async function getAllStartTimestampsRows(): Promise<StartTimestamps[]> {
    return (await getDb().selectFrom('start_timestamps').selectAll().execute()) as unknown as StartTimestamps[];
}

/** Each user's first tracked day (epoch ms), one row per distinct user. */
export async function getUserFirstDays(): Promise<number[]> {
    const rows = await getDb()
        .selectFrom('daily_stats')
        .select(sql<number>`MIN(day_timestamp)`.as('firstDay'))
        .where('user_id', 'is not', null)
        .where('day_timestamp', 'is not', null)
        .groupBy('user_id')
        .execute();
    return rows.map((r) => r.firstDay);
}

export interface RetentionCounts {
    /** Distinct users active in the previous 30-day window. */
    previousActive: number;
    /** Of those, how many were also active in the last 30 days. */
    retained: number;
}

/** Rolling 30-day retention: previous window = [now-60d, now-30d), current = [now-30d, now]. */
export async function getRetentionCounts(now: number): Promise<RetentionCounts> {
    const dayMs = 24 * 60 * 60 * 1000;
    const mid = now - 30 * dayMs;
    const start = now - 60 * dayMs;
    const row = await sql<{ previousActive: number; retained: number }>`
        SELECT
            (SELECT COUNT(DISTINCT user_id) FROM daily_stats
                WHERE day_timestamp >= ${start} AND day_timestamp < ${mid}) AS previousActive,
            (SELECT COUNT(*) FROM (
                SELECT DISTINCT user_id FROM daily_stats
                    WHERE day_timestamp >= ${start} AND day_timestamp < ${mid}
                INTERSECT
                SELECT DISTINCT user_id FROM daily_stats WHERE day_timestamp >= ${mid}
            )) AS retained
    `.execute(getDb());
    return row.rows[0] ?? { previousActive: 0, retained: 0 };
}

/** Per-guild connected time over the last 30 days (epoch cutoff computed from `now`). */
export async function getGuildRecentConnected(now: number): Promise<Map<string, number>> {
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const rows = await getDb()
        .selectFrom('daily_stats')
        .select(['guild_id', sql<number>`COALESCE(SUM(time_connected), 0)`.as('value')])
        .where('day_timestamp', '>=', cutoff)
        .groupBy('guild_id')
        .execute();
    const result = new Map<string, number>();
    for (const r of rows) {
        if (r.guild_id) result.set(r.guild_id, r.value);
    }
    return result;
}

export interface JoinLeaveCounts {
    /** Servers the bot joined in the last 30 days. */
    gained30d: number;
    /** Servers that removed the bot in the last 30 days (dated departures only). */
    lost30d: number;
}

export async function getJoinLeaveCounts(now: number): Promise<JoinLeaveCounts> {
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    try {
        return await getDb()
            .selectFrom('servers')
            .select([
                sql<number>`COALESCE(SUM(joined_at >= ${cutoff}), 0)`.as('gained30d'),
                sql<number>`COALESCE(SUM(left_at >= ${cutoff}), 0)`.as('lost30d'),
            ])
            .executeTakeFirstOrThrow();
    } catch {
        return { gained30d: 0, lost30d: 0 }; // joined_at/left_at may not exist yet (migration 17)
    }
}

export interface PeakCounts {
    /** Highest concurrent-session count sampled today (UTC). */
    today: number;
    /** All-time highest sample, with the day it happened (epoch ms) or null. */
    allTime: number;
    allTimeDay: number | null;
}

export async function getPeakCounts(now: number): Promise<PeakCounts> {
    try {
        const day = new Date(now).setUTCHours(0, 0, 0, 0);
        const [todayRow, bestRow] = await Promise.all([
            getDb()
                .selectFrom('daily_peaks')
                .select('peak_sessions')
                .where('day_timestamp', '=', day)
                .executeTakeFirst(),
            getDb()
                .selectFrom('daily_peaks')
                .select(['day_timestamp', 'peak_sessions'])
                .orderBy('peak_sessions', 'desc')
                .orderBy('day_timestamp', 'desc')
                .limit(1)
                .executeTakeFirst(),
        ]);
        return {
            today: todayRow?.peak_sessions ?? 0,
            allTime: bestRow?.peak_sessions ?? 0,
            allTimeDay: bestRow?.day_timestamp ?? null,
        };
    } catch {
        return { today: 0, allTime: 0, allTimeDay: null }; // daily_peaks may not exist yet (migration 18)
    }
}

/** Total number of daily_stats rows (storage/ops metric). */
export async function getDailyStatsRowCount(): Promise<number> {
    const row = await getDb()
        .selectFrom('daily_stats')
        .select(sql<number>`COUNT(*)`.as('count'))
        .executeTakeFirstOrThrow();
    return row.count;
}

export interface ServerMetaRow {
    guildId: string;
    name: string | null;
    icon: string | null;
    botPresent: boolean;
    statsEnabled: boolean;
    logsEnabled: boolean;
}

/** Every guild ever seen, with cached name/icon and presence flags. */
export async function getAllServersMeta(): Promise<ServerMetaRow[]> {
    const rows = await getDb()
        .selectFrom('servers')
        .select(['guild_id', 'guild_name', 'guild_icon', 'bot_present', 'stats', 'logs'])
        .execute();
    return rows
        .filter((r) => !!r.guild_id)
        .map((r) => ({
            guildId: r.guild_id as string,
            name: r.guild_name,
            icon: r.guild_icon,
            botPresent: (r.bot_present as unknown as number | null) === 1,
            statsEnabled: r.stats == null || (r.stats as unknown as number) !== 0,
            logsEnabled: r.logs == null || (r.logs as unknown as number) !== 0,
        }));
}
