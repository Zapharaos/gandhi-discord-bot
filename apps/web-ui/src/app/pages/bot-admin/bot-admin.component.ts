import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-bot-admin',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
        <i class="pi pi-cog"></i>
      </span>
      <h1 class="text-2xl font-bold text-surface-0">{{ 'botAdmin.title' | translate }}</h1>
    </header>

    <!-- Intentionally empty for now — this is the bot-operator area. -->
    <div class="rounded-2xl border border-dashed border-surface-800 p-10 text-center text-surface-500">
      <i class="pi pi-wrench mb-3 block text-3xl text-surface-600"></i>
      {{ 'botAdmin.soon' | translate }}
    </div>
  `,
})
export class BotAdminComponent {}
