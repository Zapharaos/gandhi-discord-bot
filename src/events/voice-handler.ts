import {EventHandler} from "@events/event-handler";
import {EventDataService} from "@services/event-data-service";
import {
    VoiceState,
    ChannelType, TextChannel,
} from "discord.js";
import {Voice} from "../voice/voice";
import {EventData} from "@models/event-data";
import {VoiceProps} from "@models/voice-props";
import {ServerController} from "@controllers/server";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {StartTimestampsModel} from "@models/database/start_timestamps";

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
        const logChannel = guild.channels.cache.get(server.log_channel_id);
        if (!logChannel || logChannel.type !== ChannelType.GuildText || !(logChannel instanceof TextChannel)) return;

        // Retrieve the user start timestamps
        const row = await StartTimestampsController.getUserByGuild(guild.id, user.id);
        const startTimestamps = StartTimestampsModel.fromStartTimestamps(row);

        const props = new VoiceProps(oldState, newState, guild.id, user.id, userName, startTimestamps, logChannel);

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