import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';

interface PrefItem {
  key: string;
  command: string | null;
}

@Component({
  selector: 'app-support-preferences',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/support" class="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100">
      <i class="pi pi-angle-left text-xs"></i>{{ 'support.back' | translate }}
    </a>
    <h1 class="text-2xl font-bold text-surface-0">{{ 'support.prefs.title' | translate }}</h1>
    <p class="mt-2 text-surface-400">{{ 'support.prefs.intro' | translate }}</p>

    <div class="mt-8 flex flex-col gap-4">
      @for (item of items; track item.key) {
        <div class="rounded-2xl border border-surface-800 bg-surface-900 p-4">
          <h2 class="font-semibold text-surface-100">{{ 'support.prefs.' + item.key + '.title' | translate }}</h2>
          <p class="mt-1 text-sm text-surface-400">{{ 'support.prefs.' + item.key + '.body' | translate }}</p>
          @if (item.command) {
            <div class="mt-2.5 flex items-center gap-2 text-xs text-surface-500">
              <span>{{ 'support.prefs.viaCommand' | translate }}</span>
              <code class="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-primary-300">{{ item.command }}</code>
            </div>
          }
        </div>
      }
    </div>

    <div class="mt-6 rounded-2xl border border-primary-500/30 bg-primary-500/10 p-4 text-sm text-surface-200">
      <i class="pi pi-info-circle mr-1.5 text-primary-400"></i>
      {{ 'support.prefs.manage' | translate }}
      <a [routerLink]="profileTarget()" class="font-medium text-primary-300 hover:underline">
        {{ (authed() ? 'support.prefs.profileLink' : 'support.prefs.signInLink') | translate }}</a
      >.
    </div>
  `,
})
export class PreferencesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly authed = signal<boolean>(this.auth.isAuthenticated);

  readonly items: PrefItem[] = [
    { key: 'stats', command: '/user-settings' },
    { key: 'logs', command: '/user-settings' },
    { key: 'private', command: '/user-settings' },
    { key: 'consent', command: null },
  ];

  ngOnInit(): void {
    void this.auth.ensureLoaded().then((v) => this.authed.set(v));
  }

  profileTarget(): string {
    return this.authed() ? '/profile' : '/login';
  }
}
