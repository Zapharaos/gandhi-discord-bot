import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    umami?: {
      track(eventName: string, data?: Record<string, unknown>): void;
      track(callback: (props: Record<string, unknown>) => Record<string, unknown>): void;
    };
  }
}

/**
 * Injecte le script Umami (self-hosted) et expose `track()` / `trackOutbound()`
 * pour les événements custom.
 *
 * No-op si `environment.umami.host` ou `websiteId` sont vides (désactivé en dev).
 * `track()` peut donc être appelé sans condition côté appelant.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private static readonly UTM_KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', 'msclkid', 'twclid',
  ];

  /** À appeler une seule fois (depuis AppComponent, après seo.init()). */
  init(): void {
    if (!this.isBrowser) return;

    const { host, websiteId, hostUrl } = environment.umami;
    if (!host || !websiteId) return;

    const utmData = this.extractAndCleanUtmParams();
    const scriptName = environment.umami.scriptName || 'script.js';

    const script = this.doc.createElement('script');
    script.defer = true;
    script.src = `${host.replace(/\/$/, '')}/${scriptName.replace(/^\//, '')}`;
    script.setAttribute('data-website-id', websiteId);
    script.setAttribute('data-auto-track', 'false');
    if (hostUrl) {
      script.setAttribute('data-host-url', hostUrl.replace(/\/$/, ''));
    }

    script.onload = () => {
      const w = this.doc.defaultView as Window & typeof globalThis;
      const cleanUrl = w.location.pathname + w.location.search + w.location.hash;
      w.umami?.track((props) => ({ ...props, url: cleanUrl, ...utmData }));
    };

    this.doc.head.appendChild(script);

    // Pageviews sur chaque navigation SPA.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects ?? (e as NavigationEnd).url;
        this.doc.defaultView?.umami?.track((props) => ({ ...props, url }));
      });
  }

  private extractAndCleanUtmParams(): Record<string, string> {
    const w = this.doc.defaultView as Window & typeof globalThis;
    const url = new URL(w.location.href);
    const utmData: Record<string, string> = {};

    for (const key of AnalyticsService.UTM_KEYS) {
      const value = url.searchParams.get(key);
      if (value) {
        utmData[key] = value;
        url.searchParams.delete(key);
      }
    }

    if (Object.keys(utmData).length > 0) {
      w.history.replaceState({}, '', url.toString());
    }

    return utmData;
  }

  /** Enregistre un événement custom. No-op tant que le script Umami n'est pas chargé. */
  track(eventName: string, data?: Record<string, unknown>): void {
    if (!this.isBrowser) return;
    this.doc.defaultView?.umami?.track(eventName, data);
  }

  /** Enregistre un clic sortant (bouton "Add to Discord", liens externes, etc.). */
  trackOutbound(url: string | null | undefined, context: string): void {
    if (!url) return;
    this.track('outbound', { url, context });
  }
}
