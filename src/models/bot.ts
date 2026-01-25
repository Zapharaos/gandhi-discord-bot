import {
    AutocompleteInteraction,
    Client,
    CommandInteraction,
    Events, GuildMember,
    Interaction, PartialGuildMember, VoiceState,
    MessageReaction, User as DiscordUser, PartialMessageReaction, PartialUser
} from 'discord.js';

import {
    CommandHandler,
} from '@events/command-handler';
import {Logger} from "@services/logger";

import Logs from '../../lang/logs.json';
import {VoiceHandler} from "@events/voice-handler";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {DailyStatsController} from "@controllers/daily-stats";
import {UserStatsController} from "@controllers/user-stats";
import {pendingTaketimeCards} from '@commands/fun/taketime';

export class Bot {
    private ready = false;

    constructor(
        private token: string,
        private client: Client,
        private commandHandler: CommandHandler,
        private voiceHandler: VoiceHandler,
    ) {
    }

    public async start(): Promise<void> {
        this.registerListeners();
        await this.login(this.token);

        // Clear the start_timestamps table on startup
        if (process.env.NODE_ENV !== 'development') {
            await StartTimestampsController.clearTable();
        }
    }

    private registerListeners(): void {
        this.client.on(Events.ClientReady, () => this.onReady());
        this.client.on(Events.InteractionCreate, (intr: Interaction) => this.onInteraction(intr));
        this.client.on(Events.VoiceStateUpdate, (oldState: VoiceState, newState: VoiceState) => this.onVoiceState(oldState, newState));
        this.client.on(Events.GuildMemberRemove, (member: GuildMember | PartialGuildMember) => this.onGuildMemberRemove(member));
        this.client.on(Events.MessageReactionAdd, (reaction, user) => this.onMessageReactionAdd(reaction, user));
    }

    private async login(token: string): Promise<void> {
        try {
            await this.client.login(token);
        } catch (error) {
            await Logger.error(Logs.error.clientLogin, error);
            return;
        }
    }

    private async onReady(): Promise<void> {
        const userTag = this.client.user?.tag  ?? 'N/A';
        Logger.info(Logs.info.clientLogin.replaceAll('{USER_TAG}', userTag));

        this.ready = true;
        Logger.info(Logs.info.clientReady);
    }

    private async onInteraction(intr: Interaction): Promise<void> {
        if (!this.ready) return;

        if (intr instanceof CommandInteraction || intr instanceof AutocompleteInteraction) {
            try {
                await this.commandHandler.process(intr);
            } catch (error) {
                await Logger.error(Logs.error.command, error);
            }
        }
    }

    private async onVoiceState(oldState: VoiceState, newState: VoiceState): Promise<void> {
        if (!this.ready) return;

        try {
            await this.voiceHandler.process(oldState, newState);
        } catch (error) {
            await Logger.error(Logs.error.voice, error);
        }
    }

    private async onGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
        if (!this.ready) return;

        const guildID = member.guild.id;
        const userID = member.user.id;

        try {
            // Delete user stats when a user leaves a guild
            await UserStatsController.deleteUserStats(guildID, userID);
            await StartTimestampsController.deleteUserStartTimestamps(guildID, userID);
            await DailyStatsController.deleteUserDailyStats(guildID, userID);

            Logger.info(
                Logs.info.memberDeleteFromGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)
            );
        } catch (error) {
            await Logger.error(
                Logs.error.memberDeleteFromGuild
                    .replaceAll('{GUILD_ID}', guildID)
                    .replaceAll('{USER_ID}', userID)

            , error);
        }
    }

    private async onMessageReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: DiscordUser | PartialUser): Promise<void> {
        // Only handle DMs, only if user is not the bot
        Logger.debug('onMessageReactionAdd triggered');
        try {
            // Fetch partials if needed
            if (reaction.partial) {
                Logger.debug('Reaction is partial, fetching...');
                try { await reaction.fetch(); } catch {
                    Logger.debug('Failed to fetch partial reaction');
                    return;
                }
            }
            if (user.partial) {
                Logger.debug('User is partial, fetching...');
                try { await user.fetch(); } catch {
                    Logger.debug('Failed to fetch partial user');
                    return;
                }
            }

            Logger.debug(`Reaction from user: ${user.id}, bot: ${user.bot}`);
            if (user.bot) return;

            Logger.debug(`Message guildId: ${reaction.message.guildId}, isDM: ${!reaction.message.guildId}`);
            // Only handle DMs
            if (reaction.message.guildId) return;

            Logger.debug(`Checking pendingTaketimeCards for user ${user.id}: ${!!pendingTaketimeCards[user.id]}`);
            // Check for pending taketime cards
            if (pendingTaketimeCards[user.id]) {
                const pending = pendingTaketimeCards[user.id];
                Logger.debug(`Pending found. Message ID: ${reaction.message.id}, Expected: ${pending.messageId}`);
                if (reaction.message.id === pending.messageId) {
                    Logger.debug('Message ID matches! Sending remaining cards...');
                    try {
                        const revealMsg = 'Your remaining cards:\n' + pending.cards.map(card => `- ${card.color} ${card.value}`).join('\n');
                        await user.send(revealMsg);
                        // Clear timeout and delete pending cards
                        clearTimeout(pending.timeoutId);
                        delete pendingTaketimeCards[user.id];
                        Logger.debug('Remaining cards sent successfully!');
                    } catch (e) {
                        Logger.error('Failed to send remaining cards', e);
                    }
                } else {
                    Logger.debug('Message ID does not match');
                }
            }
        } catch (e) {
            Logger.error('Error in onMessageReactionAdd', e);
        }
    }
}