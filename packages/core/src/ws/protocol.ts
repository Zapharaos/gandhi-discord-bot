// Wire protocol shared between the bot (event publisher) and the web service
// (event consumer + browser fan-out). Kept in @gandhi/core so both sides depend
// on a single source of truth and can never drift.

export type VoiceEventType =
    | 'connect'
    | 'disconnect'
    | 'mute'
    | 'unmute'
    | 'deafen'
    | 'undeafen'
    | 'camera_on'
    | 'camera_off'
    | 'screen_on'
    | 'screen_off'
    | 'switch';

/** Event emitted by the bot when a tracked voice state changes. */
export interface VoiceEvent {
    guildId: string;
    userId: string;
    type: VoiceEventType;
    /** Epoch milliseconds when the change happened. */
    timestamp: number;
}

/** Envelope the bot sends over the internal WebSocket channel. */
export interface InternalMessage {
    kind: 'voice_event';
    event: VoiceEvent;
}
