import {SQLiteService} from "@services/sqlite-service";
import {DailyStats} from "@models/database/daily_stats";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";

export class DailyStatsController {
    private sqliteService: SQLiteService;

    constructor() {
        this.sqliteService = SQLiteService.getInstance();
    }

    async getTotalForUsersInGuildByStat(guildID: string, stat: string): Promise<DailyStats[]> {
        const db = await this.sqliteService.getDatabase();

        return new Promise<DailyStats[]>((resolve, reject) => {
            const query = ` SELECT day_timestamp, SUM(time_connected) as time_connected, SUM(${stat}) as ${stat}
                            FROM daily_stats
                            WHERE guild_id = ?
                            GROUP BY day_timestamp`;

            db.get(query, [guildID], (err: Error | null, rows: DailyStats[]) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryDailyStatsTotalUsersInGuildByStat
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{STAT_KEY}', stat)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryDailyStatsTotalUsersInGuildByStat
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{STAT_KEY}', stat)
                );
                resolve(rows);
            });
        });
    }

    async getUserInGuildByStat(guildID: string, userID: string, stat: string): Promise<DailyStats[]> {
        const db = await this.sqliteService.getDatabase();

        return new Promise<DailyStats[]>((resolve, reject) => {
            const query = ` SELECT day_timestamp, time_connected, ${stat}
                            FROM daily_stats
                            WHERE guild_id = ?
                            AND user_id = ?
                            GROUP BY day_timestamp`;

            db.get(query, [guildID, userID], (err: Error | null, rows: DailyStats[]) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryDailyStatsUserInGuildByStat
                            .replaceAll('{USER_ID}', userID)
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryDailyStatsUserInGuildByStat
                    .replaceAll('{USER_ID}', userID)
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                );
                resolve(rows);
            });
        });
    }
}