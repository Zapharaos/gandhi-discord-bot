import {VoiceState} from "discord.js";
import {VoiceStateUtils} from "@utils/voice-state";

// Minimal VoiceState stub — only the fields the utils read.
interface VoiceStateStub {
    channelId?: string | null;
    selfMute?: boolean;
    serverMute?: boolean;
    selfDeaf?: boolean;
    serverDeaf?: boolean;
    streaming?: boolean;
    selfVideo?: boolean;
}

function vs(partial: VoiceStateStub): VoiceState {
    return {
        channelId: null,
        selfMute: false,
        serverMute: false,
        selfDeaf: false,
        serverDeaf: false,
        streaming: false,
        selfVideo: false,
        ...partial,
    } as unknown as VoiceState;
}

describe('VoiceStateUtils', () => {
    describe('channel movements', () => {
        it('detects joining a channel', () => {
            expect(VoiceStateUtils.isJoiningChannel(vs({channelId: null}), vs({channelId: 'a'}))).toBeTruthy();
            expect(VoiceStateUtils.isJoiningChannel(vs({channelId: 'a'}), vs({channelId: 'a'}))).toBeFalsy();
        });
        it('detects leaving a channel', () => {
            expect(VoiceStateUtils.isLeavingChannel(vs({channelId: 'a'}), vs({channelId: null}))).toBeTruthy();
            expect(VoiceStateUtils.isLeavingChannel(vs({channelId: null}), vs({channelId: null}))).toBeFalsy();
        });
        it('detects switching channels', () => {
            expect(VoiceStateUtils.isSwitchingChannel(vs({channelId: 'a'}), vs({channelId: 'b'}))).toBeTruthy();
            expect(VoiceStateUtils.isSwitchingChannel(vs({channelId: 'a'}), vs({channelId: 'a'}))).toBeFalsy();
        });
    });

    describe('mute', () => {
        it('detects mute start (self or server)', () => {
            expect(VoiceStateUtils.startMute(vs({}), vs({selfMute: true}))).toBe(true);
            expect(VoiceStateUtils.startMute(vs({}), vs({serverMute: true}))).toBe(true);
            expect(VoiceStateUtils.startMute(vs({selfMute: true}), vs({selfMute: true}))).toBe(false);
        });
        it('detects mute stop', () => {
            expect(VoiceStateUtils.stopMute(vs({selfMute: true}), vs({}))).toBe(true);
            expect(VoiceStateUtils.stopMute(vs({}), vs({}))).toBe(false);
        });
        it('reports current mute state', () => {
            expect(VoiceStateUtils.isMuted(vs({serverMute: true}))).toBe(true);
            expect(VoiceStateUtils.isMuted(vs({}))).toBe(false);
        });
    });

    describe('deafen', () => {
        it('detects deafen start and stop', () => {
            expect(VoiceStateUtils.startDeafen(vs({}), vs({selfDeaf: true}))).toBe(true);
            expect(VoiceStateUtils.stopDeafen(vs({serverDeaf: true}), vs({}))).toBe(true);
        });
    });

    describe('streaming', () => {
        it('detects streaming start and stop', () => {
            expect(VoiceStateUtils.startStreaming(vs({}), vs({streaming: true}))).toBe(true);
            expect(VoiceStateUtils.stopStreaming(vs({streaming: true}), vs({}))).toBe(true);
            expect(VoiceStateUtils.isStreaming(vs({streaming: true}))).toBe(true);
        });
    });

    describe('camera', () => {
        it('detects camera on and off', () => {
            expect(VoiceStateUtils.startCamera(vs({}), vs({selfVideo: true}))).toBe(true);
            expect(VoiceStateUtils.stopCamera(vs({selfVideo: true}), vs({}))).toBe(true);
            expect(VoiceStateUtils.isCameraOn(vs({selfVideo: true}))).toBe(true);
        });
    });
});
