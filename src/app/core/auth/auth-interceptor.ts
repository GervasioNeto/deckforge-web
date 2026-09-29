import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from './auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const token = auth.accessToken();

  if (!token || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const authorizedReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      // A 401 on an authenticated request means the session could not be refreshed.
      if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
        const returnUrl = router.url;
        // signOut() clears the local session even if it rejects, so always redirect.
        void auth
          .signOut()
          .catch(() => undefined)
          .then(() =>
            router.navigate(['/login'], { queryParams: { returnUrl, reason: 'expired' } }),
          );
      }
      return throwError(() => error);
    }),
  );
};
