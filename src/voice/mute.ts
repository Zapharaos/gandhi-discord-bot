import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";

export class MuteVoice implements Voice {

    public async execute(props: VoiceProps, data: EventData): Promise<void> {
        // Deafen event triggers the mute event
        if (VoiceStateUtils.isDeafenEvent(props.oldState, props.newState)) {

            // User does not stay muted -> ignore the event
            // It means the mute event was triggered as part of start/stop deafen event
            if (!VoiceStateUtils.staysMuted(props.oldState, props.newState)) {
                Logger.debug('Mute - User does not stay muted after deafen event = skip');
                return
            }

            // User start deafen while already being muted -> stop mute
            if (VoiceStateUtils.startDeafen(props.oldState, props.newState)) {
                Logger.debug('User was muted before deafen event = stop mute timers');
                // TODO : stop timer
                return
            }

            // User stop deafen while still being muted -> restart mute
            if (VoiceStateUtils.stopDeafen(props.oldState, props.newState)) {
                Logger.debug('User still muted after deafen event = restart mute timers');
                // TODO : start timer
                return
            }

            // Unreachable
            Logger.debug('Mute - unreachable = skip');
            return;
        }

        if (VoiceStateUtils.startMute(props.oldState, props.newState)) {
            Logger.debug('User is muted');
            // TODO : start timer
            return
        }

        if (VoiceStateUtils.stopMute(props.oldState, props.newState)) {
            Logger.debug('User is unmuted');
            // TODO : stop timer
            // TODO : update stats
            return
        }
    }
}