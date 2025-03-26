import {UserStatsModel, StatKey as UserStatsStatKey, UserStatsFields} from "@models/database/user_stats";
import {TimeUtils} from "@utils/time";
import {StartTimestamps} from "../../types/db";
import {DatabaseUtils} from "@utils/database";

export type StatKey =
    StartTsFields.StartConnected |
    StartTsFields.StartMuted |
    StartTsFields.StartDeafened |
    StartTsFields.StartScreenSharing |
    StartTsFields.StartCamera;

export enum StartTsFields {
    GuildId = 'guild_id',
    StartCamera = 'start_camera',
    StartConnected = 'start_connected',
    StartDeafened = 'start_deafened',
    StartMuted = 'start_muted',
    StartScreenSharing = 'start_screen_sharing',
    UserId = 'user_id',
}

export class StartTimestampsModel {

    // Database fields
    guild_id: string | null;
    start_camera: number;
    start_connected: number;
    start_deafened: number;
    start_muted: number;
    start_screen_sharing: number;
    user_id: string | null;

    constructor(data: Partial<StartTimestampsModel> = {}) {
        this.guild_id = data.guild_id ?? null;
        this.start_camera = data.start_camera ?? 0;
        this.start_connected = data.start_connected ?? 0;
        this.start_deafened = data.start_deafened ?? 0;
        this.start_muted = data.start_muted ?? 0;
        this.start_screen_sharing = data.start_screen_sharing ?? 0;
        this.user_id = data.user_id ?? null;
    }

    static getColNameFromUserStat(name: string): string | null {
        switch (name) {
            case UserStatsFields.TimeConnected:
                return StartTsFields.StartConnected;
            case UserStatsFields.TimeMuted:
                return StartTsFields.StartMuted;
            case UserStatsFields.TimeDeafened:
                return StartTsFields.StartDeafened;
            case UserStatsFields.TimeScreenSharing:
                return StartTsFields.StartScreenSharing;
            case UserStatsFields.TimeCamera:
                return StartTsFields.StartCamera;
            default:
                return null;
        }
    }

    static getStatKey(key: string): StatKey {
        return key as StatKey;
    }

    static fromStartTimestamps(stats: Partial<StartTimestamps> = {}): StartTimestampsModel {
        return new StartTimestampsModel({
            guild_id: stats.guild_id ?? null,
            start_camera: DatabaseUtils.unwrapGeneratedNumber(stats.start_camera),
            start_connected: DatabaseUtils.unwrapGeneratedNumber(stats.start_connected),
            start_deafened: DatabaseUtils.unwrapGeneratedNumber(stats.start_deafened),
            start_muted: DatabaseUtils.unwrapGeneratedNumber(stats.start_muted),
            start_screen_sharing: DatabaseUtils.unwrapGeneratedNumber(stats.start_screen_sharing),
            user_id: stats.user_id ?? null,
        })
    }

    public isActive(): boolean {
        return this.start_connected !== 0;
    }

    public combineWithUserStats(userStats: UserStatsModel, userStatKey: UserStatsStatKey, statKey: StatKey | null, now: number): void {
        // No stat key to use
        if (!statKey) return;

        // User is not active yet -> no live stats to use
        if (!this.isActive()) return;

        // Retrieve the start timestamp
        const start = this[statKey];
        if (start && start !== 0) {
            // Calculate live duration
            const duration = TimeUtils.getDuration(start, now);
            userStats[userStatKey] += duration;
        }

        // If required, calculate the live duration for time_connected (used for percentage calculation)
        if (userStatKey !== UserStatsFields.TimeConnected) {
            const liveDurationConnected = TimeUtils.getDuration(this.start_connected, now);
            userStats.time_connected += liveDurationConnected;
        }
    }

    public combineAllWithUserStats(userStats: UserStatsModel, now: number): UserStatsModel {
        // User is not active yet -> no live stats to use
        if (!this || !this.isActive()) return userStats;

        if (this.start_connected && this.start_connected > 0) {
            userStats.time_connected += TimeUtils.getDuration(this.start_connected, now);
        }
        if (this.start_muted && this.start_muted > 0) {
            userStats.time_muted += TimeUtils.getDuration(this.start_muted, now);
        }
        if (this.start_deafened && this.start_deafened > 0) {
            userStats.time_deafened += TimeUtils.getDuration(this.start_deafened, now);
        }
        if (this.start_screen_sharing && this.start_screen_sharing > 0) {
            userStats.time_screen_sharing += TimeUtils.getDuration(this.start_screen_sharing, now);
        }
        if (this.start_camera && this.start_camera > 0) {
            userStats.time_camera += TimeUtils.getDuration(this.start_camera, now);
        }

        return userStats;
    }
}