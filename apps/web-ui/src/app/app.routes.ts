import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/guest.guard';
import { adminGuard } from '@core/auth/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@pages/login/login.component').then((m) => m.LoginComponent),
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
        path: 'server/:guildId',
        loadComponent: () =>
          import('@pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'admin/:guildId',
        canActivate: [adminGuard],
        loadComponent: () => import('@pages/admin/admin.component').then((m) => m.AdminComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
