import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface StatMetric {
  /** i18n key for the metric label. */
  labelKey: string;
  /** Pre-formatted value. */
  value: string;
}

/**
 * A single KPI tile: an icon chip, a label, a value, and optional labelled
 * sub-metrics (e.g. share %, session count, longest session). Presentational
 * only — the caller formats the values before passing them in.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [TranslatePipe],
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
          <i [class]="'pi ' + icon()"></i>
        </span>
        <span class="truncate text-xs font-medium uppercase tracking-wide text-surface-400">
          {{ label() }}
        </span>
      </div>
      <div class="mt-3 truncate text-2xl font-semibold text-surface-0">{{ value() }}</div>

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
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  /** Optional labelled sub-metrics rendered under the value. */
  readonly metrics = input<StatMetric[]>();
}
