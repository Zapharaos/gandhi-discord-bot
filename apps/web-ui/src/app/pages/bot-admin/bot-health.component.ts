import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { BotHealthPanelComponent } from './bot-health-panel.component';
import { PageHeaderComponent } from '@shared/page-header/page-header.component';

// Dedicated bot-operator health page (linked from the sidebar widget and the
// Administration summary card). The panel itself does all the data fetching.
@Component({
  selector: 'app-bot-health-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, BotHealthPanelComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      kicker="botAdmin.healthPage.kicker"
      titleKey="botAdmin.healthPage.title"
      subtitleKey="botAdmin.healthPage.subtitle"
      icon="pi-heart"
      iconAccent="bg-neon-pink/15 text-neon-pink"
    >
      <a
        routerLink="/bot-admin"
        class="flex items-center gap-1.5 rounded-lg border border-surface-800 px-3 py-1.5 text-sm text-surface-400 transition-colors hover:bg-surface-800/60 hover:text-surface-200"
      >
        <i class="pi pi-arrow-left text-xs"></i>{{ 'botAdmin.healthPage.back' | translate }}
      </a>
    </app-page-header>

    <app-bot-health-panel />
  `,
})
export class BotHealthComponent {}
