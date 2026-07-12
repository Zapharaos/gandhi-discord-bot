import type { UserStats, StartTimestamps } from '@gandhi/core/types/db';
import { UserStatsModel } from '@gandhi/core/models/database/user_stats';
import {
    StartTimestampsModel,
    type StatKey as StartStatKey,
} from '@gandhi/core/models/database/start_timestamps';
import { DailyStatsModel } from '@gandhi/core/models/database/daily_stats';
import {
    getGuildDailyStatsRows,
    getGuildStartTimestampsRows,
    getGuildUserStatsRows,
} from '../stats/queries';
import type { TimelineStat, TimelinePoint } from '../stats/service';

const TOP_MEMBERS = 10;

export interface MemberEntry {
    userId: string;
    isPrivate: boolean;
    isLive: boolean;
    model: UserStatsModel;
}

// Build a per-member live model, carrying the private flag and current-session
// state so the caller can apply the privacy policy: private members are counted
// in server-wide totals but never itemised in the per-member list.
async function loadMembers(guildId: string): Promise<MemberEntry[]> {
    const now = Date.now();
    const [userRows, startRows] = await Promise.all([
        getGuildUserStatsRows(guildId),
        getGuildStartTimestampsRows(guildId),
    ]);
    const startByUser = new Map<string | null, StartTimestamps>(startRows.map((r) => [r.user_id, r]));

    return userRows.map((row: UserStats) => {
        const model = UserStatsModel.fromUserStats(row);
        let isLive = false;
        const startRow = startByUser.get(row.user_id);
        if (startRow) {
            const start = StartTimestampsModel.fromStartTimestamps(startRow);
            if (start.isActive()) {
                start.combineAllWithUserStats(model, now);
                isLive = true;
            }
        }
        return {
            userId: row.user_id ?? '',
            isPrivate: (row.private as unknown as number | null) === 1,
            isLive,
            model,
        };
    });
}

export interface GuildMemberStats {
    userId: string;
    isLive: boolean;
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
    daily_streak: number;
}

function toMemberStats(m: MemberEntry): GuildMemberStats {
    return {
        userId: m.userId,
        isLive: m.isLive,
        time_connected: m.model.time_connected,
        time_muted: m.model.time_muted,
        time_deafened: m.model.time_deafened,
        time_screen_sharing: m.model.time_screen_sharing,
        time_camera: m.model.time_camera,
        daily_streak: m.model.daily_streak,
    };
}

export interface GuildOverview {
    memberCount: number;
    activeCount: number;
    /** Members hidden from the per-member list because they enabled private mode. */
    hiddenCount: number;
    totals: {
        time_connected: number;
        time_muted: number;
        time_deafened: number;
        time_screen_sharing: number;
        time_camera: number;
    };
    topMembers: GuildMemberStats[];
}

// Pure privacy policy, separated from the DB read so it can be unit-tested:
// totals count every member; the leaderboard and per-member list only ever name
// non-private members; hiddenCount reports how many were withheld.
export function buildOverview(members: MemberEntry[]): GuildOverview {
    // Totals include EVERY member (private included) — the aggregate is anonymous.
    const totals = { time_connected: 0, time_muted: 0, time_deafened: 0, time_screen_sharing: 0, time_camera: 0 };
    for (const m of members) {
        totals.time_connected += m.model.time_connected;
        totals.time_muted += m.model.time_muted;
        totals.time_deafened += m.model.time_deafened;
        totals.time_screen_sharing += m.model.time_screen_sharing;
        totals.time_camera += m.model.time_camera;
    }

    // The leaderboard only ever names non-private members.
    const topMembers = members
        .filter((m) => !m.isPrivate)
        .sort((a, b) => b.model.time_connected - a.model.time_connected)
        .slice(0, TOP_MEMBERS)
        .map(toMemberStats);

    return {
        memberCount: members.length,
        activeCount: members.filter((m) => m.isLive).length,
        hiddenCount: members.filter((m) => m.isPrivate).length,
        totals,
        topMembers,
    };
}

export async function getGuildOverview(guildId: string): Promise<GuildOverview> {
    return buildOverview(await loadMembers(guildId));
}

export interface GuildMembersResult {
    members: GuildMemberStats[];
    /** Count of private members omitted from `members` (still in overview totals). */
    hiddenCount: number;
}

export function buildMembersResult(members: MemberEntry[]): GuildMembersResult {
    return {
        members: members
            .filter((m) => !m.isPrivate)
            .sort((a, b) => b.model.time_connected - a.model.time_connected)
            .map(toMemberStats),
        hiddenCount: members.filter((m) => m.isPrivate).length,
    };
}

export async function getGuildMembers(guildId: string): Promise<GuildMembersResult> {
    return buildMembersResult(await loadMembers(guildId));
}

/**
 * Server-wide daily timeline for the heatmap: the sum of every member's daily
 * stats for the selected stat, plus ongoing sessions. Private members are
 * included — the series is an anonymous aggregate and never identifies anyone.
 */
export async function getGuildTimeline(
    guildId: string,
    stat: TimelineStat,
    from?: number,
    to?: number,
): Promise<TimelinePoint[]> {
    const now = Date.now();
    const [dailyRows, startRows] = await Promise.all([
        getGuildDailyStatsRows(guildId, from, to),
        getGuildStartTimestampsRows(guildId),
    ]);

    const perDay = new Map<number, number>();
    for (const row of dailyRows) {
        const model = DailyStatsModel.fromDailyStats(row);
        perDay.set(model.day_timestamp, (perDay.get(model.day_timestamp) ?? 0) + model[stat]);
    }

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

    return [...perDay.entries()].map(([day, value]) => ({ day, value })).sort((a, b) => a.day - b.day);
}
