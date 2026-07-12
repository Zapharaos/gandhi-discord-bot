import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'gandhi.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  readonly current = signal<Language>(DEFAULT_LANGUAGE);

  /** Resolve the initial language from storage or the browser, then apply it. */
  init(): void {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    const browser = this.translate.getBrowserLang();
    const initial = this.normalize(stored ?? browser);
    this.use(initial);
  }

  use(lang: Language): void {
    this.translate.use(lang);
    this.current.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  private normalize(lang: string | null | undefined): Language {
    return SUPPORTED_LANGUAGES.includes(lang as Language) ? (lang as Language) : DEFAULT_LANGUAGE;
  }
}
