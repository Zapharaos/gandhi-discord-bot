import {SQLiteService} from '@services/sqlite-service';
import {Logger} from '@services/logger';
import Logs from '../../lang/logs.json';
import {Server} from "@models/database/server";

export class ServerController {
    private sqliteService: SQLiteService;

    constructor() {
        this.sqliteService = SQLiteService.getInstance();
    }

    async setLogChannel(guildID: string, channelId: string): Promise<boolean> {
        const db = await this.sqliteService.getDatabase();

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
                Logger.debug(Logs.debug.queryServerLogChannel
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{CHANNEL_ID}', channelId)
                );
                resolve(true);
            });
        });
    }

    async getServer(guildID: string): Promise<Server> {
        const db = await this.sqliteService.getDatabase();

        return new Promise<Server>((resolve, reject) => {
            const query = `SELECT *
                           FROM servers
                           WHERE guild_id = ?`;

            db.get(query, [guildID], (err: Error | null, row: Server) => {
                if (err) {
                    Logger.error(
                        Logs.error.queryServerGet
                            .replaceAll('{GUILD_ID}', guildID)
                        , err);
                    reject(err);
                    return;
                }
                Logger.debug(Logs.debug.queryServerGet
                    .replaceAll('{GUILD_ID}', guildID)
                );
                resolve(row);
            });
        });
    }
}