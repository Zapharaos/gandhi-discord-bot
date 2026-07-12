import path from 'node:path';
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { DB } from '@gandhi/core/types/db';
import { loadConfig } from './config';
import { logger } from './logger';

// The bot is the sole writer; this service opens the same SQLite file read-only.
// WAL (enabled by the bot) lets us read concurrently without blocking the writer.
let instance: Kysely<DB> | null = null;

export function getDb(): Kysely<DB> {
    if (!instance) {
        const config = loadConfig();
        const file = path.join(process.cwd(), config.databaseFile);

        const sqlite = new SQLite(file, { readonly: true, fileMustExist: true });
        // Defensive: guarantee no write can ever be issued from this process.
        sqlite.pragma('query_only = ON');
        sqlite.pragma('busy_timeout = 5000');

        logger.info({ file }, 'Opened SQLite database read-only');

        instance = new Kysely<DB>({ dialect: new SqliteDialect({ database: sqlite }) });
    }
    return instance;
}

export async function closeDb(): Promise<void> {
    if (instance) {
        await instance.destroy();
        instance = null;
    }
}
