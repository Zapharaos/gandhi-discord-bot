import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import path from "path";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {DB} from "@gandhi/core/types/db";
import { promises as fs  } from 'fs'

// Declare a global variable to store the DB instance
let dbInstance: Kysely<DB> | null = null;

// Singleton pattern to ensure only one DB instance is created
export async function getDb(): Promise<Kysely<DB>> {
    if (!dbInstance) {
        const dialect = await setupSqliteDialect();

        // Database interface is passed to Kysely's constructor, and from now on, Kysely knows your database structure.
        // Dialect is passed to Kysely's constructor, and from now on, Kysely knows how to communicate with your database.
        dbInstance = new Kysely<DB>({ dialect });
    }
    return dbInstance;
}

async function setupSqliteDialect(): Promise<SqliteDialect> {
    const defaultDbFilePath = process.env.DATABASE_URL ?? "data/gandhi-bot.db";

    // Create db folder if not exists
    const dataPath = './data';
    if (!await fs.stat(dataPath).catch(() => false)) {
        await fs.mkdir(dataPath);
        console.info(Logs.info.directoryCreate.replaceAll('{DIRECTORY}', dataPath));
    }

    Logger.info(Logs.info.sqliteConnect.replaceAll('{DATABASE}', defaultDbFilePath));

    const sqlite = new SQLite(path.join(process.cwd(), defaultDbFilePath));

    // Rollback journal (DELETE), NOT WAL. WAL relies on a shared-memory index
    // (-shm + mmap) that is unreliable on Windows/DrvFs bind mounts and can leave a
    // stuck lock that hangs every writer. The classic rollback journal uses plain
    // file locks, which work there; busy_timeout serialises the bot's writes against
    // the web service's reads. (On a native/ext4 volume, WAL would be preferable.)
    sqlite.pragma('journal_mode = DELETE');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('foreign_keys = ON');

    return new SqliteDialect({
        database: sqlite,
    })
}