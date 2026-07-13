import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

// Above-the-fold hero: gradient headline, dual CTA, floating dashboard preview.
@Component({
  selector: 'app-landing-hero',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="top" class="relative overflow-hidden bg-surface-950">
      <!-- Ambient glows -->
      <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-neon-pink/10 blur-3xl"></div>
      <!-- Dot grid -->
      <div class="pointer-events-none absolute inset-0 bg-dot-grid bg-[length:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"></div>

      <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-2">
        <div>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-surface-700 bg-surface-900/70 px-3 py-1 text-xs font-medium text-surface-300"
          >
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green"></span>
            {{ 'landing.hero.badge' | translate }}
          </span>

          <h1 class="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-surface-0 sm:text-5xl lg:text-6xl">
            {{ 'landing.hero.title' | translate }}
            <span class="bg-gradient-to-r from-primary-400 via-neon-pink to-neon-cyan bg-clip-text text-transparent">
              {{ 'landing.hero.titleAccent' | translate }}
            </span>
          </h1>

          <p class="mt-5 max-w-xl text-lg text-surface-400">{{ 'landing.hero.subtitle' | translate }}</p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              [href]="inviteUrl() || '#'"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/40"
              [class.pointer-events-none]="!inviteUrl()"
              [class.opacity-60]="!inviteUrl()"
            >
              <i class="pi pi-discord"></i>{{ 'landing.hero.ctaInvite' | translate }}
            </a>
            <a
              routerLink="/login"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-900/60 px-6 py-3 text-base font-semibold text-surface-100 transition-colors hover:border-surface-500 hover:bg-surface-800"
            >
              {{ 'landing.hero.ctaSignIn' | translate }}
              <i class="pi pi-arrow-right text-sm"></i>
            </a>
          </div>

          <p class="mt-4 text-sm text-surface-500">
            <i class="pi pi-lock mr-1 text-xs"></i>{{ 'landing.hero.reassurance' | translate }}
          </p>
        </div>

        <!-- Floating dashboard preview -->
        <div class="relative lg:animate-float">
          <div class="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-primary-500/10 blur-2xl"></div>
          <div class="rounded-3xl border border-surface-800 bg-surface-900/80 p-5 shadow-2xl backdrop-blur">
            <div class="flex items-center gap-2 border-b border-surface-800 pb-3">
              <span class="h-3 w-3 rounded-full bg-red-400/80"></span>
              <span class="h-3 w-3 rounded-full bg-amber-400/80"></span>
              <span class="h-3 w-3 rounded-full bg-neon-green/80"></span>
              <span class="ml-2 text-xs text-surface-500">dashboard · {{ 'app.title' | translate }}</span>
              <span class="ml-auto inline-flex items-center gap-1.5 rounded-full bg-neon-green/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-neon-green">
                <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green"></span>{{ 'dashboard.live' | translate }}
              </span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              @for (t of tiles; track t.key) {
                <div class="rounded-2xl border border-surface-800 bg-surface-950/60 p-4">
                  <div class="flex items-center gap-2 text-surface-400">
                    <i [class]="'pi ' + t.icon + ' ' + t.accent"></i>
                    <span class="text-xs">{{ t.key | translate }}</span>
                  </div>
                  <div class="mt-2 text-2xl font-bold text-surface-0">{{ t.value }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HeroComponent {
  readonly inviteUrl = input<string | null>(null);

  // Illustrative values for the preview card (not live data).
  readonly tiles = [
    { key: 'stats.connected', icon: 'pi-volume-up', value: '142h', accent: 'text-primary-400' },
    { key: 'stats.streak', icon: 'pi-bolt', value: '17d', accent: 'text-neon-green' },
    { key: 'stats.screen', icon: 'pi-desktop', value: '23h', accent: 'text-neon-cyan' },
    { key: 'stats.muted', icon: 'pi-microphone', value: '46h', accent: 'text-neon-pink' },
  ];
}
