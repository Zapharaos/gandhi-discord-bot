import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { FooterComponent } from '@shared/footer/footer.component';
import { PublicHeaderComponent } from '@shared/public-header/public-header.component';
import { HeroComponent } from './sections/hero.component';
import { FeaturesComponent } from './sections/features.component';
import { HeatmapDemoComponent } from './sections/heatmap-demo.component';
import { CommandsComponent } from './sections/commands.component';
import { PrivacyComponent } from './sections/privacy.component';
import { CtaComponent } from './sections/cta.component';

// Public marketing landing. Fetches the Discord invite URL once and shares it
// with the hero and closing CTA.
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    PublicHeaderComponent,
    HeroComponent,
    FeaturesComponent,
    HeatmapDemoComponent,
    CommandsComponent,
    PrivacyComponent,
    CtaComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-surface-950 text-surface-200">
      <app-public-header />
      <main>
        <app-landing-hero [inviteUrl]="inviteUrl()" />
        <app-landing-features />
        <app-landing-heatmap-demo />
        <app-landing-commands />
        <app-landing-privacy />
        <app-landing-cta [inviteUrl]="inviteUrl()" />
      </main>
      <app-footer />
    </div>
  `,
})
export class LandingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  readonly inviteUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.translate.get('landing.meta.title').subscribe((t) => this.title.setTitle(t));
    this.api.config().subscribe({
      next: (c) => this.inviteUrl.set(c.botInviteUrl),
      error: () => this.inviteUrl.set(null),
    });
  }
}
