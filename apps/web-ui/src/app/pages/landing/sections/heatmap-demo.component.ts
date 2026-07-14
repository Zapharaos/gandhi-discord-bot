import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';

interface Cell {
  x: number;
  y: number;
  fill: string;
}

interface PodiumEntry {
  rank: number;
  name: string;
  value: string;
  barH: string;
  ring: string;
  bar: string;
  rankColor: string;
}

const WEEKS = 53;
const DAYS = 7;
const SIZE = 11; // cell side
const GAP = 3;
const PITCH = SIZE + GAP;

// GitHub-style intensity ramp: empty slate → blurple primary shades.
const LEVELS = ['#20242e', '#151a3b', '#363f96', '#5865f2', '#8d99e4'];

/**
 * Two alternating rows: the contribution heatmap (text ↔ visual) and a dummy
 * leaderboard podium (visual ↔ text). Both visuals are static and
 * self-contained — the heatmap SVG scales to its container, never scrolling.
 */
@Component({
  selector: 'app-landing-heatmap-demo',
  standalone: true,
  imports: [TranslatePipe, RevealOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface-950 py-20 md:py-24">
      <div class="mx-auto flex max-w-6xl flex-col gap-16 px-4">
        <!-- Row 1: heatmap text  ·  heatmap visual -->
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div appReveal>
            <span class="text-sm font-semibold uppercase tracking-wide text-neon-green">
              {{ 'landing.demo.kicker' | translate }}
            </span>
            <h2 class="mt-3 text-3xl font-bold text-surface-0 sm:text-4xl">
              {{ 'landing.demo.title' | translate }}
            </h2>
            <p class="mt-4 text-surface-400">{{ 'landing.demo.subtitle' | translate }}</p>
            <ul class="mt-6 flex flex-col gap-3">
              @for (p of points; track p) {
                <li class="flex items-start gap-3 text-sm text-surface-300">
                  <i class="pi pi-check-circle mt-0.5 text-neon-green"></i>
                  <span>{{ 'landing.demo.' + p | translate }}</span>
                </li>
              }
            </ul>
          </div>

          <div appReveal [revealDelay]="120">
            <div class="rounded-3xl border border-surface-800 bg-surface-900/70 p-5 shadow-2xl sm:p-6">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-surface-200">{{ 'landing.demo.calendar' | translate }}</span>
                <div class="flex items-center gap-1.5 text-xs text-surface-500">
                  <span class="hidden sm:inline">{{ 'heatmap.less' | translate }}</span>
                  @for (l of levels; track l) {
                    <span class="h-2.5 w-2.5 rounded-sm" [style.background]="l"></span>
                  }
                  <span class="hidden sm:inline">{{ 'heatmap.more' | translate }}</span>
                </div>
              </div>
              <svg
                [attr.viewBox]="'0 0 ' + width + ' ' + height"
                class="mt-4 block w-full"
                role="img"
                [attr.aria-label]="'landing.demo.title' | translate"
              >
                @for (c of cells; track $index) {
                  <rect
                    [attr.x]="c.x"
                    [attr.y]="c.y"
                    [attr.width]="size"
                    [attr.height]="size"
                    rx="2"
                    [attr.fill]="c.fill"
                  />
                }
              </svg>
            </div>
          </div>
        </div>

        <!-- Row 2: podium visual  ·  podium text -->
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div appReveal>
            <div class="rounded-3xl border border-surface-800 bg-surface-900/70 p-5 shadow-2xl sm:p-6">
              <div class="mb-5 flex items-center gap-2 text-sm font-medium text-surface-200">
                <i class="pi pi-trophy text-neon-pink"></i>{{ 'landing.demo.leaderboard' | translate }}
              </div>
              <div class="flex items-end justify-center gap-3">
                @for (p of podium; track p.name) {
                  <div class="flex w-1/3 flex-col items-center justify-end">
                    <div class="relative mb-2">
                      @if (p.rank === 1) {
                        <i class="pi pi-crown absolute -top-4 left-1/2 -translate-x-1/2 text-sm text-amber-400"></i>
                      }
                      <span
                        [class]="'flex h-10 w-10 items-center justify-center rounded-full bg-surface-800 text-sm font-bold text-surface-100 ring-2 ' + p.ring"
                      >
                        {{ p.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div class="mb-2 text-center">
                      <div class="max-w-[5.5rem] truncate text-xs font-medium text-surface-200">{{ p.name }}</div>
                      <div class="text-[0.7rem] text-surface-500">{{ p.value }}</div>
                    </div>
                    <div
                      [class]="
                        'flex w-full items-start justify-center rounded-t-md border border-b-0 border-surface-700 bg-gradient-to-t to-transparent pt-1.5 ' +
                        p.barH +
                        ' ' +
                        p.bar
                      "
                    >
                      <span [class]="'text-xs font-bold ' + p.rankColor">{{ p.rank }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <div appReveal [revealDelay]="120">
            <span class="text-sm font-semibold uppercase tracking-wide text-neon-pink">
              {{ 'landing.demo.lbKicker' | translate }}
            </span>
            <h2 class="mt-3 text-3xl font-bold text-surface-0 sm:text-4xl">
              {{ 'landing.demo.lbTitle' | translate }}
            </h2>
            <p class="mt-4 text-surface-400">{{ 'landing.demo.lbSubtitle' | translate }}</p>
            <ul class="mt-6 flex flex-col gap-3">
              @for (p of lbPoints; track p) {
                <li class="flex items-start gap-3 text-sm text-surface-300">
                  <i class="pi pi-check-circle mt-0.5 text-neon-pink"></i>
                  <span>{{ 'landing.demo.' + p | translate }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HeatmapDemoComponent {
  readonly size = SIZE;
  readonly levels = LEVELS;
  readonly width = WEEKS * PITCH;
  readonly height = DAYS * PITCH;
  readonly points = ['p1', 'p2', 'p3'];
  readonly lbPoints = ['lbP1', 'lbP2', 'lbP3'];
  readonly cells: Cell[] = this.build();

  // Illustrative top 3, ordered for display (2nd · 1st · 3rd).
  readonly podium: PodiumEntry[] = [
    { rank: 2, name: 'pixelwave', value: '128 h', barH: 'h-14', ring: 'ring-surface-400', bar: 'from-surface-400/30', rankColor: 'text-surface-300' },
    { rank: 1, name: 'nova', value: '167 h', barH: 'h-20', ring: 'ring-amber-400', bar: 'from-amber-400/30', rankColor: 'text-amber-300' },
    { rank: 3, name: 'echo', value: '94 h', barH: 'h-10', ring: 'ring-amber-700', bar: 'from-amber-700/30', rankColor: 'text-amber-600' },
  ];

  private build(): Cell[] {
    const out: Cell[] = [];
    let seed = 1337;
    const rand = () => {
      // Deterministic LCG — same pattern every load.
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS; d++) {
        const r = rand();
        // Weight towards emptier cells, with occasional bright streaks.
        let level = 0;
        if (r > 0.55) level = 1;
        if (r > 0.72) level = 2;
        if (r > 0.86) level = 3;
        if (r > 0.95) level = 4;
        out.push({ x: w * PITCH, y: d * PITCH, fill: LEVELS[level] });
      }
    }
    return out;
  }
}
