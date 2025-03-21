import {SQLiteService} from "@services/sqlite-service";
import process from "node:process";
import {LocalMigration} from "@models/database/migration";
import fs from "fs";
import {pathToFileURL} from "url";
import path from "path";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";

export class DatabaseMigrationService {

    private migrationsPath = path.join(process.cwd(), 'migrations');
    private fileExtension = '.js';

    constructor() {
    }

    public async process(): Promise<void> {
        // TODO : handle args for different db types
        // TODO : handle down migrations
        await this.migrateSqlite();
    }

    private async migrateSqlite(): Promise<void> {
        Logger.info(Logs.info.sqliteMigrate);

        const sqliteService = SQLiteService.getInstance();
        await sqliteService.connect(true);

        // Get local migrations and applied migrations
        const localMigrations = this.getLocalMigrations(this.migrationsPath, this.fileExtension);
        const appliedMigrations = await sqliteService.getAppliedMigrations();
        const remainingMigrations = localMigrations.filter(migration => !appliedMigrations.some((applied: string) => migration.includes(applied)));

        Logger.debug('localMigrations = ' + this.formatFileList(localMigrations));
        Logger.debug('appliedMigrations = ' + this.formatFileList(appliedMigrations));
        Logger.debug('remainingMigrations = ' + this.formatFileList(remainingMigrations));

        // Apply remaining migrations
        sqliteService.serialize(async () => {
            for (const fileName of remainingMigrations) {
                const migration = await this.formatFileToLocalMigration(fileName);
                await sqliteService.applyMigration(migration);
            }
        });
    }

    private getLocalMigrations(path: string, extension: string): string[] {
        return fs.readdirSync(path).filter(file => file.endsWith(extension));
    }

    private async formatFileToLocalMigration(name: string): Promise<LocalMigration> {
        const file = await import(pathToFileURL(path.join(this.migrationsPath, name)).href);
        return {
            name: file.name,
            up: file.up,
            down: file.down,
        }
    }

    private formatFileList(files: string[]): string {
        return files.length > 0
            ? files.map((file: string) => `'${file}'`).join(', ')
            : 'N/A';
    }
}