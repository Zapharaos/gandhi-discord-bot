import type { Kysely } from 'kysely';
import type { DB } from '../types/db';

// Shared GDPR write operations (right to erasure / reset) used by both the
// bot's /reset-stats & /delete-data commands and the web service's /api/gdpr
// endpoints. Callers pass their own Kysely connection (the bot's writer or the
// web service's dedicated read-write connection) — no logging or Discord
// coupling here, so each caller reports results its own way.

/** Aggregate columns zeroed by a stats reset (settings and daily history are kept). */
export const RESET_VALUES = {
    time_connected: 0, time_muted: 0, time_deafened: 0, time_screen_sharing: 0, time_camera: 0,
    last_activity: 0, daily_streak: 0,
    max_connected: 0, max_muted: 0, max_deafened: 0, max_screen_sharing: 0, max_camera: 0, max_daily_streak: 0,
    count_connected: 0, count_switch: 0, count_muted: 0, count_deafened: 0, count_screen_sharing: 0, count_camera: 0,
} as const;

export interface DeleteUserDataResult {
    /** Number of user_stats rows removed (one per server the user had data on). */
    deletedGuilds: number;
    /** Whether the users identity-cache row was purged (only when no data remains anywhere). */
    identityPurged: boolean;
}

/**
 * Resets a user's aggregate stats back to zero while keeping their settings
 * (stats/logs/private/local_admin) and their daily history (daily_stats) intact.
 * Scoped to guildId when provided, otherwise every server. Returns rows reset.
 */
export async function resetUserStats(db: Kysely<DB>, userId: string, guildId?: string): Promise<number> {
    let query = db.updateTable('user_stats').set(RESET_VALUES).where('user_id', '=', userId);
    if (guildId) {
        query = query.where('guild_id', '=', guildId);
    }
    const result = await query.execute();
    return result.reduce((sum, r) => sum + Number(r.numUpdatedRows ?? 0), 0);
}

async function deleteUserRows(
    db: Kysely<DB>,
    table: 'user_stats' | 'daily_stats' | 'start_timestamps',
    userId: string,
    guildId?: string,
): Promise<number> {
    let query = db.deleteFrom(table).where('user_id', '=', userId);
    if (guildId) {
        query = query.where('guild_id', '=', guildId);
    }
    const result = await query.execute();
    return result.reduce((sum, r) => sum + Number(r.numDeletedRows ?? 0), 0);
}

/**
 * Erases every row we hold about a user (right to erasure): user_stats (which
 * also clears their settings, reverting them to the opt-out default),
 * daily_stats and start_timestamps. Scoped to guildId when provided, otherwise
 * every server. The users identity-cache row (username/avatar) is purged too,
 * but only once no per-guild data remains anywhere — a guild-scoped delete
 * keeps it while other servers still reference the user.
 */
export async function deleteUserData(
    db: Kysely<DB>,
    userId: string,
    guildId?: string,
): Promise<DeleteUserDataResult> {
    const deletedGuilds = await deleteUserRows(db, 'user_stats', userId, guildId);
    await deleteUserRows(db, 'daily_stats', userId, guildId);
    await deleteUserRows(db, 'start_timestamps', userId, guildId);

    let identityPurged = false;
    if (!(await hasRemainingUserData(db, userId))) {
        const result = await db.deleteFrom('users').where('user_id', '=', userId).execute();
        identityPurged = result.reduce((sum, r) => sum + Number(r.numDeletedRows ?? 0), 0) > 0;
    }

    return { deletedGuilds, identityPurged };
}

/** True while any of the three per-guild tables still references the user. */
async function hasRemainingUserData(db: Kysely<DB>, userId: string): Promise<boolean> {
    for (const table of ['user_stats', 'daily_stats', 'start_timestamps'] as const) {
        const row = await db.selectFrom(table).select('user_id').where('user_id', '=', userId).limit(1).executeTakeFirst();
        if (row) return true;
    }
    return false;
}
