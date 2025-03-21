import {Voice} from "./voice";
import {VoiceState} from "discord.js";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";

export class CameraVoice implements Voice {

    public async execute(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        if (VoiceStateUtils.startCamera(oldState, newState)) {
            Logger.debug('User is camera');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.stopCamera(oldState, newState)) {
            Logger.debug('User is not camera');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}