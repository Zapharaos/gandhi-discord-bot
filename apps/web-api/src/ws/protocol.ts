// Wire protocol shared between the bot (publisher) and browser clients.
//
// The bot pushes VoiceEvents to /internal/events; the web service fans them out
// to the relevant rooms as ServerMessages. The full stat state is always loaded
// from the database on connect — these events are only live deltas.

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

/** Envelope the bot sends over /internal/events. */
export interface InternalMessage {
    kind: 'voice_event';
    event: VoiceEvent;
}

/** Messages a browser client can send to the server. */
export type ClientMessage =
    | { type: 'subscribe'; rooms: string[] }
    | { type: 'unsubscribe'; rooms: string[] }
    | { type: 'ping' };

/** Messages the server pushes to a browser client. */
export type ServerMessage =
    | { type: 'ready'; rooms: string[] }
    | { type: 'voice_event'; event: VoiceEvent }
    | { type: 'pong' }
    | { type: 'error'; error: string };

/** Room helpers — the single source of truth for room naming. */
export const rooms = {
    user: (userId: string): string => `user:${userId}`,
    guild: (guildId: string): string => `guild:${guildId}`,
};
