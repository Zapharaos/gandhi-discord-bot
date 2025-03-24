export type StatKey =
    'time_connected' |
    'time_muted' |
    'time_deafened' |
    'time_screen_sharing' |
    'time_camera' |
    'daily_streak' |
    'total_joins' |
    'last_activity';

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
    public time_connected: number;
    public time_muted: number;
    public time_deafened: number;
    public time_screen_sharing: number;
    public time_camera: number;
    public daily_streak: number;
    public total_joins: number;
    public last_activity: number;

    constructor(data: UserStats) {
        this.guild_id = data.guild_id;
        this.user_id = data.user_id;
        this.time_connected = data.time_connected;
        this.time_muted = data.time_muted;
        this.time_deafened = data.time_deafened;
        this.time_screen_sharing = data.time_screen_sharing;
        this.time_camera = data.time_camera;
        this.daily_streak = data.daily_streak;
        this.total_joins = data.total_joins;
        this.last_activity = data.last_activity;
    }

    static getStatKey(key: string): StatKey {
        return key as StatKey;
    }
}