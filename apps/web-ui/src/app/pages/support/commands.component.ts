import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface Arg {
  name: string;
  descKey: string;
}
interface Cmd {
  name: string;
  key: string;
  args: Arg[];
}

@Component({
  selector: 'app-support-commands',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/support" class="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100">
      <i class="pi pi-angle-left text-xs"></i>{{ 'support.back' | translate }}
    </a>
    <h1 class="text-2xl font-bold text-surface-0">{{ 'support.commands.title' | translate }}</h1>
    <p class="mt-2 text-surface-400">{{ 'support.commands.intro' | translate }}</p>

    <div class="mt-8 flex flex-col gap-2">
      @for (c of commands; track c.name) {
        <div class="overflow-hidden rounded-2xl border border-surface-800 bg-surface-900">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left"
            [class.cursor-default]="!c.args.length"
            (click)="toggle(c.name)"
          >
            <code class="shrink-0 rounded bg-surface-800 px-2 py-0.5 font-mono text-sm text-primary-300">{{ c.name }}</code>
            <span class="min-w-0 flex-1 truncate text-sm text-surface-300">{{ 'support.commands.' + c.key | translate }}</span>
            @if (c.args.length) {
              <i
                class="pi pi-angle-down text-surface-500 transition-transform"
                [class.rotate-180]="isOpen(c.name)"
              ></i>
            }
          </button>
          @if (c.args.length && isOpen(c.name)) {
            <div class="border-t border-surface-800 px-4 py-3">
              <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                {{ 'support.commands.arguments' | translate }}
              </div>
              <div class="flex flex-col gap-2">
                @for (a of c.args; track a.name) {
                  <div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                    <code class="w-fit shrink-0 rounded bg-surface-800 px-1.5 py-0.5 font-mono text-xs text-surface-200">{{ a.name }}</code>
                    <div class="min-w-0">
                      <span class="text-sm text-surface-400">{{ 'support.commands.args.' + a.descKey | translate }}</span>
                      @if (a.descKey === 'stat') {
                        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span class="text-[11px] uppercase tracking-wide text-surface-500">{{ 'support.commands.args.statValues' | translate }}</span>
                          @for (v of statValues; track v) {
                            <span class="rounded bg-surface-800 px-1.5 py-0.5 text-[11px] text-surface-300">{{ 'stats.' + v | translate }}</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class CommandsComponent {
  private readonly open = signal(new Set<string>());

  // The values the `stat` argument accepts, matching the bot's heatmap/rank choices.
  readonly statValues = ['connected', 'muted', 'deafened', 'screen', 'camera'];

  readonly commands: Cmd[] = [
    { name: '/stats', key: 'stats', args: [{ name: 'target', descKey: 'target' }] },
    {
      name: '/heatmap',
      key: 'heatmap',
      args: [
        { name: 'target', descKey: 'target' },
        { name: 'target-all', descKey: 'targetAll' },
        { name: 'stat', descKey: 'stat' },
        { name: 'format', descKey: 'format' },
      ],
    },
    { name: '/rank', key: 'rank', args: [{ name: 'stat', descKey: 'stat' }] },
    {
      name: '/user-settings',
      key: 'userSettings',
      args: [
        { name: 'stats', descKey: 'toggle' },
        { name: 'logs', descKey: 'toggle' },
        { name: 'private', descKey: 'togglePrivate' },
      ],
    },
    {
      name: '/server-settings',
      key: 'serverSettings',
      args: [
        { name: 'stats', descKey: 'toggle' },
        { name: 'logs', descKey: 'toggle' },
        { name: 'logchannel', descKey: 'logchannel' },
      ],
    },
    { name: '/export', key: 'export', args: [{ name: 'scope', descKey: 'scope' }] },
    { name: '/delete-data', key: 'deleteData', args: [{ name: 'scope', descKey: 'scope' }] },
    { name: '/reset-stats', key: 'resetStats', args: [{ name: 'scope', descKey: 'scope' }] },
    { name: '/my-servers', key: 'myServers', args: [] },
  ];

  isOpen(name: string): boolean {
    return this.open().has(name);
  }

  toggle(name: string): void {
    const next = new Set(this.open());
    if (next.has(name)) next.delete(name);
    else next.add(name);
    this.open.set(next);
  }
}
