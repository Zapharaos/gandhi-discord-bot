import http from 'node:http';
import { Client } from 'discord.js';
import { Logger } from '@services/logger';
import { BotStatusController } from '@controllers/bot-status';
import { DailyPeaksController } from '@controllers/daily-peaks';

const SHARD_ID = 0;
const HEARTBEAT_INTERVAL_MS = 15_000;

// Exposes the bot's liveness two ways:
//   • a DB heartbeat (read by the web service so the dashboard can show status),
//   • a tiny HTTP /health endpoint (for container orchestration / Docker healthcheck).
// Both derive from the same live snapshot of the Discord client.
class BotHealthService {
    private client: Client | null = null;
    private timer: NodeJS.Timeout | null = null;
    private server: http.Server | null = null;
    private startedAt = Date.now();

    start(client: Client): void {
        this.client = client;
        this.startedAt = Date.now();
        void this.writeHeartbeat();
        this.timer = setInterval(() => void this.writeHeartbeat(), HEARTBEAT_INTERVAL_MS);
        this.timer.unref();
        this.startHttpServer();
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.server?.close();
    }

    private snapshot(): { ready: boolean; guildCount: number; wsPing: number; startedAt: number; uptimeMs: number } {
        const client = this.client;
        const ready = !!client?.isReady();
        return {
            ready,
            guildCount: client?.guilds.cache.size ?? 0,
            wsPing: client?.ws.ping ?? 0,
            startedAt: this.startedAt,
            uptimeMs: Date.now() - this.startedAt,
        };
    }

    private async writeHeartbeat(): Promise<void> {
        const s = this.snapshot();
        await BotStatusController.heartbeat(SHARD_ID, {
            ready: s.ready,
            guildCount: s.guildCount,
            wsPing: s.wsPing,
            startedAt: s.startedAt,
        });
        // Piggy-back on the heartbeat cadence to track the daily concurrency peak.
        if (s.ready) await DailyPeaksController.samplePeak();
    }

    private startHttpServer(): void {
        const port = Number.parseInt(process.env.HEALTH_PORT ?? process.env.PORT ?? '3000', 10);
        this.server = http.createServer((req, res) => {
            if (req.url !== '/health') {
                res.writeHead(404);
                res.end();
                return;
            }
            const s = this.snapshot();
            res.writeHead(s.ready ? 200 : 503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: s.ready ? 'ok' : 'starting', ...s }));
        });
        this.server.on('error', (err) => Logger.error('Bot health server error', err));
        this.server.listen(port, () => Logger.info(`Bot health server listening on :${port}`));
    }
}

export const botHealth = new BotHealthService();
