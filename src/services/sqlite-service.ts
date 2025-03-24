import { Logger } from '@services/logger';
import fs from 'fs';
import path from "path";
import sqlite3, {Database} from "sqlite3";
import {LocalMigration} from "@models/database/migration";
import Logs from "../../lang/logs.json";

const defaultDbFilePath = process.env.DB_PATH ?? "data/gandhi-bot.db";

export class SQLiteService {

    private static instance: SQLiteService;
    private db: Database | null = null;

    private constructor() {}

    public static getInstance(): SQLiteService {
        if (!SQLiteService.instance) {
            SQLiteService.instance = new SQLiteService();
        }
        return SQLiteService.instance;
    }

    async getDatabase(): Promise<Database | null> {
        if (!this.db) {
            await this.connect();
            Logger.debug(Logs.debug.sqliteConnected);
        }
        return this.db;
    }

    async connect(log: boolean = false, dbFilePath: string = defaultDbFilePath): Promise<void> {
        if (log) Logger.info(Logs.info.sqliteConnect.replaceAll('{DATABASE}', dbFilePath));

        // Create db folder if not exists
        const dataPath = './data';
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath);
            if (log) Logger.info(Logs.info.directoryCreate.replaceAll('{DIRECTORY}', dataPath));
        }

        // Connect to the database
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(path.join(process.cwd(), dbFilePath), (err) => {
                if (err) {
                    Logger.error(Logs.error.sqliteConnect, err);
                    reject(err);
                    return;
                }

                if (!db) {
                    reject(new Error('Database connection is not established.'))
                    return;
                }

                this.db = db;
                if (log) Logger.info(Logs.info.sqliteConnected);

                // Ensure the migrations table exists
                db.run(`
                    CREATE TABLE IF NOT EXISTS migrations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            });
        })
    }

    close(): void {
        if (this.db) {
            Logger.info(Logs.info.sqliteDisconnect);
            this.db.close();
            this.db = null;
        }
    }

    async getAppliedMigrations(): Promise<string[]> {
        const db = this.db;
        if (!db) {
            throw new Error('Database connection is not established.');
        }

        return new Promise((resolve, reject) => {
            db.all(`SELECT name FROM migrations`, (err: Error | null, rows: {name: string}[]) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });
    }

    applyMigration(migration: LocalMigration): Promise<void> {
        const db = this.db;
        if (!db) {
            throw new Error('Database connection is not established.');
        }

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                migration.up.forEach(query => {
                    db.run(query, (err: Error | null) => {
                        if (err) {
                            db.run("ROLLBACK");
                            Logger.error(Logs.error.sqliteMigration.replaceAll('{MIGRATION_NAME}', migration.name));
                            reject(err);
                            return;
                        }
                    });
                });

                db.run(`INSERT INTO migrations (name) VALUES (?)`, [migration.name], (err: Error | null) => {
                    if (err) {
                        db.run("ROLLBACK");
                        Logger.error(Logs.error.sqliteMigration.replaceAll('{MIGRATION_NAME}', migration.name));
                        reject(err);
                        return;
                    }

                    db.run("COMMIT");
                    Logger.info(Logs.info.sqliteMigration.replaceAll('{MIGRATION_NAME}', migration.name));
                    resolve();
                });
            });
        });
    }

    serialize(callback: () => void): void {
        if (!this.db) {
            throw new Error('Database connection is not established.');
        }

        this.db.serialize(callback);
    }
}