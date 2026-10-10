import { Injectable, inject, effect } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy, Router } from '@angular/router';
import { BrandService } from './brand.service';

@Injectable({ providedIn: 'root' })
export class BrandTitleStrategy extends TitleStrategy {
  private readonly router = inject(Router);
  private readonly brandService = inject(BrandService);

  constructor() {
    super();
    effect(() => {
      const brand = this.brandService.displayName();
      const title = this.buildTitle(this.router.routerState.snapshot);
      document.title = title ? `${title} · ${brand}` : brand;
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const brand = this.brandService.displayName();
    const title = this.buildTitle(snapshot);
    document.title = title ? `${title} · ${brand}` : brand;
  }
}
