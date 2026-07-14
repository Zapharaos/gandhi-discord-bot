import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { WsService } from '@core/ws/ws.service';
import { SeoService } from '@core/services/seo.service';
import { AnalyticsService } from '@core/services/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly ws = inject(WsService);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);

  ngOnInit(): void {
    this.language.init();
    this.seo.init();
    this.analytics.init();
    // Single long-lived WS connection for the whole app (survives navigation).
    this.ws.connect();
  }
}
