import {Voice} from "./voice";
import {VoiceState} from "discord.js";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";

export class DeafenVoice implements Voice {

    public async execute(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        if (VoiceStateUtils.staysMuted(oldState, newState)) {
            Logger.debug('Deafen event while already muted');
            // TODO : start timer
            // TODO : update stats
            return;
        }

        if (VoiceStateUtils.isDeafened(oldState, newState)) {
            Logger.debug('User is deafened');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.isUndeafened(oldState, newState)) {
            Logger.debug('User is undeafened');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}