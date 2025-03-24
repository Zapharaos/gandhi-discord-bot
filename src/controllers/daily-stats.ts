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

    async updateUserDailyStats(guildID: string, userID: string, stat: string, duration: number, now: number): Promise<void> {
        const db = await this.sqliteService.getDatabase();

        // Generic function to call to update the daily stats
        async function update(date: number, duration: number): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                db.run(`
                    INSERT INTO daily_stats (guild_id, user_id, day_timestamp, ${stat})
                    VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id, day_timestamp) DO
                    UPDATE SET ${stat} = ${stat} + ?
                `, [guildID, userID, date, duration, duration], function (err: Error | null) {
                    if (err) {
                        Logger.error(
                            Logs.error.queryDailyStatsUpdateUser
                                .replaceAll('{GUILD_ID}', guildID)
                                .replaceAll('{USER_ID}', userID)
                                .replaceAll('{STAT_KEY}', stat)
                            , err);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        }

        const days = [];
        let remainingDuration = duration;
        let dayMax = now;
        let dayMin = new Date(now).setUTCHours(0, 0, 0, 0);

        // Split the duration into days
        while (remainingDuration > 0) {
            // Calculate the duration for the current day
            const dayDuration = Math.min(remainingDuration, dayMax - dayMin);

            // Update the remaining durations to split
            remainingDuration -= dayDuration;

            // Create day object and add it to the list
            days.push({
                date: dayDuration,
                duration: "",
            });

            // Update the processed day limits
            dayMax = dayMin;
            dayMin = new Date(dayMin).setUTCHours(-24, 0, 0, 0); // Start of previous day
        }

        // Update the daily stats for each day
        for (const day of days) {
            await update(day.date, day.duration);
        }
    }
}