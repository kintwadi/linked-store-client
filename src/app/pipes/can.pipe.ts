import { Pipe, PipeTransform, inject } from '@angular/core';
import { PermissionService } from '../services/permission.service';

type CanAction = 'edit' | 'delete' | 'create' | 'qr' | 'users' | 'payouts';

@Pipe({
  name: 'can',
  standalone: true,
  pure: true,
})
export class CanPipe implements PipeTransform {
  private readonly perm = inject(PermissionService);

  transform(
    target: any,
    action: CanAction,
    contextStoreId?: string
  ): boolean {
    switch (action) {
      case 'edit':
        return this.perm.canEditProduct(target ?? { storeId: contextStoreId });
      case 'delete':
        return this.perm.canDeleteProduct(target ?? { storeId: contextStoreId });
      case 'create':
        return this.perm.canCreateProductInStore(
          typeof target === 'string' ? target : contextStoreId ?? ''
        );
      case 'qr':
        return this.perm.canGenerateQrFor(target ?? { storeId: contextStoreId });
      case 'users':
        return this.perm.canManageUsers(
          typeof target === 'string' ? target : contextStoreId ?? ''
        );
      case 'payouts':
        return this.perm.canManagePayouts(
          typeof target === 'string' ? target : contextStoreId ?? ''
        );
      default:
        return false;
    }
  }
}
