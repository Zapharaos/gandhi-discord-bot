import {EventHandler} from "@events/event-handler";
import {EventDataService} from "@services/event-data-service";
import {
    CommandInteraction,
    VoiceState,
    ChannelType,
} from "discord.js";
import {Voice} from "../voice/voice";
import {EventData} from "@models/event-data";
import {VoiceProps} from "@models/voice-props";
import {ServerController} from "@controllers/server";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {StartTimestamps} from "@models/database/start_timestamps";

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
        const serverController = new ServerController();
        const server = await serverController.getServer(guild.id);
        if (!server) return;
        const logChannel = guild.channels.cache.get(server.log_channel_id);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

        // Retrieve the user start timestamps
        const startTimestampController = new StartTimestampsController();
        const row = await startTimestampController.getUserByGuild(guild.id, user.id);
        const startTimestamps = row ? row : {} as StartTimestamps;

        const props = new VoiceProps(oldState, newState, guild.id, user.id, userName, startTimestamps, logChannel);

        for (const voice of this.voices) {
            await voice.execute(props, {} as EventData);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async sendError(intr: CommandInteraction, data: EventData): Promise<void> {
        /*try {
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
        }*/
    }
}