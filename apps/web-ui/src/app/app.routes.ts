import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/guest.guard';
import { landingGuard } from '@core/auth/landing.guard';
import { botAdminGuard } from '@core/auth/bot-admin.guard';
import { environment } from '../environments/environment';

export const routes: Routes = [
  {
    // Public marketing landing. Signed-in users are bounced to the dashboard.
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    data: { seo: { titleKey: 'seo.landing.title', descKey: 'seo.landing.desc', index: true } },
    loadComponent: () => import('@pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    data: { seo: { titleKey: 'seo.login.title', descKey: 'seo.login.desc' } },
    loadComponent: () => import('@pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    // Public legal pages (terms, privacy, legal notice, cookies).
    path: 'legal',
    loadComponent: () => import('@pages/legal/legal-layout.component').then((m) => m.LegalLayoutComponent),
    children: [
      { path: 'terms', data: { seo: { titleKey: 'seo.legal.terms.title', descKey: 'seo.legal.terms.desc', index: true } }, loadComponent: () => import('@pages/legal/terms.component').then((m) => m.TermsComponent) },
      { path: 'privacy', data: { seo: { titleKey: 'seo.legal.privacy.title', descKey: 'seo.legal.privacy.desc', index: true } }, loadComponent: () => import('@pages/legal/privacy.component').then((m) => m.PrivacyComponent) },
      { path: 'legal-notice', data: { seo: { titleKey: 'seo.legal.notice.title', descKey: 'seo.legal.notice.desc', index: true } }, loadComponent: () => import('@pages/legal/legal-notice.component').then((m) => m.LegalNoticeComponent) },
      { path: 'cookies', data: { seo: { titleKey: 'seo.legal.cookies.title', descKey: 'seo.legal.cookies.desc', index: true } }, loadComponent: () => import('@pages/legal/cookies.component').then((m) => m.CookiesComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'privacy' },
    ],
  },
  {
    // Public support section (opened from the sidebar; sub-pages for each topic).
    path: 'support',
    loadComponent: () => import('@pages/support/support-layout.component').then((m) => m.SupportLayoutComponent),
    children: [
      { path: '', data: { seo: { titleKey: 'seo.support.hub.title', descKey: 'seo.support.hub.desc', index: true } }, loadComponent: () => import('@pages/support/support-hub.component').then((m) => m.SupportHubComponent) },
      { path: 'add-bot', data: { seo: { titleKey: 'seo.support.addBot.title', descKey: 'seo.support.addBot.desc', index: true } }, loadComponent: () => import('@pages/support/add-bot.component').then((m) => m.AddBotComponent) },
      { path: 'commands', data: { seo: { titleKey: 'seo.support.commands.title', descKey: 'seo.support.commands.desc', index: true } }, loadComponent: () => import('@pages/support/commands.component').then((m) => m.CommandsComponent) },
      { path: 'preferences', data: { seo: { titleKey: 'seo.support.preferences.title', descKey: 'seo.support.preferences.desc', index: true } }, loadComponent: () => import('@pages/support/preferences.component').then((m) => m.PreferencesComponent) },
      { path: 'data', data: { seo: { titleKey: 'seo.support.data.title', descKey: 'seo.support.data.desc', index: true } }, loadComponent: () => import('@pages/support/data.component').then((m) => m.DataComponent) },
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
      {
        path: 'bot-admin/health',
        canActivate: [botAdminGuard],
        loadComponent: () => import('@pages/bot-admin/bot-health.component').then((m) => m.BotHealthComponent),
      },
    ],
  },
  ...(environment.production ? [] : [{
    path: 'og',
    loadComponent: () => import('@pages/og/og.component').then((m) => m.OgComponent),
  }]),
  { path: '**', redirectTo: '' },
];
