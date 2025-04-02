import {Logger} from "@services/logger";
import Logs from '../../lang/logs.json';
import {StatKey, StartTsFields} from "@models/database/start_timestamps";
import {getDb} from '@services/database'
import {StartTimestamps} from '../types/db'

export class StartTimestampsController {

    static async getUserByGuild(guildID: string, userID: string): Promise<StartTimestamps | null> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return null;
        }

        try {
            const result = await db
                .selectFrom('start_timestamps')
                .selectAll()
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .where('start_connected', '!=', 0)
                .executeTakeFirst();

            Logger.debug(Logs.debug.queryStartTsUserInGuild
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
            );

            if (!result) {
                return null;
            }

            return result as unknown as StartTimestamps;
        } catch (err) {
            await Logger.error(
                Logs.error.queryStartTsUserInGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
            return null;
        }
    }

    static async getUsersInGuildByStat(guildID: string, stat: StatKey | null): Promise<StartTimestamps[]> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

        if (!stat) {
            return [];
        }

        try {
            const result = await db
                .selectFrom('start_timestamps')
                .select([
                    'user_id',
                    'start_connected',
                    db.dynamic.ref<StatKey>(stat)
                ])
                .where('guild_id', '=', guildID)
                .where('start_connected', '!=', 0)
                .execute();

            Logger.debug(Logs.debug.queryStartTsUserInGuildByStat
                .replaceAll('{GUILD_ID}', guildID)
            );

            return result as unknown as StartTimestamps[];
        } catch (err) {
            await Logger.error(
                Logs.error.queryStartTsUserInGuildByStat
                    .replaceAll('{GUILD_ID}', guildID)
                , err);
            return [];
        }
    }

    static async setStartTimestamp(guildID: string, userID: string, stat: StartTsFields, timestamp: number): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        try {
            await db
                .insertInto('start_timestamps')
                .values({
                    guild_id: guildID,
                    user_id: userID,
                    [stat]: timestamp,
                })
                .onConflict((oc) => oc
                    .columns(['guild_id', 'user_id'])
                    .doUpdateSet({
                        [stat]: timestamp,
                    })
                )
                .execute();

            Logger.debug(Logs.debug.queryStartTsSetTimestamp
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{USER_ID}', userID)
                .replaceAll('{STAT}', stat)
                .replaceAll('{TIMESTAMP}', timestamp.toString())
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryStartTsSetTimestamp
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                    .replaceAll('{STAT}', stat)
                    .replaceAll('{TIMESTAMP}', timestamp.toString())
                , err);
        }
    }

    static async clearTable(): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        try {
            await db
                .deleteFrom('start_timestamps')
                .execute();

            Logger.debug(Logs.debug.queryStartTsClear);
        } catch (err) {
            await Logger.error(Logs.error.queryStartTsClear, err);
        }
    }

    static async deleteUserStartTimestamps(guildID: string, userID: string): Promise<void> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }

        try {
            await db
                .deleteFrom('start_timestamps')
                .where('guild_id', '=', guildID)
                .where('user_id', '=', userID)
                .execute();

            Logger.debug(
                Logs.debug.queryStartTsDeleteUser
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
            );
        } catch (err) {
            await Logger.error(
                Logs.error.queryStartTsDeleteUser
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
        }
    }
}