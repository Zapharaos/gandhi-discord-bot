import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ShellChromeComponent } from '../shell/shell-chrome.component';
import { PublicHeaderComponent } from '@shared/public-header/public-header.component';
import { FooterComponent } from '@shared/footer/footer.component';

// Legal pages are public, but signed-in users keep the full app chrome (like
// the support section). We resolve auth first, then pick the layout.
@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [RouterOutlet, ShellChromeComponent, PublicHeaderComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (authed() === true) {
      <app-shell-chrome><router-outlet /></app-shell-chrome>
    } @else if (authed() === false) {
      <div class="flex min-h-screen flex-col bg-surface-950 text-surface-200">
        <app-public-header />
        <main class="relative flex-1 overflow-hidden">
          <div class="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl"></div>
          <div class="relative mx-auto w-full max-w-4xl px-4 py-12">
            <router-outlet />
          </div>
        </main>
        <app-footer />
      </div>
    }
  `,
})
export class LegalLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly authed = signal<boolean | null>(this.auth.isAuthenticated ? true : null);

  ngOnInit(): void {
    void this.auth.ensureLoaded().then((v) => this.authed.set(v));
  }
}
