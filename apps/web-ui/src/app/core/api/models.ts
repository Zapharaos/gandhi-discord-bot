// Response shapes returned by @gandhi/web-api. Kept intentionally small and
// hand-written (the API surface is tiny) rather than generated.

export interface MeGuild {
  id: string;
  name: string | null;
  icon: string | null;
  isAdmin: boolean;
  hasData: boolean;
}

export interface MeResponse {
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
  guilds: MeGuild[];
}

export interface AggregatedStats {
  time_connected: number;
  time_muted: number;
  time_deafened: number;
  time_screen_sharing: number;
  time_camera: number;
  max_connected: number;
  max_muted: number;
  max_deafened: number;
  max_screen_sharing: number;
  max_camera: number;
  max_daily_streak: number;
  count_connected: number;
  count_muted: number;
  count_deafened: number;
  count_screen_sharing: number;
  count_camera: number;
  count_switch: number;
  daily_streak: number;
  last_activity: number;
  isLive: boolean;
}

export interface StatsResponse {
  scope: 'global' | 'guild';
  guildId?: string;
  stats: AggregatedStats;
}

export type TimelineStat =
  | 'time_connected'
  | 'time_muted'
  | 'time_deafened'
  | 'time_screen_sharing'
  | 'time_camera';

export interface TimelinePoint {
  day: number;
  value: number;
}

export interface TimelineResponse {
  scope: 'global' | 'guild';
  guildId: string | null;
  stat: TimelineStat;
  points: TimelinePoint[];
}

export interface GuildMemberStats {
  userId: string;
  isLive: boolean;
  time_connected: number;
  time_muted: number;
  time_deafened: number;
  time_screen_sharing: number;
  time_camera: number;
  daily_streak: number;
}

export interface GuildOverview {
  memberCount: number;
  activeCount: number;
  /** Members hidden from itemised views because they enabled private mode. */
  hiddenCount: number;
  totals: {
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
  };
  topMembers: GuildMemberStats[];
}

export interface AdminOverviewResponse {
  guildId: string;
  overview: GuildOverview;
}

export interface AdminTimelineResponse {
  guildId: string;
  stat: TimelineStat;
  points: TimelinePoint[];
}
