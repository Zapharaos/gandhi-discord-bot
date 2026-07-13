import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from '@core/api/api.service';
import { GuildSettings } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { LanguageService, SUPPORTED_LANGUAGES } from '@core/i18n/language.service';

type Flag = 'stats' | 'logs' | 'private';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, ToggleSwitchModule, SelectModule, ButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-surface-0">{{ 'profile.title' | translate }}</h1>
        <p class="text-sm text-surface-400">{{ 'profile.subtitle' | translate }}</p>
      </div>
      <p-button
        size="small"
        severity="danger"
        [text]="true"
        icon="pi pi-sign-out"
        [label]="'app.logout' | translate"
        (onClick)="logout()"
      />
    </header>

    <!-- Account -->
    @if (user(); as u) {
      <section class="mb-6 rounded-2xl border border-surface-800 bg-surface-900 p-5">
        <div class="flex items-center gap-4">
          @if (avatarUrl(); as url) {
            <img [src]="url" alt="" class="h-14 w-14 rounded-full object-cover" />
          } @else {
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-surface-700 text-xl"><i class="pi pi-user"></i></span>
          }
          <div class="min-w-0">
            <div class="truncate text-lg font-semibold text-surface-0">{{ u.globalName || u.username }}</div>
            <div class="mt-1 flex items-center gap-2">
              <span class="text-xs text-surface-500">{{ 'profile.discordId' | translate }}</span>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md bg-surface-800 px-2 py-1 font-mono text-xs text-surface-300 transition-colors hover:bg-surface-700"
                (click)="copyId()"
                [title]="'profile.copy' | translate"
              >
                <span>{{ u.id }}</span>
                <i class="pi text-[10px]" [class.pi-copy]="!copied()" [class.pi-check]="copied()" [class.text-green-400]="copied()"></i>
              </button>
            </div>
          </div>
        </div>
      </section>
    }

    <!-- Language -->
    <section class="mb-6 rounded-2xl border border-surface-800 bg-surface-900 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-surface-0">{{ 'profile.language' | translate }}</h2>
          <p class="text-sm text-surface-400">{{ 'profile.languageHint' | translate }}</p>
        </div>
        <p-select
          [options]="langOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="currentLang()"
          (ngModelChange)="setLang($event)"
          size="small"
          [style]="{ minWidth: '10rem' }"
        />
      </div>
    </section>

    <!-- Preferences -->
    <section class="rounded-2xl border border-surface-800 bg-surface-900 p-5">
      <h2 class="text-base font-semibold text-surface-0">{{ 'profile.prefs' | translate }}</h2>
      <p class="mb-4 text-sm text-surface-400">{{ 'profile.prefsHint' | translate }}</p>

      @if (settings().length) {
        <!-- One aligned matrix: the "All servers" master row sits on top of the per-server rows,
             so every toggle lines up under its column. -->
        <div class="overflow-x-auto rounded-xl border border-surface-800">
          <table class="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-surface-800 bg-surface-800/40 text-left">
                <th class="px-4 py-2.5 font-medium text-surface-400">{{ 'profile.server' | translate }}</th>
                @for (f of flags; track f) {
                  <th class="w-32 px-3 py-2.5 text-center font-medium text-surface-300" [title]="'settings.' + f + '.desc' | translate">
                    {{ 'settings.' + f + '.label' | translate }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              <!-- All servers: highlighted master row -->
              <tr class="border-b border-primary-500/30 bg-primary-500/10">
                <td class="px-4 py-3">
                  <span class="flex items-center gap-2.5">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300">
                      <i class="pi pi-globe text-sm"></i>
                    </span>
                    <span class="min-w-0">
                      <span class="block font-semibold text-primary-200">{{ 'profile.allServers' | translate }}</span>
                      <span class="block text-xs text-surface-400">{{ 'profile.allServersHint' | translate }}</span>
                    </span>
                  </span>
                </td>
                @for (f of flags; track f) {
                  <td class="px-3 py-3 text-center">
                    <span class="inline-flex origin-center scale-90 align-middle">
                      <p-toggleswitch [ngModel]="globalValue(f)" (ngModelChange)="toggleGlobal(f, $event)" [disabled]="saving()" />
                    </span>
                  </td>
                }
              </tr>

              @for (g of settings(); track g.guildId) {
                <tr class="border-b border-surface-800 last:border-b-0 hover:bg-surface-800/30">
                  <td class="px-4 py-2.5">
                    <span class="flex items-center gap-2.5">
                      @if (g.icon) {
                        <img [src]="g.icon" alt="" class="h-6 w-6 shrink-0 rounded-full object-cover" />
                      } @else {
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-700 text-[0.65rem] uppercase text-surface-300">{{ (g.name || '?').charAt(0) }}</span>
                      }
                      <span class="truncate text-surface-200">{{ g.name || g.guildId }}</span>
                    </span>
                  </td>
                  @for (f of flags; track f) {
                    <td class="px-3 py-2.5 text-center">
                      <span class="inline-flex origin-center scale-90 align-middle">
                        <p-toggleswitch [ngModel]="g[f]" (ngModelChange)="toggleGuild(g.guildId, f, $event)" [disabled]="saving()" />
                      </span>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 px-1 text-xs text-surface-500">{{ 'profile.matrixHint' | translate }}</p>
      } @else {
        <p class="text-surface-400">{{ 'profile.noServers' | translate }}</p>
      }
    </section>

    <!-- Support shortcut -->
    <a
      routerLink="/support"
      class="mt-6 flex items-center gap-3 rounded-2xl border border-surface-800 bg-surface-900 p-4 transition-colors hover:border-surface-600"
    >
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
        <i class="pi pi-question-circle"></i>
      </span>
      <div class="min-w-0 flex-1">
        <div class="font-medium text-surface-100">{{ 'profile.support' | translate }}</div>
        <div class="text-sm text-surface-400">{{ 'profile.supportHint' | translate }}</div>
      </div>
      <i class="pi pi-angle-right text-surface-500"></i>
    </a>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  readonly currentLang = this.language.current;
  readonly flags: Flag[] = ['stats', 'logs', 'private'];
  readonly langOptions = SUPPORTED_LANGUAGES.map((l) => ({
    value: l,
    label: l === 'fr' ? 'Français' : 'English',
  }));

  readonly settings = signal<GuildSettings[]>([]);
  readonly saving = signal(false);
  readonly copied = signal(false);

  readonly user = computed(() => this.auth.me()?.user ?? null);
  readonly avatarUrl = computed(() => {
    const u = this.user();
    return u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null;
  });

  copyId(): void {
    const id = this.user()?.id;
    if (!id) return;
    navigator.clipboard?.writeText(id);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  ngOnInit(): void {
    this.api.getSettings().subscribe((r) => this.settings.set(r.guilds));
  }

  globalValue(flag: Flag): boolean {
    const s = this.settings();
    return s.length > 0 && s.every((g) => g[flag]);
  }

  toggleGlobal(flag: Flag, value: boolean): void {
    this.save({ [flag]: value });
  }

  toggleGuild(guildId: string, flag: Flag, value: boolean): void {
    this.save({ guildId, [flag]: value });
  }

  setLang(lang: string): void {
    this.language.use(lang as (typeof SUPPORTED_LANGUAGES)[number]);
  }

  logout(): void {
    void this.auth.logout();
  }

  private save(patch: Record<string, unknown>): void {
    this.saving.set(true);
    this.api.updateSettings(patch).subscribe({
      next: (r) => {
        this.settings.set(r.guilds);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
