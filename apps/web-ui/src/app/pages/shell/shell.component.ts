import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';
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
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly languages = SUPPORTED_LANGUAGES;
  readonly currentLang = this.language.current;
  readonly selectedGuild = signal<string | null>(this.parseGuildId(this.router.url));

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

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.selectedGuild.set(this.parseGuildId(e.urlAfterRedirects)));
  }

  onGuildChange(guildId: string | null): void {
    this.router.navigate(guildId ? ['/server', guildId] : ['/dashboard']);
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
