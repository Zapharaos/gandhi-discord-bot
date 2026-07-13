import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardStat } from '@core/api/models';

/**
 * Inline (Lucide-style) SVG glyph for a voice stat. Uses proper mic-off / volume-x
 * marks for muted / deafened, which the icon font lacks. Size and colour are
 * inherited: set width/height and text colour on the host element.
 */
@Component({
  selector: 'app-stat-icon',
  standalone: true,
  host: { class: 'inline-flex' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="h-full w-full"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (stat()) {
        @case ('time_connected') {
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        }
        @case ('time_muted') {
          <!-- microphone-off -->
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
          <path d="M5 10v2a7 7 0 0 0 12 5" />
          <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          <line x1="12" y1="19" x2="12" y2="22" />
        }
        @case ('time_deafened') {
          <!-- volume-x -->
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        }
        @case ('time_screen_sharing') {
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        }
        @case ('time_camera') {
          <path d="m22 8-6 4 6 4V8Z" />
          <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
        }
        @case ('daily_streak') {
          <!-- zap -->
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        }
        @case ('count_switch') {
          <!-- refresh-cw -->
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        }
      }
    </svg>
  `,
})
export class StatIconComponent {
  readonly stat = input.required<CardStat>();
}
