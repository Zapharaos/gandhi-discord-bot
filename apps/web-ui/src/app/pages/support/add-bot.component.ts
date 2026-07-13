import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';

@Component({
  selector: 'app-support-add-bot',
  standalone: true,
  imports: [RouterLink, ButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/support" class="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100">
      <i class="pi pi-angle-left text-xs"></i>{{ 'support.back' | translate }}
    </a>
    <h1 class="text-2xl font-bold text-surface-0">{{ 'support.addBot.title' | translate }}</h1>
    <p class="mt-2 text-surface-400">{{ 'support.addBot.intro' | translate }}</p>

    <div class="mt-6 flex items-start gap-3 rounded-2xl border border-primary-500/30 bg-primary-500/10 p-4 text-sm text-surface-200">
      <i class="pi pi-shield mt-0.5 shrink-0 text-primary-400"></i>
      <span>{{ 'support.addBot.disclaimer' | translate }}</span>
    </div>

    <ol class="mt-6 flex flex-col gap-4">
      @for (i of steps; track i) {
        <li class="flex gap-4 rounded-2xl border border-surface-800 bg-surface-900 p-4">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/15 font-semibold text-primary-400">{{ i }}</span>
          <div class="pt-1 text-sm text-surface-300">
            <p>{{ 'support.addBot.step' + i | translate }}</p>
            @if (i === 4) {
              <a
                routerLink="/support/preferences"
                class="mt-3 inline-flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-1.5 text-sm font-medium text-surface-100 no-underline transition-colors hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-primary-200"
              >
                {{ 'support.prefs.title' | translate }}
                <i class="pi pi-arrow-right text-xs opacity-70"></i>
              </a>
            }
          </div>
        </li>
      }
    </ol>

    <div class="mt-8">
      <a [href]="inviteUrl() || '#'" target="_blank" rel="noopener">
        <p-button icon="pi pi-discord" [label]="'support.addBot.invite' | translate" [disabled]="!inviteUrl()" />
      </a>
    </div>
  `,
})
export class AddBotComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly steps = [1, 2, 3, 4];
  readonly inviteUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.api.config().subscribe({
      next: (c) => this.inviteUrl.set(c.botInviteUrl),
      error: () => this.inviteUrl.set(null),
    });
  }
}
