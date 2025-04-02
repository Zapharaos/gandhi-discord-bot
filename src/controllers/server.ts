import {Logger} from '@services/logger';
import Logs from '../../lang/logs.json';
import {getDb} from '@services/database'
import {Servers} from '../types/db'

export class ServerController {

    static async setLogChannel(guildID: string, channelId: string): Promise<boolean> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return false;
        }

        try {
            await db
                .insertInto('servers')
                .values({ guild_id: guildID, log_channel_id: channelId })
                .onConflict((oc) => oc
                    .column('guild_id')
                    .doUpdateSet({ log_channel_id: channelId })
                )
                .execute();

            Logger.debug(Logs.debug.queryServerLogChannel
                .replaceAll('{GUILD_ID}', guildID)
                .replaceAll('{CHANNEL_ID}', channelId)
            );
            return true;
        } catch (err) {
            await Logger.error(
                Logs.error.queryServerLogChannel
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{CHANNEL_ID}', channelId)
                , err);
            return false;
        }
    }

    static async getServer(guildID: string): Promise<Servers | null> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return null;
        }

        try {
            const server = await db
                .selectFrom('servers')
                .selectAll()
                .where('guild_id', '=', guildID)
                .executeTakeFirst();

            Logger.debug(
                Logs.debug.queryServerGet
                    .replaceAll('{GUILD_ID}', guildID)
            );

            if (!server) {
                return null;
            }

            return server as Servers;
        } catch (err) {
            await Logger.error(
                Logs.error.queryServerGet
                    .replaceAll('{GUILD_ID}', guildID)
                , err);
            return null;
        }
    }
}