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
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return null;
        }

        return new Promise<UserStats | null>((resolve, reject) => {
            const query = `SELECT *
                           FROM user_stats
                           WHERE guild_id = ?
                             AND user_id = ?`;

            db.get(query, [guildID, userID], (err: Error | null, row: UserStats | null) => {
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
                resolve(row ? new UserStats(row) : null);
            });
        });
    }

    async getUsersInGuildByStat(guildID: string, stat: string): Promise<UserStats[]> {
        const db = await this.sqliteService.getDatabase();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

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

    async updateUserStats(guildID: string, userID: string, stat: string, value: number): Promise<void> {
        const db = await this.sqliteService.getDatabase();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const query = `INSERT INTO user_stats (guild_id, user_id, ${stat})
                           VALUES (?, ?, ?)
                               ON CONFLICT(guild_id, user_id) DO UPDATE SET ${stat} = ${stat} + ?`;

            db.run(query, [guildID, userID, value, value], (err: Error | null) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStatsUserUpdateStat
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                            .replaceAll('{STAT_KEY}', stat)
                            .replaceAll('{STAT_VALUE}', value.toString())
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryStatsUserUpdateStat
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                    .replaceAll('{STAT_KEY}', stat)
                    .replaceAll('{STAT_VALUE}', value.toString())
                );
                resolve();
            });
        });
    }

    async updateLastActivityAndStreak(guildID: string, userID: string, timestamp: number): Promise<void> {
        const db = await this.sqliteService.getDatabase();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const query = `
                SELECT last_activity, daily_streak
                FROM user_stats
                WHERE guild_id = ?
                  AND user_id = ?`;

            db.get(query, [guildID, userID], (err: Error | null, row: UserStats) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStatsUserGetActivityStreak
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                        , err);
                    reject(err);
                    return;
                }

                Logger.debug(Logs.debug.queryStatsUserGetActivityStreak
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                );

                let newStreak = 1;
                if (row) {
                    const lastActivityDate = new Date(row.last_activity).setUTCHours(0, 0, 0, 0);
                    const currentDate = new Date(timestamp).setUTCHours(0, 0, 0, 0);
                    const oneDay = 24 * 60 * 60 * 1000;

                    if (currentDate - lastActivityDate === oneDay) {
                        newStreak = row.daily_streak + 1;
                    } else if (currentDate - lastActivityDate > oneDay) {
                        newStreak = 1;
                    } else {
                        newStreak = row.daily_streak;
                    }
                }

                const updateQuery = `
                    INSERT INTO user_stats (guild_id, user_id, daily_streak, last_activity)
                    VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id) DO
                    UPDATE SET daily_streak = ?, last_activity = ?`;

                db.run(updateQuery, [guildID, userID, newStreak, timestamp, newStreak, timestamp], (err: Error | null) => {
                    if (err) {
                        Logger.error(
                            Logs.error.queryStatsUserSetActivityStreak
                                .replaceAll('{GUILD_ID}', guildID)
                                .replaceAll('{USER_ID}', userID)
                            , err);
                        reject(err);
                        return;
                    }
                    Logger.debug(Logs.debug.queryStatsUserSetActivityStreak
                        .replaceAll('{GUILD_ID}', guildID)
                        .replaceAll('{USER_ID}', userID)
                    );
                    resolve();
                });
            });
        });
    }

    async incrementTotalJoins(guildID: string, userID: string): Promise<void> {
        const db = await this.sqliteService.getDatabase();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const query = `INSERT INTO user_stats (guild_id, user_id, total_joins)
                           VALUES (?, ?, 1)
                           ON CONFLICT(guild_id, user_id) DO UPDATE SET total_joins = total_joins + 1`;

            db.run(query, [guildID, userID], (err: Error | null) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryStatsUserIncrementTotalJoins
                            .replaceAll('{GUILD_ID}', guildID)
                            .replaceAll('{USER_ID}', userID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryStatsUserIncrementTotalJoins
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                );
                resolve();
            });
        });
    }
}