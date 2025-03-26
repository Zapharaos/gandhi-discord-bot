import {UserStats, StatKey as UserStatsStatKey, UserStatsFields} from "@models/database/user_stats";
import {TimeUtils} from "@utils/time";

export type StatKey =
    StartTsFields.StartConnected |
    StartTsFields.StartMuted |
    StartTsFields.StartDeafened |
    StartTsFields.StartScreenSharing |
    StartTsFields.StartCamera;

export enum StartTsFields {
    StartConnected = 'start_connected',
    StartMuted = 'start_muted',
    StartDeafened = 'start_deafened',
    StartScreenSharing = 'start_screen_sharing',
    StartCamera = 'start_camera'
}

export class StartTimestamps {
    public guild_id: string;
    public user_id: string;
    public start_connected: number;
    public start_muted: number;
    public start_deafened: number;
    public start_screen_sharing: number;
    public start_camera: number;

    constructor(data: StartTimestamps) {
        this.guild_id = data.guild_id;
        this.user_id = data.user_id;
        this.start_connected = data.start_connected;
        this.start_muted = data.start_muted;
        this.start_deafened = data.start_deafened;
        this.start_screen_sharing = data.start_screen_sharing;
        this.start_camera = data.start_camera;
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

    public isActive(): boolean {
        return this.start_connected !== 0;
    }

    public combineWithUserStats(userStats: UserStats, userStatKey: UserStatsStatKey, statKey: StatKey | null, now: number): void {
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

    public combineAllWithUserStats(userStats: UserStats, now: number): UserStats {
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