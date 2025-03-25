import {Logger} from "@services/logger";
import Logs from '../../lang/logs.json';
import {StatKey, StartTsFields} from "@models/database/start_timestamps";
import {db} from '@services/database'
import {StartTimestamps} from '../types/db'

export class StartTimestampsController {

    static async getUserByGuild(guildID: string, userID: string): Promise<StartTimestamps> {
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
                return {} as StartTimestamps;
            }

            return result as unknown as StartTimestamps;
        } catch (err) {
            await Logger.error(
                Logs.error.queryStartTsUserInGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
                , err);
            return {} as StartTimestamps;
        }
    }

    static async getUsersInGuildByStat(guildID: string, stat: StatKey | null): Promise<StartTimestamps[]> {
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
}