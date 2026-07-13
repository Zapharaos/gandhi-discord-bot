import type { UserStats } from '@gandhi/core/types/db';
import { getWriteDb } from '../db';
import { getGuildUserStatsRows, getServerOwnerId, getUsersByIds } from '../stats/queries';

export interface RosterMember {
    userId: string;
    name: string | null;
    avatar: string | null;
    /** Epoch ms of last tracked activity, or 0 if never. */
    lastActivity: number;
    isPrivate: boolean;
    isOwner: boolean;
    localAdmin: boolean;
}

export interface GuildRoster {
    ownerId: string | null;
    total: number;
    privateCount: number;
    adminCount: number;
    members: RosterMember[];
}

function avatarUrl(userId: string, hash: string | null): string | null {
    return hash ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.png` : null;
}

/**
 * Member roster for the admin view. Privacy policy: private members are counted in
 * the totals but NOT itemised (never named), consistent with leaderboards and the
 * /rank command — except the guild owner, who is always shown (and always first).
 * Every non-private tracked member appears, even with no activity.
 */
export async function getGuildRoster(guildId: string): Promise<GuildRoster> {
    const [rows, ownerId] = await Promise.all([getGuildUserStatsRows(guildId), getServerOwnerId(guildId)]);

    const identIds = rows.map((r) => r.user_id ?? '').filter((id): id is string => id.length > 0);
    if (ownerId && !identIds.includes(ownerId)) identIds.push(ownerId);
    const idents = await getUsersByIds(identIds);

    const build = (uid: string, r?: UserStats): RosterMember => {
        const id = idents.get(uid);
        return {
            userId: uid,
            name: id?.globalName || id?.username || null,
            avatar: avatarUrl(uid, id?.avatar ?? null),
            lastActivity: r ? ((r.last_activity as unknown as number | null) ?? 0) : 0,
            isPrivate: r ? (r.private as unknown as number | null) === 1 : false,
            isOwner: uid === ownerId,
            localAdmin: r ? (r.local_admin as unknown as number | null) === 1 : false,
        };
    };

    const all: RosterMember[] = rows.map((r) => build(r.user_id ?? '', r));

    // Never itemise private members (owner excepted).
    const members = all.filter((m) => !m.isPrivate || m.isOwner);

    // Surface the owner even if they were never tracked.
    if (ownerId && !all.some((m) => m.userId === ownerId)) {
        members.push(build(ownerId));
    }

    members.sort((a, b) => {
        if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
        return b.lastActivity - a.lastActivity;
    });

    return {
        ownerId,
        total: all.length,
        privateCount: all.filter((m) => m.isPrivate).length,
        adminCount: all.filter((m) => m.localAdmin).length,
        members,
    };
}

/** Grant or revoke the local "server manager" role for a member (owner-only, enforced by the route). */
export async function setLocalAdmin(guildId: string, userId: string, value: boolean): Promise<void> {
    const local_admin = value ? 1 : 0;
    await getWriteDb()
        .insertInto('user_stats')
        .values({ guild_id: guildId, user_id: userId, stats: 0, logs: 0, local_admin })
        .onConflict((oc) => oc.columns(['guild_id', 'user_id']).doUpdateSet({ local_admin }))
        .execute();
}
