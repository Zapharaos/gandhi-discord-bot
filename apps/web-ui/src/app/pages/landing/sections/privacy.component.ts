import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';

interface Pillar {
  key: string;
  icon: string;
}

@Component({
  selector: 'app-landing-privacy',
  standalone: true,
  imports: [RouterLink, TranslatePipe, RevealOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="privacy" class="bg-surface-950 py-20 md:py-24">
      <div class="mx-auto max-w-6xl px-4">
        <div
          appReveal
          class="relative overflow-hidden rounded-3xl border border-surface-800 bg-surface-900/50 p-8 md:p-12"
        >
          <div class="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-neon-cyan/10 blur-3xl"></div>

          <div class="relative max-w-2xl">
            <span class="inline-flex items-center gap-2 rounded-full bg-neon-cyan/10 px-3 py-1 text-xs font-semibold uppercase text-neon-cyan">
              <i class="pi pi-shield"></i>{{ 'landing.privacy.kicker' | translate }}
            </span>
            <h2 class="mt-4 text-3xl font-bold text-surface-0 sm:text-4xl">
              {{ 'landing.privacy.title' | translate }}
            </h2>
            <p class="mt-4 text-surface-400">{{ 'landing.privacy.subtitle' | translate }}</p>
          </div>

          <div class="relative mt-10 grid gap-5 sm:grid-cols-3">
            @for (p of pillars; track p.key) {
              <div class="rounded-2xl border border-surface-800 bg-surface-950/60 p-5">
                <i [class]="'pi ' + p.icon + ' text-lg text-neon-cyan'"></i>
                <h3 class="mt-3 font-semibold text-surface-0">
                  {{ 'landing.privacy.' + p.key + '.title' | translate }}
                </h3>
                <p class="mt-1.5 text-sm text-surface-400">
                  {{ 'landing.privacy.' + p.key + '.desc' | translate }}
                </p>
              </div>
            }
          </div>

          <div class="relative mt-8 flex flex-wrap gap-4">
            <a
              routerLink="/legal/privacy"
              class="inline-flex items-center gap-2 text-sm font-medium text-primary-400 hover:text-primary-300"
            >
              {{ 'landing.privacy.readPolicy' | translate }}<i class="pi pi-arrow-right text-xs"></i>
            </a>
            <a
              routerLink="/support/data"
              class="inline-flex items-center gap-2 text-sm font-medium text-surface-400 hover:text-surface-200"
            >
              {{ 'landing.privacy.manageData' | translate }}<i class="pi pi-arrow-right text-xs"></i>
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PrivacyComponent {
  readonly pillars: Pillar[] = [
    { key: 'optIn', icon: 'pi-check-circle' },
    { key: 'noContent', icon: 'pi-comment' },
    { key: 'control', icon: 'pi-sliders-h' },
  ];
}
