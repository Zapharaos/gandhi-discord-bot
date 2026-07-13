import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface VoiceEvent {
  guildId: string;
  userId: string;
  type: string;
  timestamp: number;
}

type ServerMessage =
  | { type: 'ready'; rooms: string[] }
  | { type: 'voice_event'; event: VoiceEvent }
  | { type: 'guild_activity'; guildId: string }
  | { type: 'pong' }
  | { type: 'error'; error: string };

const HEARTBEAT_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Live connection to the web service's /ws endpoint. The full stat state is
 * always loaded over HTTP; this stream only carries incremental signals so the UI
 * can refresh in real time. Connected once at app start; reconnects automatically
 * with jittered backoff and a client heartbeat to survive idle proxies.
 */
@Injectable({ providedIn: 'root' })
export class WsService {
  private socket: WebSocket | null = null;
  private reconnectDelay = 1000;
  private closedByUser = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private readonly pending = new Set<string>();

  readonly connected = signal(false);
  /** Raw events for the viewer / administered guilds. */
  readonly events = new Subject<VoiceEvent>();
  /** Identity-free "activity happened in this guild" pings (any member). */
  readonly guildActivity = new Subject<{ guildId: string }>();
  /** Fires on every successful (re)connect, so callers can re-sync after a gap. */
  readonly opened = new Subject<void>();

  connect(): void {
    if (this.socket) return; // already connected/connecting
    this.closedByUser = false;
    this.open();
  }

  disconnect(): void {
    this.closedByUser = true;
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
  }

  subscribe(room: string): void {
    this.pending.add(room);
    this.send({ type: 'subscribe', rooms: [room] });
  }

  unsubscribe(room: string): void {
    this.pending.delete(room);
    this.send({ type: 'unsubscribe', rooms: [room] });
  }

  private open(): void {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${scheme}://${window.location.host}/ws`);
    this.socket = socket;

    socket.onopen = () => {
      this.connected.set(true);
      this.reconnectDelay = 1000;
      // Re-assert any rooms requested before the socket was ready.
      for (const room of this.pending) this.send({ type: 'subscribe', rooms: [room] });
      this.startHeartbeat();
      this.opened.next();
    };

    socket.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data as string) as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === 'voice_event') this.events.next(msg.event);
      else if (msg.type === 'guild_activity') this.guildActivity.next({ guildId: msg.guildId });
    };

    socket.onclose = () => {
      this.connected.set(false);
      this.socket = null;
      this.stopHeartbeat();
      if (!this.closedByUser) {
        // Jittered backoff so a server restart doesn't trigger a reconnect stampede.
        const jitter = 0.8 + Math.random() * 0.4;
        setTimeout(() => this.open(), Math.round(this.reconnectDelay * jitter));
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_BACKOFF_MS);
      }
    };

    socket.onerror = () => socket.close();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => this.send({ type: 'ping' }), HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private send(payload: unknown): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}
