import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { PublicHeaderComponent } from '@shared/public-header/public-header.component';
import { FooterComponent } from '@shared/footer/footer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, TranslatePipe, PublicHeaderComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col bg-surface-950 text-surface-200">
      <app-public-header [showNav]="false" cta="home" />

      <main class="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <!-- Ambient background, echoing the landing hero -->
        <div class="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-500/20 blur-3xl"></div>
        <div class="pointer-events-none absolute inset-0 bg-dot-grid bg-[length:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>

        <div
          class="relative w-full max-w-sm rounded-3xl border border-surface-800 bg-surface-900/80 p-8 text-center shadow-2xl backdrop-blur"
        >
          <img
            src="assets/images/logo.png"
            alt="Gandhi"
            class="mx-auto mb-6 h-20 w-20 rounded-2xl shadow-lg"
          />
          <h1 class="mb-2 text-2xl font-bold text-surface-0">{{ 'login.title' | translate }}</h1>
          <p class="mb-8 text-sm text-surface-400">{{ 'login.subtitle' | translate }}</p>
          <button
            type="button"
            (click)="login()"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/40"
          >
            <i class="pi pi-discord"></i>{{ 'login.button' | translate }}
          </button>
          <p class="mt-6 text-xs leading-relaxed text-surface-500">
            {{ 'login.legalPrefix' | translate }}
            <a routerLink="/legal/terms" class="text-surface-400 underline hover:text-surface-200">{{ 'login.legalTerms' | translate }}</a>
            {{ 'login.legalAnd' | translate }}
            <a routerLink="/legal/privacy" class="text-surface-400 underline hover:text-surface-200">{{ 'login.legalPrivacy' | translate }}</a>.
          </p>
        </div>
      </main>

      <app-footer />
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  login(): void {
    this.auth.login();
  }
}
