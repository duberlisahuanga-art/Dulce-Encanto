import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { CsrfService } from './csrf.service';
import { AuthService } from './auth.service';
import { API_URL } from '../config/api-url';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function applyMutationHeaders(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  const setHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    setHeaders['X-XSRF-TOKEN'] = token;
  }
  return req.clone({
    withCredentials: true,
    setHeaders,
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // If the request is not to our backend API, pass through
  const isApi = req.url.startsWith('/api/') ||
    req.url.startsWith('/sanctum/') ||
    (API_URL && req.url.startsWith(API_URL));

  if (!isApi) {
    return next(req);
  }

  const csrf = inject(CsrfService);
  const injector = inject(Injector);
  const method = req.method.toUpperCase();
  const isMutation = MUTATION_METHODS.has(method);

  if (!isMutation) {
    const cloned = req.clone({
      withCredentials: true,
      setHeaders: {
        Accept: 'application/json',
      },
    });
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/api/v1/auth/me')) {
          const auth = injector.get(AuthService);
          auth.clearLocalSession();
        }
        return throwError(() => error);
      }),
    );
  }

  return csrf.ensureCsrf().pipe(
    switchMap(() => {
      const token = csrf.getToken();
      const cloned = applyMutationHeaders(req, token);

      return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          // If CSRF token is expired or mismatched (419), refresh cookie and retry once
          if (error.status === 419) {
            return csrf.refresh().pipe(
              switchMap(() => {
                const refreshedToken = csrf.getToken();
                return next(applyMutationHeaders(req, refreshedToken));
              }),
            );
          }

          if (error.status === 401 && !req.url.includes('/api/v1/auth/login')) {
            const auth = injector.get(AuthService);
            auth.clearLocalSession();
          }

          return throwError(() => error);
        }),
      );
    }),
  );
};
