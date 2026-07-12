import type { WebSocket } from 'ws';
import { logger } from '../logger';
import type { ServerMessage } from './protocol';

// Room-based fan-out over browser WebSocket connections. A "room" is an opaque
// string (see protocol.rooms) such as `user:123` or `guild:456`. A socket may be
// in several rooms; a room may hold several sockets.
class WsHub {
    private readonly roomToSockets = new Map<string, Set<WebSocket>>();
    private readonly socketToRooms = new Map<WebSocket, Set<string>>();

    register(socket: WebSocket): void {
        if (!this.socketToRooms.has(socket)) {
            this.socketToRooms.set(socket, new Set());
        }
    }

    subscribe(socket: WebSocket, room: string): void {
        this.register(socket);
        this.socketToRooms.get(socket)!.add(room);
        let set = this.roomToSockets.get(room);
        if (!set) {
            set = new Set();
            this.roomToSockets.set(room, set);
        }
        set.add(socket);
    }

    unsubscribe(socket: WebSocket, room: string): void {
        this.socketToRooms.get(socket)?.delete(room);
        const set = this.roomToSockets.get(room);
        if (set) {
            set.delete(socket);
            if (set.size === 0) this.roomToSockets.delete(room);
        }
    }

    remove(socket: WebSocket): void {
        const roomSet = this.socketToRooms.get(socket);
        if (roomSet) {
            for (const room of roomSet) {
                const sockets = this.roomToSockets.get(room);
                if (sockets) {
                    sockets.delete(socket);
                    if (sockets.size === 0) this.roomToSockets.delete(room);
                }
            }
        }
        this.socketToRooms.delete(socket);
    }

    roomsOf(socket: WebSocket): string[] {
        return [...(this.socketToRooms.get(socket) ?? [])];
    }

    /** Send a message to every socket currently in the given room. */
    publish(room: string, message: ServerMessage): number {
        const sockets = this.roomToSockets.get(room);
        if (!sockets || sockets.size === 0) return 0;
        const payload = JSON.stringify(message);
        let delivered = 0;
        for (const socket of sockets) {
            // ws.OPEN === 1; guard so a half-closed socket can't throw.
            if (socket.readyState === 1) {
                try {
                    socket.send(payload);
                    delivered += 1;
                } catch (err) {
                    logger.warn({ err, room }, 'Failed to deliver WS message');
                }
            }
        }
        return delivered;
    }

    get connectionCount(): number {
        return this.socketToRooms.size;
    }
}

export const hub = new WsHub();
