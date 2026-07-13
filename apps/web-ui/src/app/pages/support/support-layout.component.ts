import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { ShellChromeComponent } from '../shell/shell-chrome.component';

// Support is public, but signed-in users keep the full app chrome (sidebar).
// We resolve auth first, then pick the layout.
@Component({
  selector: 'app-support-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, TranslatePipe, ShellChromeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (authed() === true) {
      <app-shell-chrome><router-outlet /></app-shell-chrome>
    } @else if (authed() === false) {
      <div class="min-h-screen bg-surface-950 text-surface-200">
        <header class="border-b border-surface-800">
          <div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
            <a routerLink="/support" class="flex items-center gap-2.5">
              <img src="assets/images/logo.png" alt="" class="h-8 w-8 rounded-lg" />
              <span class="font-semibold text-surface-0">{{ 'app.title' | translate }}</span>
            </a>
            <a routerLink="/login" class="ml-auto text-sm text-surface-400 transition-colors hover:text-surface-100">
              {{ 'support.signIn' | translate }}
            </a>
          </div>
        </header>
        <main class="mx-auto max-w-3xl px-4 py-8">
          <router-outlet />
        </main>
      </div>
    }
  `,
})
export class SupportLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  // Start optimistic if we already know the user is signed in, to avoid a flash.
  readonly authed = signal<boolean | null>(this.auth.isAuthenticated ? true : null);

  ngOnInit(): void {
    void this.auth.ensureLoaded().then((v) => this.authed.set(v));
  }
}
