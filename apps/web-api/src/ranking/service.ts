import { StartTimestampsModel, type StatKey as StartStatKey } from '@gandhi/core/models/database/start_timestamps';
import { DailyStatsModel } from '@gandhi/core/models/database/daily_stats';
import { loadMembers, type MemberEntry } from '../admin/service';
import { getGuildDailyStatsRows, getGuildStartTimestampsRows, getUsersByIds } from '../stats/queries';
import type { TimelineStat } from '../stats/service';

export type RankSort = 'value' | 'percent' | 'max' | 'count';
/** A rankable stat: any voice-time stat, or the daily streak (in days, not ms). */
export type RankStat = TimelineStat | 'daily_streak';

export interface RankEntry {
    rank: number;
    userId: string;
    /** Display name (global name → username → id fallback). Null for the viewer's own out-of-top row. */
    name: string | null;
    /** Full avatar URL, or null (front falls back to initials). */
    avatar: string | null;
    /** Value of the ranked stat (ms) over the selected period, live session folded in. */
    value: number;
    /** The member's connected time (ms) over the same period, so the front can show value as a %. */
    connected: number;
    /** Longest single session (ms) for the stat, all-time. */
    max: number;
    /** Number of sessions for the stat, all-time. */
    count: number;
    isLive: boolean;
    isMe: boolean;
}

export interface GuildRanking {
    stat: RankStat;
    /** Server-wide total for the stat over the period (every member, private included — anonymous). */
    total: number;
    /** Top entries (capped), private members excluded. */
    entries: RankEntry[];
    /** The viewer's own rank, if they are ranked (non-private) — even outside the top. */
    me: RankEntry | null;
}

const TOP_N = 100;

export interface ActiveMember {
    userId: string;
    name: string | null;
    avatar: string | null;
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
}

/**
 * Members currently in a voice channel, with their live-folded stats. Non-private
 * members only (private members are never itemised). Visible to any guild member.
 */
export async function getGuildActiveMembers(guildId: string): Promise<ActiveMember[]> {
    const members = await loadMembers(guildId);
    const active = members.filter((m) => m.isLive && !m.isPrivate);
    const idents = await getUsersByIds(active.map((m) => m.userId));

    return active
        .map((m) => {
            const id = idents.get(m.userId);
            return {
                userId: m.userId,
                name: id?.globalName || id?.username || null,
                avatar: avatarUrl(m.userId, id?.avatar ?? null),
                time_connected: m.model.time_connected,
                time_muted: m.model.time_muted,
                time_deafened: m.model.time_deafened,
                time_screen_sharing: m.model.time_screen_sharing,
                time_camera: m.model.time_camera,
            };
        })
        .sort((a, b) => b.time_connected - a.time_connected);
}

