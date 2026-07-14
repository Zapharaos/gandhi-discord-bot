import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';

interface Cmd {
  name: string;
  key: string;
}

@Component({
  selector: 'app-landing-commands',
  standalone: true,
  imports: [TranslatePipe, RevealOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="commands" class="bg-surface-950 py-20 md:py-24">
      <div class="mx-auto max-w-6xl px-4">
        <div class="mx-auto max-w-2xl text-center" appReveal>
          <span class="text-sm font-semibold uppercase tracking-wide text-neon-pink">
            {{ 'landing.commands.kicker' | translate }}
          </span>
          <h2 class="mt-3 text-3xl font-bold text-surface-0 sm:text-4xl">
            {{ 'landing.commands.title' | translate }}
          </h2>
          <p class="mt-4 text-surface-400">{{ 'landing.commands.subtitle' | translate }}</p>
        </div>

        <div class="mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl border border-surface-800 bg-surface-900/60 shadow-2xl">
          <div class="flex items-center gap-2 border-b border-surface-800 bg-surface-900 px-4 py-3">
            <i class="pi pi-discord text-primary-400"></i>
            <span class="text-sm font-medium text-surface-300">#{{ 'landing.commands.channel' | translate }}</span>
          </div>
          <ul class="divide-y divide-surface-800/70">
            @for (c of commands; track c.name; let i = $index) {
              <li appReveal [revealDelay]="i * 60" class="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-800/30">
                <code class="shrink-0 rounded-lg bg-primary-500/15 px-2.5 py-1 font-mono text-sm font-semibold text-primary-300">
                  /{{ c.name }}
                </code>
                <span class="pt-1 text-sm text-surface-400">
                  {{ 'landing.commands.' + c.key | translate }}
                </span>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class CommandsComponent {
  readonly commands: Cmd[] = [
    { name: 'stats', key: 'stats' },
    { name: 'heatmap', key: 'heatmap' },
    { name: 'rank', key: 'rank' },
    { name: 'usersettings', key: 'userSettings' },
    { name: 'export', key: 'export' },
    { name: 'delete-data', key: 'deleteData' },
  ];
}
