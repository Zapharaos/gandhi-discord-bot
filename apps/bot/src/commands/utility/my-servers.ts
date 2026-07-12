import {ChatInputCommandInteraction, EmbedBuilder, PermissionsString} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";

export class MyServersCommand implements Command {
    public names = ['myservers'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        // List every server where we hold data linked to this user (data access request).
        const entries = await UserStatsController.getUserGuildEntries(intr.user.id);

        if (entries.length === 0) {
            await InteractionUtils.send(intr, "✅ We don't have any stats data linked to you on any server.");
            return;
        }

        const lines = entries.map((entry) => {
            // Resolve the server name if the bot still shares that server with the user.
            const guildName = intr.client.guilds.cache.get(entry.guildId)?.name ?? `Unknown server (${entry.guildId})`;
            const flags: string[] = [];
            flags.push(entry.stats ? '📊 stats: ON' : '📊 stats: OFF');
            flags.push(entry.logs ? '📝 logs: ON' : '📝 logs: OFF');
            if (entry.isPrivate) {
                flags.push('🔒 private');
            }
            return `**${guildName}**\n\`${entry.guildId}\`\n${flags.join(' · ')}`;
        });

        const embed = new EmbedBuilder()
            .setTitle('🗂️ Servers with your data')
            .setDescription(
                `We have data linked to you on **${entries.length}** server(s).\n\n${lines.join('\n\n')}`
            )
            .setFooter({ text: 'Use /usersettings to change tracking, per server.' });

        await InteractionUtils.send(intr, embed);
    };
}
