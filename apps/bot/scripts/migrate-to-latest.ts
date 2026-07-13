import * as path from 'path'
import { promises as fs  } from 'fs'
import {
    Migrator,
    FileMigrationProvider, Kysely, SqliteDialect,
} from 'kysely'
import Logs from "../lang/logs.json";
import process from "node:process";
import SQLite from "better-sqlite3";

async function migrateToLatest() {

    // Create db folder if not exists
    const dataPath = './data';
    if (!await fs.stat(dataPath).catch(() => false)) {
        await fs.mkdir(dataPath);
        console.info(Logs.info.directoryCreate.replaceAll('{DIRECTORY}', dataPath));
    }

    // Get the database instance
    const defaultDbFilePath = process.env.DATABASE_URL ?? "data/gandhi-bot.db";
    const sqlite = new SQLite(path.join(process.cwd(), defaultDbFilePath));
    // Use the classic rollback journal (see database.ts for why WAL is avoided on
    // Windows/DrvFs bind mounts). Running this on a currently-WAL DB checkpoints and
    // converts it to DELETE mode. busy_timeout bounds any lock wait.
    sqlite.pragma('journal_mode = DELETE');
    sqlite.pragma('busy_timeout = 10000');
    const db = new Kysely<unknown>({
        dialect: new SqliteDialect({
            database: sqlite,
        }),
    })

    console.info('Running database migrations...');

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            // This needs to be an absolute path.
            migrationFolder: path.join(__dirname, '../src/migrations'),
        }),
    })

    // Instrumentation: list what the migrator sees (this reads the folder AND the
    // kysely_migration table — if it hangs HERE, it's a DB read/lock problem).
    console.info('Reading migration state...');
    const known = await migrator.getMigrations();
    const pending = known.filter((m) => !m.executedAt);
    console.info(`Found ${known.length} migration(s), ${pending.length} pending.`);

    // Skip migrateToLatest entirely when nothing is pending. This avoids the
    // migrator's lock/transaction path (which was hanging), and lets the bot boot.
    if (pending.length === 0) {
        console.info('No pending migrations — nothing to apply.');
        await db.destroy();
        return;
    }

    console.info(`Applying ${pending.length} pending migration(s): ${pending.map((m) => m.name).join(', ')}`);
    const timeout = new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error('Migration timed out after 60s — likely a locked/hung database file.')), 60_000),
    );
    const { error, results } = (await Promise.race([migrator.migrateToLatest(), timeout])) as Awaited<
        ReturnType<typeof migrator.migrateToLatest>
    >;

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

migrateToLatest().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});