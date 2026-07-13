import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-support-data',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/support" class="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100">
      <i class="pi pi-angle-left text-xs"></i>{{ 'support.back' | translate }}
    </a>
    <h1 class="text-2xl font-bold text-surface-0">{{ 'support.data.title' | translate }}</h1>
    <p class="mt-2 text-surface-400">{{ 'support.data.intro' | translate }}</p>

    <div class="mt-8 flex flex-col gap-4">
      @for (item of items; track item.key) {
        <div class="flex gap-4 rounded-2xl border border-surface-800 bg-surface-900 p-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
            <i [class]="'pi ' + item.icon"></i>
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-surface-100">{{ 'support.data.' + item.key + '.title' | translate }}</h2>
            <p class="mt-1 text-sm text-surface-400">{{ 'support.data.' + item.key + '.body' | translate }}</p>

            @if (item.command || item.link) {
              <div class="mt-3 flex flex-wrap items-center gap-2">
                @if (item.command) {
                  <a
                    routerLink="/support/commands"
                    class="inline-flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-1.5 text-sm text-surface-100 no-underline transition-colors hover:border-primary-500/40 hover:bg-primary-500/10"
                  >
                    <code class="font-mono text-primary-300">{{ item.command }}</code>
                    <i class="pi pi-arrow-right text-xs opacity-70"></i>
                  </a>
                }
                @if (item.link) {
                  <a
                    [routerLink]="item.link.path"
                    class="inline-flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-1.5 text-sm font-medium text-surface-100 no-underline transition-colors hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-primary-200"
                  >
                    {{ item.link.labelKey | translate }}
                    <i class="pi pi-arrow-right text-xs opacity-70"></i>
                  </a>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DataComponent {
  readonly items: {
    key: string;
    icon: string;
    command: string | null;
    link: { path: string; labelKey: string } | null;
  }[] = [
    { key: 'access', icon: 'pi-download', command: '/export', link: { path: '/dashboard', labelKey: 'support.data.openDashboard' } },
    { key: 'erase', icon: 'pi-trash', command: '/delete-data', link: null },
    { key: 'reset', icon: 'pi-refresh', command: '/reset-stats', link: null },
    { key: 'what', icon: 'pi-eye', command: null, link: { path: '/support/preferences', labelKey: 'support.prefs.title' } },
  ];
}
