import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";

export class ScreenSharingVoice implements Voice {

    public async execute(props: VoiceProps, data: EventData): Promise<void> {
        if (VoiceStateUtils.startStreaming(props.oldState, props.newState)) {
            Logger.debug('User is streaming');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.stopStreaming(props.oldState, props.newState)) {
            Logger.debug('User is not streaming');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}