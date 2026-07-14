import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService, SUPPORTED_LANGUAGES, type Language } from '@core/i18n/language.service';
import { AUTHOR, GITHUB_URL, PORTFOLIO_URL } from '@shared/brand';

interface FooterLink {
  path: string;
  key: string;
}

// Public footer shared by the landing, legal and support surfaces.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, FormsModule, SelectModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-t border-surface-800 bg-surface-950">
      <div class="mx-auto max-w-6xl px-4 py-12">
        <div class="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <!-- Brand -->
          <div>
            <a routerLink="/" class="flex items-center gap-2.5">
              <img src="assets/images/logo.png" alt="" class="h-8 w-8 rounded-lg" />
              <span class="font-semibold text-surface-0">{{ 'app.title' | translate }}</span>
            </a>
            <p class="mt-3 max-w-xs text-sm text-surface-400">{{ 'footer.tagline' | translate }}</p>
            <a
              [href]="github"
              target="_blank"
              rel="noopener"
              class="mt-4 inline-flex items-center gap-2 rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-surface-300 transition-colors hover:border-surface-500 hover:text-surface-100"
            >
              <i class="pi pi-github"></i>{{ 'footer.github' | translate }}
            </a>
          </div>

          <!-- Link columns -->
          @for (col of columns; track col.title) {
            <nav>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">
                {{ col.title | translate }}
              </h3>
              <ul class="mt-3 flex flex-col gap-2">
                @for (link of col.links; track link.path) {
                  <li>
                    <a
                      [routerLink]="link.path"
                      class="text-sm text-surface-400 transition-colors hover:text-surface-100"
                    >
                      {{ link.key | translate }}
                    </a>
                  </li>
                }
              </ul>
            </nav>
          }
        </div>

        <div class="mt-10 flex flex-col items-center justify-between gap-4 border-t border-surface-800/70 pt-6 sm:flex-row">
          <div class="text-center text-sm text-surface-500 sm:text-left">
            <p>© {{ year }} {{ 'app.title' | translate }} · {{ 'footer.rights' | translate }}</p>
            <p class="mt-1">
              {{ 'footer.madeBy' | translate }}
              <a
                [href]="portfolio"
                target="_blank"
                rel="noopener"
                class="font-medium text-surface-300 transition-colors hover:text-primary-300"
              >
                {{ author }}
              </a>
            </p>
          </div>
          <p-select
            [options]="langOptions"
            optionLabel="label"
            optionValue="value"
            [ngModel]="lang.current()"
            (ngModelChange)="setLang($event)"
            size="small"
            [style]="{ minWidth: '9rem' }"
          />
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly lang = inject(LanguageService);
  readonly github = GITHUB_URL;
  readonly author = AUTHOR;
  readonly portfolio = PORTFOLIO_URL;
  readonly year = new Date().getFullYear();

  readonly langOptions = SUPPORTED_LANGUAGES.map((l) => ({
    value: l,
    label: l === 'fr' ? 'Français' : 'English',
  }));

  readonly columns: { title: string; links: FooterLink[] }[] = [
    {
      title: 'footer.columns.product',
      links: [
        { path: '/support/add-bot', key: 'footer.links.addBot' },
        { path: '/login', key: 'footer.links.dashboard' },
        { path: '/support', key: 'footer.links.support' },
      ],
    },
    {
      title: 'footer.columns.help',
      links: [
        { path: '/support/commands', key: 'footer.links.commands' },
        { path: '/support/preferences', key: 'footer.links.preferences' },
        { path: '/support/data', key: 'footer.links.data' },
      ],
    },
    {
      title: 'footer.columns.legal',
      links: [
        { path: '/legal/terms', key: 'footer.links.terms' },
        { path: '/legal/privacy', key: 'footer.links.privacy' },
        { path: '/legal/legal-notice', key: 'footer.links.notice' },
        { path: '/legal/cookies', key: 'footer.links.cookies' },
      ],
    },
  ];

  setLang(l: Language): void {
    this.lang.use(l);
  }
}
