import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '@core/api/api.service';
import { AuthService } from '@core/auth/auth.service';
import { StatCardComponent } from '@shared/stat-card/stat-card.component';
import { HeatmapComponent } from '@shared/heatmap/heatmap.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [TagModule, TranslatePipe, StatCardComponent, HeatmapComponent, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-wrap items-center gap-3">
      <i class="pi pi-shield text-primary"></i>
      <h1 class="text-xl font-bold">{{ title() }}</h1>
      <p-tag [value]="'admin.badge' | translate" severity="info" />
    </section>

    @if (overview(); as o) {
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <app-stat-card icon="pi-users" [label]="'admin.members' | translate" [value]="o.memberCount.toString()" />
        <app-stat-card icon="pi-circle-fill" [label]="'admin.activeNow' | translate" [value]="o.activeCount.toString()" />
        <app-stat-card icon="pi-clock" [label]="'admin.totalConnected' | translate" [value]="o.totals.time_connected | duration" />
        <app-stat-card icon="pi-eye-slash" [label]="'admin.hidden' | translate" [value]="o.hiddenCount.toString()" />
      </div>

      <section class="mt-8">
        <h2 class="mb-3 text-lg font-semibold">{{ 'admin.topMembers' | translate }}</h2>
        <div class="overflow-hidden rounded-xl border border-surface-800">
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
        <div class="rounded-xl border border-surface-800 bg-surface-900 p-4">
          <app-heatmap [points]="timeline()" />
        </div>
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
}
