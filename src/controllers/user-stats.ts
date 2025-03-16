import {SQLiteService} from "@services/sqlite-service";
import {UserStats} from "@models/database/user_stats";
import {Logger} from "@services/logger";
import Logs from '../../lang/logs.json';

export class UserStatsController {
    private sqliteService: SQLiteService;

    constructor() {
        this.sqliteService = SQLiteService.getInstance();
    }

    async getUserInGuild(guildID: string, userID: string): Promise<UserStats | null> {
        const db = await this.sqliteService.getDatabase();

        return new Promise<UserStats | null>((resolve, reject) => {
            const query = `SELECT *
                           FROM user_stats
                           WHERE guild_id = ?
                             AND user_id = ?`;

            db.get(query, [guildID, userID], (err: Error | null, row: UserStats) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStatsUserInGuild
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryStatsUserInGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                );
                resolve(row);
            });
        });
    }

    async getUsersInGuildByStat(guildID: string, stat: string): Promise<UserStats[]> {
        const db = await this.sqliteService.getDatabase();

        return new Promise<UserStats[]>((resolve, reject) => {
            const query = `SELECT *
                           FROM user_stats
                           WHERE guild_id = ?`;

            db.all(query, [guildID], (err: Error | null, rows: UserStats[]) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStatsUserInGuildByStat
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{STAT_KEY}', stat)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryStatsUserInGuildByStat
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{STAT_KEY}', stat)
                );
                resolve(rows);
            });
        });
    }
}