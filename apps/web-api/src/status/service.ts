import type { BotStatus } from '@gandhi/core/types/db';
import { getBotStatusRow } from '../stats/queries';
import { hub } from '../ws/hub';

// A heartbeat older than this means the bot is considered offline (it writes
// every ~15s, so 45s tolerates a couple of missed beats).
const STALE_MS = 45_000;

export interface BotHealth {
    /** Bot is up AND its heartbeat is recent. */
    online: boolean;
    /** Discord client reported ready at the last heartbeat. */
    ready: boolean;
    /** Epoch ms of the last heartbeat, or null if none yet. */
    lastSeen: number | null;
    guildCount: number;
    /** Gateway latency in ms, or null. */
    wsPing: number | null;
    /** Uptime in ms since the bot process started, or null. */
    uptimeMs: number | null;
}

// Pure so it can be unit-tested without a database.
export function computeBotHealth(row: BotStatus | undefined, now: number): BotHealth {
    if (!row || row.updated_at == null) {
        return { online: false, ready: false, lastSeen: null, guildCount: 0, wsPing: null, uptimeMs: null };
    }
    const fresh = now - row.updated_at < STALE_MS;
    const ready = row.ready === 1;
    return {
        online: fresh && ready,
        ready,
        lastSeen: row.updated_at,
        guildCount: row.guild_count ?? 0,
        wsPing: row.ws_ping ?? null,
        uptimeMs: row.started_at != null ? Math.max(0, now - row.started_at) : null,
    };
}

export interface ServiceStatus {
    /** This web service is responding (always true if you get a response). */
    web: boolean;
    /** The SQLite database could be read. */
    db: boolean;
    bot: BotHealth;
    /** Live browser WebSocket connections currently held by this instance. */
    wsConnections: number;
}

// Never throws: a DB failure is reported as db:false + an offline bot, so the
// status endpoint stays a reliable liveness probe.
export async function getServiceStatus(): Promise<ServiceStatus> {
    const wsConnections = hub.connectionCount;
    try {
        const row = await getBotStatusRow();
        return { web: true, db: true, bot: computeBotHealth(row, Date.now()), wsConnections };
    } catch {
        return { web: true, db: false, bot: computeBotHealth(undefined, Date.now()), wsConnections };
    }
}
