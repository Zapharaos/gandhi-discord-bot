import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { catchError, filter, of, switchMap, timer } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { ServiceStatus } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { LanguageService, SUPPORTED_LANGUAGES, Language } from '@core/i18n/language.service';

interface GuildOption {
  label: string;
  value: string | null;
  isAdmin: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, FormsModule, SelectModule, ButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-surface-950 text-surface-0">
      <header
        class="flex flex-wrap items-center gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3"
      >
        <div class="flex items-center gap-2 font-semibold">
          <i class="pi pi-chart-bar text-primary"></i>
          <span>{{ 'app.title' | translate }}</span>
        </div>

        @if (status(); as st) {
          <span
            class="flex items-center gap-1.5 rounded-full border border-surface-700 px-2.5 py-1 text-xs"
            [title]="botTooltip(st)"
          >
            <i
              class="pi pi-circle-fill text-[0.6rem]"
              [class.text-green-500]="st.bot.online"
              [class.text-red-500]="!st.bot.online"
            ></i>
            <span class="text-surface-300">
              {{ (st.bot.online ? 'health.online' : 'health.offline') | translate }}
            </span>
          </span>
        }

        <div class="ml-auto flex items-center gap-2">
          <p-select
            [options]="guildOptions()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="selectedGuild()"
            (ngModelChange)="onGuildChange($event)"
            [style]="{ minWidth: '14rem' }"
          />

          <div class="flex overflow-hidden rounded-md border border-surface-700">
            @for (lang of languages; track lang) {
              <button
                type="button"
                class="px-2 py-1 text-xs uppercase"
                [class.bg-primary]="currentLang() === lang"
                [class.text-surface-400]="currentLang() !== lang"
                (click)="setLang(lang)"
              >
                {{ lang }}
              </button>
            }
          </div>

          @if (adminGuildId(); as gid) {
            <p-button
              severity="info"
              icon="pi pi-shield"
              [text]="true"
              [label]="'admin.badge' | translate"
              (onClick)="goAdmin(gid)"
            />
          }

          <p-button
            severity="secondary"
            icon="pi pi-sign-out"
            [text]="true"
            [ariaLabel]="'app.logout' | translate"
            (onClick)="logout()"
          />
        </div>
      </header>

      <main class="mx-auto max-w-5xl p-4">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly languages = SUPPORTED_LANGUAGES;
  readonly currentLang = this.language.current;
  readonly selectedGuild = signal<string | null>(this.parseGuildId(this.router.url));

  // Poll the stack status every 20s for the header health indicator; a failed
  // request just yields null (indicator hidden) rather than erroring the shell.
  readonly status = toSignal(
    timer(0, 20000).pipe(switchMap(() => this.api.status().pipe(catchError(() => of(null))))),
    { initialValue: null },
  );

  readonly guildOptions = computed<GuildOption[]>(() => {
    const me = this.auth.me();
    const options: GuildOption[] = [{ label: 'Global', value: null, isAdmin: false }];
    for (const g of me?.guilds ?? []) {
      if (g.hasData || g.isAdmin) {
        options.push({ label: g.name ?? g.id, value: g.id, isAdmin: g.isAdmin });
      }
    }
    return options;
  });

  // The admin shortcut only appears when the selected server is one the user
  // administers (mirrors the server-side authorization).
  readonly adminGuildId = computed<string | null>(() => {
    const gid = this.selectedGuild();
    if (!gid) return null;
    const guild = this.auth.me()?.guilds.find((g) => g.id === gid);
    return guild?.isAdmin ? gid : null;
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.selectedGuild.set(this.parseGuildId(e.urlAfterRedirects)));
  }

  onGuildChange(guildId: string | null): void {
    this.router.navigate(guildId ? ['/server', guildId] : ['/dashboard']);
  }

  goAdmin(guildId: string): void {
    this.router.navigate(['/admin', guildId]);
  }

  botTooltip(st: ServiceStatus): string {
    if (!st.db) return 'Database unreachable';
    const parts = [`${st.bot.guildCount} servers`];
    if (st.bot.wsPing != null) parts.push(`${st.bot.wsPing} ms`);
    if (st.bot.lastSeen != null) parts.push(`seen ${new Date(st.bot.lastSeen).toLocaleTimeString()}`);
    return parts.join(' · ');
  }

  setLang(lang: Language): void {
    this.language.use(lang);
  }

  logout(): void {
    void this.auth.logout();
  }

  private parseGuildId(url: string): string | null {
    const match = /\/server\/([^/?#]+)/.exec(url);
    return match ? match[1] : null;
  }
}
