import type { Selectable } from 'kysely';
import type { UserStats, StartTimestamps, DailyStats, Servers, BotStatus } from '@gandhi/core/types/db';
import { getDb, getWriteDb } from '../db';

/** The bot's latest heartbeat row (single shard), or undefined if never written. */
export async function getBotStatusRow(): Promise<BotStatus | undefined> {
    return (await getDb()
        .selectFrom('bot_status')
        .selectAll()
        .where('shard_id', '=', 0)
        .executeTakeFirst()) as unknown as BotStatus | undefined;
}

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

export interface UserGuildSettings {
    guildId: string;
    stats: boolean;
    logs: boolean;
    isPrivate: boolean;
}

/** The user's per-guild opt-in settings (stats/logs/private), for guilds with a row. */
export async function getUserSettingsRows(userId: string): Promise<UserGuildSettings[]> {
    const rows = await getDb()
        .selectFrom('user_stats')
        .select(['guild_id', 'stats', 'logs', 'private'])
        .where('user_id', '=', userId)
        .execute();
    return rows
        .filter((r) => !!r.guild_id)
        .map((r) => ({
            guildId: r.guild_id as string,
            stats: (r.stats as unknown as number | null) === 1,
            logs: (r.logs as unknown as number | null) === 1,
            isPrivate: (r.private as unknown as number | null) === 1,
        }));
}

/** Guild ids where the user has been granted the local "server manager" role. */
export async function getUserLocalAdminGuildIds(userId: string): Promise<string[]> {
    try {
        const rows = await getDb()
            .selectFrom('user_stats')
            .select('guild_id')
            .where('user_id', '=', userId)
            .where('local_admin', '=', 1)
            .execute();
        return rows.map((r) => r.guild_id).filter((id): id is string => !!id);
    } catch {
        return []; // local_admin column may not exist yet (migration 16)
    }
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

export type ServerMeta = Pick<Selectable<Servers>, 'guild_name' | 'guild_icon' | 'stats' | 'bot_present'>;

/** Cached guild name/icon/presence (populated by the bot) for the given guild ids. */
export async function getServersMeta(guildIds: string[]): Promise<Map<string, ServerMeta>> {
    const result = new Map<string, ServerMeta>();
    if (guildIds.length === 0) return result;

    const rows = await getDb()
        .selectFrom('servers')
        .select(['guild_id', 'guild_name', 'guild_icon', 'stats', 'bot_present'])
        .where('guild_id', 'in', guildIds)
        .execute();

    for (const row of rows) {
        if (row.guild_id) {
            result.set(row.guild_id, {
                guild_name: row.guild_name,
                guild_icon: row.guild_icon,
                stats: row.stats,
                bot_present: row.bot_present,
            });
        }
    }
    return result;
}

export interface UserIdentity {
    username: string | null;
    globalName: string | null;
    avatar: string | null;
}

/** Cached Discord identities (username/global name/avatar), keyed by user id. */
export async function getUsersByIds(userIds: string[]): Promise<Map<string, UserIdentity>> {
    const result = new Map<string, UserIdentity>();
    if (userIds.length === 0) return result;

    const rows = await getDb()
        .selectFrom('users')
        .select(['user_id', 'username', 'global_name', 'avatar'])
        .where('user_id', 'in', userIds)
        .execute();

    for (const row of rows) {
        result.set(row.user_id, {
            username: row.username,
            globalName: row.global_name,
            avatar: row.avatar,
        });
    }
    return result;
}

/** Upsert fetched Discord identities into the local cache. */
export async function upsertUsers(
    users: Array<{ userId: string; username: string; globalName: string | null; avatar: string | null }>,
): Promise<void> {
    if (users.length === 0) return;
    const now = Date.now();
    const db = getWriteDb();
    for (const u of users) {
        const values = { username: u.username, global_name: u.globalName, avatar: u.avatar, updated_at: now };
        await db
            .insertInto('users')
            .values({ user_id: u.userId, ...values })
            .onConflict((oc) => oc.column('user_id').doUpdateSet(values))
            .execute();
    }
}

export interface GuildChannel {
    channelId: string;
    name: string | null;
}

/** The guild's cached text channels (populated by the bot), ordered by name. */
export async function getGuildChannels(guildId: string): Promise<GuildChannel[]> {
    try {
        const rows = await getDb()
            .selectFrom('channels')
            .select(['channel_id', 'name'])
            .where('guild_id', '=', guildId)
            .execute();
        return rows
            .map((r) => ({ channelId: r.channel_id, name: r.name }))
            .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    } catch {
        // The `channels` table may not exist yet if the bot hasn't run migration 15.
        return [];
    }
}

export interface ServerSettingsRow {
    logChannelId: string | null;
    stats: boolean;
    logs: boolean;
}

/** Server-level settings (log channel + stats/logs). Unset stats/logs default to ON, like the bot. */
export async function getServerSettingsRow(guildId: string): Promise<ServerSettingsRow> {
    const row = await getDb()
        .selectFrom('servers')
        .select(['log_channel_id', 'stats', 'logs'])
        .where('guild_id', '=', guildId)
        .executeTakeFirst();
    const statsVal = row?.stats as unknown as number | null;
    const logsVal = row?.logs as unknown as number | null;
    return {
        logChannelId: row?.log_channel_id ?? null,
        stats: statsVal == null || statsVal !== 0,
        logs: logsVal == null || logsVal !== 0,
    };
}

/** Cached guild owner id (populated by the bot), or null. */
export async function getServerOwnerId(guildId: string): Promise<string | null> {
    try {
        const row = await getDb()
            .selectFrom('servers')
            .select('owner_id')
            .where('guild_id', '=', guildId)
            .executeTakeFirst();
        return row?.owner_id ?? null;
    } catch {
        return null; // owner_id column may not exist yet (migration 16)
    }
}

/** True when the user has been granted the local "server manager" role on this guild. */
export async function isUserLocalAdmin(userId: string, guildId: string): Promise<boolean> {
    try {
        const row = await getDb()
            .selectFrom('user_stats')
            .select('local_admin')
            .where('user_id', '=', userId)
            .where('guild_id', '=', guildId)
            .executeTakeFirst();
        return !!row && (row.local_admin as unknown as number | null) === 1;
    } catch {
        return false; // local_admin column may not exist yet (migration 16)
    }
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
