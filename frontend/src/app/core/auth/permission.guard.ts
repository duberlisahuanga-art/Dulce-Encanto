import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export function permissionGuard(permission: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const hasPermission = () => auth.user()?.permissions.includes(permission) ?? false;

    if (auth.authenticated()) {
      return hasPermission() || router.createUrlTree(['/cuenta']);
    }

    return auth
      .loadCurrentUser()
      .pipe(map(() => hasPermission() || router.createUrlTree(['/ingresar'])));
  };
}
