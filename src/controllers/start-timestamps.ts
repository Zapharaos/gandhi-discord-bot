import {SQLiteService} from "@services/sqlite-service";
import {Logger} from "@services/logger";
import Logs from '../../lang/logs.json';

export class StartTimestampsController {
    private sqliteService: SQLiteService;

    constructor() {
        this.sqliteService = SQLiteService.getInstance();
    }

    async getStartTimestamps(guildID: string, userID: string): Promise<any> {
        let db = await this.sqliteService.getDatabase();

        return new Promise<any>((resolve, reject) => {
            const query = `SELECT *
                           FROM start_timestamps
                           WHERE guild_id = ?
                             AND user_id = ?
                             AND start_connected IS NOT 0`;

            db.get(query, [guildID, userID], (err: Error | null, row: any) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryUserStartTsInGuild
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryUserStartTsInGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                );
                resolve(row);
            });
        });
    }
}