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

export class ResetStatsCommand implements Command {
    public names = ['reset-stats'];
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

        // Irreversible action: ask for an explicit confirmation first.
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('reset-confirm').setLabel('Reset').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('reset-cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
        );

        const msg = await InteractionUtils.send(intr, {
            content: `⚠️ This will reset **your stats** on **${scopeLabel}** to zero. Your settings and daily history are kept, but the aggregated totals cannot be recovered. Confirm?`,
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
                content: '⌛ Reset cancelled (no confirmation received).',
                components: [],
            });
            return;
        }

        if (btn.customId === 'reset-cancel') {
            await btn.update({ content: '❎ Reset cancelled.', components: [] });
            return;
        }

        const affected = await UserStatsController.resetUserStats(intr.user.id, scope === 'global' ? undefined : guildId!);

        if (affected === 0) {
            await btn.update({ content: `ℹ️ Nothing to reset — you have no stats on ${scopeLabel}.`, components: [] });
            return;
        }

        await btn.update({
            content: `✅ Your stats were reset on **${scopeLabel}** (${affected} server${affected > 1 ? 's' : ''}).`,
            components: [],
        });
    };
}
