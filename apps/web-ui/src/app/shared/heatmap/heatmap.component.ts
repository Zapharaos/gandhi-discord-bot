import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { TimelinePoint } from '@core/api/models';
import { DurationPipe } from '@shared/pipes/duration.pipe';

interface Cell {
  x: number;
  y: number;
  ts: number;
  value: number;
  level: 0 | 1 | 2 | 3 | 4;
}
interface MonthLabel {
  x: number;
  text: string;
}
interface DayLabel {
  y: number;
  text: string;
}
interface Hover {
  left: number;
  top: number;
  date: string;
  value: string;
}

const DAY_MS = 86_400_000;
const WEEKS = 53;
const CELL = 14; // viewBox pitch (the SVG scales to fill its container)
const SIZE = 12;
const GUTTER_LEFT = 28;
const GUTTER_TOP = 16;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #wrap class="relative w-full">
      <svg
        #svg
        class="block w-full"
        [attr.viewBox]="'0 0 ' + vbWidth() + ' ' + height"
        [style.aspectRatio]="vbWidth() + ' / ' + height"
        preserveAspectRatio="none"
        role="img"
      >
        @for (m of monthLabels(); track m.x) {
          <text [attr.x]="m.x" [attr.y]="11" font-size="10" class="fill-surface-500">{{ m.text }}</text>
        }
        @for (d of dayLabels; track d.text) {
          <text [attr.x]="0" [attr.y]="d.y" font-size="10" class="fill-surface-500">{{ d.text }}</text>
        }
        @for (cell of cells(); track cell.x + '-' + cell.y) {
          <rect
            [attr.x]="gutterLeft + cell.x * cellSize"
            [attr.y]="gutterTop + cell.y * cellSize"
            [attr.width]="rectSize"
            [attr.height]="rectSize"
            rx="2"
            [attr.class]="'cursor-pointer ' + levelClass[cell.level]"
            (mouseenter)="onHover(cell, $event)"
            (mouseleave)="hover.set(null)"
          />
        }
      </svg>

      @if (hover(); as h) {
        <div
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-surface-700 bg-surface-950 px-2.5 py-1.5 text-xs shadow-xl"
          [style.left.px]="h.left"
          [style.top.px]="h.top"
        >
          <div class="font-semibold text-surface-100">{{ h.value }}</div>
          <div class="text-[11px] text-surface-400">{{ h.date }}</div>
        </div>
      }
    </div>

    <!-- Legend -->
    <div class="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-surface-500">
      <span>{{ 'heatmap.less' | translate }}</span>
      @for (lvl of legendLevels; track lvl) {
        <span [attr.class]="'inline-block h-2.5 w-2.5 rounded-sm ' + levelBg[lvl]"></span>
      }
      <span>{{ 'heatmap.more' | translate }}</span>
    </div>
  `,
})
export class HeatmapComponent {
  readonly points = input<TimelinePoint[]>([]);

  private readonly translate = inject(TranslateService);
  private readonly duration = new DurationPipe();
  private readonly wrap = viewChild.required<ElementRef<HTMLElement>>('wrap');

  readonly cellSize = CELL;
  readonly rectSize = SIZE;
  readonly gutterLeft = GUTTER_LEFT;
  readonly gutterTop = GUTTER_TOP;
  readonly height = GUTTER_TOP + 7 * CELL;
  readonly legendLevels: Cell['level'][] = [0, 1, 2, 3, 4];
  readonly levelClass: Record<Cell['level'], string> = {
    0: 'fill-surface-800',
    1: 'fill-primary-500/30',
    2: 'fill-primary-500/55',
    3: 'fill-primary-500/80',
    4: 'fill-primary-500',
  };
  readonly levelBg: Record<Cell['level'], string> = {
    0: 'bg-surface-800',
    1: 'bg-primary-500/30',
    2: 'bg-primary-500/55',
    3: 'bg-primary-500/80',
    4: 'bg-primary-500',
  };
  readonly dayLabels: DayLabel[] = [
    { y: GUTTER_TOP + 1 * CELL + 9, text: 'Mon' },
    { y: GUTTER_TOP + 3 * CELL + 9, text: 'Wed' },
    { y: GUTTER_TOP + 5 * CELL + 9, text: 'Fri' },
  ];

  readonly hover = signal<Hover | null>(null);
  readonly vbWidth = computed(() => GUTTER_LEFT + WEEKS * CELL);

  private readonly gridStart = computed(() => {
    // Anchor the LAST column on the current week so today always appears (in the
    // rightmost column), then walk back WEEKS-1 weeks to the grid's first Sunday.
    const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
    const currentWeekSunday = today - new Date(today).getUTCDay() * DAY_MS;
    return currentWeekSunday - (WEEKS - 1) * 7 * DAY_MS;
  });

  readonly cells = computed<Cell[]>(() => {
    const byDay = new Map<number, number>();
    let max = 0;
    for (const p of this.points()) {
      byDay.set(p.day, p.value);
      if (p.value > max) max = p.value;
    }

    const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
    const gridStart = this.gridStart();

    const cells: Cell[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const day = gridStart + i * DAY_MS;
      if (day > today) break;
      const value = byDay.get(day) ?? 0;
      cells.push({ x: Math.floor(i / 7), y: i % 7, ts: day, value, level: this.level(value, max) });
    }
    return cells;
  });

  readonly monthLabels = computed<MonthLabel[]>(() => {
    const gridStart = this.gridStart();
    const labels: MonthLabel[] = [];
    let lastMonth = -1;
    let lastCol = -2;
    for (let col = 0; col < WEEKS; col++) {
      const month = new Date(gridStart + col * 7 * DAY_MS).getUTCMonth();
      if (month !== lastMonth && col - lastCol >= 2) {
        labels.push({ x: GUTTER_LEFT + col * CELL, text: MONTHS[month] });
        lastMonth = month;
        lastCol = col;
      }
    }
    return labels;
  });

  // Position the tooltip from the hovered cell's real on-screen box, so it stays
  // accurate however the responsive SVG is scaled.
  onHover(cell: Cell, event: MouseEvent): void {
    const rect = (event.target as SVGRectElement).getBoundingClientRect();
    const container = this.wrap().nativeElement.getBoundingClientRect();

    const date = new Date(cell.ts).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const value = cell.value > 0 ? (this.duration.transform(cell.value) ?? '') : this.translate.instant('heatmap.none');
    this.hover.set({
      left: rect.left - container.left + rect.width / 2,
      top: rect.top - container.top - 4,
      date,
      value,
    });
  }

  private level(value: number, max: number): Cell['level'] {
    if (value <= 0 || max <= 0) return 0;
    const ratio = value / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  }
}
