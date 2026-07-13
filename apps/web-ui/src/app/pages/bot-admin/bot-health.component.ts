import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { BotHealthPanelComponent } from './bot-health-panel.component';

// Dedicated bot-operator health page (linked from the sidebar widget and the
// Administration summary card). The panel itself does all the data fetching.
@Component({
  selector: 'app-bot-health-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, BotHealthPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
        <i class="pi pi-heart"></i>
      </span>
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-surface-0">{{ 'botAdmin.healthPage.title' | translate }}</h1>
        <p class="text-sm text-surface-400">{{ 'botAdmin.healthPage.subtitle' | translate }}</p>
      </div>
      <a
        routerLink="/bot-admin"
        class="ml-auto flex items-center gap-1.5 rounded-lg border border-surface-800 px-3 py-1.5 text-sm text-surface-400 transition-colors hover:bg-surface-800/60 hover:text-surface-200"
      >
        <i class="pi pi-arrow-left text-xs"></i>{{ 'botAdmin.healthPage.back' | translate }}
      </a>
    </header>

    <app-bot-health-panel />
  `,
})
export class BotHealthComponent {}
