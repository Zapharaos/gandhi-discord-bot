import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { combineLatest, startWith, Subject, switchMap, map, auditTime, of, catchError } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '@core/api/api.service';
import { AuthService } from '@core/auth/auth.service';
import { WsService } from '@core/ws/ws.service';
import { VisibilityService } from '@core/visibility/visibility.service';
import { TimelinePoint, TimelineStat } from '@core/api/models';
import { StatCardComponent, StatMetric } from '@shared/stat-card/stat-card.component';
import { HeatmapComponent } from '@shared/heatmap/heatmap.component';
import { RankingComponent } from '@shared/ranking/ranking.component';
import { ActiveMembersComponent } from '@shared/active-members/active-members.component';
import { ServerSettingsComponent } from '@shared/server-settings/server-settings.component';
import { MemberAdminComponent } from '@shared/member-admin/member-admin.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';

interface StatOption {
  label: string;
  value: TimelineStat;
}

type ServerTab = 'stats' | 'activity' | 'leaderboard' | 'settings';
interface TabDef {
  id: ServerTab;
  labelKey: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    SelectModule,
    TagModule,
    ButtonModule,
    TranslatePipe,
    StatCardComponent,
    HeatmapComponent,
    RankingComponent,
    ActiveMembersComponent,
    ServerSettingsComponent,
    MemberAdminComponent,
    DurationPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-center gap-3">
      @if (guild(); as g) {
        @if (g.icon) {
          <img [src]="g.icon" alt="" class="h-11 w-11 shrink-0 rounded-xl object-cover" />
        } @else {
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-700 text-lg font-semibold uppercase text-surface-200">{{ (g.name || '?').charAt(0) }}</span>
        }
      }
      <div class="min-w-0">
        <h1 class="truncate text-2xl font-bold text-surface-0">{{ title() }}</h1>
        <p class="text-sm text-surface-400">{{ subtitleKey() | translate }}</p>
      </div>
      @if (isSession() && stats()?.isLive) {
        <p-tag severity="success" [value]="'dashboard.live' | translate" icon="pi pi-circle-fill" />
      }
      @if (!isSession() && (!guildId() || tab() === 'stats')) {
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <p-button size="small" severity="secondary" [text]="true" icon="pi pi-download" label="JSON" (onClick)="export('json')" />
          <p-button size="small" severity="secondary" [text]="true" icon="pi pi-download" label="CSV" (onClick)="export('csv')" />
        </div>
      }
    </header>

    <!-- Live voice session, surfaced right in the dashboard (total + per-server). -->
    @if (liveSession(); as ls) {
      <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
        <span class="relative flex h-2.5 w-2.5 shrink-0">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
        </span>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-surface-100">{{ 'session.live.title' | translate }}</div>
          <div class="text-xs text-surface-400">{{ 'session.live.subtitle' | translate }}</div>
        </div>
        <div class="ml-auto flex items-center gap-2 text-sm">
          <i class="pi pi-clock text-surface-500"></i>
          <span class="font-mono text-surface-100">{{ ls.stats.time_connected | duration }}</span>
        </div>
      </div>
    }

    @if (guildId(); as gid) {
      <!-- Server view: tabbed. -->
      <nav class="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-surface-800">
        @for (t of serverTabs(); track t.id) {
          <button
            type="button"
            (click)="tab.set(t.id)"
            class="-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
            [class.border-primary-500]="tab() === t.id"
            [class.text-primary-300]="tab() === t.id"
            [class.border-transparent]="tab() !== t.id"
            [class.text-surface-400]="tab() !== t.id"
            [class.hover:text-surface-100]="tab() !== t.id"
          >
            <i [class]="'pi text-xs ' + t.icon"></i>{{ t.labelKey | translate }}
          </button>
        }
      </nav>

      <div class="mt-6">
        @switch (tab()) {
          @case ('stats') {
            <ng-container [ngTemplateOutlet]="cardsPanel" />
            <div class="mt-8">
              <ng-container [ngTemplateOutlet]="heatmapSection" [ngTemplateOutletContext]="{ points: timeline(), titleKey: 'dashboard.activity' }" />
            </div>
          }
          @case ('activity') {
            <ng-container [ngTemplateOutlet]="heatmapSection" [ngTemplateOutletContext]="{ points: serverTimeline(), titleKey: 'dashboard.serverActivity' }" />
            <div class="mt-8">
              <app-active-members [guildId]="gid" [showEmpty]="true" />
            </div>
          }
          @case ('leaderboard') {
            <app-ranking [guildId]="gid" />
          }
          @case ('settings') {
            <app-server-settings [guildId]="gid" />
            <div class="mt-6">
              <app-member-admin [guildId]="gid" />
            </div>
          }
        }
      </div>
    } @else {
      <!-- Total / session view: no tabs — cards then personal heatmap. -->
      <div class="mt-6">
        <ng-container [ngTemplateOutlet]="cardsPanel" />
      </div>
      <div class="mt-8">
        <ng-container [ngTemplateOutlet]="heatmapSection" [ngTemplateOutletContext]="{ points: timeline(), titleKey: 'dashboard.activity' }" />
      </div>
    }

