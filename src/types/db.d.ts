/**
 * This file was generated by kysely-codegen.
 * Please do not edit it manually.
 */

import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface DailyStats {
  day_timestamp: Generated<number | null>;
  guild_id: string | null;
  time_camera: Generated<number | null>;
  time_connected: Generated<number | null>;
  time_deafened: Generated<number | null>;
  time_muted: Generated<number | null>;
  time_screen_sharing: Generated<number | null>;
  user_id: string | null;
}

export interface Servers {
  guild_id: string | null;
  log_channel_id: string | null;
}

export interface StartTimestamps {
  guild_id: string | null;
  start_camera: Generated<number | null>;
  start_connected: Generated<number | null>;
  start_deafened: Generated<number | null>;
  start_muted: Generated<number | null>;
  start_screen_sharing: Generated<number | null>;
  user_id: string | null;
}

export interface UserStats {
  daily_streak: Generated<number | null>;
  guild_id: string | null;
  last_activity: Generated<number | null>;
  time_camera: Generated<number | null>;
  time_connected: Generated<number | null>;
  time_deafened: Generated<number | null>;
  time_muted: Generated<number | null>;
  time_screen_sharing: Generated<number | null>;
  total_joins: Generated<number | null>;
  user_id: string | null;
}

export interface DB {
  daily_stats: DailyStats;
  servers: Servers;
  start_timestamps: StartTimestamps;
  user_stats: UserStats;
}
