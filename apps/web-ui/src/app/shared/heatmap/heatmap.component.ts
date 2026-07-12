import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TimelinePoint } from '@core/api/models';
import { DurationPipe } from '@shared/pipes/duration.pipe';

interface Cell {
  x: number;
  y: number;
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
}

const DAY_MS = 86_400_000;
const WEEKS = 53;
const CELL = 12; // size + gap
const SIZE = 11; // rect size

@Component({
  selector: 'app-heatmap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <svg
        [attr.width]="width()"
        [attr.height]="height"
        [attr.viewBox]="'0 0 ' + width() + ' ' + height"
        role="img"
      >
        @for (cell of cells(); track cell.x + '-' + cell.y) {
          <rect
            [attr.x]="cell.x * cellSize"
            [attr.y]="cell.y * cellSize"
            [attr.width]="rectSize"
            [attr.height]="rectSize"
            rx="2"
            [attr.class]="levelClass[cell.level]"
          >
            <title>{{ cell.label }}</title>
          </rect>
        }
      </svg>
    </div>
  `,
})
export class HeatmapComponent {
  readonly points = input<TimelinePoint[]>([]);

  readonly cellSize = CELL;
  readonly rectSize = SIZE;
  readonly height = 7 * CELL;
  readonly levelClass: Record<Cell['level'], string> = {
    0: 'fill-surface-700/40',
    1: 'fill-primary/25',
    2: 'fill-primary/50',
    3: 'fill-primary/75',
    4: 'fill-primary',
  };

  private readonly duration = new DurationPipe();

  readonly width = computed(() => WEEKS * CELL);

  readonly cells = computed<Cell[]>(() => {
    const byDay = new Map<number, number>();
    let max = 0;
    for (const p of this.points()) {
      byDay.set(p.day, p.value);
      if (p.value > max) max = p.value;
    }

    // End on today (UTC), start 53 weeks back aligned to the week's Sunday.
    const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
    const start = today - (WEEKS * 7 - 1) * DAY_MS;
    const startDow = new Date(start).getUTCDay();
    const gridStart = start - startDow * DAY_MS;

    const cells: Cell[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const day = gridStart + i * DAY_MS;
      if (day > today) break;
      const value = byDay.get(day) ?? 0;
      const x = Math.floor(i / 7);
      const y = i % 7;
      const dateLabel = new Date(day).toISOString().slice(0, 10);
      cells.push({
        x,
        y,
        level: this.level(value, max),
        label: value > 0 ? `${dateLabel} — ${this.duration.transform(value)}` : dateLabel,
      });
    }
    return cells;
  });

  private level(value: number, max: number): Cell['level'] {
    if (value <= 0 || max <= 0) return 0;
    const ratio = value / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  }
}
