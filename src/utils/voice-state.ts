import {VoiceState} from "discord.js";

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

    static startMute(oldState: VoiceState, newState: VoiceState) {
        const prev = oldState.selfMute || oldState.serverMute;
        const next = newState.selfMute || newState.serverMute;
        return !prev && next;
    }

    static stopMute(oldState: VoiceState, newState: VoiceState) {
        const prev = oldState.selfMute || oldState.serverMute;
        const next = newState.selfMute || newState.serverMute;
        return prev && !next;
    }

    static isMuted(newState: VoiceState) {
        return newState.selfMute || newState.serverMute;
    }

    static startDeafen(oldState: VoiceState, newState: VoiceState) {
        const prev = oldState.selfDeaf || oldState.serverDeaf;
        const next = newState.selfDeaf || newState.serverDeaf;
        return !prev && next;
    }

    static stopDeafen(oldState: VoiceState, newState: VoiceState) {
        const prev = oldState.selfDeaf || oldState.serverDeaf;
        const next = newState.selfDeaf || newState.serverDeaf;
        return prev && !next;
    }

    static isDeafen(newState: VoiceState) {
        return newState.selfDeaf || newState.serverDeaf;
    }

    static startStreaming(oldState: VoiceState, newState: VoiceState) {
        return !oldState.streaming && newState.streaming;
    }

    static stopStreaming(oldState: VoiceState, newState: VoiceState) {
        return oldState.streaming && !newState.streaming;
    }

    static isStreaming(newState: VoiceState) {
        return newState.streaming;
    }

    static startCamera(oldState: VoiceState, newState: VoiceState) {
        return !oldState.selfVideo && newState.selfVideo;
    }

    static stopCamera(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfVideo && !newState.selfVideo;
    }

    static isCameraOn(newState: VoiceState) {
        return newState.selfVideo;
    }
}