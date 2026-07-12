import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    PermissionsString,
} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {DailyStatsController} from "@controllers/daily-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";

export class DeleteDataCommand implements Command {
    public names = ['delete-data'];
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

        const scopeLabel = scope === 'global' ? 'all servers' : 'this server';

        // Irreversible erasure: ask for an explicit confirmation first.
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('delete-confirm').setLabel('Delete everything').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('delete-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
        );

        const msg = await InteractionUtils.send(intr, {
            content: `⚠️ This will **permanently delete all data we hold about you** on **${scopeLabel}** — stats, daily history and settings. This cannot be undone, and you will revert to the default (not tracked). Confirm?`,
            components: [row],
        });
        // Deferred HIDDEN interactions reply via followUp, which returns a Message.
        if (!msg || !('awaitMessageComponent' in msg)) return;

        let btn: ButtonInteraction;
        try {
            btn = await msg.awaitMessageComponent({
                filter: (i) => i.user.id === intr.user.id,
                componentType: ComponentType.Button,
                time: 30000,
            });
        } catch {
            // Timed out with no answer.
            await InteractionUtils.editReply(intr, {
                content: '⌛ Deletion cancelled (no confirmation received).',
                components: [],
            });
            return;
        }

        if (btn.customId === 'delete-cancel') {
            await btn.update({ content: '❎ Deletion cancelled.', components: [] });
            return;
        }

        const targetGuild = scope === 'global' ? undefined : guildId!;

        // Purge every table that holds data linked to the user.
        const deletedStats = await UserStatsController.deleteUserData(intr.user.id, targetGuild);
        await DailyStatsController.deleteUserData(intr.user.id, targetGuild);
        await StartTimestampsController.deleteUserData(intr.user.id, targetGuild);

        if (deletedStats === 0) {
            await btn.update({ content: `ℹ️ Nothing to delete — we hold no data about you on ${scopeLabel}.`, components: [] });
            return;
        }

        await btn.update({
            content:
                `✅ Your data was permanently deleted on **${scopeLabel}** (${deletedStats} server${deletedStats > 1 ? 's' : ''}).\n` +
                `ℹ️ Log messages already posted in server channels are not affected — ask a server admin to remove them if needed.`,
            components: [],
        });
    };
}
