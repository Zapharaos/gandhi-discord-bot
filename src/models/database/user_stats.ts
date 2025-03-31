import {UserStats} from "../../types/db";
import {DatabaseUtils} from "@utils/database";

export enum UserStatsFields {
    DailyStreak = 'daily_streak',
    GuildId = 'guild_id',
    LastActivity = 'last_activity',
    TimeCamera = 'time_camera',
    TimeConnected = 'time_connected',
    TimeDeafened = 'time_deafened',
    TimeMuted = 'time_muted',
    TimeScreenSharing = 'time_screen_sharing',
    MaxCamera = 'max_camera',
    MaxConnected = 'max_connected',
    MaxDailyStreak = 'max_daily_streak',
    MaxDeafened = 'max_deafened',
    MaxMuted = 'max_muted',
    MaxScreenSharing = 'max_screen_sharing',
    TotalJoins = 'total_joins',
    UserId = 'user_id',
}

export const StatTimeRelated = [
    UserStatsFields.TimeConnected,
    UserStatsFields.TimeMuted,
    UserStatsFields.TimeDeafened,
    UserStatsFields.TimeScreenSharing,
    UserStatsFields.TimeCamera
];

export const StatMaxRelated = [
    UserStatsFields.MaxConnected,
    UserStatsFields.MaxMuted,
    UserStatsFields.MaxDeafened,
    UserStatsFields.MaxScreenSharing,
    UserStatsFields.MaxCamera,
    UserStatsFields.MaxDailyStreak
];

export type StatKey =
    UserStatsFields.TimeConnected |
    UserStatsFields.TimeMuted |
    UserStatsFields.TimeDeafened |
    UserStatsFields.TimeScreenSharing |
    UserStatsFields.TimeCamera |
    UserStatsFields.DailyStreak |
    UserStatsFields.MaxConnected |
    UserStatsFields.MaxMuted |
    UserStatsFields.MaxDeafened |
    UserStatsFields.MaxScreenSharing |
    UserStatsFields.MaxCamera |
    UserStatsFields.MaxDailyStreak |
    UserStatsFields.TotalJoins |
    UserStatsFields.LastActivity;

export class UserStatsModel {

    // Database fields
    daily_streak: number;
    guild_id: string | null;
    last_activity: number;
    max_camera: number;
    max_connected: number;
    max_daily_streak: number;
    max_deafened: number;
    max_muted: number;
    max_screen_sharing: number;
    time_camera: number;
    time_connected: number;
    time_deafened: number;
    time_muted: number;
    time_screen_sharing: number;
    total_joins: number;
    user_id: string | null;

    isLive: boolean = false;

    constructor(data: Partial<UserStatsModel> = {}) {
        this.daily_streak = data.daily_streak ?? 0;
        this.guild_id = data.guild_id ?? null;
        this.last_activity = data.last_activity ?? 0;
        this.max_camera = data.max_camera ?? 0;
        this.max_connected = data.max_connected ?? 0;
        this.max_daily_streak = data.daily_streak ?? 0;
        this.max_deafened = data.max_deafened ?? 0;
        this.max_muted = data.max_muted ?? 0;
        this.max_screen_sharing = data.max_screen_sharing ?? 0;
        this.time_camera = data.time_camera ?? 0;
        this.time_connected = data.time_connected ?? 0;
        this.time_deafened = data.time_deafened ?? 0;
        this.time_muted = data.time_muted ?? 0;
        this.time_screen_sharing = data.time_screen_sharing ?? 0;
        this.total_joins = data.total_joins ?? 0;
        this.user_id = data.user_id ?? null;
    }

    static getStatKey(key: string): StatKey {
        return key as StatKey;
    }

    static fromUserStats(stats: Partial<UserStats> = {}): UserStatsModel {
        return new UserStatsModel({
            daily_streak: DatabaseUtils.unwrapGeneratedNumber(stats.daily_streak),
            guild_id: stats.guild_id ?? null,
            last_activity: DatabaseUtils.unwrapGeneratedNumber(stats.last_activity),
            time_camera: DatabaseUtils.unwrapGeneratedNumber(stats.time_camera),
            time_connected: DatabaseUtils.unwrapGeneratedNumber(stats.time_connected),
            time_deafened: DatabaseUtils.unwrapGeneratedNumber(stats.time_deafened),
            time_muted: DatabaseUtils.unwrapGeneratedNumber(stats.time_muted),
            time_screen_sharing: DatabaseUtils.unwrapGeneratedNumber(stats.time_screen_sharing),
            max_camera: DatabaseUtils.unwrapGeneratedNumber(stats.max_camera),
            max_connected: DatabaseUtils.unwrapGeneratedNumber(stats.max_connected),
            max_daily_streak: DatabaseUtils.unwrapGeneratedNumber(stats.max_daily_streak),
            max_deafened: DatabaseUtils.unwrapGeneratedNumber(stats.max_deafened),
            max_muted: DatabaseUtils.unwrapGeneratedNumber(stats.max_muted),
            max_screen_sharing: DatabaseUtils.unwrapGeneratedNumber(stats.max_screen_sharing),
            total_joins: DatabaseUtils.unwrapGeneratedNumber(stats.total_joins),
            user_id: stats.user_id ?? null,
        })
    }
}