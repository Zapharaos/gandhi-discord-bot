import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-950 p-4">
      <!-- Ambient background glow -->
      <div class="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-500/20 blur-3xl"></div>

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
        <p-button
          styleClass="w-full justify-center"
          icon="pi pi-discord"
          [label]="'login.button' | translate"
          (onClick)="login()"
        />
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  login(): void {
    this.auth.login();
  }
}
