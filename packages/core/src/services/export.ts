import type { UserStats, StartTimestamps, DailyStats } from '../types/db';
import { DatabaseUtils } from '../utils/database';

// Pure export builders shared by the bot's /export command and the web service's
// /api/export endpoint. Given the three sets of rows we hold about a user, these
// produce a portable JSON payload and a spreadsheet-friendly CSV — with no
// database or Discord coupling, so both callers fetch rows their own way and
// pass a guild-name resolver.

export const EXPORT_VERSION = 1;

export interface ExportGuild {
    guild_id: string;
    guild_name: string | null;
    user_stats: UserStats | null;
    start_timestamps: StartTimestamps | null;
    daily_stats: DailyStats[];
}

export interface ExportPayload {
    export_version: number;
    exported_at: string;
    discord_user_id: string;
    scope: string;
    guilds: ExportGuild[];
}

export interface BuildExportInput {
    userId: string;
    scope: string;
    userStats: UserStats[];
    startTimestamps: StartTimestamps[];
    dailyStats: DailyStats[];
    /** Resolve a display name for a guild id (bot: client cache; web: servers table). */
    guildName: (guildId: string) => string | null;
}

/** Group every row we hold about the user by guild into a portable payload. */
export function buildExportPayload(input: BuildExportInput): ExportPayload {
    const guildIds = new Set<string>();
    for (const r of input.userStats) if (r.guild_id) guildIds.add(r.guild_id);
    for (const r of input.startTimestamps) if (r.guild_id) guildIds.add(r.guild_id);
    for (const r of input.dailyStats) if (r.guild_id) guildIds.add(r.guild_id);

    const guilds: ExportGuild[] = [...guildIds].map((gid) => ({
        guild_id: gid,
        guild_name: input.guildName(gid),
        user_stats: input.userStats.find((r) => r.guild_id === gid) ?? null,
        start_timestamps: input.startTimestamps.find((r) => r.guild_id === gid) ?? null,
        daily_stats: input.dailyStats.filter((r) => r.guild_id === gid),
    }));

    return {
        export_version: EXPORT_VERSION,
        exported_at: new Date().toISOString(),
        discord_user_id: input.userId,
        scope: input.scope,
        guilds,
    };
}

const CSV_COLUMNS = [
    'guild_id',
    'guild_name',
    'date',
    'time_connected',
    'time_muted',
    'time_deafened',
    'time_screen_sharing',
    'time_camera',
] as const;

function csvEscape(value: string | number | null): string {
    const s = value === null ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/**
 * Flatten the daily_stats across guilds into a long-format CSV — one row per
 * (guild, day). Durations are in milliseconds, matching the JSON export.
 */
export function exportDailyStatsToCsv(payload: ExportPayload): string {
    const lines: string[] = [CSV_COLUMNS.join(',')];

    for (const guild of payload.guilds) {
        for (const day of guild.daily_stats) {
            const ts = DatabaseUtils.unwrapGeneratedNumber(day.day_timestamp);
            lines.push(
                [
                    csvEscape(guild.guild_id),
                    csvEscape(guild.guild_name),
                    csvEscape(ts ? new Date(ts).toISOString().slice(0, 10) : ''),
                    DatabaseUtils.unwrapGeneratedNumber(day.time_connected),
                    DatabaseUtils.unwrapGeneratedNumber(day.time_muted),
                    DatabaseUtils.unwrapGeneratedNumber(day.time_deafened),
                    DatabaseUtils.unwrapGeneratedNumber(day.time_screen_sharing),
                    DatabaseUtils.unwrapGeneratedNumber(day.time_camera),
                ].join(','),
            );
        }
    }

    return lines.join('\n');
}
