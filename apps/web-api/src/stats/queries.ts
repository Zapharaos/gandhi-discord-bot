import type { Selectable } from 'kysely';
import type { UserStats, StartTimestamps, DailyStats, Servers } from '@gandhi/core/types/db';
import { getDb } from '../db';

// Thin read-only query layer. Mirrors the shapes the bot's controllers read, but
// scoped to a single user and never writing — the web service is a pure reader.
//
// Rows are cast back to the raw table interfaces (with their Generated columns)
// so they can be handed straight to the @gandhi/core model factories, exactly as
// the bot's controllers do.

export async function getUserStatsRows(userId: string, guildId?: string): Promise<UserStats[]> {
    let query = getDb().selectFrom('user_stats').selectAll().where('user_id', '=', userId);
    if (guildId) query = query.where('guild_id', '=', guildId);
    return (await query.execute()) as unknown as UserStats[];
}

export async function getStartTimestampsRows(userId: string, guildId?: string): Promise<StartTimestamps[]> {
    let query = getDb().selectFrom('start_timestamps').selectAll().where('user_id', '=', userId);
    if (guildId) query = query.where('guild_id', '=', guildId);
    return (await query.execute()) as unknown as StartTimestamps[];
}

export async function getDailyStatsRows(
    userId: string,
    guildId?: string,
    from?: number,
    to?: number,
): Promise<DailyStats[]> {
    let query = getDb().selectFrom('daily_stats').selectAll().where('user_id', '=', userId);
    if (guildId) query = query.where('guild_id', '=', guildId);
    if (from !== undefined) query = query.where('day_timestamp', '>=', from);
    if (to !== undefined) query = query.where('day_timestamp', '<=', to);
    return (await query.orderBy('day_timestamp', 'asc').execute()) as unknown as DailyStats[];
}

// --- Guild-scoped reads (for the admin view: every member of a guild) ---

export async function getGuildUserStatsRows(guildId: string): Promise<UserStats[]> {
    return (await getDb()
        .selectFrom('user_stats')
        .selectAll()
        .where('guild_id', '=', guildId)
        .execute()) as unknown as UserStats[];
}

export async function getGuildStartTimestampsRows(guildId: string): Promise<StartTimestamps[]> {
    return (await getDb()
        .selectFrom('start_timestamps')
        .selectAll()
        .where('guild_id', '=', guildId)
        .execute()) as unknown as StartTimestamps[];
}

export async function getGuildDailyStatsRows(
    guildId: string,
    from?: number,
    to?: number,
): Promise<DailyStats[]> {
    let query = getDb().selectFrom('daily_stats').selectAll().where('guild_id', '=', guildId);
    if (from !== undefined) query = query.where('day_timestamp', '>=', from);
    if (to !== undefined) query = query.where('day_timestamp', '<=', to);
    return (await query.orderBy('day_timestamp', 'asc').execute()) as unknown as DailyStats[];
}

/** Distinct guild ids where the user has any stored stats. */
export async function getUserGuildIds(userId: string): Promise<string[]> {
    const rows = await getDb()
        .selectFrom('user_stats')
        .select('guild_id')
        .distinct()
        .where('user_id', '=', userId)
        .execute();
    return rows.map((r) => r.guild_id).filter((id): id is string => !!id);
}

/** Cached guild name/icon (populated by the bot) for the given guild ids. */
export async function getServersMeta(
    guildIds: string[],
): Promise<Map<string, Pick<Selectable<Servers>, 'guild_name' | 'guild_icon' | 'stats'>>> {
    const result = new Map<string, Pick<Selectable<Servers>, 'guild_name' | 'guild_icon' | 'stats'>>();
    if (guildIds.length === 0) return result;

    const rows = await getDb()
        .selectFrom('servers')
        .select(['guild_id', 'guild_name', 'guild_icon', 'stats'])
        .where('guild_id', 'in', guildIds)
        .execute();

    for (const row of rows) {
        if (row.guild_id) {
            result.set(row.guild_id, {
                guild_name: row.guild_name,
                guild_icon: row.guild_icon,
                stats: row.stats,
            });
        }
    }
    return result;
}

/** True when the user has enabled private mode on the given guild. */
export async function isUserPrivate(userId: string, guildId: string): Promise<boolean> {
    const row = await getDb()
        .selectFrom('user_stats')
        .select('private')
        .where('user_id', '=', userId)
        .where('guild_id', '=', guildId)
        .executeTakeFirst();
    return !!row && (row.private as unknown as number | null) === 1;
}
