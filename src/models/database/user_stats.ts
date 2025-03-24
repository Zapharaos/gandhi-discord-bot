export type StatKey =
    UserStatsFields.TimeConnected |
    UserStatsFields.TimeMuted |
    UserStatsFields.TimeDeafened |
    UserStatsFields.TimeScreenSharing |
    UserStatsFields.TimeCamera |
    UserStatsFields.DailyStreak |
    UserStatsFields.TotalJoins |
    UserStatsFields.LastActivity;

export enum UserStatsFields {
    TimeConnected = 'time_connected',
    TimeMuted = 'time_muted',
    TimeDeafened = 'time_deafened',
    TimeScreenSharing = 'time_screen_sharing',
    TimeCamera = 'time_camera',
    DailyStreak = 'daily_streak',
    TotalJoins = 'total_joins',
    LastActivity = 'last_activity'
}

export class UserStats {
    public guild_id: string;
    public user_id: string;
    public time_connected: number = 0;
    public time_muted: number = 0;
    public time_deafened: number = 0;
    public time_screen_sharing: number = 0;
    public time_camera: number = 0;
    public daily_streak: number = 0;
    public total_joins: number = 0;
    public last_activity: number = 0;

    constructor(data: Partial<UserStats> = {}) {
        this.guild_id = data.guild_id || '';
        this.user_id = data.user_id || '';
        this.time_connected = data.time_connected || 0;
        this.time_muted = data.time_muted || 0;
        this.time_deafened = data.time_deafened || 0;
        this.time_screen_sharing = data.time_screen_sharing || 0;
        this.time_camera = data.time_camera || 0;
        this.daily_streak = data.daily_streak || 0;
        this.total_joins = data.total_joins || 0;
        this.last_activity = data.last_activity || 0;
    }

    static getStatKey(key: string): StatKey {
        return key as StatKey;
    }
}