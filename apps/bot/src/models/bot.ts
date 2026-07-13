import {
    AutocompleteInteraction,
    ChannelType,
    Client,
    CommandInteraction,
    Events, Guild, GuildMember,
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
import {ServerController} from "@controllers/server";
import {StartTsFields} from "@gandhi/core/models/database/start_timestamps";
import {UserStatsFields} from "@gandhi/core/models/database/user_stats";
import {DatabaseUtils} from "@gandhi/core/utils/database";
import {Generated} from "@gandhi/core/types/db";
import {pendingTaketimeCards} from '@commands/fun/taketime';

export class Bot {
    private ready = false;
    private shuttingDown = false;

    constructor(
        private token: string,
        private client: Client,
        private commandHandler: CommandHandler,
        private voiceHandler: VoiceHandler,
    ) {
    }

    public async start(): Promise<void> {
        this.registerListeners();
        this.registerShutdownHandlers();
        await this.login(this.token);
        // NOTE: live-session state is reconciled in onReady (once the guild/voice
        // caches are populated), not here.
    }

    /**
     * On a graceful shutdown (SIGINT/SIGTERM), flush every in-progress voice session
     * to the database — as if each connected member had just left — so their elapsed
     * time is saved. Only the gap between stop and the next start is then lost.
     * Crashes / SIGKILL can't run this; the onReady reconciliation is the fallback.
     */
    private registerShutdownHandlers(): void {
        const handler = (signal: string): void => {
            if (this.shuttingDown) return;
            this.shuttingDown = true;
            Logger.info(`Received ${signal}, flushing active voice sessions before exit...`);
            this.flushActiveSessions()
                .catch((err) => Logger.error(Logs.error.voice, err))
                .finally(() => process.exit(0));
        };
        process.once('SIGINT', () => handler('SIGINT'));
        process.once('SIGTERM', () => handler('SIGTERM'));
    }

    private async flushActiveSessions(): Promise<void> {
        const now = Date.now();
        const sessions = await StartTimestampsController.getAllActiveSessions();

        // Each live timestamp maps to the matching cumulative time stat.
        const fields: [StartTsFields, UserStatsFields][] = [
            [StartTsFields.StartConnected, UserStatsFields.TimeConnected],
            [StartTsFields.StartMuted, UserStatsFields.TimeMuted],
            [StartTsFields.StartDeafened, UserStatsFields.TimeDeafened],
            [StartTsFields.StartScreenSharing, UserStatsFields.TimeScreenSharing],
            [StartTsFields.StartCamera, UserStatsFields.TimeCamera],
        ];

        let flushed = 0;
        for (const session of sessions) {
            const guildId = session.guild_id;
            const userId = session.user_id;
            if (!guildId || !userId) continue;

            for (const [startField, timeField] of fields) {
                const start = DatabaseUtils.unwrapGeneratedNumber(session[startField] as unknown as Generated<number | null>);
                if (!start || start <= 0) continue;

                const duration = now - start;
                if (duration <= 0) continue;

                // Same effect as a "leave": add to totals, update max, daily, then stop the timer.
                await UserStatsController.updateUserStats(guildId, userId, timeField, duration);
                await UserStatsController.updateUserMaxStats(guildId, userId, timeField.replace('time_', 'max_'), duration);
                await DailyStatsController.updateUserDailyStats(guildId, userId, timeField, duration, now);
                await StartTimestampsController.setStartTimestamp(guildId, userId, startField, 0);
            }
            flushed++;
        }

        Logger.info(`Flushed ${flushed} active voice session(s) before shutdown`);
    }

    private registerListeners(): void {
        this.client.on(Events.ClientReady, () => this.onReady());
        this.client.on(Events.InteractionCreate, (intr: Interaction) => this.onInteraction(intr));
        this.client.on(Events.VoiceStateUpdate, (oldState: VoiceState, newState: VoiceState) => this.onVoiceState(oldState, newState));
        this.client.on(Events.GuildMemberRemove, (member: GuildMember | PartialGuildMember) => this.onGuildMemberRemove(member));
        this.client.on(Events.GuildCreate, (guild: Guild) => this.onGuildChange(guild));
        this.client.on(Events.GuildUpdate, (_oldGuild: Guild, guild: Guild) => this.onGuildChange(guild));
        this.client.on(Events.GuildDelete, (guild: Guild) => this.onGuildDelete(guild));
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

        // Reconcile in-progress voice sessions after a restart. Events missed while
        // the bot was down cannot be recovered, so instead of counting bogus
        // wall-clock time (which would include the downtime) we drop stale state and
        // re-seed currently-connected members from "now". In development we keep the
        // existing state to make restarts non-destructive during iteration.
        if (process.env.NODE_ENV !== 'development') {
            try {
                await this.reconcileVoiceState();
            } catch (error) {
                await Logger.error(Logs.error.voice, error);
            }
        }

        // Refresh the cached list of guilds the bot is in (name, icon, presence)
        // so the web dashboard can list only the servers it shares with the user.
        try {
            await this.syncAllGuilds();
        } catch (error) {
            await Logger.error('Failed to sync guilds on ready', error);
        }

        this.ready = true;
        Logger.info(Logs.info.clientReady);
    }

    /** Reconcile the servers table with the guilds the bot is currently in. */
    private async syncAllGuilds(): Promise<void> {
        await ServerController.markAllGuildsAbsent();
        for (const guild of this.client.guilds.cache.values()) {
            await ServerController.syncGuild(guild.id, guild.name, guild.iconURL());
        }
        Logger.info(`Synced ${this.client.guilds.cache.size} guild(s) into the servers table`);
    }

    private async onGuildChange(guild: Guild): Promise<void> {
        try {
            await ServerController.syncGuild(guild.id, guild.name, guild.iconURL());
        } catch (error) {
            await Logger.error(`Failed to sync guild ${guild.id}`, error);
        }
    }

    private async onGuildDelete(guild: Guild): Promise<void> {
        try {
            await ServerController.markGuildAbsent(guild.id);
        } catch (error) {
            await Logger.error(`Failed to mark guild ${guild.id} absent`, error);
        }
    }

    /**
     * Rebuilds the start_timestamps table from the voice channels' current state.
     * Only seeds members whose server and personal settings have stats enabled, so
     * opted-out users never get live-session data recreated. Sub-states (mute,
     * deafen, streaming, camera) currently active are re-seeded too, so their timers
     * resume as well.
     */
    private async reconcileVoiceState(): Promise<void> {
        const now = Date.now();

        // Drop stale state first: any timestamp predates the downtime and is unusable.
        await StartTimestampsController.clearTable();

        let seeded = 0;
        for (const guild of this.client.guilds.cache.values()) {
            // Respect the server-level stats setting (default on when unset).
            const server = await ServerController.getServer(guild.id);
            const serverStatsEnabled = !server || (server.stats as unknown as number | null) == null || (server.stats as unknown as number) !== 0;
            if (!serverStatsEnabled) continue;

            for (const channel of guild.channels.cache.values()) {
                if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) continue;

                for (const member of channel.members.values()) {
                    if (member.user.bot) continue;

                    // Respect the user-level opt-in (no row / not explicitly on = skip).
                    const userStats = await UserStatsController.getUserInGuild(guild.id, member.id);
                    const userStatsEnabled = !!userStats && (userStats.stats as unknown as number) === 1;
                    if (!userStatsEnabled) continue;

                    const vs = member.voice;
                    await StartTimestampsController.setStartTimestamp(guild.id, member.id, StartTsFields.StartConnected, now);
                    if (vs.mute) await StartTimestampsController.setStartTimestamp(guild.id, member.id, StartTsFields.StartMuted, now);
                    if (vs.deaf) await StartTimestampsController.setStartTimestamp(guild.id, member.id, StartTsFields.StartDeafened, now);
                    if (vs.streaming) await StartTimestampsController.setStartTimestamp(guild.id, member.id, StartTsFields.StartScreenSharing, now);
                    if (vs.selfVideo) await StartTimestampsController.setStartTimestamp(guild.id, member.id, StartTsFields.StartCamera, now);
                    seeded++;
                }
            }
        }

        Logger.info(`Voice state reconciled after startup: ${seeded} active member session(s) re-seeded`);
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