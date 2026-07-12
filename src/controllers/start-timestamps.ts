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

    /**
     * Returns every start_timestamps row linked to a user (right to access / portability).
     * Scoped to guildID when provided, otherwise every server.
     */
    static async getUserData(userID: string, guildID?: string): Promise<StartTimestamps[]> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return [];
        }

        try {
            let query = db.selectFrom('start_timestamps').selectAll().where('user_id', '=', userID);
            if (guildID) {
                query = query.where('guild_id', '=', guildID);
            }
            const rows = await query.execute();
            return rows as unknown as StartTimestamps[];
        } catch (err) {
            await Logger.error(`Error exporting start_timestamps for user ${userID}${guildID ? ` in guild ${guildID}` : ' (all guilds)'}`, err);
            return [];
        }
    }

    /**
     * Erases a user's live session timestamps (right to erasure). Scoped to
     * guildID when provided, otherwise every server. Returns rows deleted.
     */
    static async deleteUserData(userID: string, guildID?: string): Promise<number> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return 0;
        }

        try {
            let query = db.deleteFrom('start_timestamps').where('user_id', '=', userID);
            if (guildID) {
                query = query.where('guild_id', '=', guildID);
            }
            const result = await query.execute();
            const affected = result.reduce((sum, r) => sum + Number(r.numDeletedRows ?? 0), 0);

            Logger.debug(`Deleted start_timestamps for user ${userID}${guildID ? ` in guild ${guildID}` : ' (all guilds)'}: ${affected} row(s)`);
            return affected;
        } catch (err) {
            await Logger.error(`Error deleting start_timestamps for user ${userID}${guildID ? ` in guild ${guildID}` : ' (all guilds)'}`, err);
            return 0;
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