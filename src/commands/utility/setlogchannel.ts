import {ChatInputCommandInteraction, PermissionsString} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {InteractionUtils} from "@utils/interaction";
import {ServerController} from "@controllers/server";
import {Logger} from "@services/logger";

export class SetLogChannelCommand implements Command {
    public names = ['setlogchannel'];
    public deferType = CommandDeferType.NONE;
    public requireClientPerms: PermissionsString[] = ["Administrator", "ManageChannels"];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const channel = intr.options.getChannel("channel");
        if (channel?.type !== 0) { // 0 = GUILD_TEXT
            Logger.debug("SetLogChannelCommand - Bad channel type: " + channel?.type);
            await InteractionUtils.send(intr, "❌ Please select a **text channel**!");
            return;
        }

        const serverController = new ServerController();
        try {
            const success = await serverController.setLogChannel(intr.guildId, channel.id);
            if (success) {
                await InteractionUtils.send(intr, `✅ Log channel set to <#${channel.id}>`);
            }
        } catch (error) {
            await InteractionUtils.send(intr, "❌ An error occurred while trying to set the log channel.");
        }
    };
}