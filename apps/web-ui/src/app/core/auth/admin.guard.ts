import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Allow only users who administer the `:guildId` in the route; else go home. */
export const adminGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authenticated = await auth.ensureLoaded();
  if (!authenticated) return router.createUrlTree(['/login']);

  const guildId = route.paramMap.get('guildId');
  const guild = auth.me()?.guilds.find((g) => g.id === guildId);
  return guild?.isAdmin ? true : router.createUrlTree(['/dashboard']);
};
