import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** The public landing is for signed-out visitors; send authenticated users to the app. */
export const landingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authenticated = await auth.ensureLoaded();
  return authenticated ? router.createUrlTree(['/dashboard']) : true;
};
