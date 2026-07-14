import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of, switchMap } from 'rxjs';

import { ApiService } from '@core/api/api.service';
import { BotAdminHealth, BotAdminHealthHistory, BotEventEntry, HealthRange } from '@core/api/models';
import { VisibilityService } from '@core/visibility/visibility.service';
import { SparklineComponent, SparkPoint } from '@shared/sparkline/sparkline.component';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';

interface Tile {
  labelKey: string;
  value: string;
  /** Highlight the value when it signals a problem. */
  alert?: boolean;
  muted?: boolean;
}

interface Chart {
  key: string;
  labelKey: string;
  points: SparkPoint[];
  points2?: SparkPoint[];
  format: (v: number) => string;
}

// Dot color per event type: red = incident, amber = instability, green =
// recovery, gray = lifecycle.
const EVENT_DOT: Record<string, string> = {
  startup: 'bg-surface-400',
  ready: 'bg-green-500',
  shutdown: 'bg-surface-500',
  shard_disconnect: 'bg-amber-500',
  shard_reconnecting: 'bg-amber-500',
  shard_resume: 'bg-green-500',
  shard_error: 'bg-red-500',
  client_error: 'bg-red-500',
  client_warn: 'bg-amber-500',
  command_error: 'bg-red-500',
};

const HOUR_MS = 3_600_000;

