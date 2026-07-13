import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/guest.guard';
import { landingGuard } from '@core/auth/landing.guard';
import { botAdminGuard } from '@core/auth/bot-admin.guard';

export const routes: Routes = [
  {
    // Public marketing landing. Signed-in users are bounced to the dashboard.
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    loadComponent: () => import('@pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    // Public legal pages (terms, privacy, legal notice, cookies).
    path: 'legal',
    loadComponent: () => import('@pages/legal/legal-layout.component').then((m) => m.LegalLayoutComponent),
    children: [
      { path: 'terms', loadComponent: () => import('@pages/legal/terms.component').then((m) => m.TermsComponent) },
      { path: 'privacy', loadComponent: () => import('@pages/legal/privacy.component').then((m) => m.PrivacyComponent) },
      { path: 'legal-notice', loadComponent: () => import('@pages/legal/legal-notice.component').then((m) => m.LegalNoticeComponent) },
      { path: 'cookies', loadComponent: () => import('@pages/legal/cookies.component').then((m) => m.CookiesComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'privacy' },
    ],
  },
  {
    // Public support section (opened from the sidebar; sub-pages for each topic).
    path: 'support',
    loadComponent: () => import('@pages/support/support-layout.component').then((m) => m.SupportLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('@pages/support/support-hub.component').then((m) => m.SupportHubComponent) },
      { path: 'add-bot', loadComponent: () => import('@pages/support/add-bot.component').then((m) => m.AddBotComponent) },
      { path: 'commands', loadComponent: () => import('@pages/support/commands.component').then((m) => m.CommandsComponent) },
      { path: 'preferences', loadComponent: () => import('@pages/support/preferences.component').then((m) => m.PreferencesComponent) },
      { path: 'data', loadComponent: () => import('@pages/support/data.component').then((m) => m.DataComponent) },
    ],
  },
  {
    // Authenticated shell hosting the user dashboard.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@pages/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'session',
        data: { mode: 'session' },
        loadComponent: () =>
          import('@pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'server/:guildId',
        loadComponent: () =>
          import('@pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('@pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'bot-admin',
        canActivate: [botAdminGuard],
        loadComponent: () => import('@pages/bot-admin/bot-admin.component').then((m) => m.BotAdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
