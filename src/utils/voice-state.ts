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

    static isMuted(oldState: VoiceState, newState: VoiceState) {
        return !oldState.selfMute && newState.selfMute;
    }

    static isUnmuted(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfMute && !newState.selfMute;
    }

    static staysMuted(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfMute && newState.selfMute && newState.serverMute;
    }

    static isDeafened(oldState: VoiceState, newState: VoiceState) {
        return !oldState.selfDeaf && newState.selfDeaf;
    }

    static isUndeafened(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfDeaf && !newState.selfDeaf;
    }

    static isDeafenEvent(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfDeaf !== newState.selfDeaf;
    }

    static isStreaming(oldState: VoiceState, newState: VoiceState) {
        return !oldState.streaming && newState.streaming;
    }

    static isNotStreaming(oldState: VoiceState, newState: VoiceState) {
        return oldState.streaming && !newState.streaming;
    }

    static isCamera(oldState: VoiceState, newState: VoiceState) {
        return !oldState.selfVideo && newState.selfVideo;
    }

    static isNotCamera(oldState: VoiceState, newState: VoiceState) {
        return oldState.selfVideo && !newState.selfVideo;
    }
}