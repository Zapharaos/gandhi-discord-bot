import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    CommandInteraction,
    NewsChannel,
    TextChannel,
    ThreadChannel,
    EmbedBuilder,
} from 'discord.js';

import {EventHandler} from '@events/event-handler';
import {Command, CommandDeferType} from '@commands/commands';
import {DiscordLimits} from '@constants/discord-limits';
import {EventData} from '@models/event-data';
import {Logger} from '@services/logger';
import {InteractionUtils} from '@utils/interaction';
import {CommandUtils} from '@utils/command';
import {EventDataService} from "@services/event-data-service";
import Logs from '../../lang/logs.json';

export class CommandHandler implements EventHandler {

    constructor(
        public commands: Command[],
        private eventDataService: EventDataService
    ) {
    }

    public async process(intr: CommandInteraction | AutocompleteInteraction): Promise<void> {
        // Don't respond to self, or other bots
        if (intr.user.id === intr.client.user?.id || intr.user.bot) {
            return;
        }

        const commandParts =
            intr instanceof ChatInputCommandInteraction || intr instanceof AutocompleteInteraction
                ? [
                    intr.commandName,
                    intr.options.getSubcommandGroup(false) ?? '',
                    intr.options.getSubcommand(false) ?? '',
                ].filter(Boolean)
                : [intr.commandName];
        const commandName = commandParts.join(' ');

        // Try to find the command the user wants

        const command = CommandUtils.findCommand(this.commands, commandParts);
        if (!command) {
            Logger.error(
                Logs.error.commandNotFound
                    .replaceAll('{INTERACTION_ID}', intr.id)
                    .replaceAll('{COMMAND_NAME}', commandName)
            );
            return;
        }

        if (intr instanceof AutocompleteInteraction) {
            if (!command.autocomplete) {
                Logger.error(
                    Logs.error.autocompleteNotFound
                        .replaceAll('{INTERACTION_ID}', intr.id)
                        .replaceAll('{COMMAND_NAME}', commandName)
                );
                return;
            }

            try {
                const option = intr.options.getFocused(true);
                const choices = await command.autocomplete(intr, option);
                await InteractionUtils.respond(
                    intr,
                    choices?.slice(0, DiscordLimits.CHOICES_PER_AUTOCOMPLETE)
                );
            } catch (error) {
                Logger.error(
                    intr.channel instanceof TextChannel ||
                    intr.channel instanceof NewsChannel ||
                    intr.channel instanceof ThreadChannel
                        ? Logs.error.autocompleteGuild
                            .replaceAll('{INTERACTION_ID}', intr.id)
                            .replaceAll('{OPTION_NAME}', commandName)
                            .replaceAll('{COMMAND_NAME}', commandName)
                            .replaceAll('{USER_TAG}', intr.user.tag)
                            .replaceAll('{USER_ID}', intr.user.id)
                            .replaceAll('{CHANNEL_NAME}', intr.channel.name)
                            .replaceAll('{CHANNEL_ID}', intr.channel.id)
                            .replaceAll('{GUILD_NAME}', intr.guild?.name)
                            .replaceAll('{GUILD_ID}', intr.guild?.id)
                        : Logs.error.autocompleteOther
                            .replaceAll('{INTERACTION_ID}', intr.id)
                            .replaceAll('{OPTION_NAME}', commandName)
                            .replaceAll('{COMMAND_NAME}', commandName)
                            .replaceAll('{USER_TAG}', intr.user.tag)
                            .replaceAll('{USER_ID}', intr.user.id),
                    error
                );
            }
            return;
        }

        // Defer interaction
        // NOTE: Anything after this point we should be responding to the interaction
        switch (command.deferType) {
            case CommandDeferType.PUBLIC: {
                await InteractionUtils.deferReply(intr, false);
                break;
            }
            case CommandDeferType.HIDDEN: {
                await InteractionUtils.deferReply(intr, true);
                break;
            }
        }

        // Return if defer was unsuccessful
        if (command.deferType !== CommandDeferType.NONE && !intr.deferred) {
            return;
        }

        // Get data from database
        const data = await this.eventDataService.create({
            user: intr.user,
            channel: intr.channel ?? undefined,
            guild: intr.guild ?? undefined,
            args: intr instanceof ChatInputCommandInteraction ? intr.options : undefined,
        });

        try {
            // Execute the command
            await command.execute(intr, data);
        } catch (error) {
            await this.sendError(intr, data);

            // Log command error
            Logger.error(
                intr.channel instanceof TextChannel ||
                intr.channel instanceof NewsChannel ||
                intr.channel instanceof ThreadChannel
                    ? Logs.error.commandGuild
                        .replaceAll('{INTERACTION_ID}', intr.id)
                        .replaceAll('{COMMAND_NAME}', commandName)
                        .replaceAll('{USER_TAG}', intr.user.tag)
                        .replaceAll('{USER_ID}', intr.user.id)
                        .replaceAll('{CHANNEL_NAME}', intr.channel.name)
                        .replaceAll('{CHANNEL_ID}', intr.channel.id)
                        .replaceAll('{GUILD_NAME}', intr.guild?.name)
                        .replaceAll('{GUILD_ID}', intr.guild?.id)
                    : Logs.error.commandOther
                        .replaceAll('{INTERACTION_ID}', intr.id)
                        .replaceAll('{COMMAND_NAME}', commandName)
                        .replaceAll('{USER_TAG}', intr.user.tag)
                        .replaceAll('{USER_ID}', intr.user.id),
                error
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async sendError(intr: CommandInteraction, data: EventData): Promise<void> {
        try {
            await InteractionUtils.send(
                intr,
                new EmbedBuilder().addFields(
                    {name: 'ERROR_CODE', value: intr.id},
                    {name: 'GUILD_ID', value: intr.guild?.id ?? "N/A"},
                    {name: 'SHARD_ID', value: (intr.guild?.shardId ?? 0).toString()}
                )
            );
        } catch {
            // Ignore
        }
    }
}