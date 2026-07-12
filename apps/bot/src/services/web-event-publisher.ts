import { WebSocket } from 'ws';
import { Logger } from '@services/logger';
import type { InternalMessage, VoiceEvent } from '@gandhi/core/ws/protocol';

// Optional live-event bridge to the web service. The bot connects to the web
// service's /internal/events endpoint as a client and pushes voice events so the
// dashboard can update in real time.
//
// Design constraints:
//  - Entirely optional: if WEB_INTERNAL_WS_URL is unset, this is a no-op and the
//    bot runs exactly as before (no web service required).
//  - Never blocks or throws into the voice handler: publish() is fire-and-forget.
//  - Self-healing: reconnects with capped backoff. Events emitted while
//    disconnected are simply dropped — the dashboard reloads full state over HTTP
//    whenever a browser (re)connects, so these deltas are best-effort.
class WebEventPublisher {
    private socket: WebSocket | null = null;
    private url: string | null = null;
    private token = '';
    private reconnectDelay = 1000;
    private stopped = false;

    /** Wire up from the environment. Safe to call once at startup. */
    start(): void {
        const url = process.env.WEB_INTERNAL_WS_URL;
        const token = process.env.INTERNAL_WS_TOKEN;
        if (!url) {
            Logger.info('WEB_INTERNAL_WS_URL not set — live event publishing disabled');
            return;
        }
        if (!token) {
            Logger.warn('WEB_INTERNAL_WS_URL set but INTERNAL_WS_TOKEN missing — live publishing disabled');
            return;
        }
        this.url = url;
        this.token = token;
        this.stopped = false;
        this.open();
    }

    stop(): void {
        this.stopped = true;
        this.socket?.close();
        this.socket = null;
    }

    /** Fire-and-forget: never throws, drops the event if not currently connected. */
    publish(event: VoiceEvent): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        try {
            const message: InternalMessage = { kind: 'voice_event', event };
            this.socket.send(JSON.stringify(message));
        } catch {
            // Best-effort: a failed send is not worth disrupting the bot.
        }
    }

    private open(): void {
        if (!this.url) return;
        const separator = this.url.includes('?') ? '&' : '?';
        const socket = new WebSocket(`${this.url}${separator}token=${encodeURIComponent(this.token)}`);
        this.socket = socket;

        socket.on('open', () => {
            this.reconnectDelay = 1000;
            Logger.info('Connected to web service /internal/events');
        });

        socket.on('close', () => {
            this.socket = null;
            if (!this.stopped) {
                setTimeout(() => this.open(), this.reconnectDelay);
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
            }
        });

        // Swallow errors: 'close' handles reconnection, and we must never let a
        // transport error bubble into the voice handler.
        socket.on('error', () => undefined);
    }
}

export const webEvents = new WebEventPublisher();
