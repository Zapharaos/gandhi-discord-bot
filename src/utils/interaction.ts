import {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    CommandInteraction,
    DiscordAPIError,
    RESTJSONErrorCodes as DiscordApiErrors,
    EmbedBuilder,
    InteractionReplyOptions,
    InteractionResponse,
    InteractionUpdateOptions,
    Message,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    WebhookMessageEditOptions,
    ChatInputCommandInteraction,
    GuildMember,
    Guild,
    MessageFlags,
    CommandInteractionOption,
    CacheType,
    InteractionCallbackResponse,
    User,
    MessageReaction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
} from 'discord.js';

const IGNORED_ERRORS = [
    DiscordApiErrors.UnknownMessage,
    DiscordApiErrors.UnknownChannel,
    DiscordApiErrors.UnknownGuild,
    DiscordApiErrors.UnknownUser,
    DiscordApiErrors.UnknownInteraction,
    DiscordApiErrors.CannotSendMessagesToThisUser, // User blocked bot or DM disabled
    DiscordApiErrors.ReactionWasBlocked, // User blocked bot or DM disabled
    DiscordApiErrors.MaximumActiveThreads,
];

export type InteractionUser = {
    id: string;
    name: string;
    avatar: string;
}

export type ReplyTableRow = {
    label: string;
    main: string;
    secondary?: string;
}

export class InteractionUtils {
    public static async deferReply(
        intr: CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction,
        hidden: boolean = false
    ): Promise<InteractionResponse | void> {
        try {

            return await intr.deferReply({
                flags: hidden ? MessageFlags.Ephemeral : undefined,
            });
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async deferUpdate(
        intr: MessageComponentInteraction | ModalSubmitInteraction
    ): Promise<InteractionResponse | void> {
        try {
            return await intr.deferUpdate();
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async send(
        intr: CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction,
        content: string | EmbedBuilder | InteractionReplyOptions,
        hidden: boolean = false
    ): Promise<Message | void | InteractionCallbackResponse> {
        try {
            const options: InteractionReplyOptions =
                typeof content === 'string'
                    ? {content}
                    : content instanceof EmbedBuilder
                        ? {embeds: [content]}
                        : content;
            if (intr.deferred || intr.replied) {
                return await intr.followUp({
                    ...options,
                    flags: hidden ? MessageFlags.Ephemeral : undefined,
                });
            } else {
                return await intr.reply({
                    ...options,
                    flags: hidden ? MessageFlags.Ephemeral : undefined,
                    withResponse: true,
                });
            }
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async respond(
        intr: AutocompleteInteraction,
        choices: ApplicationCommandOptionChoiceData[] = []
    ): Promise<void> {
        try {
            return await intr.respond(choices);
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async editReply(
        intr: CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction,
        content: string | EmbedBuilder | WebhookMessageEditOptions
    ): Promise<Message | void> {
        try {
            const options: WebhookMessageEditOptions =
                typeof content === 'string'
                    ? {content}
                    : content instanceof EmbedBuilder
                        ? {embeds: [content]}
                        : content;
            return await intr.editReply(options);
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async update(
        intr: MessageComponentInteraction,
        content: string | EmbedBuilder | InteractionUpdateOptions
    ): Promise<Message | void> {
        try {
            const options: InteractionUpdateOptions =
                typeof content === 'string'
                    ? {content}
                    : content instanceof EmbedBuilder
                        ? {embeds: [content]}
                        : content;
            return await intr.update({
                ...options,
                fetchReply: true,
            });
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                typeof error.code == 'number' &&
                IGNORED_ERRORS.includes(error.code)
            ) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static getGuildId(interaction: CommandInteraction): string | null {
        return interaction.guildId;
    }

    private static getTargetRaw(interaction: ChatInputCommandInteraction): NonNullable<CommandInteractionOption<CacheType>["member"]> {
        return interaction.options.getMember('target')!;
    }

    public static getInteractionUserRaw(interaction: ChatInputCommandInteraction): GuildMember | NonNullable<CommandInteractionOption<CacheType>["member"]>{
        return this.getTargetRaw(interaction) ?? interaction.member;
    }

    private static getTargetMember(interaction: ChatInputCommandInteraction): GuildMember | null {
        const target = this.getTargetRaw(interaction);
        return (target as GuildMember) ?? null;
    }

    public static getInteractionUser(interaction: ChatInputCommandInteraction): InteractionUser {
        const target = this.getTargetMember(interaction);
        if (target) {
            return {
                id: target.user.id,
                name: target.displayName,
                avatar: target.displayAvatarURL()
            }
        }
        const member = interaction.member as GuildMember;
        return {
            id: interaction.user.id,
            name: member.displayName,
            avatar: member.displayAvatarURL()
        }
    }

    public static async fetchGuildMemberNickname(guild: Guild, id: string): Promise<string | null> {
        try {
            const member = await guild.members.fetch(id);
            return member.displayName || member.nickname || member.user.globalName;
        } catch (error) {
            console.error(`Failed to fetch member with id ${id}:`, error);
            return null;
        }
    }

    public static async replyWithPagination(intr: ChatInputCommandInteraction, ebs: EmbedBuilder[]): Promise<void> {
        let currentPage = 0;

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Primary)
        );

        const msg = await intr.editReply({ embeds: [ebs[currentPage]], components: [row] });

        const filter = (i: MessageComponentInteraction): i is ButtonInteraction =>
            i.isButton() && i.user.id === intr.user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId === 'next' && currentPage < ebs.length - 1) {
                currentPage++;
            } else if (btnInteraction.customId === 'prev' && currentPage > 0) {
                currentPage--;
            }

            row.components[0].setDisabled(currentPage === 0);
            row.components[1].setDisabled(currentPage === ebs.length - 1);

            await btnInteraction.update({ embeds: [ebs[currentPage]], components: [row] });
        });

        collector.on('end', () => {
            row.components.forEach(button => button.setDisabled(true));
            msg.edit({ components: [row] }).catch(() => {});
        });
    }
}