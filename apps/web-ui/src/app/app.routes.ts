import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/guest.guard';
import { adminGuard } from '@core/auth/admin.guard';
import { botAdminGuard } from '@core/auth/bot-admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@pages/login/login.component').then((m) => m.LoginComponent),
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
        path: 'admin/:guildId',
        canActivate: [adminGuard],
        loadComponent: () => import('@pages/admin/admin.component').then((m) => m.AdminComponent),
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
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
