import { randomUUID } from 'node:crypto';

// A guild the user belongs to, as seen through the Discord OAuth `guilds` scope.
export interface SessionGuild {
    id: string;
    name: string;
    icon: string | null;
    /** True when the user has ADMINISTRATOR or MANAGE_GUILD on this guild. */
    isAdmin: boolean;
}

export interface SessionData {
    userId: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
    /** Guilds cached from Discord; refreshed when older than GUILDS_TTL_MS. */
    guilds: SessionGuild[];
    guildsFetchedAt: number;
    createdAt: number;
    expiresAt: number;
}

// In-memory session store. Kept in-process so the web service never has to write
// to the bot-owned SQLite file. Sessions are lost on restart (a re-login), which
// is an acceptable trade-off for keeping the bot the sole database writer.
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const GUILDS_TTL_MS = 5 * 60 * 1000; // 5 minutes

const sessions = new Map<string, SessionData>();

export const SESSION_COOKIE = 'gandhi_sid';

export function createSession(
    data: Omit<SessionData, 'createdAt' | 'expiresAt'>,
): { id: string; session: SessionData } {
    const now = Date.now();
    const session: SessionData = { ...data, createdAt: now, expiresAt: now + SESSION_TTL_MS };
    const id = randomUUID();
    sessions.set(id, session);
    return { id, session };
}

export function getSession(id: string | undefined): SessionData | null {
    if (!id) return null;
    const session = sessions.get(id);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
        sessions.delete(id);
        return null;
    }
    return session;
}

export function destroySession(id: string | undefined): void {
    if (id) sessions.delete(id);
}

// Periodically drop expired sessions so the map can't grow unbounded.
export function startSessionSweeper(intervalMs = 60 * 60 * 1000): NodeJS.Timeout {
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [id, session] of sessions) {
            if (session.expiresAt < now) sessions.delete(id);
        }
    }, intervalMs);
    timer.unref();
    return timer;
}
