import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, switchMap, map, catchError, of, merge, startWith, filter } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { WsService } from '@core/ws/ws.service';
import { VisibilityService } from '@core/visibility/visibility.service';
import { ActiveMember, RankStat } from '@core/api/models';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { StatIconComponent } from '@shared/stat-icon/stat-icon.component';

@Component({
  selector: 'app-active-members',
  standalone: true,
  imports: [TranslatePipe, DurationPipe, StatIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (members().length || showEmpty()) {
      <section>
        <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-surface-0">
          <span class="relative flex h-2.5 w-2.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
          </span>
          {{ 'active.title' | translate }}
          <span class="rounded-full bg-surface-800 px-2 py-0.5 text-xs font-medium text-surface-400">{{ members().length }}</span>
        </h2>

        @if (!members().length) {
          <p class="rounded-3xl border border-dashed border-surface-800 p-8 text-center text-surface-500">
            {{ 'active.empty' | translate }}
          </p>
        }

        <div class="grid gap-3 sm:grid-cols-2">
          @for (m of members(); track m.userId) {
            <div class="card flex items-center gap-3.5 p-4">
              <div class="relative h-12 w-12 shrink-0">
                @if (m.avatar) {
                  <img [src]="m.avatar" alt="" class="h-12 w-12 rounded-full object-cover" />
                } @else {
                  <span class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-700 text-base font-medium text-surface-200">{{ initials(m) }}</span>
                }
                <span class="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-surface-900 bg-green-500"></span>
                </span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="truncate font-semibold text-surface-100">{{ displayName(m) }}</div>
                @if (secondary(m); as extra) {
                  <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-surface-400">
                    @for (x of extra; track x.stat) {
                      <span class="flex items-center gap-1.5" [title]="('stats.' + x.key) | translate">
                        <app-stat-icon [stat]="x.stat" class="h-3.5 w-3.5 text-surface-500" />{{ x.value | duration }}
                      </span>
                    }
                  </div>
                }
              </div>

              <div class="shrink-0 text-right">
                <div class="font-mono text-lg font-semibold text-surface-0">{{ m.time_connected | duration }}</div>
                <div class="text-[10px] font-medium uppercase tracking-wide text-surface-500">{{ 'stats.connected' | translate }}</div>
              </div>
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class ActiveMembersComponent {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WsService);
  private readonly visibility = inject(VisibilityService);

  readonly guildId = input.required<string>();
  /** When true, still render the section (with an empty state) when nobody is active. */
  readonly showEmpty = input(false);

  // Refetch on a visibility-aware poll AND whenever this guild reports live
  // activity over the WS (identity-free ping), so the list stays current.
  private readonly refresh$ = merge(
    this.visibility.pollTimer(20000),
    this.ws.guildActivity.pipe(filter((a) => a.guildId === this.guildId())),
  ).pipe(startWith(null));

  readonly members = toSignal(
    combineLatest([toObservable(this.guildId), this.refresh$]).pipe(
      switchMap(([gid]) =>
        this.api.guildActiveMembers(gid).pipe(
          map((r) => r.members),
          catchError(() => of<ActiveMember[]>([])),
        ),
      ),
    ),
    { initialValue: [] as ActiveMember[] },
  );

  /** Non-zero secondary stats (mute/deafen/screen/camera), or null when there are none. */
  secondary(m: ActiveMember): { stat: RankStat; key: string; value: number }[] | null {
    const out: { stat: RankStat; key: string; value: number }[] = [];
    if (m.time_muted > 0) out.push({ stat: 'time_muted', key: 'muted', value: m.time_muted });
    if (m.time_deafened > 0) out.push({ stat: 'time_deafened', key: 'deafened', value: m.time_deafened });
    if (m.time_screen_sharing > 0) out.push({ stat: 'time_screen_sharing', key: 'screen', value: m.time_screen_sharing });
    if (m.time_camera > 0) out.push({ stat: 'time_camera', key: 'camera', value: m.time_camera });
    return out.length ? out : null;
  }

  displayName(m: ActiveMember): string {
    return m.name || `@${m.userId.slice(-4)}`;
  }

  initials(m: ActiveMember): string {
    return m.name?.trim().charAt(0).toUpperCase() || '#';
  }
}
