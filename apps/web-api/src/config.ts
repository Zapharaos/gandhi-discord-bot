// Centralised, validated environment configuration for the web service.
// The web service is deployed independently of the bot, so it reads its own
// env (DISCORD_CLIENT_SECRET, SESSION_SECRET, …) and only shares the SQLite
// file with the bot via a mounted volume.

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function optional(name: string, fallback: string): string {
    const value = process.env[name];
    return value && value.length > 0 ? value : fallback;
}

export interface Config {
    host: string;
    port: number;
    /** Public base URL of this service, used to build the OAuth redirect URI. */
    baseUrl: string;
    /** Where the browser is sent after a successful login (the Angular app). */
    frontendUrl: string;
    /** Path to the SQLite database file, opened read-only. */
    databaseFile: string;
    isProduction: boolean;
    discord: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    /** Secret used to sign the session cookie. */
    sessionSecret: string;
    /** Shared secret the bot must present to push events to /internal/events. */
    internalWsToken: string;
    /** Extra allowed CORS origin (e.g. the Angular dev server); empty to disable. */
    corsOrigin: string;
    /** Discord user ids that are bot operators (BOT_ADMIN_IDS), for the bot-admin area. */
    botAdminIds: string[];
    /** Bot token (DISCORD_TOKEN) used to fetch user identities on demand. Optional — lazy backfill is skipped when absent. */
    discordBotToken: string | null;
}

let cached: Config | null = null;

export function loadConfig(): Config {
    if (cached) return cached;

    const baseUrl = optional('WEB_BASE_URL', 'http://localhost:3001');

    cached = {
        host: optional('WEB_HOST', '0.0.0.0'),
        port: Number.parseInt(optional('WEB_PORT', '3001'), 10),
        baseUrl,
        frontendUrl: optional('WEB_FRONTEND_URL', baseUrl),
        databaseFile: optional('DATABASE_URL', 'data/gandhi-bot.db'),
        isProduction: process.env.NODE_ENV === 'production',
        discord: {
            clientId: required('DISCORD_CLIENT_ID'),
            clientSecret: required('DISCORD_CLIENT_SECRET'),
            redirectUri: optional('DISCORD_OAUTH_REDIRECT_URI', `${baseUrl}/auth/callback`),
        },
        sessionSecret: required('SESSION_SECRET'),
        internalWsToken: required('INTERNAL_WS_TOKEN'),
        corsOrigin: optional('WEB_CORS_ORIGIN', ''),
        botAdminIds: optional('BOT_ADMIN_IDS', '')
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        discordBotToken: process.env['DISCORD_TOKEN'] || null,
    };

    return cached;
}
