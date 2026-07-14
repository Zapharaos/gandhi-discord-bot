import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { ServerSettings, ServerSettingsPatch } from '@core/api/models';

@Component({
  selector: 'app-server-settings',
  standalone: true,
  imports: [FormsModule, ButtonModule, ToggleSwitchModule, SelectModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card p-5">
      <h2 class="text-base font-semibold text-surface-0">{{ 'admin.settings.title' | translate }}</h2>
      <p class="mb-4 text-sm text-surface-400">{{ 'admin.settings.hint' | translate }}</p>

      @if (settings(); as s) {
        <div class="flex flex-col gap-4">
          <!-- Stats tracking -->
          <div class="rounded-xl border border-surface-800 p-4">
            <div class="flex items-start gap-2.5">
              <span class="inline-flex origin-left scale-90"><p-toggleswitch [ngModel]="s.stats" (ngModelChange)="patch({ stats: $event })" [disabled]="saving()" /></span>
              <div>
                <div class="text-sm font-medium text-surface-100">{{ 'admin.settings.stats' | translate }}</div>
                <div class="text-xs text-surface-500">{{ 'admin.settings.statsHint' | translate }}</div>
              </div>
            </div>
          </div>

          <!-- Event logging + its log channel on the right (only when logging is on) -->
          <div class="rounded-xl border border-surface-800 p-4">
            <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              <div class="flex items-start gap-2.5">
                <span class="inline-flex origin-left scale-90"><p-toggleswitch [ngModel]="s.logs" (ngModelChange)="patch({ logs: $event })" [disabled]="saving()" /></span>
                <div>
                  <div class="text-sm font-medium text-surface-100">{{ 'admin.settings.logs' | translate }}</div>
                  <div class="text-xs text-surface-500">{{ 'admin.settings.logsHint' | translate }}</div>
                </div>
              </div>

              @if (s.logs) {
                <div class="w-full sm:w-auto">
                  <label class="mb-1 block text-xs font-medium text-surface-500">{{ 'admin.settings.logChannel' | translate }}</label>
                  @if (channelOptions().length) {
                    <p-select
                      [options]="channelOptions()"
                      optionLabel="label"
                      optionValue="value"
                      [ngModel]="s.logChannelId"
                      (ngModelChange)="saveLogChannel($event)"
                      [filter]="true"
                      filterBy="label"
                      [showClear]="true"
                      [placeholder]="'admin.settings.logChannelPlaceholder2' | translate"
                      [disabled]="saving()"
                      styleClass="w-full sm:w-64"
                      appendTo="body"
                      [size]="'small'"
                    />
                  } @else {
                    <p class="text-xs text-surface-500">
                      <i class="pi pi-info-circle mr-1"></i>{{ 'admin.settings.noChannels' | translate }}
                    </p>
                  }
                  @if (savedHint()) {
                    <p class="mt-1.5 flex items-center gap-1.5 text-xs text-green-400"><i class="pi pi-check-circle"></i>{{ 'admin.settings.saved' | translate }}</p>
                  }
                  @if (channelError()) {
                    <p class="mt-1.5 flex items-center gap-1.5 text-xs text-red-400"><i class="pi pi-exclamation-circle"></i>{{ 'admin.settings.logChannelError' | translate }}</p>
                  }
                </div>
              }
            </div>
          </div>
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
  readonly channelError = signal(false);

  readonly channelOptions = computed(() =>
    (this.settings()?.channels ?? []).map((c) => ({ value: c.channelId, label: `#${c.name ?? c.channelId}` })),
  );

  constructor() {
    toObservable(this.guildId)
      .pipe(switchMap((gid) => this.api.getServerSettings(gid)))
      .subscribe((r) => this.settings.set(r.settings));
  }

  patch(p: ServerSettingsPatch): void {
    this.save(p);
  }

  saveLogChannel(channelId: string | null): void {
    this.save({ logChannelId: channelId ?? null });
  }

  private save(p: ServerSettingsPatch): void {
    this.saving.set(true);
    this.savedHint.set(false);
    this.channelError.set(false);
    this.api.updateServerSettings(this.guildId(), p).subscribe({
      next: (r) => {
        this.settings.set(r.settings);
        this.saving.set(false);
        if (r.logChannelError) {
          this.channelError.set(true);
        } else {
          this.savedHint.set(true);
          setTimeout(() => this.savedHint.set(false), 2000);
        }
      },
      error: () => this.saving.set(false),
    });
  }
}
