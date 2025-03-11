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