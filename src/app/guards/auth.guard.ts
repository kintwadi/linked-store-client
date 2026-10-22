import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, AuthUser } from '../services/auth.service';

/**
 * True only for store-scoped staff whose role is above RUNNER.
 * Platform (global admin) accounts have no store and can never verify a pickup.
 * Mirrors the backend rule in PickupController#verify.
 */
export function canVerifyPickups(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isGlobalAdmin || user.role === 'GLOBAL_ADMIN') return false;
  if (!user.storeId) return false;
  return (
    user.role === 'OWNER' ||
    user.role === 'STORE_ADMIN' ||
    user.role === 'STORE_REPRESENTATIVE' ||
    user.role === 'CLERK'
  );
}

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const data = route.data as {
    requireGlobalAdmin?: boolean;
    requireStoreAdmin?: boolean;
    requireStoreStaffAboveRunner?: boolean;
  } | undefined;

  if (!authService.isLoggedIn()) {
    if (data?.requireStoreStaffAboveRunner) {
      return router.createUrlTree(['/staff-login'], {
        queryParams: { redirectTo: state.url },
      });
    }
    return router.createUrlTree(['/login']);
  }

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
    // Signed in, but with an account that cannot verify pickups. Send them to
    // the staff login (instead of the landing page) so they can switch to a
    // store team account and still land back on the scanned pickup link.
    if (!canVerifyPickups(user)) {
      return router.createUrlTree(['/staff-login'], {
        queryParams: { redirectTo: state.url },
      });
    }
  }

  return true;
};
