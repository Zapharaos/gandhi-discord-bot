import fs from 'node:fs';
import path from 'node:path';
import { DailyStatsModel } from '@gandhi/core/models/database/daily_stats';
import {
    StartTimestampsModel,
    type StatKey as StartStatKey,
} from '@gandhi/core/models/database/start_timestamps';
import { loadConfig } from '../config';
import { getBotStatusRow } from '../stats/queries';
import type { TimelinePoint, TimelineStat } from '../stats/service';
import { computeBotHealth, type BotHealth } from '../status/service';
import { hub } from '../ws/hub';
import {
    getAllServersMeta,
    getAllStartTimestampsRows,
    getDailyActivityCounts,
    getDailyStatsRowCount,
    getGlobalDailyAgg,
    getGlobalTotals,
    getGuildActivityRows,
    getGuildRecentConnected,
    getJoinLeaveCounts,
    getLiveCounts,
    getMembershipCounts,
    getPeakCounts,
    getRetentionCounts,
    getServerCounts,
    getUserActivityCounts,
    getUserFirstDays,
    type GlobalTotals,
    type GuildActivityRow,
    type LiveCounts,
    type ServerMetaRow,
} from './queries';

const DAY_MS = 24 * 60 * 60 * 1000;
const GROWTH_MONTHS = 12;

export interface BotAdminOverview {
    servers: {
        /** Guilds ever seen. */
        total: number;
        /** Guilds the bot is in right now. */
        present: number;
        /** Guilds the bot has left. */
        left: number;
        statsEnabled: number;
        logsEnabled: number;
        /** Present guilds with no member activity in the last 30/90 days. */
        inactive30d: number;
        inactive90d: number;
        /** Joined/departed in the last 30 days (0 until bot migration 17 has run). */
        gained30d: number;
        lost30d: number;
        /** Average members per present guild (0 when no guilds). */
        avgMembers: number;
        /** Guild count Discord reported at the last heartbeat (compare to `present`). */
        discordGuildCount: number;
    };
    users: {
        distinct: number;
        memberships: number;
        private: {
            memberships: number;
            users: number;
            /** privateMemberships / memberships, in [0, 100]. */
            percent: number;
            /** Average private members per present guild. */
            avgPerServer: number;
        };
        statsOptedOut: number;
        logsOptedOut: number;
        active30d: number;
        active90d: number;
        inactive30d: number;
        inactive90d: number;
    };
    totals: GlobalTotals & {
        /** time_connected / memberships (ms). */
        avgConnectedPerMembership: number;
        /** time_connected / distinct users (ms). */
        avgConnectedPerUser: number;
        /** time_connected / present guilds (ms). */
        avgConnectedPerServer: number;
    };
    live: LiveCounts & {
        /** Peak concurrent sessions today / all-time (0 until bot migration 18 has run). */
        peakToday: number;
        peakAllTime: number;
        peakAllTimeDay: number | null;
    };
    activity: {
        /** Distinct users with tracked activity over the last 1/7/30 days. */
        day: number;
        week: number;
        month: number;
        /** Earliest tracked day (epoch ms), or null when no data yet. */
        firstDay: number | null;
    };
    growth: {
        /** Last 12 calendar months (UTC), oldest first. */
        months: GrowthMonth[];
        retention: {
            /** Distinct users active in the previous 30-day window. */
            previousActive: number;
            /** Of those, how many are still active in the last 30 days. */
            retained: number;
            /** retained / previousActive, in [0, 100]; 0 when no previous cohort. */
            percent: number;
        };
    };
    tech: {
        /** SQLite file size in bytes (main db + WAL), or null if unreadable. */
        dbSizeBytes: number | null;
        dailyStatsRows: number;
        /** Live browser WebSocket connections held by this web instance. */
        wsConnections: number;
    };
    bot: BotHealth;
    generatedAt: number;
}

export interface GrowthMonth {
    /** UTC month start (epoch ms). */
    month: number;
    /** Users whose first tracked activity falls in this month. */
    newUsers: number;
    /** Distinct users ever tracked up to the end of this month. */
    cumulative: number;
}

