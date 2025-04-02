import * as path from 'path'
import { promises as fs  } from 'fs'
import {
    Migrator,
    FileMigrationProvider, SqliteDialect, Kysely,
} from 'kysely'
import SQLite from "better-sqlite3";
import Logs from "../lang/logs.json";
import process from "node:process";

async function migrateToLatest() {
    // Create db folder if not exists
    const dataPath = './data';
    if (!await fs.stat(dataPath).catch(() => false)) {
        await fs.mkdir(dataPath);
        console.info(Logs.info.directoryCreate.replaceAll('{DIRECTORY}', dataPath));
    }

    const defaultDbFilePath = process.env.DATABASE_URL ?? "data/gandhi-bot.db";
    const db = new Kysely<unknown>({
        dialect: new SqliteDialect({
            database: new SQLite(path.join(process.cwd(), defaultDbFilePath)),
        }),
    })

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            // This needs to be an absolute path.
            migrationFolder: path.join(__dirname, '../src/migrations'),
        }),
    })

    const { error, results } = await migrator.migrateToLatest()

    results?.forEach((it) => {
        if (it.status === 'Success') {
            console.info(Logs.info.sqliteMigration.replaceAll('{MIGRATION_NAME}', it.migrationName));
        } else if (it.status === 'Error') {
            console.error(Logs.error.sqliteMigration.replaceAll('{MIGRATION_NAME}', it.migrationName));
        }
    })

    await db.destroy()

    if (error) {
        console.error(Logs.error.databaseMigration, error);
        process.exit(1)
    }
}

migrateToLatest()