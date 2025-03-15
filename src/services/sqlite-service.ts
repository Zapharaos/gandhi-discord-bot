import { Logger } from '@services/logger';
import fs from 'fs';
import path from "path";
import sqlite3, {Database} from "sqlite3";
import {LocalMigration} from "@models/database/migration";
import Logs from "../../lang/logs.json";

export class SQLiteService {
    private db: Database | null = null;

    async connect(dbFilePath: string): Promise<void> {
        Logger.info(Logs.info.sqliteConnect.replaceAll('{DATABASE}', dbFilePath));

        // Create db folder if not exists
        const dataPath = './data';
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath);
            Logger.info(Logs.info.directoryCreate.replaceAll('{DIRECTORY}', dataPath));
        }

        // Connect to the database
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(path.join(process.cwd(), dbFilePath), (err) => {
                if (err) {
                    Logger.error(Logs.error.sqliteConnect, err);
                    reject(err);
                    return;
                }
                Logger.info(Logs.info.sqliteConnected);

                // Ensure the migrations table exists
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS migrations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE
                    )
                `, (err) => {
                    if (err) {
                        Logger.error('table', err);
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
        }
    }

    async getAppliedMigrations(): Promise<string[]> {
        if (!this.db) {
            throw new Error('Database connection is not established.');
        }

        return new Promise((resolve, reject) => {
            this.db.all(`SELECT name FROM migrations`, (err: Error | null, rows: {name: string}[]) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });
    }

    applyMigration(migration: LocalMigration): Promise<void> {
        if (!this.db) {
            throw new Error('Database connection is not established.');
        }

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");

                migration.up.forEach(query => {
                    this.db.run(query, (err: Error | null) => {
                        if (err) {
                            this.db.run("ROLLBACK");
                            Logger.error(Logs.error.sqliteMigration.replaceAll('{MIGRATION_NAME}', migration.name));
                            reject(err);
                            return;
                        }
                    });
                });

                this.db.run(`INSERT INTO migrations (name) VALUES (?)`, [migration.name], (err: Error | null) => {
                    if (err) {
                        this.db.run("ROLLBACK");
                        Logger.error(Logs.error.sqliteMigration.replaceAll('{MIGRATION_NAME}', migration.name));
                        reject(err);
                        return;
                    }

                    this.db.run("COMMIT");
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