import {Logger} from '@services/logger';
import Logs from '../../lang/logs.json';
import {getDb} from '@services/database'
import {Servers} from '@gandhi/core/types/db'

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

    static async updateServerSettings(
        guildID: string,
        settings: { stats?: boolean; logs?: boolean; logChannelId?: string }
    ): Promise<boolean> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return false;
        }

        try {
            const updateData: Record<string, unknown> = {};

            if (settings.stats !== undefined) {
                updateData.stats = settings.stats ? 1 : 0;
            }
            if (settings.logs !== undefined) {
                updateData.logs = settings.logs ? 1 : 0;
            }
            if (settings.logChannelId !== undefined) {
                updateData.log_channel_id = settings.logChannelId;
            }

            await db
                .insertInto('servers')
                .values({ guild_id: guildID, ...updateData })
                .onConflict((oc) => oc
                    .column('guild_id')
                    .doUpdateSet(updateData)
                )
                .execute();

            Logger.debug(`Server settings updated for guild ${guildID}`);
            return true;
        } catch (err) {
            await Logger.error(`Error updating server settings for guild ${guildID}`, err);
            return false;
        }
    }

    static async updateMetadata(
        guildID: string,
        guildName: string | null,
        guildIcon: string | null,
    ): Promise<boolean> {
        // Get the database instance
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return false;
        }

        try {
            const metadata = { guild_name: guildName, guild_icon: guildIcon };
            await db
                .insertInto('servers')
                .values({ guild_id: guildID, ...metadata })
                .onConflict((oc) => oc
                    .column('guild_id')
                    .doUpdateSet(metadata)
                )
                .execute();

            Logger.debug(`Server metadata updated for guild ${guildID}`);
            return true;
        } catch (err) {
            await Logger.error(`Error updating server metadata for guild ${guildID}`, err);
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

            return server as unknown as Servers;
        } catch (err) {
            await Logger.error(
                Logs.error.queryServerGet
                    .replaceAll('{GUILD_ID}', guildID)
                , err);
            return null;
        }
    }
}