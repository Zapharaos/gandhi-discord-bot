import 'dotenv/config';
import { buildApp } from './app';
import { loadConfig } from './config';
import { logger } from './logger';
import { closeDb } from './db';
import { startSessionSweeper } from './auth/sessions';

async function main(): Promise<void> {
    const config = loadConfig();
    const app = await buildApp();

    startSessionSweeper();

    const shutdown = async (signal: string): Promise<void> => {
        logger.info({ signal }, 'Shutting down web service');
        try {
            await app.close();
            await closeDb();
        } finally {
            process.exit(0);
        }
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    await app.listen({ host: config.host, port: config.port });
    logger.info({ url: config.baseUrl }, 'Web service listening');
}

main().catch((err) => {
    logger.error({ err }, 'Failed to start web service');
    process.exit(1);
});
