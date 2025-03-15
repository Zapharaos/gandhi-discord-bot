import { SQLiteService } from '@services/sqlite-service';
import { Logger } from '@services/logger';
import Logs from '../../lang/logs.json';

export class ServerController {
    private sqliteService: SQLiteService;

    constructor() {
        this.sqliteService = SQLiteService.getInstance();
    }

    async setLogChannel(guildID: string, channelId: string): Promise<boolean> {
        let db = await this.sqliteService.getDatabase();

        return new Promise<boolean>((resolve, reject) => {
            const query = `INSERT INTO servers (guild_id, log_channel_id)
                           VALUES (?, ?) ON CONFLICT(guild_id) DO
                           UPDATE
                           SET log_channel_id = ?`;

            db.run(query, [guildID, channelId, channelId], (err: Error | null) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryServerLogChannel
                        .replaceAll('{GUILD_ID}', guildID)
                        .replaceAll('{CHANNEL_ID}', channelId)
                    , err);
                    reject(err);
                    return;
                }
                Logger.info(Logs.info.queryServerLogChannel
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{CHANNEL_ID}', channelId)
                );
                resolve(true);
            });
        });
    }
}