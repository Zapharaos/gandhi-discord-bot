import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {getDb} from '@services/database'
import {DailyStats, DB} from '../types/db'
import {ExpressionBuilder} from "kysely";
import {StatKey} from "@models/database/daily_stats";

export class DailyStatsController {

    static async getTotalForUsersInGuildByStat(guildID: string, stat: string): Promise<DailyStats[]> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

        try {
            const result = await db
                .selectFrom('daily_stats')
                .select([
                    'day_timestamp',
                    db.fn.sum('time_connected').as('time_connected'),
                    db.fn.sum(db.dynamic.ref<StatKey>(stat)).as(stat)
                ])
                .where('guild_id', '=', guildID)
                .groupBy('day_timestamp')
                .execute();

            Logger.debug(Logs.debug.queryDailyStatsTotalUsersInGuildByStat
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{STAT_KEY}', stat)
            );

            return result as unknown as DailyStats[];
        } catch (err) {
            await Logger.error(
                Logs.error.queryDailyStatsTotalUsersInGuildByStat
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{STAT_KEY}', stat)
                , err);
            return [];
        }
    }

    static async getUserInGuildByStat(guildID: string, userID: string, stat: string): Promise<DailyStats[]> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

        try {
            const result = await db
                .selectFrom('daily_stats')
                .select([
                    'day_timestamp',
                    'time_connected',
                    db.dynamic.ref<StatKey>(stat)
                ])
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .groupBy('day_timestamp')
                .execute();

            Logger.debug(Logs.debug.queryDailyStatsUserInGuildByStat
                .replaceAll('{USER_ID}', userID)
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{STAT_KEY}', stat)
            );

            return result as unknown as DailyStats[];
        } catch (err) {
            await Logger.error(
                Logs.error.queryDailyStatsUserInGuildByStat
                    .replaceAll('{USER_ID}', userID)
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{STAT_KEY}', stat)
                , err);
            return [];
        }
    }

    static async updateUserDailyStats(guildID: string, userID: string, stat: string, duration: number, now: number): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
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
                date: dayMin,
                duration: dayDuration,
            });

            // Update the processed day limits
            dayMax = dayMin;
            dayMin = new Date(dayMin).setUTCHours(-24, 0, 0, 0); // Start of previous day
        }

        // Update the daily stats for each day
        for (const day of days) {
            try {
                await db
                    .insertInto('daily_stats')
                    .values({
                        guild_id: guildID,
                        user_id: userID,
                        day_timestamp: day.date,
                        [stat]: day.duration,
                    })
                    .onConflict((oc) => oc
                        .columns(['guild_id', 'user_id', 'day_timestamp'])
                        .doUpdateSet({
                            [stat]: (eb: ExpressionBuilder<DB, 'daily_stats'>) => eb(db.dynamic.ref<StatKey>(stat), '+', day.duration),
                        })
                    )
                    .execute();
            } catch (err) {
                await Logger.error(
                    Logs.error.queryDailyStatsUpdateUser
                        .replaceAll('{GUILD_ID}', guildID)
                        .replaceAll('{USER_ID}', userID)
                        .replaceAll('{STAT_KEY}', stat)
                    , err);
            }

        }
    }

    /**
     * Returns every daily_stats row linked to a user (right to access / portability).
     * Scoped to guildID when provided, otherwise every server.
     */
    static async getUserData(userID: string, guildID?: string): Promise<DailyStats[]> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

        try {
            let query = db.selectFrom('daily_stats').selectAll().where('user_id', '=', userID);
            if (guildID) {
                query = query.where('guild_id', '=', guildID);
            }
            const rows = await query.execute();
            return rows as unknown as DailyStats[];
        } catch (err) {
            await Logger.error(`Error exporting daily_stats for user ${userID}${guildID ? ` in guild ${guildID}` : ' (all guilds)'}`, err);
            return [];
        }
    }

    /**
     * Erases a user's daily history (right to erasure). Scoped to guildID when
     * provided, otherwise every server. Returns the number of rows deleted.
     */
    static async deleteUserData(userID: string, guildID?: string): Promise<number> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return 0;
        }

        try {
            let query = db.deleteFrom('daily_stats').where('user_id', '=', userID);
            if (guildID) {
                query = query.where('guild_id', '=', guildID);
            }
            const result = await query.execute();
            const affected = result.reduce((sum, r) => sum + Number(r.numDeletedRows ?? 0), 0);

            Logger.debug(`Deleted daily_stats for user ${userID}${guildID ? ` in guild ${guildID}` : ' (all guilds)'}: ${affected} row(s)`);
            return affected;
        } catch (err) {
            await Logger.error(`Error deleting daily_stats for user ${userID}${guildID ? ` in guild ${guildID}` : ' (all guilds)'}`, err);
            return 0;
        }
    }

    static async deleteUserDailyStats(guildID: string, userID: string): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        try {
            await db
                .deleteFrom('daily_stats')
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .execute();

            Logger.debug(Logs.debug.queryDailyStatsDeleteUser
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryDailyStatsDeleteUser
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
        }
    }
}