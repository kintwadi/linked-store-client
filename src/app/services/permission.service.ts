import { Injectable } from '@angular/core';
import { AuthService, AuthUser } from './auth.service';

type RoleName =
  | 'GLOBAL_ADMIN'
  | 'OWNER'
  | 'STORE_ADMIN'
  | 'STORE_REPRESENTATIVE'
  | 'CLERK'
  | 'RUNNER';

const ADMIN_PLUS_ROLES: RoleName[] = ['GLOBAL_ADMIN', 'OWNER', 'STORE_ADMIN'];
const OWNER_OR_GLOBAL: RoleName[] = ['GLOBAL_ADMIN', 'OWNER'];
const QR_ALLOWED_ANY: RoleName[] = [
  'GLOBAL_ADMIN',
  'OWNER',
  'STORE_ADMIN',
  'STORE_REPRESENTATIVE',
  'CLERK',
  'RUNNER',
];

@Injectable({ providedIn: 'root' })
export class PermissionService {
  constructor(private readonly authService: AuthService) {}

  private get user(): AuthUser | null {
    return this.authService.currentUser$.getValue();
  }

  private isRole(user: AuthUser, ...roles: RoleName[]): boolean {
    if (user.isGlobalAdmin || user.role === 'GLOBAL_ADMIN') {
      return roles.includes('GLOBAL_ADMIN');
    }
    return roles.includes(user.role as RoleName);
  }

  private isOwnStore(storeId: string): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    return !!u.storeId && u.storeId === storeId;
  }

  canEditProduct(product: { storeId: string }): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    if (!product?.storeId) return false;
    if (this.isOwnStore(product.storeId)) {
      return ADMIN_PLUS_ROLES.includes(u.role as RoleName) ||
        u.role === 'STORE_REPRESENTATIVE';
    }
    return false;
  }

  canDeleteProduct(product: { storeId: string }): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    if (!product?.storeId) return false;
    if (this.isOwnStore(product.storeId)) {
      return ADMIN_PLUS_ROLES.includes(u.role as RoleName) ||
        u.role === 'STORE_REPRESENTATIVE';
    }
    return false;
  }

  canCreateProductInStore(storeId: string): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    if (!storeId) return false;
    if (this.isOwnStore(storeId)) {
      return ADMIN_PLUS_ROLES.includes(u.role as RoleName) ||
        u.role === 'STORE_REPRESENTATIVE';
    }
    return false;
  }

  canViewAllStores(): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    return ADMIN_PLUS_ROLES.includes(u.role as RoleName) ||
      u.role === 'STORE_REPRESENTATIVE' ||
      u.role === 'CLERK' ||
      u.role === 'RUNNER';
  }

  canGenerateQrFor(target: any): boolean {
    const u = this.user;
    if (!u) return false;
    if (QR_ALLOWED_ANY.includes(u.role as RoleName) || u.isGlobalAdmin) {
      return true;
    }
    return false;
  }

  canManageUsers(storeId: string): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.role === 'STORE_REPRESENTATIVE') return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    if (!storeId) return false;
    if (this.isOwnStore(storeId)) {
      return OWNER_OR_GLOBAL.includes(u.role as RoleName) ||
        u.role === 'STORE_ADMIN';
    }
    return false;
  }

  canManagePayouts(storeId: string): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.role === 'STORE_REPRESENTATIVE') return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    if (!storeId) return false;
    if (this.isOwnStore(storeId)) {
      return OWNER_OR_GLOBAL.includes(u.role as RoleName) ||
        u.role === 'STORE_ADMIN';
    }
    return false;
  }

  /**
   * Access subscription / pricing pages, plan status, upgrades.
   * Mirrors backend PermissionService.canManageSubscription:
   *   - Global Admin (any store scope, storeId optional) -> allowed
   *   - OWNER / STORE_ADMIN on their own storeId -> allowed
   *   - STORE_REPRESENTATIVE / CLERK / RUNNER -> denied
   */
  canAccessSubscription(storeId?: string): boolean {
    const u = this.user;
    if (!u) return false;
    if (u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN') return true;
    const adminOrOwner = u.role === 'OWNER' || u.role === 'STORE_ADMIN';
    if (!adminOrOwner) return false;
    if (!storeId) return false;
    return !!u.storeId && u.storeId === storeId;
  }

  canEditSubscriptionPlans(): boolean {
    const u = this.user;
    if (!u) return false;
    return !!(u.isGlobalAdmin || u.role === 'GLOBAL_ADMIN');
  }
}
