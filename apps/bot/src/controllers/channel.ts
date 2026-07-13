import {getDb} from '@services/database'
import {Logger} from '@services/logger';

export interface ChannelInfo {
    id: string;
    name: string;
}

export class ChannelController {

    /** Replace a guild's cached text channels with the current set. */
    static async syncGuildChannels(guildId: string, channels: ChannelInfo[]): Promise<void> {
        const db = await getDb();
        if (!db) return;
        try {
            await db.deleteFrom('channels').where('guild_id', '=', guildId).execute();
            if (channels.length > 0) {
                await db
                    .insertInto('channels')
                    .values(channels.map((c) => ({ guild_id: guildId, channel_id: c.id, name: c.name })))
                    .execute();
            }
        } catch (err) {
            await Logger.error(`Error syncing channels for guild ${guildId}`, err);
        }
    }

    /** Upsert a single channel (on channel create/update). */
    static async upsertChannel(guildId: string, channelId: string, name: string): Promise<void> {
        const db = await getDb();
        if (!db) return;
        try {
            await db
                .insertInto('channels')
                .values({ guild_id: guildId, channel_id: channelId, name })
                .onConflict((oc) => oc.columns(['guild_id', 'channel_id']).doUpdateSet({ name }))
                .execute();
        } catch (err) {
            await Logger.error(`Error upserting channel ${channelId}`, err);
        }
    }

    /** Drop a channel (on channel delete). */
    static async removeChannel(guildId: string, channelId: string): Promise<void> {
        const db = await getDb();
        if (!db) return;
        try {
            await db.deleteFrom('channels').where('guild_id', '=', guildId).where('channel_id', '=', channelId).execute();
        } catch (err) {
            await Logger.error(`Error removing channel ${channelId}`, err);
        }
    }
}
