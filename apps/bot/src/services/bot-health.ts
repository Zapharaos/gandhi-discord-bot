import http from 'node:http';
import { Client } from 'discord.js';
import { Logger } from '@services/logger';
import { BotStatusController } from '@controllers/bot-status';
import { DailyPeaksController } from '@controllers/daily-peaks';
import { BotMetricsController } from '@controllers/bot-metrics';
import { BotEventsController } from '@controllers/bot-events';
import { StartTimestampsController } from '@controllers/start-timestamps';
import { healthMetrics } from '@services/health-metrics';

const SHARD_ID = 0;
const HEARTBEAT_INTERVAL_MS = 15_000;
// Persist a detailed bot_metrics sample every Nth heartbeat (4 × 15s = 60s).
const METRICS_EVERY_N_BEATS = 4;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
const METRICS_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const EVENTS_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

// Exposes the bot's liveness two ways:
//   • a DB heartbeat (read by the web service so the dashboard can show status),
//   • a tiny HTTP /health endpoint (for container orchestration / Docker healthcheck).
// Both derive from the same live snapshot of the Discord client.
class BotHealthService {
    private client: Client | null = null;
    private timer: NodeJS.Timeout | null = null;
    private server: http.Server | null = null;
    private startedAt = Date.now();
    private beatCount = 0;
    private lastPruneAt = 0;

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
        const sessions = s.ready ? await StartTimestampsController.countActiveSessions() : 0;
        if (s.ready) await DailyPeaksController.samplePeak(sessions);

        // Every Nth beat, persist a detailed metrics sample and (at most once
        // an hour) prune old health data.
        this.beatCount++;
        if (this.beatCount % METRICS_EVERY_N_BEATS !== 0) return;

        const mem = process.memoryUsage();
        const drained = healthMetrics.drain();
        await BotMetricsController.insertSample(SHARD_ID, {
            ready: s.ready,
            guildCount: s.guildCount,
            wsPing: s.wsPing,
            rssBytes: mem.rss,
            heapUsedBytes: mem.heapUsed,
            loopLagMeanMs: drained.loopLagMeanMs,
            loopLagMaxMs: drained.loopLagMaxMs,
            activeSessions: sessions,
            commandsOk: drained.commandsOk,
            commandsError: drained.commandsError,
            commandLatencyMsTotal: drained.commandLatencyMsTotal,
        });

        const now = Date.now();
        if (now - this.lastPruneAt >= PRUNE_INTERVAL_MS) {
            this.lastPruneAt = now;
            await BotMetricsController.prune(now - METRICS_RETENTION_MS);
            await BotEventsController.prune(now - EVENTS_RETENTION_MS);
        }
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
