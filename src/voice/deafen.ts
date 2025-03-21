import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";

export class DeafenVoice implements Voice {

    public async execute(props: VoiceProps, data: EventData): Promise<void> {
        if (VoiceStateUtils.startDeafen(props.oldState, props.newState)) {
            Logger.debug('User is deafened');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.stopDeafen(props.oldState, props.newState)) {
            Logger.debug('User is undeafened');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}