import { ChangeDetectionStrategy, Component, computed, ElementRef, input, signal, viewChild } from '@angular/core';

export interface SparkPoint {
  /** Epoch ms. */
  t: number;
  v: number;
}

interface Hover {
  left: number;
  top: number;
  x: number;
  label: string;
  value: string;
}

// viewBox is fixed; the SVG scales to fill its container (same approach as the heatmap).
const WIDTH = 300;
const HEIGHT = 72;
const PAD_X = 2;
const PAD_TOP = 6;
const PAD_BOTTOM = 4;

/**
 * Hand-rolled SVG line/area mini-chart for time series. Breaks the line where
 * consecutive points are further apart than `gapMs`, so downtime shows as a
 * hole instead of a misleading straight line. An optional dashed secondary
 * series (`points2`) can be overlaid on the same time axis.
 */
@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #wrap class="relative w-full">
      <svg
        class="block w-full"
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        [style.aspectRatio]="width + ' / ' + height"
        preserveAspectRatio="none"
        role="img"
        (mousemove)="onMove($event)"
        (mouseleave)="hover.set(null)"
      >
        @for (seg of areaSegments(); track $index) {
          <path [attr.d]="seg" class="fill-primary-500/15" />
        }
        @for (seg of lineSegments(); track $index) {
          <path [attr.d]="seg" fill="none" stroke-width="1.5" class="stroke-primary-400" vector-effect="non-scaling-stroke" />
        }
        @for (seg of line2Segments(); track $index) {
          <path [attr.d]="seg" fill="none" stroke-width="1.5" stroke-dasharray="4 3" class="stroke-amber-400/80" vector-effect="non-scaling-stroke" />
        }
        @if (hover(); as h) {
          <line [attr.x1]="h.x" [attr.x2]="h.x" [attr.y1]="0" [attr.y2]="height" stroke-width="1" class="stroke-surface-600" vector-effect="non-scaling-stroke" />
        }
      </svg>

      @if (hover(); as h) {
        <div
          class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-surface-700 bg-surface-950 px-2.5 py-1.5 text-xs shadow-xl"
          [style.left.px]="h.left"
          [style.top.px]="h.top"
        >
          <div class="font-semibold text-surface-100">{{ h.value }}</div>
          <div class="text-[11px] text-surface-400">{{ h.label }}</div>
        </div>
      }
    </div>
  `,
})
export class SparklineComponent {
  readonly points = input<SparkPoint[]>([]);
  /** Optional dashed overlay series, plotted against the same time/value scale. */
  readonly points2 = input<SparkPoint[]>([]);
  /** Break the line when consecutive points are further apart than this. */
  readonly gapMs = input<number>(Number.POSITIVE_INFINITY);
  readonly formatValue = input<(v: number) => string>((v) => v.toLocaleString());

  private readonly wrap = viewChild.required<ElementRef<HTMLElement>>('wrap');

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly hover = signal<Hover | null>(null);

  private readonly domain = computed(() => {
    const all = [...this.points(), ...this.points2()];
    if (all.length === 0) return null;
    let tMin = Infinity, tMax = -Infinity, vMax = 0;
    for (const p of all) {
      if (p.t < tMin) tMin = p.t;
      if (p.t > tMax) tMax = p.t;
      if (p.v > vMax) vMax = p.v;
    }
    return { tMin, tMax: Math.max(tMax, tMin + 1), vMax: Math.max(vMax, 1) };
  });

  private x(t: number): number {
    const d = this.domain()!;
    return PAD_X + ((t - d.tMin) / (d.tMax - d.tMin)) * (WIDTH - 2 * PAD_X);
  }

  private y(v: number): number {
    const d = this.domain()!;
    return HEIGHT - PAD_BOTTOM - (v / d.vMax) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
  }

  /** Split a series into contiguous runs (no gap larger than gapMs). */
  private segments(points: SparkPoint[]): SparkPoint[][] {
    const gap = this.gapMs();
    const runs: SparkPoint[][] = [];
    let run: SparkPoint[] = [];
    for (const p of points) {
      if (run.length > 0 && p.t - run[run.length - 1].t > gap) {
        runs.push(run);
        run = [];
      }
      run.push(p);
    }
    if (run.length > 0) runs.push(run);
    return runs;
  }

  private linePath(run: SparkPoint[]): string {
    return run.map((p, i) => `${i === 0 ? 'M' : 'L'}${this.x(p.t).toFixed(1)},${this.y(p.v).toFixed(1)}`).join(' ');
  }

  readonly lineSegments = computed(() => {
    if (!this.domain()) return [];
    return this.segments(this.points()).map((run) => this.linePath(run));
  });

  readonly areaSegments = computed(() => {
    if (!this.domain()) return [];
    const base = HEIGHT - PAD_BOTTOM;
    return this.segments(this.points()).map((run) => {
      const first = run[0];
      const last = run[run.length - 1];
      return `${this.linePath(run)} L${this.x(last.t).toFixed(1)},${base} L${this.x(first.t).toFixed(1)},${base} Z`;
    });
  });

  readonly line2Segments = computed(() => {
    if (!this.domain() || this.points2().length === 0) return [];
    return this.segments(this.points2()).map((run) => this.linePath(run));
  });

  onMove(event: MouseEvent): void {
    const points = this.points();
    if (points.length === 0 || !this.domain()) return;

    const container = this.wrap().nativeElement.getBoundingClientRect();
    const relX = ((event.clientX - container.left) / Math.max(1, container.width)) * WIDTH;

    // Nearest point on the primary series by viewBox x.
    let nearest = points[0];
    let best = Infinity;
    for (const p of points) {
      const dist = Math.abs(this.x(p.t) - relX);
      if (dist < best) {
        best = dist;
        nearest = p;
      }
    }

    const px = this.x(nearest.t);
    this.hover.set({
      x: px,
      left: (px / WIDTH) * container.width,
      top: -4,
      label: new Date(nearest.t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      value: this.formatValue()(nearest.v),
    });
  }
}