    <!-- KPI cards. -->
    <ng-template #cardsPanel>
      @if (isSession() && !stats()?.isLive) {
        <div class="rounded-2xl border border-dashed border-surface-800 p-10 text-center text-surface-400">
          <i class="pi pi-headphones mb-3 block text-3xl text-surface-600"></i>
          {{ 'session.none' | translate }}
        </div>
      } @else if (stats(); as s) {
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <app-stat-card icon="pi-clock" [label]="'stats.connected' | translate" [value]="s.time_connected | duration" [metrics]="metricsFor(s.time_connected, s.time_connected, s.count_connected, s.max_connected, false)" />
          <app-stat-card icon="pi-microphone" [label]="'stats.muted' | translate" [value]="s.time_muted | duration" [metrics]="metricsFor(s.time_muted, s.time_connected, s.count_muted, s.max_muted, true)" />
          <app-stat-card icon="pi-volume-off" [label]="'stats.deafened' | translate" [value]="s.time_deafened | duration" [metrics]="metricsFor(s.time_deafened, s.time_connected, s.count_deafened, s.max_deafened, true)" />
          <app-stat-card icon="pi-desktop" [label]="'stats.screen' | translate" [value]="s.time_screen_sharing | duration" [metrics]="metricsFor(s.time_screen_sharing, s.time_connected, s.count_screen_sharing, s.max_screen_sharing, true)" />
          <app-stat-card icon="pi-video" [label]="'stats.camera' | translate" [value]="s.time_camera | duration" [metrics]="metricsFor(s.time_camera, s.time_connected, s.count_camera, s.max_camera, true)" />
          @if (!isSession()) {
            <app-stat-card icon="pi-bolt" [label]="'stats.streakTitle' | translate" [value]="s.daily_streak + ' d'" [metrics]="[{ labelKey: 'stats.maxStreak', value: s.max_daily_streak + ' d' }]" />
            <app-stat-card icon="pi-sync" [label]="'stats.switches' | translate" [value]="s.count_switch.toString()" />
          }
        </div>
      } @else {
        <p class="text-surface-400">{{ 'dashboard.loading' | translate }}</p>
      }
    </ng-template>

