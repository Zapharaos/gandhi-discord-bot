import {ChatInputCommandInteraction, PermissionsString} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {InteractionUtils} from "@utils/interaction";
import {ServerController} from "@controllers/server";
import {Logger} from "@services/logger";
import Logs from "../../../lang/logs.json";

export class ServerSettingsCommand implements Command {
    public names = ['serversettings'];
    public deferType = CommandDeferType.NONE;
    public requireClientPerms: PermissionsString[] = ["Administrator", "ManageChannels"];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await Logger.error(Logs.error.intrMissingGuildID);
            await InteractionUtils.send(intr, 'This command can only be used in a server.');
            return;
        }

        const stats = intr.options.getString("stats");
        const logs = intr.options.getString("logs");
        const logChannel = intr.options.getChannel("logchannel");

        // Validate log channel if provided
        if (logChannel && logChannel.type !== 0) { // 0 = GUILD_TEXT
            Logger.debug("SettingsCommand - Bad channel type: " + logChannel.type);
            await InteractionUtils.send(intr, "❌ Please select a **text channel** for the log channel!");
            return;
        }

        // Check if at least one option is provided
        if (!stats && !logs && !logChannel) {
            await InteractionUtils.send(intr, "❌ Please provide at least one setting to update!");
            return;
        }

        try {
            const updates: { stats?: boolean; logs?: boolean; logChannelId?: string } = {};

            if (stats) {
                updates.stats = stats.toLowerCase() === 'on';
            }
            if (logs) {
                updates.logs = logs.toLowerCase() === 'on';
            }
            if (logChannel) {
                updates.logChannelId = logChannel.id;
            }

            const success = await ServerController.updateServerSettings(guildId, updates);

            if (success) {
                const messages: string[] = [];
                if (stats) {
                    messages.push(`📊 Stats tracking: **${stats.toUpperCase()}**`);
                }
                if (logs) {
                    messages.push(`📝 Event logs: **${logs.toUpperCase()}**`);
                }
                if (logChannel) {
                    messages.push(`📍 Log channel set to <#${logChannel.id}>`);
                }

                await InteractionUtils.send(intr, `✅ Server settings updated:\n${messages.join('\n')}`);
            }
        } catch (error) {
            await InteractionUtils.send(intr, "❌ An error occurred while trying to update server settings.");
            throw error;
        }
    };
}
