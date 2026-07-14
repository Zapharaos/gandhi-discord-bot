import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from '@core/api/api.service';
import { GuildSettings } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { LanguageService, SUPPORTED_LANGUAGES } from '@core/i18n/language.service';
import { PageHeaderComponent } from '@shared/page-header/page-header.component';
import { RevealOnScrollDirective } from '@shared/reveal/reveal-on-scroll.directive';

type Flag = 'stats' | 'logs' | 'private';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, ToggleSwitchModule, SelectModule, ButtonModule, TranslatePipe, PageHeaderComponent, RevealOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header kicker="profile.kicker" titleKey="profile.title" subtitleKey="profile.subtitle" icon="pi-user">
      <p-button
        size="small"
        severity="danger"
        [text]="true"
        icon="pi pi-sign-out"
        [label]="'app.logout' | translate"
        (onClick)="logout()"
      />
    </app-page-header>

    <!-- Account -->
    @if (user(); as u) {
      <section appReveal class="card mb-6 p-5">
        <div class="flex items-center gap-4">
          @if (avatarUrl(); as url) {
            <img [src]="url" alt="" class="h-14 w-14 rounded-full object-cover ring-2 ring-primary-500/30" />
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
    <section appReveal class="card mb-6 p-5">
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
    <section appReveal class="card p-5">
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

    <!-- Your data (GDPR: export / reset / delete) -->
    <section appReveal class="card mt-6 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-surface-0">{{ 'profile.data.title' | translate }}</h2>
          <p class="text-sm text-surface-400">{{ 'profile.data.hint' | translate }}</p>
        </div>
        <p-select
          [options]="scopeOptions()"
          optionLabel="label"
          optionValue="value"
          [ngModel]="dataScope()"
          (ngModelChange)="setDataScope($event)"
          size="small"
          [style]="{ minWidth: '12rem' }"
        />
      </div>

      @if (dataMessage(); as msg) {
        <p class="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <i class="pi pi-check-circle mr-1.5"></i>{{ msg.key | translate: msg.params }}
        </p>
      }

      <!-- Export -->
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-800 p-4">
        <div class="min-w-0">
          <h3 class="font-medium text-surface-100">{{ 'profile.data.export.title' | translate }}</h3>
          <p class="text-sm text-surface-400">{{ 'profile.data.export.desc' | translate }}</p>
        </div>
        <div class="flex gap-2">
          <p-button size="small" icon="pi pi-download" label="JSON" [outlined]="true" (onClick)="exportData('json')" />
          <p-button size="small" icon="pi pi-download" label="CSV" [outlined]="true" (onClick)="exportData('csv')" />
        </div>
      </div>

      <!-- Reset -->
      <div class="mt-3 rounded-xl border border-surface-800 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <h3 class="font-medium text-surface-100">{{ 'profile.data.reset.title' | translate }}</h3>
            <p class="text-sm text-surface-400">{{ 'profile.data.reset.desc' | translate }}</p>
          </div>
          <p-button
            size="small"
            severity="danger"
            [outlined]="true"
            icon="pi pi-refresh"
            [label]="'profile.data.reset.button' | translate"
            [disabled]="dataBusy()"
            (onClick)="startConfirm('reset')"
          />
        </div>
        @if (confirming() === 'reset') {
          <div class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p class="text-sm text-red-200">{{ 'profile.data.reset.confirm' | translate: { scope: scopeLabel() } }}</p>
            <div class="mt-3 flex gap-2">
              <p-button size="small" severity="danger" [label]="'profile.data.confirm' | translate" [loading]="dataBusy()" (onClick)="confirmReset()" />
              <p-button size="small" severity="secondary" [text]="true" [label]="'profile.data.cancel' | translate" [disabled]="dataBusy()" (onClick)="cancelConfirm()" />
            </div>
          </div>
        }
      </div>

      <!-- Delete -->
      <div class="mt-3 rounded-xl border border-red-500/30 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <h3 class="font-medium text-red-300">{{ 'profile.data.delete.title' | translate }}</h3>
            <p class="text-sm text-surface-400">{{ 'profile.data.delete.desc' | translate }}</p>
          </div>
          <p-button
            size="small"
            severity="danger"
            icon="pi pi-trash"
            [label]="'profile.data.delete.button' | translate"
            [disabled]="dataBusy()"
            (onClick)="startConfirm('delete')"
          />
        </div>
        @if (confirming() === 'delete') {
          <div class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p class="text-sm text-red-200">{{ 'profile.data.delete.confirm' | translate: { scope: scopeLabel() } }}</p>
            <p class="mt-2 text-xs text-surface-400">{{ 'profile.data.delete.logsNote' | translate }}</p>
            <label class="mt-3 block text-xs text-surface-300">{{ 'profile.data.delete.typeToConfirm' | translate }}</label>
            <input
              type="text"
              class="mt-1 w-48 rounded-lg border border-surface-700 bg-surface-950 px-3 py-1.5 font-mono text-sm text-surface-100 outline-none focus:border-red-400"
              [ngModel]="deleteInput()"
              (ngModelChange)="deleteInput.set($event)"
              placeholder="DELETE"
              autocomplete="off"
            />
            <div class="mt-3 flex gap-2">
              <p-button
                size="small"
                severity="danger"
                [label]="'profile.data.delete.button' | translate"
                [loading]="dataBusy()"
                [disabled]="deleteInput() !== 'DELETE'"
                (onClick)="confirmDelete()"
              />
              <p-button size="small" severity="secondary" [text]="true" [label]="'profile.data.cancel' | translate" [disabled]="dataBusy()" (onClick)="cancelConfirm()" />
            </div>
          </div>
        }
      </div>
    </section>

    <!-- Support shortcut -->
    <a
      appReveal
      routerLink="/support"
      class="card card-hover mt-6 flex items-center gap-3 p-4"
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
  private readonly translate = inject(TranslateService);

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

  // --- Your data (GDPR) ---

  /** '' = every server, otherwise a guild id. */
  readonly dataScope = signal('');
  readonly confirming = signal<'reset' | 'delete' | null>(null);
  readonly deleteInput = signal('');
  readonly dataBusy = signal(false);
  readonly dataMessage = signal<{ key: string; params?: Record<string, unknown> } | null>(null);

  // Depends on currentLang() so the "All servers" label follows language switches.
  readonly scopeOptions = computed(() => {
    this.currentLang();
    return [
      { value: '', label: this.translate.instant('profile.allServers') as string },
      ...this.settings().map((g) => ({ value: g.guildId, label: g.name || g.guildId })),
    ];
  });

  readonly scopeLabel = computed(
    () => this.scopeOptions().find((o) => o.value === this.dataScope())?.label ?? '',
  );

  setDataScope(value: string): void {
    this.dataScope.set(value);
    this.cancelConfirm();
  }

  exportData(format: 'json' | 'csv'): void {
    window.location.href = this.api.exportUrl(format, this.dataScope() || undefined);
  }

  startConfirm(action: 'reset' | 'delete'): void {
    this.confirming.set(action);
    this.deleteInput.set('');
    this.dataMessage.set(null);
  }

  cancelConfirm(): void {
    this.confirming.set(null);
    this.deleteInput.set('');
  }

  confirmReset(): void {
    this.dataBusy.set(true);
    this.api.resetStats(this.dataScope() || undefined).subscribe({
      next: (r) => {
        this.dataBusy.set(false);
        this.cancelConfirm();
        this.dataMessage.set({ key: 'profile.data.reset.done', params: { count: r.reset } });
        this.api.getSettings().subscribe((s) => this.settings.set(s.guilds));
      },
      error: () => this.dataBusy.set(false),
    });
  }

  confirmDelete(): void {
    if (this.deleteInput() !== 'DELETE') return;
    const guildId = this.dataScope() || undefined;
    this.dataBusy.set(true);
    this.api.deleteData(guildId).subscribe({
      next: (r) => {
        if (!guildId) {
          // Global erasure ends the session server-side; finish the logout locally.
          void this.auth.logout();
          return;
        }
        this.dataBusy.set(false);
        this.cancelConfirm();
        this.dataMessage.set({ key: 'profile.data.delete.done', params: { count: r.deleted } });
        this.api.getSettings().subscribe((s) => this.settings.set(s.guilds));
      },
      error: () => this.dataBusy.set(false),
    });
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
