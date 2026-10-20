import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    if ((route.data as { requireStoreStaffAboveRunner?: boolean } | undefined)?.requireStoreStaffAboveRunner) {
      return router.createUrlTree(['/staff-login'], {
        queryParams: { redirectTo: state.url },
      });
    }
    return router.createUrlTree(['/login']);
  }

  const data = route.data as {
    requireGlobalAdmin?: boolean;
    requireStoreAdmin?: boolean;
    requireStoreStaffAboveRunner?: boolean;
  } | undefined;
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
      user?.role === 'OWNER' ||
      user?.role === 'STORE_ADMIN' ||
      user?.role === 'STORE_REPRESENTATIVE' ||
      user?.role === 'CLERK' ||
      user?.role === 'RUNNER';
    if (!isAdmin) {
      return router.createUrlTree(['/']);
    }
  }

  if (data?.requireStoreStaffAboveRunner) {
    const allowed =
      !!user &&
      !user.isGlobalAdmin &&
      !!user.storeId &&
      user.role !== 'RUNNER';
    if (!allowed) {
      return router.createUrlTree(['/']);
    }
  }

  return true;
};
