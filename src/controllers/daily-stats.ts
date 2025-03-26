import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {db} from '@services/database'
import {DailyStats, DB} from '../types/db'
import {ExpressionBuilder} from "kysely";
import {StatKey} from "@models/database/daily_stats";

export class DailyStatsController {

    static async getTotalForUsersInGuildByStat(guildID: string, stat: string): Promise<DailyStats[]> {
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
}