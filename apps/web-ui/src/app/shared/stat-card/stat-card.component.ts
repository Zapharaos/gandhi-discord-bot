import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A single KPI tile: an icon, a label and a value. Presentational only — the
 * caller formats the value (duration, count, …) before passing it in.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-4 rounded-xl border border-surface-700 bg-surface-800/60 p-4"
    >
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
      >
        <i [class]="'pi ' + icon() + ' text-xl'"></i>
      </div>
      <div class="min-w-0">
        <div class="truncate text-sm text-surface-400">{{ label() }}</div>
        <div class="truncate text-lg font-semibold text-surface-0">{{ value() }}</div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
}
