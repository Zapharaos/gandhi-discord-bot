export type UserStats = {
    guild_id: string;
    user_id: string;
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
    daily_streak: number;
    total_joins: number;
    last_activity: number;
}

type UserStatsStatKey = keyof Omit<UserStats, 'guild_id' | 'user_id'>;

/**
 * Converts a string key to a UserStatsStatKey.
 *
 * @param {string} key - The key to convert.
 * @returns {UserStatsStatKey} The converted key.
 */
export function getUserStatsStatKey(key: string): UserStatsStatKey {
    return key as UserStatsStatKey
}