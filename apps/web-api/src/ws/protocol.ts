// Browser-facing WebSocket protocol. The shared bot<->service wire types
// (VoiceEvent, InternalMessage, …) live in @gandhi/core so both sides agree; this
// file adds the browser-only messages and room helpers.
//
// The full stat state is always loaded from the database on connect — these
// events are only live deltas.

import type { VoiceEvent } from '@gandhi/core/ws/protocol';

export type { VoiceEvent, VoiceEventType, InternalMessage } from '@gandhi/core/ws/protocol';

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
