// Response shapes returned by @gandhi/web-api. Kept intentionally small and
// hand-written (the API surface is tiny) rather than generated.

export interface MeGuild {
  id: string;
  name: string | null;
  /** Ready-to-render icon URL, or null. */
  icon: string | null;
  isAdmin: boolean;
  /** Granted the local "server manager" role (owner-assigned). */
  localAdmin: boolean;
  hasData: boolean;
  botPresent: boolean;
}

export interface MeResponse {
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
  /** True when the user is a bot operator (BOT_ADMIN_IDS), not a Discord server admin. */
  isBotAdmin: boolean;
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

export interface SessionStatsResponse {
  scope: 'session';
  active: boolean;
  guildIds: string[];
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

export interface RankEntry {
  rank: number;
  userId: string;
  name: string | null;
  avatar: string | null;
  value: number;
  /** Connected time over the same period, so value can be shown as a % of it. */
  connected: number;
  /** Longest single session (ms) for the stat, all-time. */
  max: number;
  /** Number of sessions for the stat, all-time. */
  count: number;
  isLive: boolean;
  isMe: boolean;
}

export type RankSort = 'value' | 'percent' | 'max' | 'count';
/** A rankable stat: any voice-time stat, or the daily streak (in days). */
export type RankStat = TimelineStat | 'daily_streak';
export type CardStat = RankStat | 'count_switch';

export interface RankingResponse {
  guildId: string;
  stat: RankStat;
  total: number;
  entries: RankEntry[];
  me: RankEntry | null;
}

export interface ActiveMember {
  userId: string;
  name: string | null;
  avatar: string | null;
  time_connected: number;
  time_muted: number;
  time_deafened: number;
  time_screen_sharing: number;
  time_camera: number;
  session_connected: number;
  session_muted: number;
  session_deafened: number;
  session_screen_sharing: number;
  session_camera: number;
}

export interface ActiveMembersResponse {
  guildId: string;
  members: ActiveMember[];
}

export interface GuildChannel {
  channelId: string;
  name: string | null;
}

export interface ServerSettings {
  logChannelId: string | null;
  logChannelName: string | null;
  channels: GuildChannel[];
  stats: boolean;
  logs: boolean;
}

export interface ServerSettingsResponse {
  guildId: string;
  settings: ServerSettings;
  /** Set on a save that rejected an invalid log-channel id. */
  logChannelError?: boolean;
}

export interface RosterMember {
  userId: string;
  name: string | null;
  avatar: string | null;
  lastActivity: number;
  isPrivate: boolean;
  isOwner: boolean;
  localAdmin: boolean;
}

export interface GuildRosterResponse {
  guildId: string;
  ownerId: string | null;
  total: number;
  privateCount: number;
  adminCount: number;
  members: RosterMember[];
}

export interface ServerSettingsPatch {
  stats?: boolean;
  logs?: boolean;
  logChannelId?: string | null;
}

export interface MemberLookupResponse {
  userId: string;
  found: boolean;
  private: boolean;
  stats: AggregatedStats | null;
}

export interface GuildSettings {
  guildId: string;
  name: string | null;
  icon: string | null;
  stats: boolean;
  logs: boolean;
  private: boolean;
}

export interface SettingsResponse {
  guilds: GuildSettings[];
}

export interface SettingsPatch {
  guildId?: string;
  stats?: boolean;
  logs?: boolean;
  private?: boolean;
}

export interface GdprResetResponse {
  /** Number of servers whose aggregate stats were reset. */
  reset: number;
}

export interface GdprDeleteResponse {
  /** Number of servers whose data was erased. */
  deleted: number;
  /** True when the cached Discord identity (username/avatar) was purged too. */
  identityPurged: boolean;
}

export interface BotHealth {
  online: boolean;
  ready: boolean;
  lastSeen: number | null;
  guildCount: number;
  wsPing: number | null;
  uptimeMs: number | null;
}

export interface ServiceStatus {
  web: boolean;
  db: boolean;
  bot: BotHealth;
  /** Live browser WebSocket connections currently held by the API instance. */
  wsConnections: number;
}

export interface ConfigResponse {
  botInviteUrl: string;
}

// --- Bot-operator area (BOT_ADMIN_IDS): whole-database aggregates ---

export interface BotAdminOverview {
  servers: {
    total: number;
    present: number;
    left: number;
    statsEnabled: number;
    logsEnabled: number;
    inactive30d: number;
    inactive90d: number;
    /** Joined/departed in the last 30 days (0 until the bot has migrated). */
    gained30d: number;
    lost30d: number;
    avgMembers: number;
    /** Guild count Discord reported at the last heartbeat (compare to `present`). */
    discordGuildCount: number;
  };
  users: {
    distinct: number;
    memberships: number;
    private: {
      memberships: number;
      users: number;
      percent: number;
      avgPerServer: number;
    };
    statsOptedOut: number;
    logsOptedOut: number;
    active30d: number;
    active90d: number;
    inactive30d: number;
    inactive90d: number;
  };
  totals: {
    time_connected: number;
    time_muted: number;
    time_deafened: number;
    time_screen_sharing: number;
    time_camera: number;
    count_connected: number;
    count_muted: number;
    count_deafened: number;
    count_screen_sharing: number;
    count_camera: number;
    count_switch: number;
    max_connected: number;
    max_muted: number;
    max_deafened: number;
    max_screen_sharing: number;
    max_camera: number;
    max_daily_streak: number;
    avgConnectedPerMembership: number;
    avgConnectedPerUser: number;
    avgConnectedPerServer: number;
  };
  live: {
    sessions: number;
    guilds: number;
    /** Peak concurrent sessions today / all-time (0 until the bot has migrated). */
    peakToday: number;
    peakAllTime: number;
    peakAllTimeDay: number | null;
  };
  activity: {
    day: number;
    week: number;
    month: number;
    firstDay: number | null;
  };
  growth: {
    /** Last 12 calendar months (UTC), oldest first. */
    months: BotAdminGrowthMonth[];
    retention: {
      previousActive: number;
      retained: number;
      percent: number;
    };
  };
  tech: {
    dbSizeBytes: number | null;
    dailyStatsRows: number;
    wsConnections: number;
  };
  bot: BotHealth;
  generatedAt: number;
}

export interface BotAdminGrowthMonth {
  /** UTC month start (epoch ms). */
  month: number;
  newUsers: number;
  cumulative: number;
}

export interface BotAdminTimelineResponse {
  stat: TimelineStat;
  points: TimelinePoint[];
}

export interface BotAdminOverviewResponse {
  overview: BotAdminOverview;
}

export interface BotAdminGuildEntry {
  guildId: string;
  name: string | null;
  icon: string | null;
  botPresent: boolean;
  statsEnabled: boolean;
  logsEnabled: boolean;
  members: number;
  privateMembers: number;
  lastActivity: number;
  timeConnected: number;
  /** Connected time over the last 30 days (ms). */
  timeConnected30d: number;
}

export interface BotAdminGuildsResponse {
  guilds: BotAdminGuildEntry[];
}

// --- Detailed bot health (bot-operator area) ---

export type HealthRange = '24h' | '7d' | '30d';

export interface BotEventEntry {
  id: number;
  timestamp: number;
  type: string;
  detail: string | null;
  /** Set on 'startup' events not preceded by a graceful 'shutdown'. */
  crashed?: boolean;
}

export interface BotAdminHealth {
  bot: BotHealth;
  /** Most recent metrics sample, or null before the first one lands. */
  current: {
    sampledAt: number;
    rssBytes: number;
    heapUsedBytes: number;
    loopLagMeanMs: number;
    loopLagMaxMs: number;
    activeSessions: number;
  } | null;
  /** Sample-presence availability (%, 1 expected per minute), null before any data. */
  availability: { h24: number | null; d7: number | null };
  counters24h: {
    reconnects: number;
    shardErrors: number;
    clientErrors: number;
    commandErrors: number;
    commandsOk: number;
  };
  events: BotEventEntry[];
  generatedAt: number;
}

export interface BotMetricPoint {
  t: number;
  wsPing: number;
  rssBytes: number;
  heapUsedBytes: number;
  loopLagMeanMs: number;
  loopLagMaxMs: number;
  activeSessions: number;
  commandsOk: number;
  commandsError: number;
  /** Average command latency inside the bucket (ms), null when no commands ran. */
  avgCommandLatencyMs: number | null;
}

export interface BotAdminHealthHistory {
  range: HealthRange;
  bucketMs: number;
  points: BotMetricPoint[];
  peaks: { day: number; peakSessions: number }[];
  generatedAt: number;
}

export interface BotAdminHealthResponse {
  health: BotAdminHealth;
}

export interface BotAdminHealthHistoryResponse {
  history: BotAdminHealthHistory;
}
