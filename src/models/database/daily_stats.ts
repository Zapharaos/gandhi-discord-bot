import {StartTimestamps, StartTsFields, StatKey as StartStatKey} from "@models/database/start_timestamps";
import {TimeUtils} from "@utils/time";

export type StatKey =
    DailyStatsFields.DayTimestamp |
    DailyStatsFields.TimeConnected |
    DailyStatsFields.TimeMuted |
    DailyStatsFields.TimeDeafened |
    DailyStatsFields.TimeScreenSharing |
    DailyStatsFields.TimeCamera;

export enum DailyStatsFields {
    DayTimestamp = 'day_timestamp',
    TimeConnected = 'time_connected',
    TimeMuted = 'time_muted',
    TimeDeafened = 'time_deafened',
    TimeScreenSharing = 'time_screen_sharing',
    TimeCamera = 'time_camera',
}

export type DailyStatsMap = Map<number, DailyStats>;

export class DailyStats {
    public guild_id: string;
    public user_id: string;
    public day_timestamp: number;
    public time_connected: number;
    public time_muted: number;
    public time_deafened: number;
    public time_screen_sharing: number;
    public time_camera: number;

    constructor(data: Partial<DailyStats> = {}) {
        this.guild_id = data.guild_id || '';
        this.user_id = data.user_id || '';
        this.day_timestamp = data.day_timestamp || 0;
        this.time_connected = data.time_connected || 0;
        this.time_muted = data.time_muted || 0;
        this.time_deafened = data.time_deafened || 0;
        this.time_screen_sharing = data.time_screen_sharing || 0;
        this.time_camera = data.time_camera || 0;
    }

    static getColNameFromStartTs(name: string): string | null {
        switch (name) {
            case StartTsFields.StartConnected:
                return DailyStatsFields.TimeConnected;
            case StartTsFields.StartMuted:
                return DailyStatsFields.TimeMuted;
            case StartTsFields.StartDeafened:
                return DailyStatsFields.TimeDeafened;
            case StartTsFields.StartScreenSharing:
                return DailyStatsFields.TimeScreenSharing;
            case StartTsFields.StartCamera:
                return DailyStatsFields.TimeCamera;
            default:
                return null;
        }
    }

    static getStatKey(key: string): StatKey {
        return key as StatKey;
    }

    static fromStartTimestamps(startTs: StartTimestamps, startStatKey: StartStatKey | null, now: number): DailyStatsMap {
        const dailyStats: DailyStatsMap = new Map();

        // If the user is not active, return an empty map
        if (!startTs.isActive()) return dailyStats;

        // If the stat key is null, return an empty map
        if (!startStatKey) return dailyStats;

        const stat: string | null = this.getColNameFromStartTs(startStatKey);
        const statKey: StatKey | null = stat ? this.getStatKey(stat) : null;

        // If the stat key is null, return an empty map
        if (!statKey) return dailyStats;

        // Duration to split (durationConnected is only used if statKey is not related to time_connected)
        const statDuration = TimeUtils.getDuration(startTs[startStatKey], now);
        const statDurationConnected = TimeUtils.getDuration(startTs.start_connected, now);

        // Remaining to split
        let remainingDuration = statDuration;
        let remainingDurationConnected = statDurationConnected;

        // Processed day limits
        let dayMax = now;
        let dayMin = new Date(now).setUTCHours(0, 0, 0, 0);

        // Split the duration into days
        while (remainingDuration > 0) {
            // Calculate the duration for the current day
            const duration = Math.min(remainingDuration, dayMax - dayMin);
            const durationConnected = Math.min(remainingDurationConnected, dayMax - dayMin);

            // Create day object and add it to the map
            const date = dayMin;
            const obj = new DailyStats({
                guild_id: "",
                user_id: "",
                day_timestamp: date,
                time_connected: durationConnected,
                time_muted: 0,
                time_deafened: 0,
                time_screen_sharing: 0,
                time_camera: 0
            })
            obj[statKey] = duration;
            dailyStats.set(date, obj);

            // Update the remaining durations to split
            remainingDuration -= duration;
            remainingDurationConnected -= durationConnected;

            // Update the processed day limits
            dayMax = dayMin;
            dayMin = new Date(dayMin).setUTCHours(-24, 0, 0, 0); // Start of previous day
        }

        // If the stat is not time_connected, remainingDurationConnected could initially be greater than remainingDuration
        // Meaning, the user was connected to a voice channel for a longer duration than the stat duration itself
        // In this case, we need to split the remaining connected duration into days
        while(remainingDurationConnected > 0) {
            // Calculate the duration for the current day
            const durationConnected = Math.min(remainingDurationConnected, dayMax - dayMin);

            // Create day object and add it to the map
            const date = dayMin;
            const obj = new DailyStats({
                guild_id: "",
                user_id: "",
                day_timestamp: date,
                time_connected: durationConnected,
                time_muted: 0,
                time_deafened: 0,
                time_screen_sharing: 0,
                time_camera: 0
            })
            dailyStats.set(date, obj);

            // Update the remaining durations to split
            remainingDurationConnected -= durationConnected;

            // Update the processed day limits
            dayMax = dayMin;
            dayMin = new Date(dayMin).setUTCHours(-24, 0, 0, 0); // Start of previous day
        }

        return dailyStats;
    }

    static mergeDailyStatsMaps(main: DailyStatsMap, secondary: DailyStatsMap): DailyStatsMap {
        const merged = new Map(main);
        secondary.forEach((value, key) => {
            const existing = merged.get(key);
            if(existing) {
                existing.time_connected += value.time_connected;
                existing.time_muted += value.time_muted;
                existing.time_deafened += value.time_deafened;
                existing.time_screen_sharing += value.time_screen_sharing;
                existing.time_camera += value.time_camera;
            } else {
                merged.set(key, value);
            }
        });
        return merged;
    }
}