    <!-- Reusable activity-heatmap section: pass { points, titleKey } via context. -->
    <ng-template #heatmapSection let-points="points" let-titleKey="titleKey">
      @if (!isSession()) {
        <section>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-lg font-semibold text-surface-0">{{ titleKey | translate }}</h2>
            <p-select
              [options]="statOptions"
              optionLabel="label"
              optionValue="value"
              [ngModel]="selectedStat()"
              (ngModelChange)="selectedStat.set($event)"
              size="small"
            />
          </div>
          <div class="rounded-2xl border border-surface-800 bg-surface-900 p-4">
            <app-heatmap [points]="points" />
          </div>
        </section>
      }
    </ng-template>
  `,
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(WsService);
  private readonly visibility = inject(VisibilityService);

  /** Bound from the route param on /server/:guildId; undefined for global/session. */
  readonly guildId = input<string>();
  /** Bound from static route data: 'session' on the /session route. */
  readonly mode = input<string>();
  readonly selectedStat = signal<TimelineStat>('time_connected');

  readonly isSession = computed(() => this.mode() === 'session');

  /** The guild being viewed (with its icon), or null for the total/session views. */
  readonly guild = computed(() => {
    const gid = this.guildId();
    if (!gid) return null;
    return this.auth.me()?.guilds.find((g) => g.id === gid) ?? null;
  });

  /** True when viewing a server the user manages (Discord admin/owner OR local manager). */
  readonly isGuildAdmin = computed(() => {
    const gid = this.guildId();
    if (!gid) return false;
    const g = this.auth.me()?.guilds.find((x) => x.id === gid);
    return (g?.isAdmin ?? false) || (g?.localAdmin ?? false);
  });

  // Server-view tabs (Settings only for admins).
  readonly tab = signal<ServerTab>('stats');
  readonly serverTabs = computed<TabDef[]>(() => {
    const tabs: TabDef[] = [
      { id: 'stats', labelKey: 'server.tabs.stats', icon: 'pi-chart-bar' },
      { id: 'activity', labelKey: 'server.tabs.activity', icon: 'pi-calendar' },
      { id: 'leaderboard', labelKey: 'server.tabs.leaderboard', icon: 'pi-trophy' },
    ];
    if (this.isGuildAdmin()) tabs.push({ id: 'settings', labelKey: 'server.tabs.settings', icon: 'pi-cog' });
    return tabs;
  });

  private readonly durationPipe = new DurationPipe();

  /** A part's share of connected time, as a rounded percentage string (or empty). */
  pct(part: number, whole: number): string {
    if (!whole || whole <= 0) return '';
    return Math.round((part / whole) * 100) + '%';
  }

  /** Labelled sub-metrics for a stat card: share of connected, session count, longest session. */
  metricsFor(part: number, whole: number, count: number, maxMs: number, withPercent: boolean): StatMetric[] {
    const metrics: StatMetric[] = [];
    if (withPercent) {
      const p = this.pct(part, whole);
      if (p) metrics.push({ labelKey: 'stats.share', value: p });
    }
    if (count > 0) metrics.push({ labelKey: 'stats.sessions', value: `${count}` });
    if (maxMs > 0) metrics.push({ labelKey: 'stats.longest', value: this.durationPipe.transform(maxMs) ?? '' });
    return metrics;
  }

  readonly statOptions: StatOption[] = [
    { label: 'Connected', value: 'time_connected' },
    { label: 'Muted', value: 'time_muted' },
    { label: 'Deafened', value: 'time_deafened' },
    { label: 'Screen sharing', value: 'time_screen_sharing' },
    { label: 'Camera', value: 'time_camera' },
  ];

  private readonly refresh$ = new Subject<void>();
  private readonly guildId$ = toObservable(this.guildId);
  private readonly mode$ = toObservable(this.mode);
  private readonly selectedStat$ = toObservable(this.selectedStat);

  readonly stats = toSignal(
    combineLatest([this.mode$, this.guildId$, this.refresh$.pipe(startWith(undefined))]).pipe(
      switchMap(([mode, gid]) => {
        if (mode === 'session') return this.api.sessionStats().pipe(map((r) => r.stats));
        if (gid) return this.api.guildStats(gid).pipe(map((r) => r.stats));
        return this.api.globalStats().pipe(map((r) => r.stats));
      }),
    ),
    { initialValue: null },
  );

  readonly timeline = toSignal(
    combineLatest([this.mode$, this.guildId$, this.selectedStat$, this.refresh$.pipe(startWith(undefined))]).pipe(
      switchMap(([mode, gid, stat]) =>
        mode === 'session' ? of([]) : this.api.timeline({ guildId: gid, stat }).pipe(map((r) => r.points)),
      ),
    ),
    { initialValue: [] },
  );

  // Server-wide activity heatmap (anonymous aggregate), for the "Server" scope of
  // the activity heatmap. Follows the selected stat.
  readonly serverTimeline = toSignal(
    combineLatest([this.guildId$, this.selectedStat$, this.refresh$.pipe(startWith(undefined))]).pipe(
      switchMap(([gid, stat]) =>
        gid ? this.api.guildTimeline(gid, stat).pipe(map((r) => r.points), catchError(() => of<TimelinePoint[]>([]))) : of<TimelinePoint[]>([]),
      ),
    ),
    { initialValue: [] as TimelinePoint[] },
  );


  // Poll the current voice session (and refresh on live WS events). Surfaces the
  // live banner on the total dashboard, or on the per-server dashboard when the
  // ongoing session is in that guild.
  private readonly session = toSignal(
    combineLatest([this.visibility.pollTimer(20000), this.refresh$.pipe(startWith(undefined))]).pipe(
      switchMap(() => this.api.sessionStats().pipe(catchError(() => of(null)))),
    ),
    { initialValue: null },
  );

  readonly liveSession = computed(() => {
    if (this.isSession()) return null;
    const s = this.session();
    if (!s?.active) return null;
    const gid = this.guildId();
    if (gid && !s.guildIds.includes(gid)) return null;
    return s;
  });

  readonly title = computed(() => {
    if (this.isSession()) return 'Session';
    const gid = this.guildId();
    if (!gid) return 'Total';
    const guild = this.auth.me()?.guilds.find((g) => g.id === gid);
    return guild?.name ?? gid;
  });

  readonly subtitleKey = computed(() => {
    if (this.isSession()) return 'session.subtitle';
    return this.guildId() ? 'dashboard.subtitleServer' : 'dashboard.subtitleTotal';
  });

  constructor() {
    // Live: re-fetch (throttled) whenever a voice event lands for a room we're in,
    // and once on every (re)connect to catch up on anything missed during a gap.
    this.ws.events.pipe(auditTime(1500), takeUntilDestroyed()).subscribe(() => this.refresh$.next());
    this.ws.opened.pipe(takeUntilDestroyed()).subscribe(() => this.refresh$.next());
  }

  export(format: 'json' | 'csv'): void {
    // Full-page navigation so the browser handles the file download (the session
    // cookie is sent automatically).
    window.location.href = this.api.exportUrl(format, this.guildId());
  }
}
