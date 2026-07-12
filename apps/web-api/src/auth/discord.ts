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
        let isAdmin = false;
        try {
            const perms = BigInt(g.permissions);
            isAdmin =
                (perms & PERMISSION_ADMINISTRATOR) !== 0n ||
                (perms & PERMISSION_MANAGE_GUILD) !== 0n;
        } catch {
            isAdmin = false;
        }
        return { id: g.id, name: g.name, icon: g.icon, isAdmin };
    });
}

export type { DiscordUser };
