import {Logger} from "@services/logger";
import Logs from '../../lang/logs.json';
import {db} from '@services/database'
import {DB, UserStats} from "../types/db";
import {ExpressionBuilder} from "kysely";
import {StatKey} from "@models/database/user_stats";
import {DatabaseUtils} from "@utils/database";

export class UserStatsController {

    static async getUserInGuild(guildID: string, userID: string): Promise<UserStats | null> {
        try {
            const userStats = await db
                .selectFrom('user_stats')
                .selectAll()
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .executeTakeFirst();

            Logger.debug(Logs.debug.queryStatsUserInGuild
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );

            if(!userStats) {
                return null;
            }

            return userStats as unknown as UserStats;
        } catch (err) {
            await Logger.error(
                Logs.error.queryStatsUserInGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
            return null;
        }
    }

    static async getUsersInGuildByStat(guildID: string, stat: string): Promise<UserStats[]> {
        try {
            const usersStats = await db
                .selectFrom('user_stats')
                .selectAll()
                .where('guild_id', '=', guildID)
                .execute();

            Logger.debug(Logs.debug.queryStatsUserInGuildByStat
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{STAT_KEY}', stat)
            );

            return usersStats as unknown as UserStats[];
        } catch (err) {
            await Logger.error(
                Logs.error.queryStatsUserInGuildByStat
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{STAT_KEY}', stat)
                , err);
            return [];
        }
    }

    static async updateUserStats(guildID: string, userID: string, stat: string, value: number): Promise<void> {
        try {
            await db
                .insertInto('user_stats')
                .values({ guild_id: guildID, user_id: userID, [stat]: value })
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet({
                        [stat]: (eb: ExpressionBuilder<DB, 'user_stats'>) => eb(db.dynamic.ref<StatKey>(stat), '+', value),
                    })
                )
                .execute();

            Logger.debug(Logs.debug.queryStatsUserUpdateStat
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
                .replaceAll('{STAT_KEY}', stat)
                .replaceAll('{STAT_VALUE}', value.toString())
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryStatsUserUpdateStat
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                    .replaceAll('{STAT_KEY}', stat)
                    .replaceAll('{STAT_VALUE}', value.toString())
                , err);
        }
    }

    static async updateLastActivityAndStreak(guildID: string, userID: string, timestamp: number): Promise<void> {
        try {

            const row = await db
                .selectFrom('user_stats')
                .selectAll()
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .executeTakeFirst();
            const userStats = row as unknown as UserStats;
            const last_activity : number = userStats ? DatabaseUtils.unwrapGeneratedNumber(userStats.last_activity) : 0;
            const daily_streak : number = userStats ? DatabaseUtils.unwrapGeneratedNumber(userStats.daily_streak) : 0;

            Logger.debug(Logs.debug.queryStatsUserGetActivityStreak
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );

            let newStreak = 1;
            if (userStats && last_activity !== 0) {
                const lastActivityDate = new Date(last_activity).setUTCHours(0, 0, 0, 0);
                const currentDate = new Date(timestamp).setUTCHours(0, 0, 0, 0);
                const oneDay = 24 * 60 * 60 * 1000;

                if (currentDate - lastActivityDate === oneDay) {
                    newStreak = daily_streak + 1;
                } else if (currentDate - lastActivityDate > oneDay) {
                    newStreak = 1;
                } else {
                    newStreak = daily_streak;
                }
            }

            await db
                .insertInto('user_stats')
                .values({ guild_id: guildID, user_id: userID, daily_streak: newStreak, last_activity: timestamp })
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet({
                        daily_streak: newStreak,
                        last_activity: timestamp
                    })
                )
                .execute();

            Logger.debug(Logs.debug.queryStatsUserSetActivityStreak
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryStatsUserSetActivityStreak
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
        }
    }

    static async incrementTotalJoins(guildID: string, userID: string): Promise<void> {
        try {
            await db
                .insertInto('user_stats')
                .values({ guild_id: guildID, user_id: userID, total_joins: 1 })
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet({
                        total_joins: (eb: ExpressionBuilder<DB, 'user_stats'>) => eb('total_joins', '+', 1),
                    })
                )
                .execute();

            Logger.debug(Logs.debug.queryStatsUserIncrementTotalJoins
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryStatsUserIncrementTotalJoins
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
        }
    }
}