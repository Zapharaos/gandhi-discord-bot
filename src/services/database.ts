import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import path from "path";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {DB} from "../types/db";
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

    return new SqliteDialect({
        database: new SQLite(path.join(process.cwd(), defaultDbFilePath)),
    })
}