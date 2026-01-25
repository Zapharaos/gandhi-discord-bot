import {Logger} from "@services/logger";
import Logs from '../../lang/logs.json';
import {getDb} from '@services/database'
import {DB, UserStats} from "../types/db";
import {ExpressionBuilder} from "kysely";
import {StatKey} from "@models/database/user_stats";
import {DatabaseUtils} from "@utils/database";
import {TimeUtils} from "@utils/time";

export class UserStatsController {

    static async getUserInGuild(guildID: string, userID: string): Promise<UserStats | null> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return null;
        }

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
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

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
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

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

    static async updateUserMaxStats(guildID: string, userID: string, stat: string, value: number): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        try {
            await db
                .insertInto('user_stats')
                .values({ guild_id: guildID, user_id: userID, [stat]: value })
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet({
                        [stat]: value,
                    })
                    .where((eb) => eb(db.dynamic.ref(stat), '<', value))
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
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

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
            // If the user already has stats
            if (userStats && last_activity !== 0) {
                const days = TimeUtils.getDaysDifference(last_activity, timestamp);

                if (days === 1) {
                    newStreak = daily_streak + 1;
                } else if (days > 1) {
                    newStreak = 1;
                } else {
                    newStreak = daily_streak;
                }
            }

            let maxStreak = row?.max_daily_streak ?? 0;
            if (newStreak > maxStreak) {
                maxStreak = newStreak;
            }

            await db
                .insertInto('user_stats')
                .values({ guild_id: guildID, user_id: userID, daily_streak: newStreak, last_activity: timestamp })
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet({
                        daily_streak: newStreak,
                        max_daily_streak: maxStreak,
                        last_activity: timestamp,
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

    static async incrementCountStat(guildID: string, userID: string, stat: string): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        try {
            await db
                .insertInto('user_stats')
                .values({ guild_id: guildID, user_id: userID, [stat]: 1 })
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet({
                        [stat]: (eb: ExpressionBuilder<DB, 'user_stats'>) => eb(db.dynamic.ref<StatKey>(stat), '+', 1),
                    })
                )
                .execute();

            Logger.debug(Logs.debug.queryStatsUserIncrementCountStat
                .replaceAll('{STAT}', stat)
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryStatsUserIncrementCountStat
                    .replaceAll('{STAT}', stat)
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
        }
    }

    static async deleteUserStats(guildID: string, userID: string): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        try {
            await db
                .deleteFrom('user_stats')
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .execute();

            Logger.debug(Logs.debug.queryStatsUserDelete
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryStatsUserDelete
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
        }
    }

    static async updateUserSettings(
        guildID: string,
        userID: string,
        settings: { stats?: boolean; logs?: boolean; private?: boolean }
    ): Promise<boolean> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return false;
        }

        try {
            const updateData: Record<string, unknown> = { guild_id: guildID, user_id: userID };

            if (settings.stats !== undefined) {
                updateData.stats = settings.stats ? 1 : 0;
            }
            if (settings.logs !== undefined) {
                updateData.logs = settings.logs ? 1 : 0;
            }
            if (settings.private !== undefined) {
                updateData.private = settings.private ? 1 : 0;
            }

            await db
                .insertInto('user_stats')
                .values(updateData)
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet(updateData)
                )
                .execute();

            Logger.debug(`User settings updated for user ${userID} in guild ${guildID}`);
            return true;
        } catch (err) {
            await Logger.error(`Error updating user settings for user ${userID} in guild ${guildID}`, err);
            return false;
        }
    }

    static async isUserPrivate(guildID: string, userID: string): Promise<boolean> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return false;
        }

        try {
            const userStats = await db
                .selectFrom('user_stats')
                .select('private')
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .executeTakeFirst();

            if (!userStats) {
                return false; // Default to not private if no record
            }

            const isPrivate = (userStats.private as unknown as number | null);
            return isPrivate !== null && isPrivate !== 0;
        } catch (err) {
            await Logger.error(`Error checking if user ${userID} is private in guild ${guildID}`, err);
            return false;
        }
    }
}