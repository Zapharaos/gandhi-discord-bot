import type { SessionData } from '../auth/sessions';
import { discordIconUrl } from '../auth/discord';
import { getServersMeta, getUserGuildIds, getUserLocalAdminGuildIds } from '../stats/queries';

export interface UserGuild {
    id: string;
    name: string | null;
    icon: string | null;
    /** Discord Manage-Server / Administrator / owner. */
    isAdmin: boolean;
    /** Granted the local "server manager" role in the DB (owner-assigned). */
    localAdmin: boolean;
    hasData: boolean;
    botPresent: boolean;
}

/**
 * The guilds worth surfacing for a user: those the bot is present in OR where the
 * user has stored data. Shared by /api/me and the settings endpoints so both
 * agree on which servers a user can see/configure.
 */
export async function resolveUserGuilds(session: SessionData): Promise<UserGuild[]> {
    const [dataGuildIds, localAdminIds] = await Promise.all([
        getUserGuildIds(session.userId),
        getUserLocalAdminGuildIds(session.userId),
    ]);
    const dataGuildSet = new Set(dataGuildIds);
    const localAdminSet = new Set(localAdminIds);
    const sessionById = new Map(session.guilds.map((g) => [g.id, g]));

    const allIds = [...new Set([...sessionById.keys(), ...dataGuildIds])];
    const meta = await getServersMeta(allIds);

    const guilds: UserGuild[] = [];
    for (const id of allIds) {
        const s = sessionById.get(id);
        const m = meta.get(id);
        const botPresent = (m?.bot_present as unknown as number | null) === 1;
        const hasData = dataGuildSet.has(id);
        if (!botPresent && !hasData) continue;

        const icon = s?.icon ? discordIconUrl(id, s.icon) : (m?.guild_icon ?? null);
        guilds.push({
            id,
            name: s?.name ?? m?.guild_name ?? null,
            icon,
            isAdmin: s?.isAdmin ?? false,
            localAdmin: localAdminSet.has(id),
            hasData,
            botPresent,
        });
    }

    return guilds.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}
