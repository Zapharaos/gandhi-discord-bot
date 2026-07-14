import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Métadonnées SEO portées par la `data` d'une route.
 *
 * Exemple : `data: { seo: { titleKey: 'seo.legal.privacy.title', descKey: 'seo.legal.privacy.desc', index: true } }`
 *
 * - `index: true` → la page est indexable (sinon `noindex, nofollow` par défaut).
 * - `image`       → image OG/Twitter spécifique (chemin relatif, ex. `assets/images/og-terms.png`).
 */
export interface SeoData {
  titleKey?: string;
  descKey?: string;
  index?: boolean;
  image?: string;
}

const SITE_NAME = 'Gandhi Bot';
const DEFAULT_OG_IMAGE = 'og-image.png';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly doc = inject(DOCUMENT);

  private readonly baseUrl = environment.siteUrl.replace(/\/$/, '');

  /** À appeler une seule fois (depuis AppComponent). S'abonne aux fins de navigation. */
  init(): void {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects ?? (e as NavigationEnd).url ?? '/';
        this.apply(this.deepestSeo(), url);
      });

    // Ré-applique les meta à chaque changement de langue (fichier i18n chargé asynchronement).
    this.translate.onLangChange.subscribe(() => {
      this.apply(this.deepestSeo(), this.router.url);
    });

    // La navigation initiale peut s'être terminée avant cet abonnement.
    if (this.router.navigated) {
      this.apply(this.deepestSeo(), this.router.url);
    }
  }

  private deepestSeo(): SeoData {
    let route: ActivatedRoute | null = this.activatedRoute.firstChild;
    while (route?.firstChild) route = route.firstChild;
    return (route?.snapshot.data?.['seo'] as SeoData) ?? {};
  }

  private apply(seo: SeoData, url: string): void {
    const path = url.split('#')[0].split('?')[0];
    const canonical = this.baseUrl ? `${this.baseUrl}${path === '/' ? '' : path}` : '';
    const image = this.absolute(seo.image ?? DEFAULT_OG_IMAGE);
    const isIndexable = seo.index === true;

    this.meta.updateTag({
      name: 'robots',
      content: isIndexable ? 'index, follow' : 'noindex, nofollow',
    });

    if (canonical) {
      this.setCanonical(canonical);
    }

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    if (canonical) {
      this.meta.updateTag({ property: 'og:url', content: canonical });
    }
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:alt', content: `${SITE_NAME}` });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    const titleKey = seo.titleKey ?? 'seo.default.title';
    const descKey = seo.descKey ?? 'seo.default.desc';

    if (this.translate.instant(titleKey) !== titleKey) {
      this.applyTitles(
        this.translate.instant(titleKey),
        this.translate.instant(descKey),
        titleKey,
        descKey,
      );
      return;
    }

    forkJoin({
      title: this.translate.get(titleKey),
      desc: this.translate.get(descKey),
    }).subscribe(({ title, desc }) => {
      this.applyTitles(title, desc, titleKey, descKey);
    });
  }

  private applyTitles(title: string, desc: string, titleKey: string, descKey: string): void {
    const pageTitle = title && title !== titleKey ? title : SITE_NAME;
    const description = desc && desc !== descKey ? desc : '';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }

  private setCanonical(href: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private absolute(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    if (!this.baseUrl) return path;
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }
}
