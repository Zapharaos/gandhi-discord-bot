import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { ServerSettings, ServerSettingsPatch } from '@core/api/models';

@Component({
  selector: 'app-server-settings',
  standalone: true,
  imports: [FormsModule, ButtonModule, ToggleSwitchModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-2xl border border-surface-800 bg-surface-900 p-5">
      <h2 class="text-base font-semibold text-surface-0">{{ 'admin.settings.title' | translate }}</h2>
      <p class="mb-4 text-sm text-surface-400">{{ 'admin.settings.hint' | translate }}</p>

      @if (settings(); as s) {
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex items-start gap-2.5">
            <span class="inline-flex origin-left scale-90"><p-toggleswitch [ngModel]="s.stats" (ngModelChange)="patch({ stats: $event })" [disabled]="saving()" /></span>
            <div>
              <div class="text-sm font-medium text-surface-100">{{ 'admin.settings.stats' | translate }}</div>
              <div class="text-xs text-surface-500">{{ 'admin.settings.statsHint' | translate }}</div>
            </div>
          </div>
          <div class="flex items-start gap-2.5">
            <span class="inline-flex origin-left scale-90"><p-toggleswitch [ngModel]="s.logs" (ngModelChange)="patch({ logs: $event })" [disabled]="saving()" /></span>
            <div>
              <div class="text-sm font-medium text-surface-100">{{ 'admin.settings.logs' | translate }}</div>
              <div class="text-xs text-surface-500">{{ 'admin.settings.logsHint' | translate }}</div>
            </div>
          </div>
        </div>

        <div class="mt-5 border-t border-surface-800 pt-4">
          <label class="text-sm font-medium text-surface-100">{{ 'admin.settings.logChannel' | translate }}</label>
          <p class="mb-2 text-xs text-surface-500">{{ 'admin.settings.logChannelHint' | translate }}</p>
          <form class="flex flex-wrap gap-2" (ngSubmit)="saveLogChannel()">
            <input
              type="text"
              [(ngModel)]="logChannelInput"
              name="logChannel"
              inputmode="numeric"
              [placeholder]="'admin.settings.logChannelPlaceholder' | translate"
              class="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 font-mono text-sm text-surface-100 outline-none focus:border-primary-500"
            />
            <p-button type="submit" size="small" icon="pi pi-check" [label]="'admin.settings.save' | translate" [disabled]="saving()" />
            @if (logChannelInput) {
              <p-button type="button" size="small" severity="secondary" [text]="true" icon="pi pi-times" [label]="'admin.settings.clear' | translate" [disabled]="saving()" (onClick)="clearLogChannel()" />
            }
          </form>
          @if (savedHint()) {
            <p class="mt-2 flex items-center gap-1.5 text-xs text-green-400"><i class="pi pi-check-circle"></i>{{ 'admin.settings.saved' | translate }}</p>
          }
        </div>
      } @else {
        <p class="text-sm text-surface-400">{{ 'dashboard.loading' | translate }}</p>
      }
    </section>
  `,
})
export class ServerSettingsComponent {
  private readonly api = inject(ApiService);

  readonly guildId = input.required<string>();

  readonly settings = signal<ServerSettings | null>(null);
  readonly saving = signal(false);
  readonly savedHint = signal(false);
  logChannelInput = '';

  constructor() {
    toObservable(this.guildId)
      .pipe(switchMap((gid) => this.api.getServerSettings(gid)))
      .subscribe((r) => {
        this.settings.set(r.settings);
        this.logChannelInput = r.settings.logChannelId ?? '';
      });
  }

  patch(p: ServerSettingsPatch): void {
    this.save(p);
  }

  saveLogChannel(): void {
    this.save({ logChannelId: this.logChannelInput.trim() || null });
  }

  clearLogChannel(): void {
    this.logChannelInput = '';
    this.save({ logChannelId: null });
  }

  private save(p: ServerSettingsPatch): void {
    this.saving.set(true);
    this.savedHint.set(false);
    this.api.updateServerSettings(this.guildId(), p).subscribe({
      next: (r) => {
        this.settings.set(r.settings);
        this.logChannelInput = r.settings.logChannelId ?? '';
        this.saving.set(false);
        this.savedHint.set(true);
        setTimeout(() => this.savedHint.set(false), 2000);
      },
      error: () => this.saving.set(false),
    });
  }
}
