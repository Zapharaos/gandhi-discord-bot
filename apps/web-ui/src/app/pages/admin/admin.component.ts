import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '@core/api/api.service';
import { AuthService } from '@core/auth/auth.service';
import { MemberLookupResponse } from '@core/api/models';
import { StatCardComponent } from '@shared/stat-card/stat-card.component';
import { HeatmapComponent } from '@shared/heatmap/heatmap.component';
import { ServerSettingsComponent } from '@shared/server-settings/server-settings.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, FormsModule, TagModule, ButtonModule, TranslatePipe, StatCardComponent, HeatmapComponent, ServerSettingsComponent, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/server', guildId()]" class="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100">
      <i class="pi pi-angle-left text-xs"></i>{{ 'admin.backToServer' | translate }}
    </a>
    <header class="flex flex-wrap items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
        <i class="pi pi-shield"></i>
      </span>
      <h1 class="text-2xl font-bold text-surface-0">{{ title() }}</h1>
      <p-tag [value]="'admin.badge' | translate" severity="info" />
    </header>

    <!-- Server configuration -->
    <div class="mt-6">
      <app-server-settings [guildId]="guildId()" />
    </div>

    @if (overview(); as o) {
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <app-stat-card icon="pi-users" [label]="'admin.members' | translate" [value]="o.memberCount.toString()" />
        <app-stat-card icon="pi-circle-fill" [label]="'admin.activeNow' | translate" [value]="o.activeCount.toString()" />
        <app-stat-card icon="pi-clock" [label]="'admin.totalConnected' | translate" [value]="o.totals.time_connected | duration" />
        <app-stat-card icon="pi-eye-slash" [label]="'admin.hidden' | translate" [value]="o.hiddenCount.toString()" />
      </div>

      <section class="mt-8">
        <h2 class="mb-3 text-lg font-semibold">{{ 'admin.topMembers' | translate }}</h2>
        <div class="overflow-hidden rounded-2xl border border-surface-800">
          @for (m of o.topMembers; track m.userId; let i = $index) {
            <div
              class="flex items-center gap-3 border-b border-surface-800 bg-surface-900 px-4 py-2 last:border-b-0"
            >
              <span class="w-6 text-right text-surface-500">{{ i + 1 }}</span>
              @if (m.isLive) {
                <i class="pi pi-circle-fill text-xs text-green-500" [title]="'dashboard.live' | translate"></i>
              }
              <span class="font-mono text-sm text-surface-300">{{ m.userId }}</span>
              <span class="ml-auto font-semibold">{{ m.time_connected | duration }}</span>
            </div>
          } @empty {
            <div class="bg-surface-900 px-4 py-3 text-surface-400">{{ 'admin.noMembers' | translate }}</div>
          }
        </div>
        @if (o.hiddenCount > 0) {
          <p class="mt-2 text-sm text-surface-500">
            <i class="pi pi-eye-slash"></i>
            {{ 'admin.hiddenNote' | translate: { count: o.hiddenCount } }}
          </p>
        }
      </section>

      <section class="mt-8">
        <h2 class="mb-3 text-lg font-semibold">{{ 'admin.serverActivity' | translate }}</h2>
        <div class="rounded-2xl border border-surface-800 bg-surface-900 p-4">
          <app-heatmap [points]="timeline()" />
        </div>
      </section>

      <!-- Look up a specific member by Discord id -->
      <section class="mt-8">
        <h2 class="mb-1 text-lg font-semibold text-surface-0">{{ 'admin.lookup.title' | translate }}</h2>
        <p class="mb-3 text-sm text-surface-400">{{ 'admin.lookup.hint' | translate }}</p>
        <form class="flex flex-wrap gap-2" (ngSubmit)="lookup()">
          <input
            type="text"
            [(ngModel)]="lookupId"
            name="lookupId"
            inputmode="numeric"
            [placeholder]="'admin.lookup.placeholder' | translate"
            class="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 font-mono text-sm text-surface-100 outline-none focus:border-primary-500"
          />
          <p-button type="submit" size="small" icon="pi pi-search" [label]="'admin.lookup.search' | translate" [disabled]="!lookupId || looking()" />
        </form>

        @if (lookupResult(); as res) {
          <div class="mt-4 rounded-2xl border border-surface-800 bg-surface-900 p-4">
            <div class="mb-3 flex items-center gap-2 font-mono text-sm text-surface-300">
              <i class="pi pi-user text-surface-500"></i>{{ res.userId }}
            </div>
            @if (!res.found) {
              <p class="text-surface-400">{{ 'admin.lookup.notFound' | translate }}</p>
            } @else if (res.private) {
              <p class="flex items-center gap-2 text-surface-400">
                <i class="pi pi-eye-slash"></i>{{ 'admin.lookup.private' | translate }}
              </p>
            } @else if (res.stats; as s) {
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <app-stat-card icon="pi-clock" [label]="'stats.connected' | translate" [value]="s.time_connected | duration" />
                <app-stat-card icon="pi-microphone" [label]="'stats.muted' | translate" [value]="s.time_muted | duration" />
                <app-stat-card icon="pi-volume-off" [label]="'stats.deafened' | translate" [value]="s.time_deafened | duration" />
                <app-stat-card icon="pi-desktop" [label]="'stats.screen' | translate" [value]="s.time_screen_sharing | duration" />
                <app-stat-card icon="pi-video" [label]="'stats.camera' | translate" [value]="s.time_camera | duration" />
                <app-stat-card icon="pi-bolt" [label]="'stats.streak' | translate" [value]="s.daily_streak + ' d'" />
              </div>
            }
          </div>
        }
      </section>
    } @else {
      <p class="mt-4 text-surface-400">{{ 'dashboard.loading' | translate }}</p>
    }
  `,
})
export class AdminComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly guildId = input.required<string>();
  private readonly guildId$ = toObservable(this.guildId);

  readonly overview = toSignal(
    this.guildId$.pipe(
      switchMap((gid) => this.api.adminOverview(gid)),
      map((r) => r.overview),
    ),
    { initialValue: null },
  );

  readonly timeline = toSignal(
    this.guildId$.pipe(
      switchMap((gid) => this.api.adminTimeline(gid)),
      map((r) => r.points),
    ),
    { initialValue: [] },
  );

  readonly title = computed(() => {
    const gid = this.guildId();
    return this.auth.me()?.guilds.find((g) => g.id === gid)?.name ?? gid;
  });

  // Member lookup by Discord id
  lookupId = '';
  readonly lookupResult = signal<MemberLookupResponse | null>(null);
  readonly looking = signal(false);

  lookup(): void {
    const id = this.lookupId.trim();
    if (!id) return;
    this.looking.set(true);
    this.api.adminMember(this.guildId(), id).subscribe({
      next: (r) => {
        this.lookupResult.set(r);
        this.looking.set(false);
      },
      error: () => {
        this.lookupResult.set(null);
        this.looking.set(false);
      },
    });
  }
}
