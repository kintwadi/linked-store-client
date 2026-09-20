import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth.service';

interface TxDetailShape {
  id?: string | null;
  status?: string | null;
  originatingStoreId?: string | null;
  originatingStoreName?: string | null;
  fulfillingStoreId?: string | null;
  fulfillingStoreName?: string | null;
  totalRetailCents?: number | null;
  currency?: string | null;
  productId?: string | null;
  productTitle?: string | null;
  productImageUrl?: string | null;
  variantId?: string | null;
  sku?: string | null;
  variantAttributesJson?: string | null;
  variantAttributes?: Record<string, string | number | boolean | null> | null;
  qrFallbackCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  expiresAt?: string | null;
}

interface VariantShape {
  id?: string | null;
  sku?: string | null;
  retailPriceCents?: number | null;
  stockQuantity?: number | null;
  storeId?: string | null;
  variantAttributes?: Record<string, string | number | boolean | null> | null;
  product?: { title?: string | null; primaryImageUrl?: string | null; thumbnailUrl?: string | null } | null;
}

@Component({
  selector: 'app-admin-request-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 1040px;
      margin: 0 auto;
      padding: 28px 20px 80px;
      display: grid;
      gap: 22px;
    }
    .back {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--color-muted, #6b7280); text-decoration: none;
      font-size: 14px; font-weight: 500;
    }
    .back:hover { color: var(--color-ink, #111827); }

    .hero-card {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
      display: grid;
      grid-template-columns: 380px 1fr;
      min-height: 440px;
    }
    @media (max-width: 860px) {
      .hero-card { grid-template-columns: 1fr; }
    }

    .product-img-wrap {
      position: relative;
      background: linear-gradient(135deg, #f5f3ff 0%, #ecfeff 100%);
      display: flex; align-items: center; justify-content: center;
      min-height: 380px;
      overflow: hidden;
    }
    .product-img-wrap img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .product-img-wrap .fallback {
      font-size: 96px;
      filter: drop-shadow(0 10px 20px rgba(0,0,0,0.08));
    }

    .hero-body {
      padding: 32px 36px;
      display: grid;
      align-content: start;
      gap: 18px;
    }

    .hero-top-row {
      display: flex; align-items: flex-start;
      justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
    }

    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 13px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .status-badge::before {
      content: '';
      width: 7px; height: 7px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.75;
    }
    .status-badge.RESERVED, .status-badge.PENDING_RESERVATION { background: #ede9fe; color: #6d28d9; }
    .status-badge.READY     { background: #dcfce7; color: #166534; }
    .status-badge.UNAVAILABLE, .status-badge.CANCELLED { background: #fee2e2; color: #991b1b; }
    .status-badge.PAID      { background: #dbeafe; color: #1e40af; }
    .status-badge.PICKED_UP { background: #d1fae5; color: #065f46; }
    .status-badge.EXPIRED   { background: #fef3c7; color: #92400e; }
    .status-badge.default   { background: #f3f4f6; color: #4b5563; }

    .tx-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      background: #f3f4f6;
      padding: 4px 9px;
      border-radius: 8px;
      color: #6b7280;
      font-weight: 600;
    }

    .product-title {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
      line-height: 1.15;
    }

    .chips-row {
      display: flex; flex-wrap: wrap;
      gap: 8px; align-items: center;
    }
    .chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 11px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 999px;
      letter-spacing: 0.01em;
    }
    .chip.purple { background: #f3e8ff; color: #6b21a8; }
    .chip.ok { background: #ecfdf5; color: #047857; }
    .chip.info { background: #eff6ff; color: #1d4ed8; }
    .chip.warn { background: #fff7ed; color: #9a3412; }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 22px;
      padding: 18px 20px;
      background: #fafbff;
      border: 1px solid #eef2ff;
      border-radius: 16px;
    }
    @media (max-width: 560px) { .meta-grid { grid-template-columns: 1fr; } }
    .meta-item { display: grid; gap: 3px; }
    .meta-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    .meta-value.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #fff;
      padding: 4px 8px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      display: inline-block;
    }

    .countdown-banner {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      color: #9a3412;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      width: fit-content;
    }
    .countdown-banner.done { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }

    .stock-banner {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 15px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 700;
      width: fit-content;
    }
    .stock-banner.ok { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .stock-banner.zero { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .stock-banner.err { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .stock-banner.loading { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; }

    .actions-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      padding-top: 8px;
      margin-top: 6px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 26px;
      font-size: 15px;
      font-weight: 800;
      border-radius: 14px;
      transition: background .15s ease, transform .1s ease, box-shadow .15s ease;
      border: 1px solid transparent;
      cursor: pointer;
      min-height: 52px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
    .btn:active { transform: translateY(1px); }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-primary {
      background: linear-gradient(135deg, var(--color-primary, #4f46e5) 0%, var(--color-primary-600, #4338ca) 100%);
      color: #fff;
      box-shadow: 0 8px 20px -10px rgba(79,70,229,0.55);
    }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
    .btn-deny {
      background: #fff;
      color: #b91c1c;
      border: 2px solid #fecaca;
      background: #fff1f2;
      box-shadow: 0 4px 14px -8px rgba(239,68,68,0.4);
    }
    .btn-deny:hover:not(:disabled) { background: #ffe4e6; }
    .btn-ghost {
      background: #fff;
      color: #374151;
      border: 1px solid #e5e7eb;
      box-shadow: none;
      padding: 12px 20px;
      font-size: 14px;
      min-height: 44px;
    }
    .btn-ghost:hover:not(:disabled) { background: #f9fafb; }

    .spinner {
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid #e5e7eb;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: -3px;
    }
    .btn .spinner {
      border-top-color: #fff;
      width: 18px; height: 18px;
      border-width: 2.5px;
    }
    .btn-deny .spinner { border-top-color: #b91c1c; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .toasts {
      position: fixed; right: 24px; bottom: 24px;
      display: grid; gap: 10px; z-index: 100;
      pointer-events: none;
    }
    .toast {
      min-width: 300px; max-width: 440px;
      padding: 12px 16px 12px 14px;
      border-radius: 12px;
      box-shadow: 0 12px 32px -10px rgba(0,0,0,0.25);
      display: flex; align-items: flex-start; gap: 10px;
      pointer-events: auto;
      border: 1px solid transparent;
    }
    .toast .t-ico {
      width: 22px; height: 22px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0; margin-top: 1px; color: #fff; font-weight: 700;
    }
    .toast .t-body { display: grid; gap: 2px; flex: 1; }
    .toast .t-title { font-size: 14px; font-weight: 700; color: #111827; }
    .toast .t-msg   { font-size: 13px; color: #4b5563; line-height: 1.4; }
    .toast.success { background: #ecfdf5; border-color: #a7f3d0; }
    .toast.success .t-ico { background: #10b981; }
    .toast.error   { background: #fef2f2; border-color: #fecaca; }
    .toast.error .t-ico   { background: #ef4444; }

    .loading, .empty, .error-box {
      padding: 64px 24px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 20px;
    }
    .error-box { background: #fef2f2; border-color: #fecaca; color: #b91c1c; font-weight: 500; }
    .empty .ico {
      width: 64px; height: 64px; border-radius: 18px;
      background: #f3f4f6; color: #9ca3af;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 28px; margin-bottom: 10px;
    }
    .empty h4 { margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #111827; }
    .empty p { margin: 0; font-size: 13px; color: #6b7280; max-width: 360px; margin-left: auto; margin-right: auto; }

    .price-big {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
  `],
  template: `
    <div class="toasts">
      @if (toastSuccess()) {
        <div class="toast success">
          <span class="t-ico">✓</span>
          <div class="t-body"><span class="t-title">Success</span><span class="t-msg">{{ toastSuccess() }}</span></div>
        </div>
      }
      @if (toastError()) {
        <div class="toast error">
          <span class="t-ico">!</span>
          <div class="t-body"><span class="t-title">Something went wrong</span><span class="t-msg">{{ toastError() }}</span></div>
        </div>
      }
    </div>

    <div class="wrap">
      <a class="back" routerLink="/admin/notifications">← Back to notifications</a>

      @if (loading()) {
        <div class="loading">
          <div><span class="spinner" style="width:22px;height:22px;border-width:3px;"></span></div>
          <div style="margin-top:12px;">Loading request details…</div>
        </div>
      } @else if (error()) {
        <div class="error-box">
          <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Unable to load request</div>
          {{ error() }}
          <div style="margin-top:16px;">
            <a class="btn btn-ghost" routerLink="/admin">← Back to dashboard</a>
          </div>
        </div>
      } @else if (!tx()) {
        <div class="empty">
          <div class="ico">❓</div>
          <h4>Request not found</h4>
          <p>This transaction may have been deleted or you entered an invalid ID.</p>
          <div style="margin-top:18px;">
            <a class="btn btn-ghost" routerLink="/admin/notifications">← Back to notifications</a>
          </div>
        </div>
      } @else {
        <div class="hero-card">
          <div class="product-img-wrap">
            @if (tx()?.productImageUrl) {
              <img [src]="tx()!.productImageUrl" alt="" onerror="this.style.display='none'; (this.parentNode as any)?.querySelector('.fallback')?.style && ((this.parentNode as any).querySelector('.fallback').style.display = 'inline-flex');" />
            }
            <span class="fallback" [style.display]="tx()?.productImageUrl ? 'none' : 'inline-flex'">🛍️</span>
          </div>

          <div class="hero-body">
            <div class="hero-top-row">
              <div style="display:grid; gap:8px; min-width:0;">
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
                  @if (tx()?.status) {
                    <span class="status-badge" [class]="statusClass()">{{ tx()?.status }}</span>
                  }
                  @if (tx()?.id) {
                    <span class="tx-id">TX {{ tx()!.id!.slice(0, 12) }}…</span>
                  }
                </div>
                <h2 class="product-title">{{ tx()?.productTitle || 'Product Request' }}</h2>
              </div>
              <div class="price-big">{{ formatMoney(tx()?.totalRetailCents, tx()?.currency) }}</div>
            </div>

            <div class="chips-row">
              @if ((tx()?.originatingStoreName || tx()?.fulfillingStoreName) && tx()?.originatingStoreName !== tx()?.fulfillingStoreName) {
                @if (tx()?.originatingStoreName) {
                  <span class="chip purple">🏪 FROM {{ tx()!.originatingStoreName }}</span>
                }
                @if (tx()?.fulfillingStoreName) {
                  <span class="chip ok">🏬 TO {{ tx()!.fulfillingStoreName }}</span>
                }
              } @else {
                <span class="chip info">🏪 {{ tx()?.originatingStoreName || tx()?.fulfillingStoreName || 'Store' }}</span>
              }
              @if (tx()?.sku) {
                <span class="chip info">SKU <span style="font-family:ui-monospace,Menlo,monospace;">{{ tx()!.sku }}</span></span>
              }
              @if (variantAttrList().length > 0) {
                @for (attr of variantAttrList(); track attr.key) {
                  <span class="chip warn">{{ attr.key }}: {{ attr.val }}</span>
                }
              }
            </div>

            @if (countdownVisible()) {
              <div>
                <span class="countdown-banner" [class.done]="countdownExpired()">
                  ⏱ {{ countdownLabel() }} <b>{{ formatCountdown(expiresAt()) }}</b>
                </span>
              </div>
            }

            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Created</span>
                <span class="meta-value">{{ tx()?.createdAt | date:'medium' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Last updated</span>
                <span class="meta-value">{{ tx()?.updatedAt | date:'short' }}</span>
              </div>
              @if (tx()?.qrFallbackCode) {
                <div class="meta-item">
                  <span class="meta-label">QR Fallback Code</span>
                  <span class="meta-value mono">{{ tx()!.qrFallbackCode }}</span>
                </div>
              }
              <div class="meta-item">
                <span class="meta-label">Request ID</span>
                <span class="meta-value mono" style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" [title]="tx()?.id ?? ''">{{ tx()?.id || '—' }}</span>
              </div>
            </div>

            <div>
              @if (stockLoading()) {
                <span class="stock-banner loading">
                  <span class="spinner" style="border-top-color:#6b7280;"></span>
                  Checking stock availability…
                </span>
              } @else if (stockError()) {
                <span class="stock-banner err">⚠ Could not load stock for this variant</span>
              } @else if (stockLoaded()) {
                <span class="stock-banner" [class.ok]="stockQty() > 0" [class.zero]="stockQty() <= 0">
                  @if (stockQty() > 0) {
                    📦 {{ stockQty() }} item{{ stockQty() === 1 ? '' : 's' }} remaining in stock
                  } @else {
                    🚫 Sold out · no items left in inventory
                  }
                </span>
              }
            </div>

            @if (showActions()) {
              <div class="actions-row">
                @if (showAcceptButtonActive()) {
                  <button type="button"
                          class="btn btn-primary"
                          [disabled]="acceptDisabled()"
                          (click)="acceptRequest()">
                    @if (acceptPending()) {
                      <span class="spinner"></span>
                    } @else {
                      <span>✓</span>
                    }
                    Mark Ready · Accept
                  </button>
                } @else if (alreadyAccepted()) {
                  <button type="button"
                          class="btn btn-primary"
                          [disabled]="true">
                    <span>✓</span>
                    Already accepted · READY
                  </button>
                }
                <button type="button"
                        class="btn btn-deny"
                        [disabled]="actionPending()"
                        (click)="denyRequest()">
                  @if (denyPending()) {
                    <span class="spinner"></span>
                  } @else {
                    <span>✕</span>
                  }
                  @if (alreadyAccepted()) { Cancel Request } @else { Mark Unavailable · Deny }
                </button>
                <a class="btn btn-ghost" routerLink="/admin/notifications">Back</a>
              </div>
              @if (showAcceptButtonActive() && stockQty() === 0 && stockLoaded()) {
                <div style="font-size:12px; color:#b91c1c; font-weight:600; margin-top:-4px;">
                  ⚠ Cannot accept: this variant is currently out of stock. Deny the request to release any held inventory.
                </div>
              }
              @if (alreadyAccepted()) {
                <div style="font-size:12px; color:#065f46; font-weight:600; margin-top:-4px;">
                  ✓ Item marked ready. Waiting for customer to complete checkout. Customer hold window counting down above.
                </div>
              }
            } @else {
              <div class="actions-row">
                <a class="btn btn-ghost" routerLink="/admin/notifications">← Back to notifications</a>
                <a class="btn btn-ghost" routerLink="/admin">Go to dashboard</a>
                <span style="font-size:12px; color:#6b7280; margin-left:auto;">
                  @if (alreadyAccepted()) { ✓ This request has already been marked READY. }
                  @else if (alreadyDenied()) { ✕ This request has already been denied/cancelled. }
                  @else { ℹ Actions not available for status: {{ tx()?.status }} }
                </span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminRequestDetailPageComponent implements OnInit, OnDestroy {
  readonly route = inject(ActivatedRoute);
  readonly http = inject(HttpClient);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  readonly cdr = inject(ChangeDetectorRef);

  readonly tx = signal<TxDetailShape | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly stockLoading = signal(false);
  readonly stockError = signal(false);
  readonly _stockQty = signal<number | null>(null);

  readonly acceptPendingFlag = signal(false);
  readonly denyPendingFlag = signal(false);

  readonly toastSuccess = signal<string | null>(null);
  readonly toastError = signal<string | null>(null);

  currentUser: AuthUser | null = null;
  globalAdmin = false;
  private tickTimer: any = null;
  private expiresAtMs: number | null = null;

  private api(): string { return this.authService.resolveApiBasePublic(); }
  private touch(): void { this.cdr.markForCheck(); }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser$.getValue();
    this.globalAdmin = !!(this.currentUser?.isGlobalAdmin || this.currentUser?.role === 'GLOBAL_ADMIN');
    this.tickTimer = setInterval(() => this.touch(), 1000);
    const txId = this.route.snapshot.paramMap.get('transactionId');
    if (!txId) {
      this.loading.set(false);
      this.error.set('Missing transaction ID.');
      return;
    }
    void this.loadTx(txId);
  }

  ngOnDestroy(): void {
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
  }

  private async loadTx(txId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const api = this.api();
      const raw = await firstValueFrom(this.http.get<any>(`${api}/transactions/${encodeURIComponent(txId)}`)).catch(() => null);
      if (!raw || typeof raw !== 'object') {
        this.loading.set(false);
        return;
      }
      const shaped: TxDetailShape = { ...raw };
      if (shaped.variantAttributesJson && typeof shaped.variantAttributesJson === 'string') {
        try { shaped.variantAttributes = JSON.parse(shaped.variantAttributesJson); } catch { shaped.variantAttributes = null; }
      }
      if (shaped.createdAt && shaped.status === 'RESERVED') {
        const createdMs = new Date(shaped.createdAt).getTime();
        this.expiresAtMs = createdMs + 15 * 60 * 1000;
        shaped.expiresAt = new Date(this.expiresAtMs).toISOString();
      }
      this.tx.set(shaped);
      await this.loadStock();
    } catch (err: any) {
      this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load transaction.');
    } finally {
      this.loading.set(false);
      this.touch();
    }
  }

  private async loadStock(): Promise<void> {
    const variantId = this.tx()?.variantId;
    if (!variantId) return;
    this.stockLoading.set(true);
    this.stockError.set(false);
    try {
      const api = this.api();
      const res = await firstValueFrom(this.http.get<any>(`${api}/products/variants/${encodeURIComponent(variantId)}`)).catch(() => null);
      const variant: VariantShape | null = (res?.variant ?? res) as VariantShape | null;
      const qty = variant?.stockQuantity;
      if (typeof qty === 'number') {
        this._stockQty.set(qty);
        if (variant?.variantAttributes && !this.tx()?.variantAttributes) {
          this.tx.update(t => t ? { ...t, variantAttributes: variant.variantAttributes } : t);
        }
      } else {
        this.stockError.set(true);
      }
    } catch {
      this.stockError.set(true);
    } finally {
      this.stockLoading.set(false);
      this.touch();
    }
  }

  stockLoaded(): boolean { return typeof this._stockQty() === 'number'; }
  stockQty(): number { return typeof this._stockQty() === 'number' ? this._stockQty()! : 0; }
  acceptPending(): boolean { return this.acceptPendingFlag(); }
  denyPending(): boolean { return this.denyPendingFlag(); }
  actionPending(): boolean { return this.acceptPendingFlag() || this.denyPendingFlag(); }
  acceptDisabled(): boolean {
    if (this.actionPending()) return true;
    if (this.alreadyAccepted()) return true;
    if (this.stockLoaded() && this.stockQty() <= 0) return true;
    return false;
  }

  statusClass(): string {
    const s = (this.tx()?.status || 'default') as string;
    const known = ['RESERVED', 'PENDING_RESERVATION', 'READY', 'UNAVAILABLE', 'CANCELLED', 'PAID', 'PICKED_UP', 'EXPIRED'];
    return known.includes(s) ? s : 'default';
  }

  showActions(): boolean {
    const s = this.tx()?.status;
    if (s === 'RESERVED' || s === 'PENDING_RESERVATION') return true;
    if (s === 'READY') return true;
    return false;
  }
  showAcceptButtonActive(): boolean {
    const s = this.tx()?.status;
    return s === 'RESERVED' || s === 'PENDING_RESERVATION';
  }
  alreadyAccepted(): boolean { return this.tx()?.status === 'READY'; }
  alreadyDenied(): boolean {
    const s = this.tx()?.status;
    return s === 'CANCELLED' || s === 'UNAVAILABLE' || s === 'EXPIRED';
  }

  variantAttrList(): Array<{ key: string; val: string }> {
    const va = this.tx()?.variantAttributes;
    if (!va) return [];
    const out: Array<{ key: string; val: string }> = [];
    for (const k of Object.keys(va)) {
      const v = (va as Record<string, any>)[k];
      if (v == null) continue;
      out.push({ key: k, val: String(v) });
    }
    return out;
  }

  expiresAt(): string | null {
    return this.tx()?.expiresAt ?? null;
  }
  countdownVisible(): boolean {
    const s = this.tx()?.status;
    return (s === 'RESERVED' || s === 'PENDING_RESERVATION' || s === 'READY') && !!this.expiresAt();
  }
  countdownLabel(): string {
    const s = this.tx()?.status;
    if (s === 'READY') return 'Held for customer';
    return 'Expires in';
  }
  countdownExpired(): boolean {
    if (!this.expiresAt()) return false;
    return new Date(this.expiresAt()!).getTime() - Date.now() <= 0;
  }
  formatCountdown(iso: string | null | undefined): string {
    if (!iso) return '—';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  formatMoney(cents: number | undefined | null, currency: string | undefined | null): string {
    if (cents === undefined || cents === null) return '—';
    const c = currency || 'USD';
    const n = Number(cents) / 100;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n); }
    catch { return '$' + n.toFixed(2); }
  }

  private showSuccess(msg: string): void {
    this.toastSuccess.set(msg);
    setTimeout(() => { if (this.toastSuccess() === msg) this.toastSuccess.set(null); }, 3500);
  }
  private showError(msg: string): void {
    this.toastError.set(msg);
    setTimeout(() => { if (this.toastError() === msg) this.toastError.set(null); }, 4500);
  }

  async acceptRequest(): Promise<void> {
    const txId = this.tx()?.id;
    if (!txId) return;
    this.acceptPendingFlag.set(true);
    this.touch();
    const api = this.api();
    const token = this.authService.getToken();
    try {
      const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};
      const storeId = this.tx()?.fulfillingStoreId || this.tx()?.originatingStoreId || this.currentUser?.storeId;
      let url: string;
      if (this.globalAdmin && storeId) {
        url = `${api}/admin/stores/${encodeURIComponent(storeId)}/transactions/${encodeURIComponent(txId)}/mark-ready`;
      } else {
        url = `${api}/admin/stores/me/transactions/${encodeURIComponent(txId)}/mark-ready`;
      }
      await firstValueFrom(this.http.post<any>(url, {}, { headers }));
      this.tx.update(t => t ? { ...t, status: 'READY' } : t);
      this.showSuccess('Item marked READY. Customer has been notified.');
    } catch (err: any) {
      this.showError(err?.error?.message ?? err?.message ?? 'Failed to mark ready.');
    } finally {
      this.acceptPendingFlag.set(false);
      this.touch();
    }
  }

  async denyRequest(): Promise<void> {
    const txId = this.tx()?.id;
    if (!txId) return;
    this.denyPendingFlag.set(true);
    this.touch();
    const api = this.api();
    const token = this.authService.getToken();
    try {
      const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};
      const storeId = this.tx()?.fulfillingStoreId || this.tx()?.originatingStoreId || this.currentUser?.storeId;
      let url: string;
      if (this.globalAdmin && storeId) {
        url = `${api}/admin/stores/${encodeURIComponent(storeId)}/transactions/${encodeURIComponent(txId)}/mark-unavailable`;
      } else {
        url = `${api}/admin/stores/me/transactions/${encodeURIComponent(txId)}/mark-unavailable`;
      }
      await firstValueFrom(this.http.post<any>(url, {}, { headers }));
      this.tx.update(t => t ? { ...t, status: 'CANCELLED' } : t);
      this.showSuccess('Request denied. Inventory has been released.');
    } catch (err: any) {
      this.showError(err?.error?.message ?? err?.message ?? 'Failed to mark unavailable.');
    } finally {
      this.denyPendingFlag.set(false);
      this.touch();
    }
  }
}
