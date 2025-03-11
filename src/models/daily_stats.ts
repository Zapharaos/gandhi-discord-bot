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