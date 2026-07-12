import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  private readonly language = inject(LanguageService);

  ngOnInit(): void {
    this.language.init();
  }
}
