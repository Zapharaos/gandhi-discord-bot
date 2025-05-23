import {UserStats} from "../../types/db";
import {DatabaseUtils} from "@utils/database";
import {NumberUtils} from "@utils/number";
import {TimeUtils} from "@utils/time";

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
    CountCamera = 'count_camera',
    CountConnected = 'count_connected',
    CountDeafened = 'count_deafened',
    CountMuted = 'count_muted',
    CountScreenSharing = 'count_screen_sharing',
    CountSwitch = 'count_switch',
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

export const StatCountRelated = [
    UserStatsFields.CountConnected,
    UserStatsFields.CountMuted,
    UserStatsFields.CountDeafened,
    UserStatsFields.CountScreenSharing,
    UserStatsFields.CountCamera,
    UserStatsFields.CountSwitch
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
    UserStatsFields.CountConnected |
    UserStatsFields.CountMuted |
    UserStatsFields.CountDeafened |
    UserStatsFields.CountScreenSharing |
    UserStatsFields.CountCamera |
    UserStatsFields.CountSwitch |
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
    count_camera: number;
    count_connected: number;
    count_deafened: number;
    count_muted: number;
    count_screen_sharing: number;
    count_switch: number;
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
        this.count_camera = data.count_camera ?? 0;
        this.count_connected = data.count_connected ?? 0;
        this.count_deafened = data.count_deafened ?? 0;
        this.count_muted = data.count_muted ?? 0;
        this.count_screen_sharing = data.count_screen_sharing ?? 0;
        this.count_switch = data.count_switch ?? 0;
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
            count_camera: DatabaseUtils.unwrapGeneratedNumber(stats.count_camera),
            count_connected: DatabaseUtils.unwrapGeneratedNumber(stats.count_connected),
            count_deafened: DatabaseUtils.unwrapGeneratedNumber(stats.count_deafened),
            count_muted: DatabaseUtils.unwrapGeneratedNumber(stats.count_muted),
            count_screen_sharing: DatabaseUtils.unwrapGeneratedNumber(stats.count_screen_sharing),
            count_switch: DatabaseUtils.unwrapGeneratedNumber(stats.count_switch),
            user_id: stats.user_id ?? null,
        })
    }

    formatStatAsDuration(key: StatKey): string | null{
        switch (key) {
            case UserStatsFields.TimeMuted:
            case UserStatsFields.MaxMuted:
            case UserStatsFields.TimeDeafened:
            case UserStatsFields.MaxDeafened:
            case UserStatsFields.TimeScreenSharing:
            case UserStatsFields.MaxScreenSharing:
            case UserStatsFields.TimeCamera:
            case UserStatsFields.MaxCamera:
            case UserStatsFields.TimeConnected:
            case UserStatsFields.MaxConnected:
                return TimeUtils.formatDuration(this[key]);
            default:
                break;
        }
        return null;
    }

    formatStatAsPercentage(key: StatKey): string | null {
        const value = this[key];

        switch (key) {
            case UserStatsFields.TimeMuted:
            case UserStatsFields.TimeDeafened:
            case UserStatsFields.TimeScreenSharing:
            case UserStatsFields.TimeCamera:
                if (value === 0) {
                    return null;
                }
                return NumberUtils.getPercentageString(value, this.time_connected);
            default:
                break;
        }
        return null
    }

    formatStatAsDate(key: StatKey): string | null {
        switch (key) {
            case UserStatsFields.LastActivity:
                return TimeUtils.formatDate(new Date(this.last_activity));
            default:
                break;
        }
        return null;
    }

    formatStatAsString(key: StatKey): string {
        return this[key].toString();
    }
}