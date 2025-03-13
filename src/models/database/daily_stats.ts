export type DailyStats = {
    guild_id: string;
    user_id: string;
    day_timestamp: number;
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
}

type DailyStatsStatKey = keyof Omit<DailyStats, 'guild_id' | 'user_id' | 'day_timestamp'>;

/**
 * Converts a string key to a DailyStatsStatKey.
 *
 * @param {string} key - The key to convert.
 * @returns {DailyStatsStatKey} The converted key.
 */
export function getDailyStatsStatKey(key: string): DailyStatsStatKey {
    return key as DailyStatsStatKey
}