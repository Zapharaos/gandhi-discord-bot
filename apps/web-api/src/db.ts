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
        // Open read-write at the driver level but enforce read-only via PRAGMA
        // query_only. A driver-level `readonly: true` connection is an unreliable
        // WAL reader — in some container/filesystem setups it fails to see the
        // writer's recent commits (e.g. the bot's heartbeat), making the bot look
        // offline even though it isn't. query_only still rejects any write here.
        const sqlite = new SQLite(file, { fileMustExist: true });
        sqlite.pragma('busy_timeout = 5000');
        sqlite.pragma('query_only = ON');

        logger.info({ file }, 'Opened SQLite database (read-only via query_only)');

        instance = new Kysely<DB>({ dialect: new SqliteDialect({ database: sqlite }) });
    }
    return instance;
}

// A SEPARATE read-write connection used ONLY for the signed-in user's own rows:
// their settings (opt-in flags) and their GDPR reset/erasure requests. Every
// other code path uses the read-only connection above. SQLite (WAL +
// busy_timeout) serialises the occasional write against the bot's writes safely
// — see the README "Security & deployment" note.
let writeInstance: Kysely<DB> | null = null;

export function getWriteDb(): Kysely<DB> {
    if (!writeInstance) {
        const config = loadConfig();
        const file = path.join(process.cwd(), config.databaseFile);

        const SQLite = nodeRequire('better-sqlite3') as typeof SQLiteDatabase;
        const sqlite = new SQLite(file, { fileMustExist: true });
        sqlite.pragma('busy_timeout = 5000');

        logger.info({ file }, 'Opened SQLite database read-write for user settings');

        writeInstance = new Kysely<DB>({ dialect: new SqliteDialect({ database: sqlite }) });
    }
    return writeInstance;
}

export async function closeDb(): Promise<void> {
    if (instance) {
        await instance.destroy();
        instance = null;
    }
    if (writeInstance) {
        await writeInstance.destroy();
        writeInstance = null;
    }
}
