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

    /**
     * Upsert a guild's cached metadata and mark the bot as present in it. Called
     * for every guild on ready and on guildCreate/guildUpdate.
     */
    static async syncGuild(
        guildID: string,
        guildName: string | null,
        guildIcon: string | null,
        ownerId?: string | null,
    ): Promise<void> {
        const db = await getDb();
        if (!db) {
            await Logger.error(Logs.error.databaseNotFound);
            return;
        }
        try {
            const values = { guild_name: guildName, guild_icon: guildIcon, bot_present: 1, owner_id: ownerId ?? null };
            await db
                .insertInto('servers')
                .values({ guild_id: guildID, ...values })
                .onConflict((oc) => oc.column('guild_id').doUpdateSet(values))
                .execute();
        } catch (err) {
            await Logger.error(`Error syncing guild ${guildID}`, err);
        }
    }

    /** Mark the bot as no longer a member of a guild (keeps its saved settings). */
    static async markGuildAbsent(guildID: string): Promise<void> {
        const db = await getDb();
        if (!db) return;
        try {
            await db.updateTable('servers').set({ bot_present: 0 }).where('guild_id', '=', guildID).execute();
        } catch (err) {
            await Logger.error(`Error marking guild ${guildID} absent`, err);
        }
    }

    /** Reset presence for every guild (used before re-syncing on ready). */
    static async markAllGuildsAbsent(): Promise<void> {
        const db = await getDb();
        if (!db) return;
        try {
            await db.updateTable('servers').set({ bot_present: 0 }).execute();
        } catch (err) {
            await Logger.error('Error resetting guild presence', err);
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