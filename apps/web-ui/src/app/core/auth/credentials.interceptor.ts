import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Send the session cookie with every API request. Needed when the SPA is served
 * from a different origin than the API (a split deployment); harmless same-origin.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
