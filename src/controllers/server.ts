import {Logger} from '@services/logger';
import Logs from '../../lang/logs.json';
import {db} from '@services/database'
import {Servers} from '../types/db'

export class ServerController {

    static async setLogChannel(guildID: string, channelId: string): Promise<boolean> {
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
        try {
            const server = await db
                .selectFrom('servers')
                .selectAll()
                .where('guild_id', '=', guildID)
                .executeTakeFirst();

            if (!server) {
                await Logger.error(Logs.error.queryServerGet.replaceAll('{GUILD_ID}', guildID));
                return null;
            }

            Logger.debug(Logs.debug.queryServerGet.replaceAll('{GUILD_ID}', guildID));
            return server;
        } catch (err) {
            await Logger.error(Logs.error.queryServerGet.replaceAll('{GUILD_ID}', guildID), err);
            return null;
        }
    }
}