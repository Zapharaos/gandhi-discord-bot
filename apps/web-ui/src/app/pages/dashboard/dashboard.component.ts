import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { combineLatest, startWith, Subject, switchMap, map, auditTime } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '@core/api/api.service';
import { AuthService } from '@core/auth/auth.service';
import { WsService } from '@core/ws/ws.service';
import { TimelineStat } from '@core/api/models';
import { StatCardComponent } from '@shared/stat-card/stat-card.component';
import { HeatmapComponent } from '@shared/heatmap/heatmap.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';

interface StatOption {
  label: string;
  value: TimelineStat;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    SelectModule,
    TagModule,
    ButtonModule,
    TranslatePipe,
    StatCardComponent,
    HeatmapComponent,
    DurationPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-bold">{{ title() }}</h1>
      @if (stats()?.isLive) {
        <p-tag severity="success" [value]="'dashboard.live' | translate" icon="pi pi-circle-fill" />
      }
      <div class="ml-auto flex gap-2">
        <p-button size="small" severity="secondary" [outlined]="true" icon="pi pi-download" label="JSON" (onClick)="export('json')" />
        <p-button size="small" severity="secondary" [outlined]="true" icon="pi pi-download" label="CSV" (onClick)="export('csv')" />
      </div>
    </section>

    @if (stats(); as s) {
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <app-stat-card icon="pi-clock" [label]="'stats.connected' | translate" [value]="s.time_connected | duration" />
        <app-stat-card icon="pi-microphone" [label]="'stats.muted' | translate" [value]="s.time_muted | duration" />
        <app-stat-card icon="pi-volume-off" [label]="'stats.deafened' | translate" [value]="s.time_deafened | duration" />
        <app-stat-card icon="pi-desktop" [label]="'stats.screen' | translate" [value]="s.time_screen_sharing | duration" />
        <app-stat-card icon="pi-video" [label]="'stats.camera' | translate" [value]="s.time_camera | duration" />
        <app-stat-card icon="pi-bolt" [label]="'stats.streak' | translate" [value]="s.daily_streak + ' d'" />
        <app-stat-card icon="pi-star" [label]="'stats.maxStreak' | translate" [value]="s.max_daily_streak + ' d'" />
        <app-stat-card icon="pi-sync" [label]="'stats.switches' | translate" [value]="s.count_switch.toString()" />
      </div>
    } @else {
      <p class="mt-4 text-surface-400">{{ 'dashboard.loading' | translate }}</p>
    }

    <section class="mt-8">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{{ 'dashboard.activity' | translate }}</h2>
        <p-select
          [options]="statOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="selectedStat()"
          (ngModelChange)="selectedStat.set($event)"
        />
      </div>
      <div class="rounded-xl border border-surface-800 bg-surface-900 p-4">
        <app-heatmap [points]="timeline()" />
      </div>
    </section>
  `,
})
export class DashboardComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(WsService);

  /** Bound from the route param on /server/:guildId; undefined for the global view. */
  readonly guildId = input<string>();
  readonly selectedStat = signal<TimelineStat>('time_connected');

  readonly statOptions: StatOption[] = [
    { label: 'Connected', value: 'time_connected' },
    { label: 'Muted', value: 'time_muted' },
    { label: 'Deafened', value: 'time_deafened' },
    { label: 'Screen sharing', value: 'time_screen_sharing' },
    { label: 'Camera', value: 'time_camera' },
  ];

  private readonly refresh$ = new Subject<void>();
  private readonly guildId$ = toObservable(this.guildId);
  private readonly selectedStat$ = toObservable(this.selectedStat);

  readonly stats = toSignal(
    combineLatest([this.guildId$, this.refresh$.pipe(startWith(undefined))]).pipe(
      switchMap(([gid]) => (gid ? this.api.guildStats(gid) : this.api.globalStats())),
      map((r) => r.stats),
    ),
    { initialValue: null },
  );

  readonly timeline = toSignal(
    combineLatest([this.guildId$, this.selectedStat$, this.refresh$.pipe(startWith(undefined))]).pipe(
      switchMap(([gid, stat]) => this.api.timeline({ guildId: gid, stat })),
      map((r) => r.points),
    ),
    { initialValue: [] },
  );

  readonly title = computed(() => {
    const gid = this.guildId();
    if (!gid) return 'Global';
    const guild = this.auth.me()?.guilds.find((g) => g.id === gid);
    return guild?.name ?? gid;
  });

  constructor() {
    this.ws.connect();
    // Live: re-fetch (throttled) whenever a voice event lands for a room we're in.
    this.ws.events.pipe(auditTime(1500)).subscribe(() => this.refresh$.next());
  }

  export(format: 'json' | 'csv'): void {
    // Full-page navigation so the browser handles the file download (the session
    // cookie is sent automatically).
    window.location.href = this.api.exportUrl(format, this.guildId());
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }
}