function avatarUrl(userId: string, hash: string | null): string | null {
    if (!hash) return null;
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.png`;
}

/**
 * Per-user value of a stat over a bounded [from, to] day range: the sum of each
 * member's daily rows in range, plus the portion of any ongoing session that falls
 * inside the range. Mirrors the guild timeline aggregation, but keyed per user.
 */
async function rangedValuesByUser(
    guildId: string,
    stat: TimelineStat,
    from?: number,
    to?: number,
): Promise<Map<string, number>> {
    const now = Date.now();
    const [dailyRows, startRows] = await Promise.all([
        getGuildDailyStatsRows(guildId, from, to),
        getGuildStartTimestampsRows(guildId),
    ]);

    const byUser = new Map<string, number>();
    for (const row of dailyRows) {
        const model = DailyStatsModel.fromDailyStats(row);
        const uid = row.user_id ?? '';
        byUser.set(uid, (byUser.get(uid) ?? 0) + model[stat]);
    }

    const startCol = StartTimestampsModel.getColNameFromUserStat(stat);
    const startStatKey: StartStatKey | null = startCol ? StartTimestampsModel.getStatKey(startCol) : null;
    for (const row of startRows) {
        const start = StartTimestampsModel.fromStartTimestamps(row);
        if (!start.isActive()) continue;
        const uid = row.user_id ?? '';
        const liveMap = DailyStatsModel.fromStartTimestamps(start, startStatKey, now);
        for (const [day, model] of liveMap) {
            if (from !== undefined && day < from) continue;
            if (to !== undefined && day > to) continue;
            byUser.set(uid, (byUser.get(uid) ?? 0) + model[stat]);
        }
    }
    return byUser;
}

/**
 * Server leaderboard for a time stat over an optional [from, to] day range (all-time
 * when both are omitted), visible to any member. Private members are counted in the
 * anonymous server total but never itemised (consistent with /rank and the admin view).
 */
export async function getGuildRanking(
    guildId: string,
    stat: RankStat,
    viewerUserId: string,
    from?: number,
    to?: number,
    activeOnly = false,
    sort: RankSort = 'value',
): Promise<GuildRanking> {
    const members = await loadMembers(guildId);
    // Streak is a current-day scalar (in days): no period ranging, no % / count.
    const isStreak = stat === 'daily_streak';
    const ranged = !isStreak && (from !== undefined || to !== undefined);

    // All-time reads the live-folded totals off each member model; a bounded range
    // sums daily rows (+ in-range live) instead.
    const valueByUser: Map<string, number> = isStreak
        ? new Map(members.map((m: MemberEntry) => [m.userId, m.model.daily_streak]))
        : ranged
          ? await rangedValuesByUser(guildId, stat, from, to)
          : new Map(members.map((m: MemberEntry) => [m.userId, m.model[stat]]));

    // Connected time over the same window, to express a value as a % of connected.
    const connectedByUser: Map<string, number> = isStreak
        ? new Map()
        : stat === 'time_connected'
          ? valueByUser
          : ranged
            ? await rangedValuesByUser(guildId, 'time_connected', from, to)
            : new Map(members.map((m: MemberEntry) => [m.userId, m.model.time_connected]));

    // Anonymous total: every member (private included); scoped to active members
    // when the caller asked for the "now" view.
    const total = (activeOnly ? members.filter((m) => m.isLive) : members).reduce(
        (sum, m) => sum + (valueByUser.get(m.userId) ?? 0),
        0,
    );

    // All-time longest-session / session-count columns (best streak / — for streak).
    const suffix = stat.replace('time_', '');
    const maxKey = (isStreak ? 'max_daily_streak' : `max_${suffix}`) as keyof MemberEntry['model'];
    const countKey = (isStreak ? '' : `count_${suffix}`) as keyof MemberEntry['model'];

    const measureOf = (e: { value: number; connected: number; max: number; count: number }): number => {
        switch (sort) {
            case 'percent':
                return e.connected > 0 ? e.value / e.connected : 0;
            case 'max':
                return e.max;
            case 'count':
                return e.count;
            default:
                return e.value;
        }
    };

    // Leaderboard: non-private members with activity in the period (and live, for "now").
    const ranked = members
        .filter((m) => !m.isPrivate && (!activeOnly || m.isLive))
        .map((m) => ({
            userId: m.userId,
            value: valueByUser.get(m.userId) ?? 0,
            connected: connectedByUser.get(m.userId) ?? 0,
            max: (m.model[maxKey] as number) ?? 0,
            count: (m.model[countKey] as number) ?? 0,
            isLive: m.isLive,
        }))
        .filter((e) => measureOf(e) > 0)
        .sort((a, b) => measureOf(b) - measureOf(a));

    const top = ranked.slice(0, TOP_N);
    const idents = await getUsersByIds(top.map((e) => e.userId));

    const entries: RankEntry[] = top.map((e, i) => {
        const id = idents.get(e.userId);
        return {
            rank: i + 1,
            userId: e.userId,
            name: id?.globalName || id?.username || null,
            avatar: avatarUrl(e.userId, id?.avatar ?? null),
            value: e.value,
            connected: e.connected,
            max: e.max,
            count: e.count,
            isLive: e.isLive,
            isMe: e.userId === viewerUserId,
        };
    });

    const meIdx = ranked.findIndex((e) => e.userId === viewerUserId);
    const me: RankEntry | null =
        meIdx >= 0
            ? {
                  rank: meIdx + 1,
                  userId: ranked[meIdx].userId,
                  name: null,
                  avatar: null,
                  value: ranked[meIdx].value,
                  connected: ranked[meIdx].connected,
                  max: ranked[meIdx].max,
                  count: ranked[meIdx].count,
                  isLive: ranked[meIdx].isLive,
                  isMe: true,
              }
            : null;

    return { stat, total, entries, me };
}
