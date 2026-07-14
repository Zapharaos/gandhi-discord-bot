import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';

// Closing call-to-action banner.
@Component({
  selector: 'app-landing-cta',
  standalone: true,
  imports: [RouterLink, TranslatePipe, RevealOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface-950 px-4 pb-24 pt-4">
      <div
        appReveal
        class="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary-500/30 bg-gradient-to-br from-primary-900/40 via-surface-900 to-surface-900 p-10 text-center md:p-14"
      >
        <div class="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary-500/25 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-neon-pink/15 blur-3xl"></div>

        <div class="relative">
          <h2 class="text-3xl font-bold text-surface-0 sm:text-4xl">{{ 'landing.cta.title' | translate }}</h2>
          <p class="mx-auto mt-4 max-w-xl text-surface-300">{{ 'landing.cta.subtitle' | translate }}</p>

          <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              [href]="inviteUrl() || '#'"
              target="_blank"
              rel="noopener"
              class="inline-flex animate-pulse-glow items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-600"
              [class.pointer-events-none]="!inviteUrl()"
              [class.opacity-60]="!inviteUrl()"
            >
              <i class="pi pi-discord"></i>{{ 'landing.cta.button' | translate }}
            </a>
            <a
              routerLink="/support/add-bot"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-900/60 px-6 py-3 text-base font-semibold text-surface-100 transition-colors hover:border-surface-500 hover:bg-surface-800"
            >
              {{ 'landing.cta.learn' | translate }}
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CtaComponent {
  readonly inviteUrl = input<string | null>(null);
}
