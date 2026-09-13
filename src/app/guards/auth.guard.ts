import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  const data = route.data as { requireGlobalAdmin?: boolean; requireStoreAdmin?: boolean } | undefined;
  const user = authService.currentUser$.getValue();

  if (data?.requireGlobalAdmin) {
    if (!user?.isGlobalAdmin && user?.role !== 'GLOBAL_ADMIN') {
      return router.createUrlTree(['/']);
    }
  }

  if (data?.requireStoreAdmin) {
    const isAdmin =
      user?.isGlobalAdmin ||
      user?.role === 'GLOBAL_ADMIN' ||
      user?.role === 'STORE_ADMIN' ||
      user?.role === 'OWNER';
    if (!isAdmin) {
      return router.createUrlTree(['/']);
    }
  }

  return true;
};
