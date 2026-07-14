import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppPreset } from '@core/theme/app-preset';
import { DEFAULT_LANGUAGE } from '@core/i18n/language.service';
import { credentialsInterceptor } from '@core/auth/credentials.interceptor';

import { routes } from './app.routes';

registerLocaleData(localeFr);
registerLocaleData(localeEn);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // Required by PrimeNG overlays (p-select panel, etc.) to size/animate correctly.
    provideAnimationsAsync(),
    // credentialsInterceptor sends the session cookie with every request.
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor])),

    providePrimeNG({
      theme: {
        preset: AppPreset,
        options: {
          // Matches the Tailwind dark-mode selector (see tailwind.config.js).
          darkModeSelector: '.dark',
        },
      },
    }),

    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
      fallbackLang: DEFAULT_LANGUAGE,
      lang: DEFAULT_LANGUAGE,
    }),

    MessageService,
  ],
};
