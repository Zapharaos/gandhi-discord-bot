import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { WsService } from '@core/ws/ws.service';

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

  ngOnInit(): void {
    this.language.init();
    // Single long-lived WS connection for the whole app (survives navigation).
    this.ws.connect();
  }
}
