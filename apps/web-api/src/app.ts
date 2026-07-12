import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { loadConfig } from './config';
import { registerAuthRoutes } from './auth/routes';
import { registerStatsRoutes } from './stats/routes';
import { registerWsRoutes } from './ws/routes';

export async function buildApp(): Promise<FastifyInstance> {
    const config = loadConfig();

    // Configure logging via options (not a concrete pino instance) so the Fastify
    // instance keeps its default FastifyBaseLogger type and stays assignable to
    // the plain FastifyInstance our route registrars accept.
    const app = Fastify({
        trustProxy: true,
        logger: {
            level: config.isProduction ? 'info' : 'debug',
            ...(config.isProduction
                ? {}
                : {
                      transport: {
                          target: 'pino-pretty',
                          options: { colorize: true, ignore: 'pid,hostname', translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o' },
                      },
                  }),
        },
    });

    // Signed cookies back the session and OAuth-state cookies.
    await app.register(cookie, { secret: config.sessionSecret });

    // CORS is only needed when the SPA is served from a different origin (dev:
    // the Angular dev server). In production the SPA is same-origin, so no CORS.
    if (config.corsOrigin) {
        await app.register(cors, { origin: config.corsOrigin, credentials: true });
    }

    await app.register(websocket);

    app.get('/health', async () => ({ status: 'ok' }));

    await registerAuthRoutes(app);
    await registerStatsRoutes(app);
    await registerWsRoutes(app);

    return app;
}
