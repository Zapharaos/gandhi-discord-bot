import { loadConfig } from '../config';
import type { SessionGuild } from './sessions';

// Discord permission bits that grant a user server-management access. Either one
// is enough to see the server-wide (admin) view of the dashboard.
const PERMISSION_ADMINISTRATOR = 1n << 3n;
const PERMISSION_MANAGE_GUILD = 1n << 5n;

const DISCORD_API = 'https://discord.com/api/v10';

export const OAUTH_SCOPES = ['identify', 'guilds'];

interface DiscordTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

interface DiscordUser {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
}

interface DiscordPartialGuild {
    id: string;
    name: string;
    icon: string | null;
    permissions: string;
    /** True when the user is the guild owner (implies full management rights). */
    owner?: boolean;
}

/**
 * OAuth2 URL to invite the bot to a server. Permissions default to a modest set
 * (View Channels + Send Messages + Read Message History = 68608) so it can watch
 * voice states and post logs; a server admin can adjust afterwards.
 */
export function buildBotInviteUrl(): string {
    const config = loadConfig();
    const params = new URLSearchParams({
        client_id: config.discord.clientId,
        scope: 'bot applications.commands',
        permissions: '68608',
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Build a renderable guild icon URL from its icon hash. Always requests the static
 * PNG (even for animated `a_…` hashes) so server icons don't animate in the UI.
 */
export function discordIconUrl(guildId: string, iconHash: string): string {
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`;
}

/** Build the Discord authorization URL the browser is redirected to. */
export function buildAuthorizeUrl(state: string): string {
    const config = loadConfig();
    const params = new URLSearchParams({
        client_id: config.discord.clientId,
        redirect_uri: config.discord.redirectUri,
        response_type: 'code',
        scope: OAUTH_SCOPES.join(' '),
        state,
        prompt: 'none',
    });
    return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

/** Exchange the authorization code for an access token. */
export async function exchangeCode(code: string): Promise<DiscordTokenResponse> {
    const config = loadConfig();
    const body = new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: config.discord.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.discord.redirectUri,
    });

    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        throw new Error(`Discord token exchange failed (${res.status})`);
    }
    return (await res.json()) as DiscordTokenResponse;
}

export async function fetchUser(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error(`Discord /users/@me failed (${res.status})`);
    }
    return (await res.json()) as DiscordUser;
}

/** Fetch the user's guilds and flag which ones they can administer. */
export async function fetchGuilds(accessToken: string): Promise<SessionGuild[]> {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error(`Discord /users/@me/guilds failed (${res.status})`);
    }
    const guilds = (await res.json()) as DiscordPartialGuild[];

    return guilds.map((g) => {
        // The guild owner always manages, regardless of the permission bitfield.
        let isAdmin = g.owner === true;
        try {
            const perms = BigInt(g.permissions);
            isAdmin =
                isAdmin ||
                (perms & PERMISSION_ADMINISTRATOR) !== 0n ||
                (perms & PERMISSION_MANAGE_GUILD) !== 0n;
        } catch {
            // keep the owner flag if permission parsing fails
        }
        return { id: g.id, name: g.name, icon: g.icon, isAdmin };
    });
}

/** Fetch multiple users by ID using the bot token, sequential to respect Discord rate limits. */
export async function fetchUsersByIds(
    userIds: string[],
    botToken: string,
): Promise<Map<string, DiscordUser>> {
    const result = new Map<string, DiscordUser>();
    for (const userId of userIds) {
        try {
            const res = await fetch(`${DISCORD_API}/users/${userId}`, {
                headers: { Authorization: `Bot ${botToken}` },
            });
            if (res.status === 429) {
                const retryAfter = parseFloat(res.headers.get('Retry-After') ?? '1');
                await new Promise((r) => setTimeout(r, retryAfter * 1000));
                // Retry once after the cooldown.
                const retry = await fetch(`${DISCORD_API}/users/${userId}`, {
                    headers: { Authorization: `Bot ${botToken}` },
                });
                if (retry.ok) {
                    result.set(userId, (await retry.json()) as DiscordUser);
                }
            } else if (res.ok) {
                result.set(userId, (await res.json()) as DiscordUser);
            }
            // Remaining header: if we've exhausted the bucket, respect the reset.
            const remaining = res.headers.get('X-RateLimit-Remaining');
            const resetAfter = res.headers.get('X-RateLimit-Reset-After');
            if (remaining === '0' && resetAfter) {
                await new Promise((r) => setTimeout(r, parseFloat(resetAfter) * 1000));
            }
        } catch {
            // Skip on network error, try the next user.
        }
    }
    return result;
}

export type { DiscordUser };
