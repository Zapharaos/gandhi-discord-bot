import {StartTimestamps, StatKey as StartStatKey} from "@models/database/start_timestamps";
import {TimeUtils} from "@utils/time";

export type StatKey =
    'day_timestamp' |
    'time_connected' |
    'time_muted' |
    'time_deafened' |
    'time_screen_sharing' |
    'time_camera';

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

    constructor(data: DailyStats) {
        this.guild_id = data.guild_id;
        this.user_id = data.user_id;
        this.day_timestamp = data.day_timestamp;
        this.time_connected = data.time_connected;
        this.time_muted = data.time_muted;
        this.time_deafened = data.time_deafened;
        this.time_screen_sharing = data.time_screen_sharing;
        this.time_camera = data.time_camera;
    }

    static getStatKey(key: string): StatKey {
        return key as StatKey;
    }

    static fromStartTimestamps(startTs: StartTimestamps, startStatKey: StartStatKey, now: number): DailyStatsMap {
        const dailyStats: DailyStatsMap = new Map();
        const statKey = this.getStatKey(startStatKey.replace('start_', 'time_'))

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

    static mergeDailyStatsMap(main: DailyStatsMap, secondary: DailyStatsMap): DailyStatsMap {
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