import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface Topic {
  path: string;
  icon: string;
  key: string;
}

@Component({
  selector: 'app-support-hub',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-bold text-surface-0">{{ 'support.title' | translate }}</h1>
    <p class="mt-2 text-surface-400">{{ 'support.intro' | translate }}</p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      @for (t of topics; track t.path) {
        <a
          [routerLink]="t.path"
          class="group flex items-start gap-4 rounded-2xl border border-surface-800 bg-surface-900 p-5 transition-colors hover:border-surface-600"
        >
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
            <i [class]="'pi ' + t.icon + ' text-lg'"></i>
          </span>
          <div class="min-w-0">
            <div class="font-semibold text-surface-0">{{ 'support.' + t.key + '.title' | translate }}</div>
            <div class="mt-1 text-sm text-surface-400">{{ 'support.' + t.key + '.summary' | translate }}</div>
          </div>
          <i class="pi pi-angle-right ml-auto self-center text-surface-600 transition-transform group-hover:translate-x-0.5"></i>
        </a>
      }
    </div>
  `,
})
export class SupportHubComponent {
  readonly topics: Topic[] = [
    { path: 'add-bot', icon: 'pi-plus-circle', key: 'addBot' },
    { path: 'commands', icon: 'pi-hashtag', key: 'commands' },
    { path: 'preferences', icon: 'pi-sliders-h', key: 'prefs' },
    { path: 'data', icon: 'pi-database', key: 'data' },
  ];
}