@Component({
  selector: 'app-bot-health-panel',
  standalone: true,
  imports: [DatePipe, TranslatePipe, SparklineComponent, RevealOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section appReveal class="card mb-6 p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span class="text-[11px] font-medium uppercase tracking-wide text-surface-500">{{ 'botAdmin.healthPanel.title' | translate }}</span>
        <div class="flex rounded-lg border border-surface-700 p-0.5 text-xs">
          @for (r of ranges; track r) {
            <button
              type="button"
              class="rounded-md px-2.5 py-1 font-medium transition-colors"
              [class.bg-primary-500/20]="range() === r"
              [class.text-primary-300]="range() === r"
              [class.text-surface-400]="range() !== r"
              (click)="range.set(r)"
            >
              {{ 'botAdmin.healthPanel.ranges.' + r | translate }}
            </button>
          }
        </div>
      </div>

      @if (health(); as h) {
        <!-- Counter tiles -->
        <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          @for (t of tiles(); track t.labelKey) {
            <div class="rounded-xl border border-surface-800 bg-surface-950/50 px-3 py-2.5">
              <div class="truncate text-[11px] font-medium uppercase tracking-wide text-surface-500">{{ t.labelKey | translate }}</div>
              <div
                class="mt-1 truncate text-lg font-bold tabular-nums"
                [class.text-red-400]="t.alert"
                [class.text-surface-0]="!t.alert && !t.muted"
                [class.text-surface-500]="!t.alert && t.muted"
              >{{ t.value }}</div>
            </div>
          }
        </div>

        <!-- Metric sparklines -->
        @if (history(); as hist) {
          @if (hist.points.length > 0) {
            <div class="mb-4 grid gap-3 sm:grid-cols-2">
              @for (c of charts(); track c.key) {
                <div class="rounded-xl border border-surface-800 bg-surface-950/50 p-3">
                  <div class="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-surface-500">
                    <span>{{ c.labelKey | translate }}</span>
                    @if (c.key === 'sessions' && c.points2?.length) {
                      <span class="normal-case tracking-normal text-amber-400/80">— — {{ 'botAdmin.healthPanel.peaksLegend' | translate }}</span>
                    }
                  </div>
                  <app-sparkline [points]="c.points" [points2]="c.points2 ?? []" [gapMs]="gapMs()" [formatValue]="c.format" />
                </div>
              }
            </div>
          } @else {
            <p class="mb-4 rounded-xl border border-dashed border-surface-800 px-4 py-6 text-center text-sm text-surface-500">
              {{ 'botAdmin.healthPanel.noMetrics' | translate }}
            </p>
          }
        }

        <!-- Event log -->
        <h3 class="mb-2 text-[11px] font-medium uppercase tracking-wide text-surface-500">{{ 'botAdmin.healthPanel.events' | translate }}</h3>
        @if (h.events.length > 0) {
          <ul class="max-h-72 divide-y divide-surface-800 overflow-y-auto rounded-xl border border-surface-800">
            @for (e of h.events; track e.id) {
              <li class="flex items-start gap-2.5 px-3 py-2 text-sm">
                <span class="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full" [class]="dotClass(e)"></span>
                <span class="min-w-0 flex-1">
                  <span class="font-medium text-surface-200">{{ 'botAdmin.healthPanel.eventTypes.' + e.type | translate }}</span>
                  @if (e.crashed) {
                    <span class="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-400">{{ 'botAdmin.healthPanel.crashBadge' | translate }}</span>
                  }
                  @if (e.detail) {
                    <span class="block truncate text-xs text-surface-500" [title]="e.detail">{{ e.detail }}</span>
                  }
                </span>
                <span class="shrink-0 text-xs tabular-nums text-surface-500">{{ e.timestamp | date: 'MMM d, HH:mm:ss' }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="rounded-xl border border-dashed border-surface-800 px-4 py-6 text-center text-sm text-surface-500">
            {{ 'botAdmin.healthPanel.noEvents' | translate }}
          </p>
        }
      } @else {
        <div class="rounded-xl border border-dashed border-surface-800 p-8 text-center text-surface-500">
          <i class="pi pi-spinner pi-spin mb-2 block text-2xl text-surface-600"></i>
          {{ 'botAdmin.loading' | translate }}
        </div>
      }
    </section>
  `,
})
export class BotHealthPanelComponent {
  private readonly api = inject(ApiService);
  private readonly visibility = inject(VisibilityService);

  readonly ranges: HealthRange[] = ['24h', '7d', '30d'];
  readonly range = signal<HealthRange>('24h');

  // Same polling cadence as the bot's metrics sampler (60s), visibility-aware.
  readonly health = toSignal<BotAdminHealth | null>(
    this.visibility.pollTimer(60_000).pipe(
      switchMap(() => this.api.botAdminHealth().pipe(catchError(() => of(null)))),
      switchMap((r) => of(r ? r.health : null)),
    ),
    { initialValue: null },
  );

  // Refetched on range change and on the same 60s poll.
  readonly history = toSignal<BotAdminHealthHistory | null>(
    toObservable(this.range).pipe(
      switchMap((range) =>
        this.visibility.pollTimer(60_000).pipe(
          switchMap(() => this.api.botAdminHealthHistory(range).pipe(catchError(() => of(null)))),
        ),
      ),
      switchMap((r) => of(r ? r.history : null)),
    ),
    { initialValue: null },
  );

  /** Break sparkline segments after ~3 missing buckets (downtime shows as a hole). */
  readonly gapMs = computed(() => (this.history()?.bucketMs ?? 60_000) * 3);

  readonly tiles = computed<Tile[]>(() => {
    const h = this.health();
    if (!h) return [];
    const pct = (v: number | null): string => (v == null ? '—' : `${v}%`);
    return [
      { labelKey: 'botAdmin.healthPanel.availability24h', value: pct(h.availability.h24), alert: h.availability.h24 != null && h.availability.h24 < 99 },
      { labelKey: 'botAdmin.healthPanel.availability7d', value: pct(h.availability.d7), alert: h.availability.d7 != null && h.availability.d7 < 99 },
      { labelKey: 'botAdmin.healthPanel.reconnects', value: h.counters24h.reconnects.toLocaleString(), muted: h.counters24h.reconnects === 0 },
      { labelKey: 'botAdmin.healthPanel.commandErrors', value: h.counters24h.commandErrors.toLocaleString(), alert: h.counters24h.commandErrors > 0, muted: h.counters24h.commandErrors === 0 },
      { labelKey: 'botAdmin.healthPanel.memory', value: h.current ? this.mb(h.current.rssBytes) : '—' },
      { labelKey: 'botAdmin.healthPanel.loopLag', value: h.current ? `${h.current.loopLagMaxMs} ms` : '—' },
    ];
  });

  readonly charts = computed<Chart[]>(() => {
    const hist = this.history();
    if (!hist) return [];
    const pts = hist.points;
    const map = (get: (p: (typeof pts)[number]) => number): SparkPoint[] => pts.map((p) => ({ t: p.t, v: get(p) }));
    // Daily peaks overlay only makes sense on multi-day ranges (one point per day).
    const peaks: SparkPoint[] =
      hist.range === '24h' ? [] : hist.peaks.map((p) => ({ t: p.day + 12 * HOUR_MS, v: p.peakSessions }));
    return [
      { key: 'memory', labelKey: 'botAdmin.healthPanel.chartMemory', points: map((p) => p.rssBytes), format: (v) => this.mb(v) },
      { key: 'ping', labelKey: 'botAdmin.healthPanel.chartPing', points: map((p) => p.wsPing), format: (v) => `${v} ms` },
      {
        key: 'sessions',
        labelKey: 'botAdmin.healthPanel.chartSessions',
        points: map((p) => p.activeSessions),
        points2: peaks,
        format: (v) => v.toLocaleString(),
      },
      { key: 'lag', labelKey: 'botAdmin.healthPanel.chartLag', points: map((p) => p.loopLagMaxMs), format: (v) => `${v} ms` },
    ];
  });

  dotClass(e: BotEventEntry): string {
    if (e.crashed) return 'bg-red-500';
    return EVENT_DOT[e.type] ?? 'bg-surface-500';
  }

  private mb(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
}
