import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Allow only unauthenticated users (e.g. the login page); else go to the app. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authenticated = await auth.ensureLoaded();
  return authenticated ? router.createUrlTree(['/dashboard']) : true;
};
