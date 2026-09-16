import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface InventoryVariant {
  variantId: string;
  productId?: string;
  productTitle: string | null;
  productDescription?: string | null;
  productImageUrl?: string | null;
  variantImageUrl?: string | null;
  productGalleryImageUrls?: string[] | null;
  variantGalleryImageUrls?: string[] | null;
  sku: string | null;
  wholesalePriceCents: number | null;
  retailPriceCents: number | null;
  stockQuantity: number | null;
  status: string | null;
  createdAt?: string | null;
}

@Component({
  selector: 'app-store-products-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: block; }

    .panel {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
      display: grid;
    }
    .panel-head {
      padding: 20px 24px 16px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
      border-bottom: 1px solid #f3f4f6;
    }
    .panel-head h2 {
      margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;
      display: inline-flex; align-items: center; gap: 10px;
    }
    .panel-head h2 .ico {
      width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--color-primary-50); color: var(--color-primary);
      font-size: 15px;
    }
    .panel-head .muted {
      font-size: 12px; color: #6b7280; font-weight: 500;
    }
    .panel-body { padding: 0; display: grid; }
    .panel-body > * + * { border-top: 1px solid #f3f4f6; }

    .table-wrap { overflow-x: auto; }
    table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      font-size: 14px;
    }
    th {
      text-align: left; padding: 14px 18px;
      font-weight: 600; font-size: 12px;
      text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;
      background: #f9fafb;
      position: sticky; top: 0; z-index: 1;
    }
    th:first-child { border-radius: 18px 0 0 0; }
    th:last-child  { border-radius: 0 18px 0 0; }
    td {
      padding: 16px 18px;
      color: #111827; vertical-align: middle;
      border-top: 1px solid #f3f4f6;
    }
    tbody tr { transition: background .15s ease; }
    tbody tr:hover td { background: #fafbff; }

    .cell-identity {
      display: flex; align-items: center; gap: 12px;
    }
    .thumb {
      width: 48px; height: 48px; border-radius: 12px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 20px; color: #6b7280;
      overflow: hidden;
      flex-shrink: 0;
    }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .cell-text { display: grid; gap: 3px; }
    .cell-title { font-weight: 700; color: #111827; font-size: 14px; }
    .cell-meta  { font-size: 12px; color: #6b7280; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; color: #4b5563;
      background: #f3f4f6; padding: 2px 7px; border-radius: 6px;
      font-weight: 500;
    }

    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 11px;
      border-radius: 999px; font-size: 12px; font-weight: 700;
      letter-spacing: 0.01em;
    }
    .status-badge::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: currentColor; opacity: 0.7;
    }
    .status-badge.ok   { background: #ecfdf5; color: #059669; }
    .status-badge.warn { background: #fffbeb; color: #b45309; }
    .status-badge.err  { background: #fef2f2; color: #dc2626; }
    .status-badge.info { background: #eef2ff; color: #4338ca; }

    .row-actions {
      display: flex; gap: 6px; flex-wrap: wrap;
    }
    .row-actions .btn {
      padding: 6px 11px; font-size: 12px; font-weight: 600;
      border-radius: 8px; gap: 5px;
      text-decoration: none;
    }
    .row-actions .btn .ico { font-size: 12px; }

    .btn-primary {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .btn-primary:hover  { background: var(--color-primary-600); }

    .btn-secondary {
      background: #fff;
      color: #374151;
      border: 1px solid #d1d5db;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #9ca3af;
      color: #111827;
    }

    .loading, .empty {
      padding: 48px 24px; text-align: center; color: #6b7280; font-size: 14px;
    }
    .empty {
      display: grid; gap: 8px; justify-items: center;
    }
    .empty .ico {
      width: 56px; height: 56px; border-radius: 16px;
      background: #f3f4f6; color: #9ca3af;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 26px; margin-bottom: 4px;
    }
    .empty h4 { margin: 0; font-size: 16px; font-weight: 700; color: #111827; }
    .empty p  { margin: 0; font-size: 13px; color: #6b7280; max-width: 360px; }

    .price { font-weight: 700; color: #111827; }
    .price.wholesale { color: #4338ca; }
    .stock-low { color: #b45309; font-weight: 600; }
    .stock-out { color: #dc2626; font-weight: 700; }
    .gallery-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 999px;
      background: #ecfeff; color: #0e7490;
      font-size: 11px; font-weight: 700;
      width: fit-content;
    }
  `],
  template: `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2><span class="ico">📦</span> Products & Inventory</h2>
          <span class="muted">Manage your catalog, pricing, and stock levels.</span>
        </div>
        <a class="btn btn-primary" routerLink="./new">
          <span class="ico">＋</span> Add product
        </a>
      </div>

      <div class="panel-body">
        @if (loading()) {
          <div class="loading">Loading inventory…</div>
        } @else if (products().length > 0) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="min-width: 280px;">Product</th>
                  <th>SKU</th>
                  <th>Retail</th>
                  <th>Wholesale</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th style="min-width: 120px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (v of products(); track v.variantId) {
                  <tr>
                    <td>
                      <div class="cell-identity">
                        <div class="thumb">
                          @if (v.variantImageUrl || v.productImageUrl) {
                            <img [src]="v.variantImageUrl || v.productImageUrl" alt="" onerror="this.style.display='none'" />
                          }
                          @if (!v.variantImageUrl && !v.productImageUrl) { 📦 }
                        </div>
                        <div class="cell-text">
                          <span class="cell-title">{{ v.productTitle || 'Untitled' }}</span>
                          @if (v.productDescription) {
                            <span class="cell-meta">{{ v.productDescription.slice(0, 60) }}{{ v.productDescription.length > 60 ? '…' : '' }}</span>
                          }
                          @if (galleryCount(v) > 0) {
                            <span class="gallery-chip">🖼 {{ galleryCount(v) }}</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (v.sku) { <span class="mono">{{ v.sku }}</span> }
                      @else { <span style="color:#9ca3af;">—</span> }
                    </td>
                    <td class="price">
                      @if (v.retailPriceCents != null) { {{ '$' + (v.retailPriceCents / 100).toFixed(2) }} }
                      @else { — }
                    </td>
                    <td class="price wholesale">
                      @if (v.wholesalePriceCents != null) { {{ '$' + (v.wholesalePriceCents / 100).toFixed(2) }} }
                      @else { — }
                    </td>
                    <td>
                      @if (v.stockQuantity == null) {
                        <span style="color:#9ca3af;">—</span>
                      } @else if (v.stockQuantity <= 0) {
                        <span class="stock-out">{{ v.stockQuantity }}</span>
                      } @else if (v.stockQuantity < 10) {
                        <span class="stock-low">{{ v.stockQuantity }}</span>
                      } @else {
                        <strong style="font-weight:700;">{{ v.stockQuantity }}</strong>
                      }
                    </td>
                    <td>
                      <span class="status-badge"
                            [class.ok]="v.status === 'ACTIVE' || !v.status"
                            [class.warn]="v.status === 'DRAFT' || v.status === 'OUT_OF_STOCK' || v.status === 'PENDING'"
                            [class.err]="v.status === 'INACTIVE' || v.status === 'ARCHIVED' || v.status === 'DISABLED'">
                        {{ v.status || 'ACTIVE' }}
                      </span>
                    </td>
                    <td>
                      <div class="row-actions">
                        <a class="btn btn-secondary" [routerLink]="['./', v.variantId]">
                          <span class="ico">✎</span> Edit
                        </a>
                        <a class="btn btn-secondary" [routerLink]="['/p', v.productId ?? v.variantId, 'qr']" target="_blank" rel="noopener">
                          <span class="ico">📱</span> QR
                        </a>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty">
            <div class="ico">📦</div>
            <h4>No products yet</h4>
            <p>Click <b>"+ Add product"</b> above to create your first inventory item.</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class StoreProductsListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  readonly products = signal<InventoryVariant[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadInventory();
  }

  galleryCount(v: InventoryVariant): number {
    const variantUrls = v.variantGalleryImageUrls ?? [];
    const productUrls = v.productGalleryImageUrls ?? [];
    return new Set([...variantUrls, ...productUrls]).size;
  }

  private async loadInventory(): Promise<void> {
    this.loading.set(true);
    try {
      const api = this.authService.resolveApiBasePublic();
      const storeIdParam = this.route.snapshot.parent?.paramMap.get('storeId');
      const isMe = storeIdParam === 'me';
      const pathPart = isMe ? 'me' : encodeURIComponent(storeIdParam!);
      const data = await firstValueFrom(
        this.http.get<InventoryVariant[] | { items?: InventoryVariant[]; data?: InventoryVariant[] }>(
          `${api}/admin/stores/${pathPart}/inventory`
        )
      );
      const arr = Array.isArray(data) ? data : (data.items ?? data.data ?? []);
      this.products.set(arr as InventoryVariant[]);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }
}
