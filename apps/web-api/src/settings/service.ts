import type { SessionData } from '../auth/sessions';
import { getWriteDb } from '../db';
import { getUserSettingsRows } from '../stats/queries';
import { resolveUserGuilds } from '../me/guilds';

export interface GuildSettings {
    guildId: string;
    name: string | null;
    icon: string | null;
    stats: boolean;
    logs: boolean;
    private: boolean;
}

export interface SettingsPatch {
    stats?: boolean;
    logs?: boolean;
    private?: boolean;
}

/** Current per-server settings for every server the user shares with the bot. */
export async function getSettings(session: SessionData): Promise<GuildSettings[]> {
    const [guilds, rows] = await Promise.all([
        resolveUserGuilds(session),
        getUserSettingsRows(session.userId),
    ]);
    const byGuild = new Map(rows.map((r) => [r.guildId, r]));

    return guilds.map((g) => {
        const s = byGuild.get(g.id);
        return {
            guildId: g.id,
            name: g.name,
            icon: g.icon,
            stats: s?.stats ?? false,
            logs: s?.logs ?? false,
            private: s?.isPrivate ?? false,
        };
    });
}

// Persist the caller's settings for one guild. Opt-in model: on first insert any
// flag not explicitly turned on defaults to OFF, so a user is never tracked
// without opting in (mirrors the bot's /user-settings command).
async function writeGuildSettings(userId: string, guildId: string, patch: SettingsPatch): Promise<void> {
    const provided: Record<string, number> = {};
    if (patch.stats !== undefined) provided.stats = patch.stats ? 1 : 0;
    if (patch.logs !== undefined) provided.logs = patch.logs ? 1 : 0;
    if (patch.private !== undefined) provided.private = patch.private ? 1 : 0;
    if (Object.keys(provided).length === 0) return;

    await getWriteDb()
        .insertInto('user_stats')
        .values({ guild_id: guildId, user_id: userId, stats: 0, logs: 0, ...provided })
        .onConflict((oc) => oc.columns(['guild_id', 'user_id']).doUpdateSet(provided))
        .execute();
}

/**
 * Apply a settings patch. With guildId it targets that single server; otherwise
 * it applies to every server the user shares with the bot. Only guilds the user
 * can actually see are ever written, so a user can't create rows elsewhere.
 */
export async function updateSettings(
    session: SessionData,
    patch: SettingsPatch,
    guildId?: string,
): Promise<{ updated: string[] }> {
    const allowed = new Set((await resolveUserGuilds(session)).map((g) => g.id));

    const targets = guildId ? [guildId] : [...allowed];
    const updated: string[] = [];
    for (const id of targets) {
        if (!allowed.has(id)) continue; // ignore guilds the user isn't part of
        await writeGuildSettings(session.userId, id, patch);
        updated.push(id);
    }
    return { updated };
}
