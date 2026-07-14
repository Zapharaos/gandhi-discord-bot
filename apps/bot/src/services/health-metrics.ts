import { monitorEventLoopDelay, IntervalHistogram } from 'node:perf_hooks';

export interface HealthMetricsDrain {
    loopLagMeanMs: number;
    loopLagMaxMs: number;
    commandsOk: number;
    commandsError: number;
    commandLatencyMsTotal: number;
}

// In-memory collector for the per-interval health metrics that can't be read
// off the Discord client: event-loop lag and command execution counters.
// drain() is called by the heartbeat's metrics sampler (~60s) and resets state.
class HealthMetricsService {
    private histogram: IntervalHistogram | null = null;
    private commandsOk = 0;
    private commandsError = 0;
    private commandLatencyMsTotal = 0;

    start(): void {
        if (this.histogram) return;
        this.histogram = monitorEventLoopDelay({ resolution: 20 });
        this.histogram.enable();
    }

    stop(): void {
        this.histogram?.disable();
        this.histogram = null;
    }

    recordCommand(ok: boolean, latencyMs: number): void {
        if (ok) this.commandsOk++;
        else this.commandsError++;
        this.commandLatencyMsTotal += latencyMs;
    }

    drain(): HealthMetricsDrain {
        // Histogram values are nanoseconds.
        const mean = this.histogram ? this.histogram.mean / 1e6 : 0;
        const max = this.histogram ? this.histogram.max / 1e6 : 0;
        this.histogram?.reset();

        const result: HealthMetricsDrain = {
            loopLagMeanMs: Number.isFinite(mean) ? mean : 0,
            loopLagMaxMs: Number.isFinite(max) ? max : 0,
            commandsOk: this.commandsOk,
            commandsError: this.commandsError,
            commandLatencyMsTotal: this.commandLatencyMsTotal,
        };
        this.commandsOk = 0;
        this.commandsError = 0;
        this.commandLatencyMsTotal = 0;
        return result;
    }
}

export const healthMetrics = new HealthMetricsService();
