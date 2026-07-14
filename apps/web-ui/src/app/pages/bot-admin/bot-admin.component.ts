import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '@core/api/api.service';
import { BotAdminGuildEntry, BotAdminOverview, TimelinePoint } from '@core/api/models';
import { StatCardComponent, StatMetric } from '@shared/stat-card/stat-card.component';
import { HeatmapComponent } from '@shared/heatmap/heatmap.component';
import { PageHeaderComponent } from '@shared/page-header/page-header.component';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';
import { DurationPipe } from '@shared/pipes/duration.pipe';

type GuildSort = 'members' | 'timeConnected30d' | 'timeConnected' | 'lastActivity';

interface GrowthBar {
  month: number;
  label: string;
  newUsers: number;
  cumulative: number;
  /** Bar height in px, scaled against the busiest month. */
  px: number;
}

interface Kpi {
  icon: string;
  /** Tailwind text-color class for the icon accent. */
  accent: string;
  labelKey: string;
  value: string;
  subKey?: string;
  subParams?: Record<string, unknown>;
  /** Show the pulsing live dot. */
  live?: boolean;
}

interface Row {
  labelKey: string;
  value: string;
  /** Render the value dimmed when it's a zero/empty signal. */
  muted?: boolean;
}

interface TimeCard {
  stat: 'time_connected' | 'time_muted' | 'time_deafened' | 'time_screen_sharing' | 'time_camera';
  labelKey: string;
  total: number;
  metrics: StatMetric[];
}

