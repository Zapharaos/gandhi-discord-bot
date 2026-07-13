import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CardStat } from '@core/api/models';
import { StatIconComponent } from '@shared/stat-icon/stat-icon.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';

export interface StatMetric {
  /** i18n key for the metric label. */
  labelKey: string;
  /** Pre-formatted value. */
  value: string;
}

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [TranslatePipe, StatIconComponent, DurationPipe],
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="group flex h-full flex-col rounded-2xl border border-surface-800 bg-surface-900 p-4 transition-colors hover:border-surface-600"
    >
      <div class="flex items-center gap-2.5">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400"
        >
          <app-stat-icon [stat]="stat()" class="h-4 w-4" />
        </span>
        <span class="truncate text-xs font-medium uppercase tracking-wide text-surface-400">
          {{ label() }}
        </span>
        @if (liveMs() != null) {
          <span class="relative ml-auto flex h-2 w-2 shrink-0">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
        }
      </div>
      <div class="mt-3 truncate text-2xl font-semibold text-surface-0">{{ value() }}</div>

      @if (liveMs()! > 0) {
        <div class="mt-2 text-sm font-mono font-medium text-green-400">+ {{ liveMs()! | duration }}</div>
      }

      @if (metrics()?.length) {
        <div class="mt-2.5 flex flex-col gap-1 border-t border-surface-800 pt-2.5">
          @for (m of metrics(); track m.labelKey) {
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="text-surface-500">{{ m.labelKey | translate }}</span>
              <span class="font-medium tabular-nums text-surface-300">{{ m.value }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StatCardComponent {
  readonly stat = input.required<CardStat>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  /** Current live session value in ms — shows a pulse dot and running timer. */
  readonly liveMs = input<number | null>(null);
  /** Optional labelled sub-metrics rendered under the value. */
  readonly metrics = input<StatMetric[]>();
}
