import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Standard page header for the authenticated pages: an optional icon/avatar,
 * a colored kicker, a subtly gradient title and a subtitle — echoing the
 * landing's section headers. Right-side actions go in the projected content.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-wrap items-center gap-3">
      @if (avatarUrl()) {
        <img [src]="avatarUrl()" alt="" class="h-11 w-11 shrink-0 rounded-xl object-cover" />
      } @else if (avatarFallback()) {
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-700 text-lg font-semibold uppercase text-surface-200">
          {{ avatarFallback() }}
        </span>
      } @else if (icon()) {
        <span [class]="'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + iconAccent()">
          <i [class]="'pi ' + icon()"></i>
        </span>
      }

      <div class="min-w-0">
        @if (kicker()) {
          <span class="text-xs font-semibold uppercase tracking-wide text-primary-400">
            {{ kicker()! | translate }}
          </span>
        }
        <h1 class="truncate bg-gradient-to-r from-surface-0 to-surface-300 bg-clip-text text-2xl font-bold text-transparent">
          {{ titleKey() ? (titleKey()! | translate) : title() }}
        </h1>
        @if (subtitleKey()) {
          <p class="text-sm text-surface-400">{{ subtitleKey()! | translate }}</p>
        }
      </div>

      <div class="ml-auto flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  /** i18n key for the small colored label above the title. */
  readonly kicker = input<string | null>(null);
  /** Raw, already-resolved title text (e.g. a server name). */
  readonly title = input<string>('');
  /** i18n key for the title (used when `title` is not a raw string). */
  readonly titleKey = input<string | null>(null);
  /** i18n key for the subtitle line. */
  readonly subtitleKey = input<string | null>(null);
  /** PrimeIcon class (without the `pi ` prefix), e.g. 'pi-cog'. */
  readonly icon = input<string | null>(null);
  /** Tailwind classes for the icon tile (bg + text). */
  readonly iconAccent = input<string>('bg-primary-500/15 text-primary-400');
  /** Avatar image URL (takes precedence over icon), e.g. a server icon. */
  readonly avatarUrl = input<string | null>(null);
  /** Single-letter fallback shown when there's no avatar image. */
  readonly avatarFallback = input<string | null>(null);
}
