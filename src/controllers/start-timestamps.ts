import {SQLiteService} from "@services/sqlite-service";
import {Logger} from "@services/logger";
import Logs from '../../lang/logs.json';
import {StartTimestamps, StatKey} from "@models/database/start_timestamps";

export class StartTimestampsController {
    private sqliteService: SQLiteService;

    constructor() {
        this.sqliteService = SQLiteService.getInstance();
    }

    async getUserByGuild(guildID: string, userID: string): Promise<StartTimestamps> {
        const db = await this.sqliteService.getDatabase();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return {} as StartTimestamps;
        }

        return new Promise<StartTimestamps>((resolve, reject) => {
            const query = `SELECT *
                           FROM start_timestamps
                           WHERE guild_id = ?
                             AND user_id = ?
                             AND start_connected IS NOT 0`;

            db.get(query, [guildID, userID], (err: Error | null, row: StartTimestamps) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStartTsUserInGuild
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryStartTsUserInGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                );
                resolve(new StartTimestamps(row));
            });
        });
    }

    async getUsersInGuildByStat(guildID: string, stat: StatKey | null): Promise<StartTimestamps[]> {
        // If the stat label is null, return an empty array
        if (!stat) {
            return [];
        }

        const db = await this.sqliteService.getDatabase();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

        return new Promise<StartTimestamps[]>((resolve, reject) => {
            const query = `SELECT user_id, start_connected, ${stat}
                           FROM start_timestamps
                           WHERE guild_id = ?
                             AND start_connected IS NOT 0`;

            db.all(query, [guildID], (err: Error | null, rows: StartTimestamps[]) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStartTsUserInGuildByStat
                            .replaceAll('{GUILD_ID}', guildID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryStartTsUserInGuildByStat
                    .replaceAll('{GUILD_ID}', guildID)
                );
                resolve(rows);
            });
        });
    }

    async setStartTimestamp(guildID: string, userID: string, stat: string, timestamp: number): Promise<void> {
        const db = await this.sqliteService.getDatabase();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const query = `INSERT INTO start_timestamps (guild_id, user_id, ${stat})
                           VALUES (?, ?, ?)
                           ON CONFLICT(guild_id, user_id) DO UPDATE SET ${stat} = ?`;

            db.run(query, [guildID, userID, timestamp, timestamp], (err: Error | null) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStartTsSetTimestamp
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                            .replaceAll('{STAT}', stat)
                            .replaceAll('{TIMESTAMP}', timestamp.toString())
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryStartTsSetTimestamp
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                    .replaceAll('{STAT}', stat)
                    .replaceAll('{TIMESTAMP}', timestamp.toString())
                );
                resolve();
            });
        });
    }
}