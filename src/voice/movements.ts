import {Voice} from "./voice";
import {VoiceState} from "discord.js";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";

export class MovementsVoice implements Voice {

    public async execute(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        await this.handleJoin(oldState, newState, data);
        await this.handleLeave(oldState, newState, data);
        await this.handleSwitch(oldState, newState, data);
    }

    private async handleJoin(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        // Check if the user is joining a channel
        if (VoiceStateUtils.isJoiningChannel(oldState, newState)) {

            Logger.debug('User is joining a channel');

            // TODO : Start user timer
            // TODO : update stats

            // Joins as muted or deafened
            if (VoiceStateUtils.startMute(oldState, newState)) {
                Logger.debug('User is joining muted');
                // TODO : Start mute timer for user
            }
            else if (VoiceStateUtils.startDeafen(oldState, newState)) {
                Logger.debug('User is joining deafened');
                // TODO : Start deafen timer for user
            }
        }
    }

    private async handleLeave(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        // Check if the user is leaving a channel
        if (VoiceStateUtils.isLeavingChannel(oldState, newState)) {
            Logger.debug('User is leaving a channel');

            // TODO : leaving channel : with and without live timers
            // TODO : Stop user's live timers (if any)
        }
    }

    private async handleSwitch(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void> {
        // Check if the user is switching channels
        if (VoiceStateUtils.isSwitchingChannel(oldState, newState)) {
            Logger.debug('User is switching channels');

            // TODO : switching channels
        }
    }
}