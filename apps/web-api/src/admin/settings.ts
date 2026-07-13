import { getWriteDb } from '../db';
import { getGuildChannels, getServerSettingsRow, type GuildChannel, type ServerSettingsRow } from '../stats/queries';

export interface ServerSettings extends ServerSettingsRow {
    /** Human-readable name of the current log channel (from the bot's channel cache). */
    logChannelName: string | null;
    /** The guild's text channels, for a channel picker. */
    channels: GuildChannel[];
}

export interface ServerSettingsPatch {
    stats?: boolean;
    logs?: boolean;
    /** Digit-string channel id, or null to clear the log channel. */
    logChannelId?: string | null;
}

/** True when the id is a real text channel of this guild (per the bot's cache). */
export interface LogChannelValidation {
    valid: boolean;
    name: string | null;
}

async function resolveLogChannel(guildId: string, channelId: string | null): Promise<LogChannelValidation> {
    if (!channelId) return { valid: true, name: null };
    const channels = await getGuildChannels(guildId);
    // If the bot hasn't synced this guild's channels yet, we can't validate — accept
    // the id rather than block a legitimate channel.
    if (channels.length === 0) return { valid: true, name: null };
    const match = channels.find((c) => c.channelId === channelId);
    return match ? { valid: true, name: match.name } : { valid: false, name: null };
}

export async function getServerSettings(guildId: string): Promise<ServerSettings> {
    const [row, channels] = await Promise.all([getServerSettingsRow(guildId), getGuildChannels(guildId)]);
    const logChannelName = channels.find((c) => c.channelId === row.logChannelId)?.name ?? null;
    return { ...row, logChannelName, channels };
}

/**
 * Admin write path for a guild's server-level settings. The log channel is
 * validated against the bot's cached channel list — an id that isn't a real text
 * channel of this guild is rejected, so logs can't be pointed at a bogus id.
 */
export async function updateServerSettings(
    guildId: string,
    patch: ServerSettingsPatch,
): Promise<{ settings: ServerSettings; logChannelError?: boolean }> {
    const set: Record<string, unknown> = {};
    if (patch.stats !== undefined) set.stats = patch.stats ? 1 : 0;
    if (patch.logs !== undefined) set.logs = patch.logs ? 1 : 0;

    let logChannelError = false;
    if (patch.logChannelId !== undefined) {
        const trimmed = patch.logChannelId?.trim() || null;
        const check = await resolveLogChannel(guildId, trimmed);
        if (!check.valid) {
            logChannelError = true; // don't write an invalid channel id
        } else {
            set.log_channel_id = trimmed;
        }
    }

    if (Object.keys(set).length > 0) {
        await getWriteDb()
            .insertInto('servers')
            .values({ guild_id: guildId, ...set })
            .onConflict((oc) => oc.column('guild_id').doUpdateSet(set))
            .execute();
    }
    return { settings: await getServerSettings(guildId), ...(logChannelError ? { logChannelError } : {}) };
}
