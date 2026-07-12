import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Allow only authenticated users; otherwise redirect to the login page. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authenticated = await auth.ensureLoaded();
  return authenticated ? true : router.createUrlTree(['/login']);
};
