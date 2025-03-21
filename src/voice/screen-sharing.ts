import {Voice} from "./voice";
import {VoiceState} from "discord.js";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";

export class ScreenSharingVoice implements Voice {

    public async execute(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        if (VoiceStateUtils.startStreaming(oldState, newState)) {
            Logger.debug('User is streaming');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.stopStreaming(oldState, newState)) {
            Logger.debug('User is not streaming');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}