import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";

export class CameraVoice implements Voice {

    public async execute(props: VoiceProps, data: EventData): Promise<void> {
        if (VoiceStateUtils.startCamera(props.oldState, props.newState)) {
            Logger.debug('User is camera');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.stopCamera(props.oldState, props.newState)) {
            Logger.debug('User is not camera');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}