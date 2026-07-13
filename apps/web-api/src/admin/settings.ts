import { getWriteDb } from '../db';
import { getServerSettingsRow, type ServerSettingsRow } from '../stats/queries';

export type ServerSettings = ServerSettingsRow;

export interface ServerSettingsPatch {
    stats?: boolean;
    logs?: boolean;
    /** Digit-string channel id, or null to clear the log channel. */
    logChannelId?: string | null;
}

export async function getServerSettings(guildId: string): Promise<ServerSettings> {
    return getServerSettingsRow(guildId);
}

/**
 * Admin write path for a guild's server-level settings. Only ever touches the
 * `servers` row (never a user's data), through the narrow write connection.
 */
export async function updateServerSettings(guildId: string, patch: ServerSettingsPatch): Promise<ServerSettings> {
    const set: Record<string, unknown> = {};
    if (patch.stats !== undefined) set.stats = patch.stats ? 1 : 0;
    if (patch.logs !== undefined) set.logs = patch.logs ? 1 : 0;
    if (patch.logChannelId !== undefined) {
        const trimmed = patch.logChannelId?.trim() ?? '';
        // Empty clears it; otherwise keep only if it looks like a Discord snowflake.
        set.log_channel_id = /^[0-9]{5,25}$/.test(trimmed) ? trimmed : null;
    }

    if (Object.keys(set).length > 0) {
        await getWriteDb()
            .insertInto('servers')
            .values({ guild_id: guildId, ...set })
            .onConflict((oc) => oc.column('guild_id').doUpdateSet(set))
            .execute();
    }
    return getServerSettings(guildId);
}
