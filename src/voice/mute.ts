import {Voice} from "./voice";
import {VoiceState} from "discord.js";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";

export class MuteVoice implements Voice {

    public async execute(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        if (VoiceStateUtils.isDeafenEvent(oldState, newState)) {
            Logger.debug('Mute detected within deafen event = skip');
            return;
        }

        if (VoiceStateUtils.isMuted(oldState, newState)) {
            Logger.debug('User is muted');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.isUnmuted(oldState, newState)) {
            Logger.debug('User is unmuted');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}