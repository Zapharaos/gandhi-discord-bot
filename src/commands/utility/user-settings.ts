import {ChatInputCommandInteraction, PermissionsString} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {Logger} from "@services/logger";
import Logs from "../../../lang/logs.json";

export class UserSettingsCommand implements Command {
    public names = ['usersettings'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await Logger.error(Logs.error.intrMissingGuildID);
            await InteractionUtils.send(intr, 'This command can only be used in a server.');
            return;
        }

        const stats = intr.options.getString("stats");
        const logs = intr.options.getString("logs");
        const privateMode = intr.options.getString("private");

        // Check if at least one option is provided
        if (!stats && !logs && !privateMode) {
            await InteractionUtils.send(intr, "❌ Please provide at least one setting to update!");
            return;
        }

        try {
            const updates: { stats?: boolean; logs?: boolean; private?: boolean } = {};

            if (stats) {
                updates.stats = stats.toLowerCase() === 'on';
            }
            if (logs) {
                updates.logs = logs.toLowerCase() === 'on';
            }
            if (privateMode) {
                updates.private = privateMode.toLowerCase() === 'on';
            }

            const success = await UserStatsController.updateUserSettings(guildId, intr.user.id, updates);

            if (success) {
                const messages: string[] = [];
                if (stats) {
                    messages.push(`📊 Your stats tracking: **${stats.toUpperCase()}**`);
                }
                if (logs) {
                    messages.push(`📝 Your event logs: **${logs.toUpperCase()}**`);
                }
                if (privateMode) {
                    messages.push(`🔒 Private mode: **${privateMode.toUpperCase()}**`);
                }

                await InteractionUtils.send(intr, `✅ Your settings updated:\n${messages.join('\n')}`);
            }
        } catch (error) {
            await InteractionUtils.send(intr, "❌ An error occurred while trying to update your settings.");
            throw error;
        }
    };
}
