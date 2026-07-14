import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { GITHUB_URL } from '@shared/brand';

interface NavAnchor {
  fragment: string;
  key: string;
}

/**
 * Sticky translucent top bar shared by every public surface (landing, login,
 * support and legal), so they all wear the same chrome as the landing page.
 * `showNav` toggles the section anchors; `cta` picks the right-hand action.
 */
@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 border-b border-surface-800/60 bg-surface-950/70 backdrop-blur-lg">
      <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <a routerLink="/" fragment="top" class="flex items-center gap-2.5">
          <img src="assets/images/logo.png" alt="" class="h-8 w-8 rounded-lg" />
          <span class="font-semibold text-surface-0">{{ 'app.title' | translate }}</span>
        </a>

        @if (showNav()) {
          <nav class="ml-6 hidden items-center gap-6 md:flex">
            @for (a of anchors; track a.fragment) {
              <a
                routerLink="/"
                [fragment]="a.fragment"
                class="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                {{ a.key | translate }}
              </a>
            }
          </nav>
        }

        <div class="ml-auto flex items-center gap-1.5">
          <a
            [href]="github"
            target="_blank"
            rel="noopener"
            aria-label="GitHub"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
          >
            <i class="pi pi-github"></i>
          </a>
          @switch (cta()) {
            @case ('signin') {
              <a
                routerLink="/login"
                class="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
              >
                {{ 'landing.nav.signIn' | translate }}
              </a>
            }
            @case ('home') {
              <a
                routerLink="/"
                class="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 px-4 py-2 text-sm font-semibold text-surface-100 transition-colors hover:border-surface-500 hover:bg-surface-800"
              >
                <i class="pi pi-arrow-left text-xs"></i>{{ 'public.backHome' | translate }}
              </a>
            }
          }
        </div>
      </div>
    </header>
  `,
})
export class PublicHeaderComponent {
  /** Show the landing section anchors (Features / Commands / Privacy). */
  readonly showNav = input(true);
  /** Right-hand call to action. */
  readonly cta = input<'signin' | 'home' | 'none'>('signin');

  readonly github = GITHUB_URL;
  readonly anchors: NavAnchor[] = [
    { fragment: 'features', key: 'landing.nav.features' },
    { fragment: 'commands', key: 'landing.nav.commands' },
    { fragment: 'privacy', key: 'landing.nav.privacy' },
  ];
}
