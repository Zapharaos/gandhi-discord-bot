import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';

interface Feature {
  key: string;
  icon: string;
  accent: string;
}

@Component({
  selector: 'app-landing-features',
  standalone: true,
  imports: [TranslatePipe, RevealOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="features" class="bg-surface-950 py-20 md:py-24">
      <div class="mx-auto max-w-6xl px-4">
        <div class="mx-auto max-w-2xl text-center" appReveal>
          <span class="text-sm font-semibold uppercase tracking-wide text-primary-400">
            {{ 'landing.features.kicker' | translate }}
          </span>
          <h2 class="mt-3 text-3xl font-bold text-surface-0 sm:text-4xl">
            {{ 'landing.features.title' | translate }}
          </h2>
          <p class="mt-4 text-surface-400">{{ 'landing.features.subtitle' | translate }}</p>
        </div>

        <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          @for (f of features; track f.key; let i = $index) {
            <div
              appReveal
              [revealDelay]="i * 80"
              class="group rounded-3xl border border-surface-800 bg-surface-900/50 p-6 transition-colors hover:border-surface-600"
            >
              <span [class]="'flex h-12 w-12 items-center justify-center rounded-2xl ' + f.accent">
                <i [class]="'pi ' + f.icon + ' text-xl'"></i>
              </span>
              <h3 class="mt-5 text-lg font-semibold text-surface-0">
                {{ 'landing.features.' + f.key + '.title' | translate }}
              </h3>
              <p class="mt-2 text-sm leading-relaxed text-surface-400">
                {{ 'landing.features.' + f.key + '.desc' | translate }}
              </p>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class FeaturesComponent {
  readonly features: Feature[] = [
    { key: 'voice', icon: 'pi-volume-up', accent: 'bg-primary-500/15 text-primary-400' },
    { key: 'heatmap', icon: 'pi-calendar', accent: 'bg-neon-green/15 text-neon-green' },
    { key: 'leaderboard', icon: 'pi-trophy', accent: 'bg-neon-pink/15 text-neon-pink' },
    { key: 'privacy', icon: 'pi-shield', accent: 'bg-neon-cyan/15 text-neon-cyan' },
  ];
}
