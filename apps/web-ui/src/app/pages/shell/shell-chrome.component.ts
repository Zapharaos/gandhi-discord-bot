import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { ServiceStatus } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { VisibilityService } from '@core/visibility/visibility.service';

interface ServerLink {
  id: string;
  name: string;
  icon: string | null;
  isAdmin: boolean;
}

// The authenticated app chrome: sidebar + mobile topbar/drawer, with the page
// content projected via <ng-content>. Reused by the main shell and by the
// support section (so signed-in users keep the sidebar there too).
@Component({
  selector: 'app-shell-chrome',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen bg-surface-950 text-surface-200">
      <aside
        class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-surface-800 bg-surface-900/50 md:flex"
      >
        <ng-container [ngTemplateOutlet]="sidebar" />
      </aside>

      @if (mobileOpen()) {
        <div class="fixed inset-0 z-40 md:hidden">
          <div class="absolute inset-0 bg-black/60" (click)="mobileOpen.set(false)"></div>
          <aside
            class="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r border-surface-800 bg-surface-900 shadow-xl"
          >
            <ng-container [ngTemplateOutlet]="sidebar" />
          </aside>
        </div>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-surface-800 bg-surface-950/90 px-4 backdrop-blur md:hidden"
        >
          <button type="button" class="text-surface-300" (click)="mobileOpen.set(true)" aria-label="Menu">
            <i class="pi pi-bars text-lg"></i>
          </button>
          <img src="assets/images/logo.png" alt="" class="h-7 w-7 rounded" />
          <span class="truncate font-semibold">{{ 'app.title' | translate }}</span>
          @if (avatarUrl(); as url) {
            <a routerLink="/profile" class="ml-auto"><img [src]="url" alt="" class="h-7 w-7 rounded-full object-cover" /></a>
          }
        </header>

        <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 md:py-10">
          <ng-content />
        </main>
      </div>
    </div>

    <ng-template #sidebar>
      <!-- Fixed: logo -->
      <div class="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <img src="assets/images/logo.png" alt="" class="h-8 w-8 rounded-lg object-contain" />
        <span class="font-semibold tracking-tight">{{ 'app.title' | translate }}</span>
      </div>

      <!-- Fixed: primary views -->
      <div class="mt-3 flex shrink-0 flex-col gap-1 px-3">
        <a
          [routerLink]="['/dashboard']"
          routerLinkActive="!bg-primary-500/15 !text-primary-400 font-medium [&_i]:!text-primary-400"
          class="group flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-surface-300 transition-colors hover:bg-surface-800/60 hover:text-surface-100"
        >
          <i class="pi pi-objects-column w-5 text-center text-primary-400 transition-transform group-hover:scale-110"></i>
          <span class="flex-1">{{ 'nav.stats' | translate }}</span>
          @if (liveActive()) {
            <span class="relative flex h-2 w-2" [title]="'dashboard.live' | translate">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
          }
        </a>
      </div>

      <!-- Fixed: servers header + add button -->
      <div class="flex shrink-0 items-center justify-between px-4 pb-1.5 pt-5">
        <span class="px-1 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
          {{ 'nav.servers' | translate }}
        </span>
        <a
          href="/support/add-bot"
          target="_blank"
          rel="noopener"
          class="text-surface-500 transition-colors hover:text-surface-300"
          [title]="'nav.addServer' | translate"
        >
          <i class="pi pi-plus text-[11px]"></i>
        </a>
      </div>

      <!-- Scrollable: only the server list scrolls -->
      <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-1">
        @for (s of servers(); track s.id) {
          <a
            [routerLink]="['/server', s.id]"
            routerLinkActive="!bg-primary-500/15 !text-primary-400 font-medium"
            class="flex h-10 min-w-0 items-center gap-3 rounded-lg px-3 text-sm text-surface-400 transition-colors hover:bg-surface-800/60 hover:text-surface-100"
          >
            @if (s.icon) {
              <img [src]="s.icon" alt="" class="h-5 w-5 shrink-0 rounded-full object-cover" />
            } @else {
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-700 text-[0.65rem] uppercase text-surface-300">{{ s.name.charAt(0) }}</span>
            }
            <span class="min-w-0 flex-1 truncate">{{ s.name }}</span>
            @if (s.isAdmin) {
              <i class="pi pi-shield-fill shrink-0 text-[11px] text-surface-600" [title]="'admin.badge' | translate"></i>
            }
            @if (isLive(s.id)) {
              <span class="relative flex h-2 w-2 shrink-0" [title]="'dashboard.live' | translate">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
            }
          </a>
        }
      </nav>

      <!-- Fixed: app nav (standard items) -->
      <div class="flex shrink-0 flex-col gap-1 px-3 pt-2">
        <a
          routerLink="/support"
          routerLinkActive="!bg-primary-500/15 !text-primary-400 font-medium"
          class="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-surface-400 transition-colors hover:bg-surface-800/60 hover:text-surface-100"
        >
          <i class="pi pi-question-circle w-5 text-center"></i>
          <span>{{ 'support.nav' | translate }}</span>
        </a>
        @if (isBotAdmin()) {
          <a
            routerLink="/bot-admin"
            routerLinkActive="!bg-primary-500/15 !text-primary-400 font-medium"
            class="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-surface-400 transition-colors hover:bg-surface-800/60 hover:text-surface-100"
          >
            <i class="pi pi-cog w-5 text-center"></i>
            <span>{{ 'botAdmin.nav' | translate }}</span>
          </a>
        }

        <!-- Bot health, tucked under the admin/support nav. Full details for operators only. -->
        @if (status(); as st) {
          @if (isBotAdmin()) {
            <div class="mt-1 rounded-xl border border-surface-800 bg-surface-800/30 p-3">
              <div class="flex items-center gap-2">
                <span class="relative flex h-2.5 w-2.5">
                  @if (st.bot.online) {
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  }
                  <span class="relative inline-flex h-2.5 w-2.5 rounded-full" [class.bg-green-500]="st.bot.online" [class.bg-red-500]="!st.bot.online"></span>
                </span>
                <span class="text-sm font-medium text-surface-100">{{ (st.bot.online ? 'health.online' : 'health.offline') | translate }}</span>
                @if (st.bot.online && st.bot.wsPing != null) {
                  <span class="ml-auto text-[10px] font-medium uppercase tracking-wide text-surface-500">{{ st.bot.wsPing }} ms</span>
                }
              </div>
              <div class="mt-2 flex flex-col gap-1 text-[11px] text-surface-500">
                @if (st.bot.online) {
                  <span class="flex items-center gap-1.5"><i class="pi pi-server text-[10px]"></i>{{ st.bot.guildCount }} {{ 'health.servers' | translate }}</span>
                  <span class="flex items-center gap-1.5"><i class="pi pi-clock text-[10px]"></i>{{ 'health.uptime' | translate }} {{ uptimeLabel(st) }}</span>
                }
                <span class="flex items-center gap-1.5"><i class="pi pi-history text-[10px]"></i>{{ 'health.lastSeen' | translate }} {{ lastSeenLabel(st) }}</span>
              </div>
            </div>
          } @else {
            <div class="mt-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs" [title]="botTooltip(st)">
              <span class="relative flex h-2 w-2">
                @if (st.bot.online) {
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                }
                <span class="relative inline-flex h-2 w-2 rounded-full" [class.bg-green-500]="st.bot.online" [class.bg-red-500]="!st.bot.online"></span>
              </span>
              <span class="text-surface-400">{{ (st.bot.online ? 'health.online' : 'health.offline') | translate }}</span>
              @if (st.bot.online && st.bot.wsPing != null) {
                <span class="ml-auto text-[10px] text-surface-600">{{ st.bot.wsPing }} ms</span>
              }
            </div>
          }
        }
      </div>

      <!-- Fixed footer: the user -->
      <div class="mt-2 flex shrink-0 items-center border-t border-surface-800 p-2">
        <a
          routerLink="/profile"
          routerLinkActive="bg-surface-800/60"
          class="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 hover:bg-surface-800/60"
        >
          @if (avatarUrl(); as url) {
            <img [src]="url" alt="" class="h-8 w-8 rounded-full object-cover" />
          } @else {
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-700"><i class="pi pi-user"></i></span>
          }
          <span class="min-w-0 flex-1 truncate text-sm font-medium text-surface-200">{{ userName() }}</span>
          <i class="pi pi-angle-right text-surface-500"></i>
        </a>
      </div>
    </ng-template>
  `,
})
export class ShellChromeComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly visibility = inject(VisibilityService);

  readonly mobileOpen = signal(false);

  readonly status = toSignal(
    this.visibility.pollTimer(20000).pipe(switchMap(() => this.api.status().pipe(catchError(() => of(null))))),
    { initialValue: null },
  );

  // Current voice session: whether the user is live, and in which guilds — drives
  // the pulse dots next to the Dashboard item and any server they're active in.
  readonly session = toSignal(
    this.visibility.pollTimer(20000).pipe(
      switchMap(() =>
        this.api.sessionStats().pipe(
          map((r) => ({ active: r.active, guildIds: r.guildIds })),
          catchError(() => of({ active: false, guildIds: [] as string[] })),
        ),
      ),
    ),
    { initialValue: { active: false, guildIds: [] as string[] } },
  );
  readonly liveActive = computed(() => this.session().active);

  readonly servers = computed<ServerLink[]>(() =>
    (this.auth.me()?.guilds ?? []).map((g) => ({
      id: g.id,
      name: g.name ?? g.id,
      icon: g.icon,
      isAdmin: g.isAdmin,
    })),
  );

  readonly isBotAdmin = computed(() => this.auth.me()?.isBotAdmin ?? false);

  isLive(guildId: string): boolean {
    return this.session().guildIds.includes(guildId);
  }

  readonly userName = computed(() => {
    const u = this.auth.me()?.user;
    return u?.globalName ?? u?.username ?? '';
  });

  readonly avatarUrl = computed(() => {
    const u = this.auth.me()?.user;
    return u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null;
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.mobileOpen.set(false));
  }

  lastSeenLabel(st: ServiceStatus): string {
    return st.bot.lastSeen == null ? '—' : this.relativeTime(st.bot.lastSeen);
  }

  uptimeLabel(st: ServiceStatus): string {
    return st.bot.uptimeMs == null ? '—' : this.compactDuration(st.bot.uptimeMs);
  }

  botTooltip(st: ServiceStatus): string {
    if (!st.db) return 'Database unreachable';
    const parts: string[] = [];
    parts.push(st.bot.online ? 'Online' : 'Offline');
    parts.push(`${st.bot.guildCount} servers`);
    if (st.bot.wsPing != null) parts.push(`${st.bot.wsPing} ms`);
    if (st.bot.uptimeMs != null) parts.push(`up ${this.compactDuration(st.bot.uptimeMs)}`);
    if (st.bot.lastSeen != null) parts.push(`seen ${this.relativeTime(st.bot.lastSeen)}`);
    return parts.join(' · ');
  }

  private relativeTime(ts: number): string {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  private compactDuration(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000);
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
