import {EventHandler} from "@events/event-handler";
import {EventDataService} from "@services/event-data-service";
import {
    VoiceState,
    ChannelType, TextChannel,
} from "discord.js";
import {Voice} from "../voice/voice";
import {EventData} from "@models/event-data";
import {VoiceProps} from "@models/voice-props";
import {SettingsProps} from "@models/settings-props";
import {ServerController} from "@controllers/server";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {StartTimestampsModel} from "@gandhi/core/models/database/start_timestamps";
import {UserStatsController} from "@controllers/user-stats";
import {webEvents} from "@services/web-event-publisher";
import type {VoiceEventType} from "@gandhi/core/ws/protocol";

/**
 * Derive the live event(s) from a voice-state transition. Several dimensions can
 * change at once (e.g. connecting while already muted), so this returns every
 * change; the web dashboard uses them only as a signal to refresh.
 */
function deriveVoiceEvents(oldState: VoiceState, newState: VoiceState): VoiceEventType[] {
    const events: VoiceEventType[] = [];

    if (oldState.channelId !== newState.channelId) {
        if (!oldState.channelId && newState.channelId) events.push('connect');
        else if (oldState.channelId && !newState.channelId) events.push('disconnect');
        else events.push('switch');
    }
    if (oldState.mute !== newState.mute) events.push(newState.mute ? 'mute' : 'unmute');
    if (oldState.deaf !== newState.deaf) events.push(newState.deaf ? 'deafen' : 'undeafen');
    if (oldState.selfVideo !== newState.selfVideo) events.push(newState.selfVideo ? 'camera_on' : 'camera_off');
    if (oldState.streaming !== newState.streaming) events.push(newState.streaming ? 'screen_on' : 'screen_off');

    return events;
}

export class VoiceHandler implements EventHandler {

    constructor(
        public voices: Voice[],
        private eventDataService: EventDataService
    ) {
    }

    public async process(oldState: VoiceState, newState: VoiceState): Promise<void> {

        // Retrieve the user
        const user = newState.member?.user;
        if (!user) return;

        // Retrieve the remaining props
        const guild = newState.guild;
        const userName = newState.member?.nickname || user.displayName;

        // Retrieve the server and log channel
        const server = await ServerController.getServer(guild.id);
        if (!server || !server.log_channel_id) return;

        // Check if stats or logs are enabled at server level (default to true if not set)
        const serverStatsEnabled = (server.stats as unknown as number | null) == null || (server.stats as unknown as number) !== 0;
        const serverLogsEnabled = (server.logs as unknown as number | null) == null || (server.logs as unknown as number) !== 0;

        // Check if stats or logs are enabled at user level.
        // Opt-in model: a user is only tracked once they have explicitly opted in
        // (stats/logs === 1). No record, or an unset value, means opted-out.
        const userStats = await UserStatsController.getUserInGuild(guild.id, user.id);
        const userStatsEnabled = !!userStats && (userStats.stats as unknown as number) === 1;
        const userLogsEnabled = !!userStats && (userStats.logs as unknown as number) === 1;

        // Combine server and user settings (both must be enabled for the feature to work)
        const statsEnabled = serverStatsEnabled && userStatsEnabled;
        const logsEnabled = serverLogsEnabled && userLogsEnabled;

        // If both are disabled, return early
        if (!statsEnabled && !logsEnabled) return;

        const logChannel = guild.channels.cache.get(server.log_channel_id);
        if (!logChannel || logChannel.type !== ChannelType.GuildText || !(logChannel instanceof TextChannel)) return;

        // Update the user last activity and streak (only if stats are enabled)
        if (statsEnabled) {
            await UserStatsController.updateLastActivityAndStreak(guild.id, user.id, Date.now());
        }

        // Retrieve the user start timestamps (only if stats are enabled)
        const row = statsEnabled ? await StartTimestampsController.getUserByGuild(guild.id, user.id) : null;
        const startTimestamps = StartTimestampsModel.fromStartTimestamps(row ?? {});

        // Create settings object
        const settings = new SettingsProps(statsEnabled, logsEnabled, logChannel);

        const props = new VoiceProps(oldState, newState, guild.id, user.id, userName, startTimestamps, settings, Date.now());

        // Push live events to the web dashboard (best-effort; only for tracked
        // users, so opted-out users' activity is never broadcast).
        if (statsEnabled) {
            const now = Date.now();
            for (const type of deriveVoiceEvents(oldState, newState)) {
                webEvents.publish({ guildId: guild.id, userId: user.id, type, timestamp: now });
            }
        }

        for (const voice of this.voices) {
            try {
                await voice.execute(props, {} as EventData);
            }
            catch (error) {
                // Log command error
                await Logger.error(
                    Logs.error.voiceEventGuild
                        .replaceAll('{EVENT_NAME}', voice.name)
                        .replaceAll('{USER_TAG}', user.tag)
                        .replaceAll('{USER_ID}', user.id)
                        .replaceAll('{CHANNEL_NAME}', oldState.channel?.name ?? 'N/A')
                        .replaceAll('{CHANNEL_ID}', oldState.channel?.id ?? 'N/A')
                        .replaceAll('{GUILD_NAME}', guild?.name)
                        .replaceAll('{GUILD_ID}', guild?.id),
                    error
                );
            }
        }
    }
}