import {StartTimestampsModel, StartTsFields, StatKey as StartStatKey} from "@models/database/start_timestamps";
import {TimeUtils} from "@utils/time";
import { DailyStats } from "../../types/db";
import {DatabaseUtils} from "@utils/database";

export type StatKey =
    DailyStatsFields.DayTimestamp |
    DailyStatsFields.TimeConnected |
    DailyStatsFields.TimeMuted |
    DailyStatsFields.TimeDeafened |
    DailyStatsFields.TimeScreenSharing |
    DailyStatsFields.TimeCamera;

export enum DailyStatsFields {
    DayTimestamp = 'day_timestamp',
    GuildId = 'guild_id',
    TimeCamera = 'time_camera',
    TimeConnected = 'time_connected',
    TimeDeafened = 'time_deafened',
    TimeMuted = 'time_muted',
    TimeScreenSharing = 'time_screen_sharing',
    UserId = 'user_id',
}

export type DailyStatsMap = Map<number, DailyStatsModel>;

export class DailyStatsModel {

    // Database fields
    day_timestamp: number;
    guild_id: string | null;
    time_camera: number;
    time_connected: number;
    time_deafened: number;
    time_muted: number;
    time_screen_sharing: number;
    user_id: string | null;

    constructor(stats: Partial<DailyStatsModel> = {}) {
        this.day_timestamp = stats.day_timestamp ?? 0
        this.guild_id = stats.guild_id ?? null
        this.time_camera = stats.time_camera ?? 0
        this.time_connected = stats.time_connected ?? 0
        this.time_deafened = stats.time_deafened ?? 0
        this.time_muted = stats.time_muted ?? 0
        this.time_screen_sharing = stats.time_screen_sharing ?? 0
        this.user_id = stats.user_id ?? null
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

    static fromDailyStats(stats: Partial<DailyStats> = {}): DailyStatsModel {
        return new DailyStatsModel({
            day_timestamp: DatabaseUtils.unwrapGeneratedNumber(stats.time_camera),
            guild_id: stats.guild_id ?? null,
            time_camera: DatabaseUtils.unwrapGeneratedNumber(stats.time_camera),
            time_connected: DatabaseUtils.unwrapGeneratedNumber(stats.time_connected),
            time_deafened: DatabaseUtils.unwrapGeneratedNumber(stats.time_deafened),
            time_muted: DatabaseUtils.unwrapGeneratedNumber(stats.time_muted),
            time_screen_sharing: DatabaseUtils.unwrapGeneratedNumber(stats.time_screen_sharing),
            user_id: stats.user_id ?? null,
        })
    }

    static fromStartTimestamps(startTs: StartTimestampsModel, startStatKey: StartStatKey | null, now: number): DailyStatsMap {
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
            const obj = new DailyStatsModel({
                day_timestamp: date,
                time_connected: durationConnected,
            });
            obj[statKey] = duration;
            dailyStats.set(date,obj);

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
            const obj = new DailyStatsModel({
                day_timestamp: date,
                time_connected: durationConnected,
            });
            dailyStats.set(date,obj);

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