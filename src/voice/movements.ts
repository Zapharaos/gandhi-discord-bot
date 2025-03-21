import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";

export class MovementsVoice implements Voice {

    public async execute(props: VoiceProps, data: EventData): Promise<void> {
        await this.handleJoin(props, data);
        await this.handleLeave(props, data);
        await this.handleSwitch(props, data);
    }

    private async handleJoin(props: VoiceProps, data: EventData): Promise<void> {
        // Check if the user is joining a channel
        if (VoiceStateUtils.isJoiningChannel(props.oldState, props.newState)) {

            Logger.debug('User is joining a channel');

            // TODO : Start user timer
            // TODO : update stats

            // Joins as muted or deafened
            if (VoiceStateUtils.startMute(props.oldState, props.newState)) {
                Logger.debug('User is joining muted');
                // TODO : Start mute timer for user
            }
            else if (VoiceStateUtils.startDeafen(props.oldState, props.newState)) {
                Logger.debug('User is joining deafened');
                // TODO : Start deafen timer for user
            }
        }
    }

    private async handleLeave(props: VoiceProps, data: EventData): Promise<void> {
        // Check if the user is leaving a channel
        if (VoiceStateUtils.isLeavingChannel(props.oldState, props.newState)) {
            Logger.debug('User is leaving a channel');

            // TODO : leaving channel : with and without live timers
            // TODO : Stop user's live timers (if any)
        }
    }

    private async handleSwitch(props: VoiceProps, data: EventData): Promise<void> {
        // Check if the user is switching channels
        if (VoiceStateUtils.isSwitchingChannel(props.oldState, props.newState)) {
            Logger.debug('User is switching channels');

            // TODO : switching channels
        }
    }
}