// Bucket each user's first tracked day into the last GROWTH_MONTHS calendar
// months. Users who appeared before the window only feed the cumulative counts.
export function buildGrowthMonths(firstDays: number[], now: number): GrowthMonth[] {
    const d = new Date(now);
    const months: GrowthMonth[] = [];
    for (let i = GROWTH_MONTHS - 1; i >= 0; i--) {
        months.push({ month: Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1), newUsers: 0, cumulative: 0 });
    }
    const windowStart = months[0].month;
    let before = 0;
    for (const first of firstDays) {
        if (first < windowStart) {
            before++;
            continue;
        }
        const fd = new Date(first);
        const bucket = Date.UTC(fd.getUTCFullYear(), fd.getUTCMonth(), 1);
        const entry = months.find((m) => m.month === bucket);
        if (entry) entry.newUsers++;
    }
    let running = before;
    for (const m of months) {
        running += m.newUsers;
        m.cumulative = running;
    }
    return months;
}

/** Size of the SQLite database on disk (main file + WAL), or null if unreadable. */
function getDbFileSize(): number | null {
    try {
        const file = path.join(process.cwd(), loadConfig().databaseFile);
        let size = fs.statSync(file).size;
        try {
            size += fs.statSync(`${file}-wal`).size;
        } catch {
            // No WAL file — fine.
        }
        return size;
    } catch {
        return null;
    }
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

/** Count present guilds whose latest member activity is older than the cutoff. */
function countInactiveGuilds(
    servers: ServerMetaRow[],
    activityByGuild: Map<string, GuildActivityRow>,
    cutoff: number,
): number {
    return servers.filter((s) => s.botPresent && (activityByGuild.get(s.guildId)?.lastActivity ?? 0) < cutoff).length;
}

export async function getBotAdminOverview(): Promise<BotAdminOverview> {
    const now = Date.now();
    const [
        serverCounts,
        memberships,
        totals,
        userActivity,
        guildActivity,
        live,
        daily,
        servers,
        statusRow,
        firstDays,
        retention,
        dailyStatsRows,
        joinLeave,
        peaks,
    ] = await Promise.all([
        getServerCounts(),
        getMembershipCounts(),
        getGlobalTotals(),
        getUserActivityCounts(now),
        getGuildActivityRows(),
        getLiveCounts(),
        getDailyActivityCounts(now),
        getAllServersMeta(),
        getBotStatusRow(),
        getUserFirstDays(),
        getRetentionCounts(now),
        getDailyStatsRowCount(),
        getJoinLeaveCounts(now),
        getPeakCounts(now),
    ]);

    const activityByGuild = new Map(guildActivity.map((g) => [g.guildId, g]));
    const bot = computeBotHealth(statusRow, now);
    const present = serverCounts.present;

    return {
        servers: {
            total: serverCounts.total,
            present,
            left: serverCounts.total - present,
            statsEnabled: serverCounts.statsEnabled,
            logsEnabled: serverCounts.logsEnabled,
            inactive30d: countInactiveGuilds(servers, activityByGuild, now - 30 * DAY_MS),
            inactive90d: countInactiveGuilds(servers, activityByGuild, now - 90 * DAY_MS),
            gained30d: joinLeave.gained30d,
            lost30d: joinLeave.lost30d,
            avgMembers: present > 0 ? round1(memberships.memberships / present) : 0,
            discordGuildCount: bot.guildCount,
        },
        users: {
            distinct: memberships.distinctUsers,
            memberships: memberships.memberships,
            private: {
                memberships: memberships.privateMemberships,
                users: memberships.privateUsers,
                percent:
                    memberships.memberships > 0
                        ? round1((memberships.privateMemberships / memberships.memberships) * 100)
                        : 0,
                avgPerServer: present > 0 ? round1(memberships.privateMemberships / present) : 0,
            },
            statsOptedOut: memberships.statsOptedOut,
            logsOptedOut: memberships.logsOptedOut,
            active30d: userActivity.activeUsers30d,
            active90d: userActivity.activeUsers90d,
            inactive30d: memberships.distinctUsers - userActivity.activeUsers30d,
            inactive90d: memberships.distinctUsers - userActivity.activeUsers90d,
        },
        totals: {
            ...totals,
            avgConnectedPerMembership:
                memberships.memberships > 0 ? Math.round(totals.time_connected / memberships.memberships) : 0,
            avgConnectedPerUser:
                memberships.distinctUsers > 0 ? Math.round(totals.time_connected / memberships.distinctUsers) : 0,
            avgConnectedPerServer: present > 0 ? Math.round(totals.time_connected / present) : 0,
        },
        live: {
            ...live,
            peakToday: peaks.today,
            peakAllTime: peaks.allTime,
            peakAllTimeDay: peaks.allTimeDay,
        },
        activity: {
            day: daily.day,
            week: daily.week,
            month: daily.month,
            firstDay: daily.firstDay,
        },
        growth: {
            months: buildGrowthMonths(firstDays, now),
            retention: {
                previousActive: retention.previousActive,
                retained: retention.retained,
                percent:
                    retention.previousActive > 0
                        ? round1((retention.retained / retention.previousActive) * 100)
                        : 0,
            },
        },
        tech: {
            dbSizeBytes: getDbFileSize(),
            dailyStatsRows,
            wsConnections: hub.connectionCount,
        },
        bot,
        generatedAt: now,
    };
}

/**
 * Global daily timeline: the sum of every guild's daily stats for the selected
 * stat, plus ongoing sessions — the whole-bot version of the per-guild admin
 * timeline. Anonymous aggregate; never identifies anyone.
 */
export async function getBotAdminTimeline(
    stat: TimelineStat,
    from?: number,
    to?: number,
): Promise<TimelinePoint[]> {
    const now = Date.now();
    const [dailyRows, startRows] = await Promise.all([getGlobalDailyAgg(stat, from, to), getAllStartTimestampsRows()]);

    const perDay = new Map<number, number>(dailyRows.map((r) => [r.day, r.value]));

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

export interface BotAdminGuildEntry {
    guildId: string;
    name: string | null;
    icon: string | null;
    botPresent: boolean;
    statsEnabled: boolean;
    logsEnabled: boolean;
    members: number;
    privateMembers: number;
    /** Most recent member activity (epoch ms), 0 when never. */
    lastActivity: number;
    /** Summed connected time across every member (ms), all-time. */
    timeConnected: number;
    /** Summed connected time over the last 30 days (ms) — dead vs alive signal. */
    timeConnected30d: number;
}

/**
 * One row per guild ever seen (union of `servers` and guilds that only exist in
 * user_stats), sorted by member count. Aggregates only — no per-user data.
 */
export async function getBotAdminGuilds(): Promise<BotAdminGuildEntry[]> {
    const [servers, guildActivity, recentConnected] = await Promise.all([
        getAllServersMeta(),
        getGuildActivityRows(),
        getGuildRecentConnected(Date.now()),
    ]);

    const entries = new Map<string, BotAdminGuildEntry>();
    for (const s of servers) {
        entries.set(s.guildId, {
            ...s,
            members: 0,
            privateMembers: 0,
            lastActivity: 0,
            timeConnected: 0,
            timeConnected30d: recentConnected.get(s.guildId) ?? 0,
        });
    }
    for (const g of guildActivity) {
        const entry = entries.get(g.guildId);
        if (entry) {
            entry.members = g.members;
            entry.privateMembers = g.privateMembers;
            entry.lastActivity = g.lastActivity;
            entry.timeConnected = g.timeConnected;
        } else {
            // Stats rows can outlive the server row (or predate it) — still list them.
            entries.set(g.guildId, {
                guildId: g.guildId,
                name: null,
                icon: null,
                botPresent: false,
                statsEnabled: true,
                logsEnabled: true,
                members: g.members,
                privateMembers: g.privateMembers,
                lastActivity: g.lastActivity,
                timeConnected: g.timeConnected,
                timeConnected30d: recentConnected.get(g.guildId) ?? 0,
            });
        }
    }

    return [...entries.values()].sort((a, b) => b.members - a.members || b.timeConnected - a.timeConnected);
}
