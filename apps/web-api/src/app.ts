import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { loadConfig } from './config';
import { registerAuthRoutes } from './auth/routes';
import { registerStatsRoutes } from './stats/routes';
import { registerExportRoutes } from './export/routes';
import { registerAdminRoutes } from './admin/routes';
import { registerRankingRoutes } from './ranking/routes';
import { registerStatusRoutes } from './status/routes';
import { registerSettingsRoutes } from './settings/routes';
import { registerWsRoutes } from './ws/routes';

export async function buildApp(): Promise<FastifyInstance> {
    const config = loadConfig();

    // Configure logging via options (not a concrete pino instance) so the Fastify
    // instance keeps its default FastifyBaseLogger type and stays assignable to
    // the plain FastifyInstance our route registrars accept.
    const app = Fastify({
        trustProxy: true,
        bodyLimit: 64 * 1024, // this API takes no large bodies; cap to blunt abuse
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

    // Security headers. The service serves only JSON + WebSocket (the SPA is a
    // separate origin), so helmet's defaults are appropriate as-is.
    await app.register(helmet, { global: true });

    // Basic rate limiting to blunt brute-force / abuse. /health is exempt so
    // orchestrator probes are never throttled.
    await app.register(rateLimit, {
        max: 300,
        timeWindow: '1 minute',
        allowList: (req) => req.url === '/health',
    });

    // Signed cookies back the session and OAuth-state cookies.
    await app.register(cookie, { secret: config.sessionSecret });

    // CORS is only needed when the SPA is served from a different origin (dev:
    // the Angular dev server). In production the SPA is same-origin, so no CORS.
    if (config.corsOrigin) {
        await app.register(cors, {
            origin: config.corsOrigin,
            credentials: true,
            methods: ['GET', 'POST'],
        });
    }

    await app.register(websocket);

    // Never leak internals: log the real error, return a generic shape.
    app.setErrorHandler((error: FastifyError, request, reply) => {
        const status = error.statusCode ?? 500;
        if (status >= 500) {
            request.log.error({ err: error }, 'Unhandled error');
            return reply.code(500).send({ error: 'internal_error' });
        }
        return reply.code(status).send({ error: error.code ?? 'request_error', message: error.message });
    });

    app.setNotFoundHandler((_request, reply) => {
        reply.code(404).send({ error: 'not_found' });
    });

    app.get('/health', async () => ({ status: 'ok' }));

    await registerAuthRoutes(app);
    await registerStatsRoutes(app);
    await registerExportRoutes(app);
    await registerAdminRoutes(app);
    await registerRankingRoutes(app);
    await registerStatusRoutes(app);
    await registerSettingsRoutes(app);
    await registerWsRoutes(app);

    return app;
}
