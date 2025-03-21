import {EventHandler} from "@events/event-handler";
import {Command} from "@commands/commands";
import {EventDataService} from "@services/event-data-service";
import {
    AutocompleteInteraction,
    CommandInteraction,
    NewsChannel,
    TextChannel,
    ThreadChannel,
    VoiceState
} from "discord.js";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {Voice} from "../voice/voice";
import {EventData} from "@models/event-data";

export class VoiceHandler implements EventHandler {

    constructor(
        public voices: Voice[],
        private eventDataService: EventDataService
    ) {
    }

    public async process(oldState: VoiceState, newState: VoiceState): Promise<void> {

        for (const voice of this.voices) {
            // const data = await this.eventDataService.get(oldState.guild.id);
            await voice.execute(oldState, newState, {} as EventData);
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