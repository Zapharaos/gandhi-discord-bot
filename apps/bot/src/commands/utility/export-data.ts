import {gzipSync} from 'node:zlib';
import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    PermissionsString,
} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {DailyStatsController} from "@controllers/daily-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {buildExportPayload} from "@gandhi/core/services/export";

// Conservative cap so the file uploads on any server (Discord's base limit is 25 MiB,
// but non-boosted servers historically allowed less). Aggregate stats are tiny, so
// this is only ever hit in pathological cases.
const SAFE_UPLOAD_BYTES = 8 * 1024 * 1024;

export class ExportDataCommand implements Command {
    public names = ['export'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        // Scope: 'server' (default, current guild only) or 'global' (every server).
        const scope = intr.options.getString('scope') ?? 'server';
        const guildId = InteractionUtils.getGuildId(intr);

        if (scope === 'server' && !guildId) {
            await InteractionUtils.send(intr, "❌ The `server` scope can only be used inside a server. Use `scope: all servers` from a DM.");
            return;
        }

        const targetGuild = scope === 'global' ? undefined : guildId!;

        // Gather everything we hold about the user across the three tables.
        const [statsRows, dailyRows, tsRows] = await Promise.all([
            UserStatsController.getUserData(intr.user.id, targetGuild),
            DailyStatsController.getUserData(intr.user.id, targetGuild),
            StartTimestampsController.getUserData(intr.user.id, targetGuild),
        ]);

        if (statsRows.length === 0 && dailyRows.length === 0 && tsRows.length === 0) {
            await InteractionUtils.send(intr, `ℹ️ We hold no data about you on ${scope === 'global' ? 'any server' : 'this server'} — nothing to export.`);
            return;
        }

        // Group all rows by guild into a portable payload (shared with the web
        // service via @gandhi/core), resolving guild names from the client cache.
        const payload = buildExportPayload({
            userId: intr.user.id,
            scope,
            userStats: statsRows,
            startTimestamps: tsRows,
            dailyStats: dailyRows,
            guildName: (gid) => intr.client.guilds.cache.get(gid)?.name ?? null,
        });
        const guilds = payload.guilds;

        const json = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
        const baseName = `gandhi-export-${intr.user.id}-${scope}`;

        // Attach as raw JSON when small enough; otherwise gzip to fit the upload cap.
        let attachment: AttachmentBuilder;
        let note = '';
        if (json.byteLength <= SAFE_UPLOAD_BYTES) {
            attachment = new AttachmentBuilder(json, { name: `${baseName}.json` });
        } else {
            const gz = gzipSync(json);
            if (gz.byteLength > SAFE_UPLOAD_BYTES) {
                // Even compressed it's too large for a single Discord upload.
                await InteractionUtils.send(
                    intr,
                    "❌ Your export is too large to send over Discord in one file. " +
                    "Please export one server at a time using `/export scope:this server` from within each server.",
                );
                return;
            }
            attachment = new AttachmentBuilder(gz, { name: `${baseName}.json.gz` });
            note = '\nℹ️ The file was gzip-compressed to fit Discord\'s upload limit — decompress it to read the JSON.';
        }

        await InteractionUtils.send(intr, {
            content:
                `✅ Here is a copy of all data we hold about you on **${scope === 'global' ? 'all servers' : 'this server'}** ` +
                `(${guilds.length} server${guilds.length > 1 ? 's' : ''}, JSON format).${note}`,
            files: [attachment],
        });
    };
}
