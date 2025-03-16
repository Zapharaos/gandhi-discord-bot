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
        let db = await this.sqliteService.getDatabase();

        return new Promise<UserStats | null>((resolve, reject) => {
            const query = `SELECT *
                           FROM user_stats
                           WHERE guild_id = ?
                             AND user_id = ?`;

            db.get(query, [guildID, userID], (err: Error | null, row: UserStats) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryUserStatsInGuild
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.info(Logs.info.queryUserStatsInGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                );
                resolve(row);
            });
        });
    }
}