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
  | { type: 'pong' }
  | { type: 'error'; error: string };

/**
 * Live connection to the web service's /ws endpoint. The full stat state is
 * always loaded over HTTP; this stream only carries incremental voice events so
 * the dashboard can update in real time. Reconnects automatically with backoff.
 */
@Injectable({ providedIn: 'root' })
export class WsService {
  private socket: WebSocket | null = null;
  private reconnectDelay = 1000;
  private closedByUser = false;
  private readonly pending = new Set<string>();

  readonly connected = signal(false);
  readonly events = new Subject<VoiceEvent>();

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  disconnect(): void {
    this.closedByUser = true;
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
    };

    socket.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data as string) as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === 'voice_event') this.events.next(msg.event);
    };

    socket.onclose = () => {
      this.connected.set(false);
      this.socket = null;
      if (!this.closedByUser) {
        setTimeout(() => this.open(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      }
    };

    socket.onerror = () => socket.close();
  }

  private send(payload: unknown): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}
