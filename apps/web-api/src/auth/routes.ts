import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { logger } from '../logger';
import { buildAuthorizeUrl, exchangeCode, fetchGuilds, fetchUser } from './discord';
import { createSession, destroySession, SESSION_COOKIE } from './sessions';
import { requireAuth, resolveSession } from './guard';
import { resolveUserGuilds } from '../me/guilds';

const STATE_COOKIE = 'gandhi_oauth_state';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
    const config = loadConfig();

    const secureCookie = config.baseUrl.startsWith('https://');
    const baseCookieOpts = {
        path: '/',
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax' as const,
        signed: true,
    };

    // Step 1 — send the browser to Discord with a CSRF state cookie.
    app.get('/auth/login', async (request, reply) => {
        const state = randomUUID();
        reply.setCookie(STATE_COOKIE, state, { ...baseCookieOpts, maxAge: 600 });
        return reply.redirect(buildAuthorizeUrl(state));
    });

    // Step 2 — Discord redirects back with a code; verify state, create a session.
    app.get<{ Querystring: { code?: string; state?: string } }>('/auth/callback', async (request, reply) => {
        const { code, state } = request.query;

        const rawState = request.cookies[STATE_COOKIE];
        const unsignedState = rawState ? request.unsignCookie(rawState) : { valid: false, value: null };
        reply.clearCookie(STATE_COOKIE, { path: '/' });

        if (!code || !state || !unsignedState.valid || unsignedState.value !== state) {
            return reply.code(400).send({ error: 'invalid_oauth_state' });
        }

        try {
            const token = await exchangeCode(code);
            const [user, guilds] = await Promise.all([
                fetchUser(token.access_token),
                fetchGuilds(token.access_token),
            ]);

            const { id } = createSession({
                userId: user.id,
                username: user.username,
                globalName: user.global_name,
                avatar: user.avatar,
                guilds,
                guildsFetchedAt: Date.now(),
            });

            reply.setCookie(SESSION_COOKIE, id, { ...baseCookieOpts, maxAge: 7 * 24 * 60 * 60 });
            return reply.redirect(config.frontendUrl);
        } catch (err) {
            logger.error({ err }, 'OAuth callback failed');
            return reply.code(502).send({ error: 'oauth_failed' });
        }
    });

    // Log out — destroy the session and clear the cookie.
    app.post('/auth/logout', async (request, reply) => {
        const raw = request.cookies[SESSION_COOKIE];
        const unsigned = raw ? request.unsignCookie(raw) : { valid: false, value: null };
        if (unsigned.valid && unsigned.value) destroySession(unsigned.value);
        reply.clearCookie(SESSION_COOKIE, { path: '/' });
        return { ok: true };
    });

    // Current user + the guilds worth showing (bot present or the user has data),
    // each annotated with hasData / botPresent / isAdmin and an icon URL.
    app.get('/api/me', { preHandler: requireAuth }, async (request) => {
        const session = request.authSession!;
        return {
            user: {
                id: session.userId,
                username: session.username,
                globalName: session.globalName,
                avatar: session.avatar,
            },
            // Bot operators (BOT_ADMIN_IDS) — distinct from Discord server admins.
            isBotAdmin: config.botAdminIds.includes(session.userId),
            guilds: await resolveUserGuilds(session),
        };
    });

    // Lightweight auth probe for the SPA (does not require the guard).
    app.get('/api/session', async (request) => {
        const session = resolveSession(request);
        return { authenticated: !!session };
    });
}
