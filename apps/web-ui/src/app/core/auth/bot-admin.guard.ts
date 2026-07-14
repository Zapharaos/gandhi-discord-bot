import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Allow only bot operators (BOT_ADMIN_IDS); everyone else goes home. */
export const botAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authenticated = await auth.ensureLoaded();
  if (!authenticated) return router.createUrlTree(['/login']);

  return auth.me()?.isBotAdmin ? true : router.createUrlTree(['/dashboard']);
};
