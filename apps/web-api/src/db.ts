import path from 'node:path';
import { createRequire } from 'node:module';
import type SQLiteDatabase from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { DB } from '@gandhi/core/types/db';
import { loadConfig } from './config';
import { logger } from './logger';

// The bot is the sole writer; this service opens the same SQLite file read-only.
// WAL (enabled by the bot) lets us read concurrently without blocking the writer.
let instance: Kysely<DB> | null = null;

// Load the native better-sqlite3 binding lazily (on first query) rather than at
// import time. This lets the HTTP server boot — and serve /health and the auth
// layer — even before a database connection is ever opened, and keeps the native
// module out of the import graph for tests that don't touch the database.
const nodeRequire = createRequire(__filename);

export function getDb(): Kysely<DB> {
    if (!instance) {
        const config = loadConfig();
        const file = path.join(process.cwd(), config.databaseFile);

        const SQLite = nodeRequire('better-sqlite3') as typeof SQLiteDatabase;
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
