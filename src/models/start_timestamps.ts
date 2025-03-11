export type StartTimestamps = {
    guild_id: string;
    user_id: string;
    start_connected: number;
    start_muted: number;
    start_deafened: number;
    start_screen_sharing: number;
    start_camera: number;
}

type StartTsStatKey = keyof Omit<StartTimestamps, 'guild_id' | 'user_id'>;

/**
 * Converts a string key to a StartTsStatKey.
 *
 * @param {string} key - The key to convert.
 * @returns {StartTsStatKey} The converted key.
 */
export function getStartTsStatKey(key: string): StartTsStatKey {
    return key as StartTsStatKey
}