@Component({
  selector: 'app-bot-admin',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, TranslatePipe, StatCardComponent, HeatmapComponent, PageHeaderComponent, RevealOnScrollDirective, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header kicker="botAdmin.kicker" titleKey="botAdmin.title" subtitleKey="botAdmin.subtitle" icon="pi-cog" />

    @if (error()) {
      <p class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <i class="pi pi-exclamation-triangle mr-1.5"></i>{{ 'botAdmin.error' | translate }}
      </p>
    } @else if (!overview()) {
      <div class="rounded-2xl border border-dashed border-surface-800 p-10 text-center text-surface-500">
        <i class="pi pi-spinner pi-spin mb-3 block text-3xl text-surface-600"></i>
        {{ 'botAdmin.loading' | translate }}
      </div>
    } @else {
      @if (overview(); as o) {
        <!-- Key figures -->
        <div appReveal class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          @for (k of kpis(); track k.labelKey) {
            <div class="card p-5">
              <div class="flex items-center gap-2">
                <i class="pi {{ k.icon }} text-sm {{ k.accent }}"></i>
                <span class="truncate text-xs font-medium uppercase tracking-wide text-surface-400">{{ k.labelKey | translate }}</span>
                @if (k.live) {
                  <span class="relative ml-auto flex h-2 w-2 shrink-0">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                }
              </div>
              <div class="mt-2 truncate text-3xl font-bold tabular-nums text-surface-0">{{ k.value }}</div>
              @if (k.subKey) {
                <div class="mt-1 truncate text-xs text-surface-500">{{ k.subKey | translate: k.subParams }}</div>
              }
            </div>
          }
        </div>

        <!-- Bot health summary — click through to the dedicated health page -->
        <a
          routerLink="/bot-admin/health"
          class="card card-hover group mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5"
        >
          <span class="relative flex h-2.5 w-2.5">
            @if (o.bot.online) {
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            }
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full" [class.bg-green-500]="o.bot.online" [class.bg-red-500]="!o.bot.online"></span>
          </span>
          <span class="text-sm font-semibold" [class.text-green-400]="o.bot.online" [class.text-red-400]="!o.bot.online">
            {{ (o.bot.online ? 'botAdmin.health.online' : 'botAdmin.health.offline') | translate }}
          </span>
          @if (o.bot.wsPing != null) {
            <span class="text-sm text-surface-400">{{ 'botAdmin.health.ping' | translate }} <span class="font-medium tabular-nums text-surface-200">{{ o.bot.wsPing }} ms</span></span>
          }
          @if (o.bot.uptimeMs != null) {
            <span class="text-sm text-surface-400">{{ 'botAdmin.health.uptime' | translate }} <span class="font-medium tabular-nums text-surface-200">{{ o.bot.uptimeMs | duration }}</span></span>
          }
          @if (o.servers.discordGuildCount !== o.servers.present) {
            <span class="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
              <i class="pi pi-exclamation-triangle mr-1 text-[10px]"></i>{{ 'botAdmin.health.discordMismatch' | translate: { count: o.servers.discordGuildCount } }}
            </span>
          }
          <span class="ml-auto flex items-center gap-1.5 text-xs font-medium text-surface-500 transition-colors group-hover:text-primary-400">
            {{ 'botAdmin.health.details' | translate }}<i class="pi pi-arrow-right text-[10px]"></i>
          </span>
        </a>

        <!-- Global activity heatmap -->
        <section class="mb-6 card p-5">
          <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-0">
            <i class="pi pi-calendar text-xs text-primary-400"></i>{{ 'botAdmin.timeline.title' | translate }}
          </h2>
          <app-heatmap [points]="timeline()" />
        </section>

        <!-- Growth & retention -->
        <div class="mb-6 grid gap-3 lg:grid-cols-3">
          <section class="card p-5 lg:col-span-2">
            <h2 class="mb-1 flex items-center gap-2 text-sm font-semibold text-surface-0">
              <i class="pi pi-chart-bar text-xs text-primary-400"></i>{{ 'botAdmin.growth.title' | translate }}
            </h2>
            <p class="mb-4 text-xs text-surface-500">{{ 'botAdmin.growth.hint' | translate }}</p>
            <div class="flex items-end gap-1.5">
              @for (b of growthBars(); track b.month) {
                <div
                  class="group flex min-w-0 flex-1 flex-col items-center gap-1"
                  [title]="('botAdmin.growth.barTitle' | translate: { count: b.newUsers, cumulative: b.cumulative })"
                >
                  <span class="h-4 text-[10px] tabular-nums text-surface-500 group-hover:text-surface-300">{{ b.newUsers > 0 ? b.newUsers : '' }}</span>
                  <div
                    class="w-full rounded-t transition-colors"
                    [class.bg-primary-500/70]="b.newUsers > 0"
                    [class.bg-surface-800]="b.newUsers === 0"
                    [style.height.px]="b.px"
                  ></div>
                  <span class="truncate text-[10px] text-surface-500">{{ b.label }}</span>
                </div>
              }
            </div>
          </section>

          <section class="flex flex-col justify-center card p-5">
            <h2 class="mb-1 flex items-center gap-2 text-sm font-semibold text-surface-0">
              <i class="pi pi-sync text-xs text-primary-400"></i>{{ 'botAdmin.growth.retention' | translate }}
            </h2>
            <p class="mb-3 text-xs text-surface-500">{{ 'botAdmin.growth.retentionHint' | translate }}</p>
            <div class="text-4xl font-bold tabular-nums" [class.text-surface-0]="o.growth.retention.previousActive > 0" [class.text-surface-500]="o.growth.retention.previousActive === 0">
              {{ o.growth.retention.previousActive > 0 ? o.growth.retention.percent + '%' : '—' }}
            </div>
            @if (o.growth.retention.previousActive > 0) {
              <div class="mt-1 text-xs text-surface-500">
                {{ 'botAdmin.growth.retentionSub' | translate: { retained: o.growth.retention.retained, previous: o.growth.retention.previousActive } }}
              </div>
            }
          </section>
        </div>

        <!-- Servers / users detail panels -->
        <div class="mb-6 grid gap-3 lg:grid-cols-3">
          <section class="card p-5">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-0">
              <i class="pi pi-server text-xs text-primary-400"></i>{{ 'botAdmin.servers.title' | translate }}
            </h2>
            <div class="flex flex-col divide-y divide-surface-800">
              @for (r of serverRows(); track r.labelKey) {
                <div class="flex items-center justify-between gap-3 py-2 text-sm">
                  <span class="text-surface-400">{{ r.labelKey | translate }}</span>
                  <span class="font-medium tabular-nums" [class.text-surface-200]="!r.muted" [class.text-surface-500]="r.muted">{{ r.value }}</span>
                </div>
              }
            </div>
          </section>

          <section class="card p-5">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-0">
              <i class="pi pi-users text-xs text-primary-400"></i>{{ 'botAdmin.users.title' | translate }}
            </h2>
            <div class="flex flex-col divide-y divide-surface-800">
              @for (r of userRows(); track r.labelKey) {
                <div class="flex items-center justify-between gap-3 py-2 text-sm">
                  <span class="text-surface-400">{{ r.labelKey | translate }}</span>
                  <span class="font-medium tabular-nums" [class.text-surface-200]="!r.muted" [class.text-surface-500]="r.muted">{{ r.value }}</span>
                </div>
              }
            </div>
          </section>

          <section class="card p-5">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-0">
              <i class="pi pi-desktop text-xs text-primary-400"></i>{{ 'botAdmin.system.title' | translate }}
            </h2>
            <div class="flex flex-col divide-y divide-surface-800">
              @for (r of systemRows(); track r.labelKey) {
                <div class="flex items-center justify-between gap-3 py-2 text-sm">
                  <span class="text-surface-400">{{ r.labelKey | translate }}</span>
                  <span class="font-medium tabular-nums" [class.text-surface-200]="!r.muted" [class.text-surface-500]="r.muted">{{ r.value }}</span>
                </div>
              }
            </div>
          </section>
        </div>

        <!-- Cumulative voice time -->
        <h2 class="mb-3 text-base font-semibold text-surface-0">{{ 'botAdmin.totals.title' | translate }}</h2>
        <div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          @for (card of timeCards(); track card.stat) {
            <app-stat-card
              [stat]="card.stat"
              [label]="card.labelKey | translate"
              [value]="card.total | duration"
              [metrics]="card.metrics"
            />
          }
        </div>
        <div class="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-sm">
          <span class="text-surface-400">{{ 'botAdmin.totals.avgPerServer' | translate }} <span class="font-medium tabular-nums text-surface-200">{{ o.totals.avgConnectedPerServer | duration }}</span></span>
          <span class="text-surface-400">{{ 'botAdmin.totals.switches' | translate }} <span class="font-medium tabular-nums text-surface-200">{{ o.totals.count_switch | number }}</span></span>
          <span class="text-surface-400">{{ 'botAdmin.totals.maxStreak' | translate }} <span class="font-medium tabular-nums text-surface-200">{{ o.totals.max_daily_streak | number }}</span></span>
        </div>

        <!-- Per-guild table -->
        <h2 class="mb-3 text-base font-semibold text-surface-0">{{ 'botAdmin.guilds.title' | translate }}</h2>
        <div class="overflow-x-auto rounded-xl border border-surface-800">
          <table class="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-surface-800 bg-surface-800/40 text-left">
                <th class="px-4 py-2.5 font-medium text-surface-400">{{ 'botAdmin.guilds.server' | translate }}</th>
                <th class="px-3 py-2.5 text-center font-medium text-surface-400">{{ 'botAdmin.guilds.present' | translate }}</th>
                @for (col of sortCols; track col.key) {
                  <th class="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 font-medium text-surface-400 transition-colors hover:text-surface-200"
                      (click)="setSort(col.key)"
                    >
                      {{ col.labelKey | translate }}
                      @if (sort() === col.key) {
                        <i class="pi pi-sort-amount-down text-[10px]"></i>
                      }
                    </button>
                  </th>
                }
                <th class="px-3 py-2.5 text-right font-medium text-surface-400">{{ 'botAdmin.guilds.private' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (g of sortedGuilds(); track g.guildId) {
                <tr class="border-b border-surface-800 last:border-b-0 hover:bg-surface-800/30">
                  <td class="px-4 py-2.5">
                    <span class="flex items-center gap-2.5">
                      @if (g.icon) {
                        <img [src]="g.icon" alt="" class="h-6 w-6 shrink-0 rounded-full object-cover" />
                      } @else {
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-700 text-[0.65rem] uppercase text-surface-300">{{ (g.name || '?').charAt(0) }}</span>
                      }
                      <span class="min-w-0">
                        <span class="block truncate text-surface-200">{{ g.name || g.guildId }}</span>
                        <span class="block font-mono text-[0.65rem] text-surface-500">{{ g.guildId }}</span>
                      </span>
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <span class="inline-flex h-2 w-2 rounded-full" [class.bg-green-500]="g.botPresent" [class.bg-surface-600]="!g.botPresent"></span>
                  </td>
                  <td class="px-3 py-2.5 text-right tabular-nums text-surface-300">{{ g.members | number }}</td>
                  <td class="px-3 py-2.5 text-right tabular-nums" [class.text-surface-300]="g.timeConnected30d > 0" [class.text-surface-600]="g.timeConnected30d === 0">
                    {{ g.timeConnected30d > 0 ? (g.timeConnected30d | duration) : '—' }}
                  </td>
                  <td class="px-3 py-2.5 text-right tabular-nums text-surface-300">{{ g.timeConnected | duration }}</td>
                  <td class="px-3 py-2.5 text-right tabular-nums text-surface-300">
                    {{ g.lastActivity > 0 ? (g.lastActivity | date: 'mediumDate') : '—' }}
                  </td>
                  <td class="px-3 py-2.5 text-right tabular-nums text-surface-300">{{ g.privateMembers | number }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-6 text-center text-surface-500">{{ 'botAdmin.guilds.empty' | translate }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class BotAdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly duration = new DurationPipe();

  readonly overview = signal<BotAdminOverview | null>(null);
  readonly guilds = signal<BotAdminGuildEntry[]>([]);
  readonly timeline = signal<TimelinePoint[]>([]);
  readonly error = signal(false);
  readonly sort = signal<GuildSort>('members');

  readonly sortCols: { key: GuildSort; labelKey: string }[] = [
    { key: 'members', labelKey: 'botAdmin.guilds.members' },
    { key: 'timeConnected30d', labelKey: 'botAdmin.guilds.time30d' },
    { key: 'timeConnected', labelKey: 'botAdmin.guilds.timeConnected' },
    { key: 'lastActivity', labelKey: 'botAdmin.guilds.lastActivity' },
  ];

  ngOnInit(): void {
    this.api.botAdminOverview().subscribe({
      next: (r) => this.overview.set(r.overview),
      error: () => this.error.set(true),
    });
    this.api.botAdminGuilds().subscribe({
      next: (r) => this.guilds.set(r.guilds),
      error: () => this.error.set(true),
    });
    // The heatmap is decorative context — a failure shouldn't blank the page.
    this.api.botAdminTimeline().subscribe({
      next: (r) => this.timeline.set(r.points),
    });
  }

  setSort(key: GuildSort): void {
    this.sort.set(key);
  }

  readonly sortedGuilds = computed(() => {
    const key = this.sort();
    return [...this.guilds()].sort((a, b) => b[key] - a[key]);
  });

  private n(value: number): string {
    return value.toLocaleString();
  }

  /** SQLite size on disk, formatted; em dash when the API couldn't read it. */
  readonly dbSize = computed(() => {
    const bytes = this.overview()?.tech.dbSizeBytes;
    if (bytes == null) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  // Monthly new-user bars, scaled against the busiest month of the window.
  readonly growthBars = computed<GrowthBar[]>(() => {
    const months = this.overview()?.growth.months ?? [];
    const max = Math.max(1, ...months.map((m) => m.newUsers));
    return months.map((m) => ({
      month: m.month,
      label: new Date(m.month).toLocaleDateString(undefined, { month: 'short' }),
      newUsers: m.newUsers,
      cumulative: m.cumulative,
      px: m.newUsers > 0 ? Math.max(6, Math.round((m.newUsers / max) * 72)) : 2,
    }));
  });

  // The four headline figures; everything else lives in the detail panels.
  readonly kpis = computed<Kpi[]>(() => {
    const o = this.overview();
    if (!o) return [];
    return [
      {
        icon: 'pi-server',
        accent: 'text-primary-400',
        labelKey: 'botAdmin.kpi.servers',
        value: this.n(o.servers.present),
        subKey: 'botAdmin.kpi.serversSub',
        subParams: { total: this.n(o.servers.total), left: this.n(o.servers.left) },
      },
      {
        icon: 'pi-users',
        accent: 'text-neon-cyan',
        labelKey: 'botAdmin.kpi.users',
        value: this.n(o.users.distinct),
        subKey: 'botAdmin.kpi.usersSub',
        subParams: { count: this.n(o.users.memberships) },
      },
      {
        icon: 'pi-clock',
        accent: 'text-neon-green',
        labelKey: 'botAdmin.kpi.connected',
        value: this.duration.transform(o.totals.time_connected),
        subKey: 'botAdmin.kpi.connectedSub',
        subParams: { avg: this.duration.transform(o.totals.avgConnectedPerUser) },
      },
      {
        icon: 'pi-headphones',
        accent: 'text-neon-pink',
        labelKey: 'botAdmin.kpi.live',
        value: this.n(o.live.sessions),
        subKey: 'botAdmin.kpi.liveSub',
        subParams: { count: this.n(o.live.guilds) },
        live: o.live.sessions > 0,
      },
    ];
  });

  readonly serverRows = computed<Row[]>(() => {
    const o = this.overview();
    if (!o) return [];
    return [
      { labelKey: 'botAdmin.servers.avgMembers', value: this.n(o.servers.avgMembers) },
      { labelKey: 'botAdmin.servers.gained30', value: this.n(o.servers.gained30d), muted: o.servers.gained30d === 0 },
      { labelKey: 'botAdmin.servers.lost30', value: this.n(o.servers.lost30d), muted: o.servers.lost30d === 0 },
      { labelKey: 'botAdmin.servers.inactive30', value: this.n(o.servers.inactive30d), muted: o.servers.inactive30d === 0 },
      { labelKey: 'botAdmin.servers.inactive90', value: this.n(o.servers.inactive90d), muted: o.servers.inactive90d === 0 },
      { labelKey: 'botAdmin.servers.statsEnabled', value: `${this.n(o.servers.statsEnabled)} / ${this.n(o.servers.total)}` },
      { labelKey: 'botAdmin.servers.logsEnabled', value: `${this.n(o.servers.logsEnabled)} / ${this.n(o.servers.total)}` },
    ];
  });

  readonly systemRows = computed<Row[]>(() => {
    const o = this.overview();
    if (!o) return [];
    return [
      { labelKey: 'botAdmin.health.dbSize', value: this.dbSize() },
      { labelKey: 'botAdmin.health.rows', value: this.n(o.tech.dailyStatsRows) },
      { labelKey: 'botAdmin.health.ws', value: this.n(o.tech.wsConnections), muted: o.tech.wsConnections === 0 },
      { labelKey: 'botAdmin.health.peakToday', value: this.n(o.live.peakToday), muted: o.live.peakToday === 0 },
      {
        labelKey: 'botAdmin.health.peakRecord',
        value: o.live.peakAllTimeDay != null && o.live.peakAllTime > 0
          ? `${this.n(o.live.peakAllTime)} (${new Date(o.live.peakAllTimeDay).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
          : this.n(o.live.peakAllTime),
        muted: o.live.peakAllTime === 0,
      },
    ];
  });

  readonly userRows = computed<Row[]>(() => {
    const o = this.overview();
    if (!o) return [];
    return [
      {
        labelKey: 'botAdmin.users.private',
        value: `${this.n(o.users.private.memberships)} (${o.users.private.percent}%)`,
        muted: o.users.private.memberships === 0,
      },
      { labelKey: 'botAdmin.users.privateAvg', value: this.n(o.users.private.avgPerServer) },
      { labelKey: 'botAdmin.users.statsOptedOut', value: this.n(o.users.statsOptedOut), muted: o.users.statsOptedOut === 0 },
      { labelKey: 'botAdmin.users.today', value: this.n(o.activity.day) },
      { labelKey: 'botAdmin.users.week', value: this.n(o.activity.week) },
      { labelKey: 'botAdmin.users.month', value: this.n(o.activity.month) },
      { labelKey: 'botAdmin.users.inactive30', value: this.n(o.users.inactive30d), muted: o.users.inactive30d === 0 },
      { labelKey: 'botAdmin.users.inactive90', value: this.n(o.users.inactive90d), muted: o.users.inactive90d === 0 },
    ];
  });

  // One card per voice-time stat: global total + longest session + session count.
  readonly timeCards = computed<TimeCard[]>(() => {
    const o = this.overview();
    if (!o) return [];
    const stats = [
      { key: 'connected', labelKey: 'stats.connected' },
      { key: 'muted', labelKey: 'stats.muted' },
      { key: 'deafened', labelKey: 'stats.deafened' },
      { key: 'screen_sharing', labelKey: 'stats.screen' },
      { key: 'camera', labelKey: 'stats.camera' },
    ] as const;
    return stats.map((s) => ({
      stat: `time_${s.key}` as TimeCard['stat'],
      labelKey: s.labelKey,
      total: o.totals[`time_${s.key}`],
      metrics: [
        { labelKey: 'stats.longest', value: this.duration.transform(o.totals[`max_${s.key}`]) },
        { labelKey: 'stats.sessions', value: this.n(o.totals[`count_${s.key}`]) },
      ],
    }));
  });
}
