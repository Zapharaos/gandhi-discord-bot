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
    // Privacy-safe "something happened in this guild" ping (no user identity), so
    // any member can refresh the (private-filtered) active list without learning
    // who is private. The raw voice_event stays limited to the user + admin rooms.
    | { type: 'guild_activity'; guildId: string }
    | { type: 'pong' }
    | { type: 'error'; error: string };

/** Room helpers — the single source of truth for room naming. */
export const rooms = {
    /** The user's own events (their full activity, wherever it happens). */
    user: (userId: string): string => `user:${userId}`,
    /** Raw voice events for a guild — admins only (carries user ids). */
    guild: (guildId: string): string => `guild:${guildId}`,
    /** Content-free activity pings for a guild — any member may subscribe. */
    guildPublic: (guildId: string): string => `guild-pub:${guildId}`,
};
