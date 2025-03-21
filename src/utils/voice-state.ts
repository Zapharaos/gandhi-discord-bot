import {VoiceState} from "discord.js";

// TODO : handler server events : mute or deafen
export class VoiceStateUtils {

    static isJoiningChannel(oldState: VoiceState, newState: VoiceState) {
        return !oldState.channelId && newState.channelId;
    }

    static isSwitchingChannel(oldState: VoiceState, newState: VoiceState) {
        return oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;
    }

    static isLeavingChannel(oldState: VoiceState, newState: VoiceState) {
        return oldState.channelId && !newState.channelId;
    }

    static staysMuted(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfMute && newState.selfMute && newState.selfMute;
    }

    static startMute(oldState: VoiceState, newState: VoiceState) {
        return !oldState.selfMute && newState.selfMute;
    }

    static stopMute(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfMute && !newState.selfMute;
    }

    static startDeafen(oldState: VoiceState, newState: VoiceState) {
        return !oldState.selfDeaf && newState.selfDeaf;
    }

    static stopDeafen(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfDeaf && !newState.selfDeaf;
    }

    static isDeafenEvent(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfDeaf !== newState.selfDeaf;
    }

    static startStreaming(oldState: VoiceState, newState: VoiceState) {
        return !oldState.streaming && newState.streaming;
    }

    static stopStreaming(oldState: VoiceState, newState: VoiceState) {
        return oldState.streaming && !newState.streaming;
    }

    static startCamera(oldState: VoiceState, newState: VoiceState) {
        return !oldState.selfVideo && newState.selfVideo;
    }

    static stopCamera(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfVideo && !newState.selfVideo;
    }
}