import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../../shared/models/product.model';
import { ProductService } from '../../services/product.service';

type CheckoutStatus = 'reserved' | 'loading' | 'confirmed' | 'error';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      display: grid;
      gap: 20px;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--color-muted);
      text-decoration: none;
      font-size: 14px;
    }
    .back:hover { color: var(--color-ink); }

    .banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: var(--radius-sm);
    }
    .banner strong { letter-spacing: 0.04em; }
    .banner .pill {
      background: #059669;
      color: #fff;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: 0.06em;
    }

    .card {
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 18px;
      display: grid;
      gap: 14px;
    }
    .card h2 {
      margin: 0;
      font-size: 16px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--color-muted);
    }

    .line {
      display: grid;
      grid-template-columns: 96px 1fr auto;
      align-items: center;
      gap: 14px;
    }
    .line img {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      background: #f3f4f6;
    }
    .line .name { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
    .line .sku  { margin: 0; font-size: 13px; color: var(--color-muted); }
    .line .qty  { font-size: 13px; color: var(--color-muted); margin-top: 6px; }
    .line .price { font-size: 16px; font-weight: 600; }

    .rows { display: grid; gap: 8px; font-size: 15px; }
    .row {
      display: flex;
      justify-content: space-between;
      color: var(--color-muted);
    }
    .row.total {
      color: var(--color-ink);
      font-size: 18px;
      font-weight: 700;
      padding-top: 10px;
      border-top: 1px dashed var(--color-border);
      margin-top: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 20px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 15px;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-primary {
      background: var(--color-primary);
      color: #fff;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-ghost {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-ink);
    }
    .btn-block { width: 100%; }
    .actions { display: grid; gap: 10px; }

    .note {
      font-size: 13px;
      color: var(--color-muted);
      text-align: center;
      margin: 0;
    }

    .empty {
      padding: 40px 20px;
      text-align: center;
      color: var(--color-muted);
    }
    .empty a { color: var(--color-primary); text-decoration: none; }

    .ledger h2 {
      margin: 0;
      font-size: 16px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--color-muted);
    }
  `],
  template: `
    <div class="wrap">
      <a class="back" routerLink="/">← Back to home</a>

      @if (loading()) {
        <div class="empty">Loading reservation…</div>
      } @else if (!product()) {
        <div class="empty">
          No active reservation. <a routerLink="/">Browse products</a>
        </div>
      } @else {
        <div class="banner">
          <div>
            <strong>RESERVED</strong>
            <div style="margin-top: 4px; font-size: 14px;">Your order is confirmed.</div>
          </div>
        </div>

        <section class="card">
          <h2>Items</h2>
          <div class="line">
            <img [src]="product()!.primaryImageUrl" [alt]="product()!.title" />
            <div>
              <p class="name">{{ product()!.title }}</p>
              @if (product()!.brand)   { <p class="sku">by {{ product()!.brand }}</p> }
              @if (product()!.variantId) { <p class="qty">Qty 1 · {{ product()!.variantId }}</p> }
              @if (!product()!.variantId) { <p class="qty">Qty 1</p> }
            </div>
            <div class="price">{{ formattedPrice() }}</div>
          </div>
        </section>

        <section class="card">
          <h2>Summary</h2>
          <div class="rows">
            <div class="row"><span>Subtotal</span><span>{{ formattedPrice() }}</span></div>
            <div class="row"><span>Tax (estimated)</span><span>{{ formatPrice(0, product()?.currency ?? 'USD') }}</span></div>
            <div class="row"><span>Delivery</span><span>Free</span></div>
            <div class="row total"><span>Total</span><span>{{ formattedPrice() }}</span></div>
          </div>
        </section>

        @if (status() === 'error' && errorMessage()) {
          <div class="card" style="border-color:#fecaca; background:#fef2f2; color:#991b1b;">
            {{ errorMessage() }}
          </div>
        }

        <div class="actions">
          <button class="btn btn-primary btn-block"
                  (click)="onConfirm()"
                  [disabled]="status() === 'loading' || status() === 'confirmed'">
            @switch (status()) {
              @case ('loading')    { Redirecting to payment… }
              @case ('confirmed')  { Confirmed ✓ }
              @case ('error')      { Try payment again }
              @default             { Confirm order }
            }
          </button>
          <a class="btn btn-ghost btn-block" routerLink="/">Continue browsing</a>
        </div>

        <p class="note">Secure payment by Stripe.</p>
      }
    </div>
  `,
})
export class CheckoutPageComponent implements OnInit {
  readonly product = signal<Product | null>(null);
  readonly transaction = signal<any>(null);
  readonly loading = signal(true);
  readonly status  = signal<CheckoutStatus>('reserved');
  readonly errorMessage = signal<string | null>(null);
  readonly scanContextFromState = signal(false);

  private detectCrossIndicators(): {
    anyScanParam: boolean;
    browsingHost: string | null;
    variantStoreId: string | null;
    txOrigin: string;
    txFulfill: string;
    txIsCross: boolean;
    hasCrossHost: boolean;
    cross: boolean;
  } {
    const tx = this.transaction();
    const p = this.product();
    const usp = new URLSearchParams(window.location.search);
    const anyScanParam =
      this.scanContextFromState() ||
      !!usp.get('gateway') || !!usp.get('gatewayCode') || !!usp.get('token') ||
      !!usp.get('storeId') || !!usp.get('store');
    const browsingHost = this.productService.getBrowsingHostStore()?.storeId ?? null;
    const variantStoreId = (p as any)?.variantStoreId ?? p?.storeId ?? null;
    const txOrigin = String((tx as any)?.originatingStoreId ?? '');
    const txFulfill = String((tx as any)?.fulfillingStoreId ?? '');
    const txIsCross = !!(txOrigin && txFulfill && txOrigin !== txFulfill);
    const hasCrossHost = !!(browsingHost && variantStoreId && browsingHost !== variantStoreId);
    const cross = hasCrossHost || anyScanParam || txIsCross;
    return { anyScanParam, browsingHost, variantStoreId, txOrigin, txFulfill, txIsCross, hasCrossHost, cross };
  }

  readonly cents = computed(() => {
    const p = this.product();
    const { cross } = this.detectCrossIndicators();
    const tx = this.transaction();
    if (p) {
      const retail = Number(p.retailPriceCents ?? 0);
      const wholesale = Number((p as any)?.wholesalePriceCents ?? 0);
      const catalogCross = Math.max(retail, retail + Math.max(0, wholesale));
      if (cross) return catalogCross;
      if (retail > 0) return retail;
    }
    if (tx && typeof tx.totalRetailCents === 'number' && tx.totalRetailCents > 0) {
      return tx.totalRetailCents;
    }
    return p?.retailPriceCents ?? 0;
  });
  readonly formattedPrice = computed(() => this.formatPrice(this.cents()));
  readonly formattedTax   = computed(() => this.formatPrice(0, this.product()?.currency ?? 'USD'));
  readonly formattedTotal = computed(() => this.formatPrice(this.cents(), this.product()?.currency ?? 'USD'));

  formatPrice(cents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  constructor(
    private readonly router: Router,
    private readonly productService: ProductService,
  ) {}

  async ngOnInit(): Promise<void> {
    const nav = this.router.getCurrentNavigation();
    const navState: any = (nav?.extras?.state as any) ?? {};
    const historyState: any = (history.state as any) ?? {};
    const scanCtx = !!(navState.hasScanContext || historyState.hasScanContext);
    if (scanCtx) this.scanContextFromState.set(true);
    const stateProduct: Product | undefined = navState.product ?? historyState.product;
    const stateVariantStoreId = navState.variantStoreId ?? historyState.variantStoreId;
    const stateWholesale = navState.variantWholesalePriceCents ?? historyState.variantWholesalePriceCents;
    if (stateProduct && typeof stateWholesale === 'number') {
      (stateProduct as any).wholesalePriceCents = stateWholesale;
    }
    if (stateProduct && stateVariantStoreId && !(stateProduct as any).variantStoreId) {
      (stateProduct as any).variantStoreId = stateVariantStoreId;
    }

    const txId =
      navState.transactionId ??
      historyState.transactionId ??
      new URLSearchParams(window.location.search).get('tx');

    if (txId) {
      this.loading.set(true);
      try {
        const tx = await this.productService.getTransaction(txId);
        const usp = new URLSearchParams(window.location.search);
        const anyScanParam =
          this.scanContextFromState() ||
          !!usp.get('gateway') || !!usp.get('gatewayCode') || !!usp.get('token') ||
          !!usp.get('storeId') || !!usp.get('store');
        const txOrigin = String((tx as any)?.originatingStoreId ?? '');
        const txFulfill = String((tx as any)?.fulfillingStoreId ?? '');
        const sameStoreCorrupted = !!txOrigin && !!txFulfill && txOrigin === txFulfill;
        const paid = (tx as any).status === 'PAID' || (tx as any).status === 'PICKED_UP';
        const gw =
          navState.scanGateway ?? historyState.scanGateway ??
          usp.get('gateway') ?? usp.get('gatewayCode') ?? usp.get('token') ?? '';
        if (sameStoreCorrupted && !paid && anyScanParam && tx.productId) {
          const redirect = gw
            ? `/p/${encodeURIComponent(String(tx.productId))}?gateway=${encodeURIComponent(gw)}`
            : `/p/${encodeURIComponent(String(tx.productId))}`;
          this.productService.clearBrowsingHostStore();
          this.router.navigateByUrl(redirect, { replaceUrl: true });
          return;
        }
        this.transaction.set(tx);

        let mergedProduct: Product | null = null;
        if (stateProduct && stateProduct.id === (tx.productId ?? tx.id)) {
          mergedProduct = stateProduct;
        } else if (tx.productId) {
          try {
            const fetched = await this.productService.getProduct(String(tx.productId));
            if (fetched && fetched.id) mergedProduct = fetched;
          } catch { /* ignore */ }
        }

        if (mergedProduct) {
          const variantStoreId = (mergedProduct as any).variantStoreId ?? mergedProduct.storeId ?? null;
          const txVariantId = tx.variantId ?? '';
          let variantRetail = mergedProduct.retailPriceCents ?? 0;
          let variantWholesale = (mergedProduct as any).wholesalePriceCents ?? 0;
          if (txVariantId && Array.isArray((mergedProduct as any).variants)) {
            const matched = (mergedProduct as any).variants.find((v: any) => v && String(v.id) === String(txVariantId));
            if (matched) {
              variantRetail = matched.retailPriceCents ?? variantRetail;
              variantWholesale = matched.wholesalePriceCents ?? variantWholesale;
              if (matched.storeId && !(mergedProduct as any).variantStoreId) {
                (mergedProduct as any).variantStoreId = matched.storeId;
              }
            }
          }
          mergedProduct.retailPriceCents = variantRetail;
          (mergedProduct as any).wholesalePriceCents = variantWholesale;
          if (!(mergedProduct as any).variantStoreId && variantStoreId) {
            (mergedProduct as any).variantStoreId = variantStoreId;
          }
          if (!(mergedProduct as any).currency || tx.currency) {
            (mergedProduct as any).currency = tx.currency ?? (mergedProduct as any).currency;
          }
          this.product.set(mergedProduct);
        } else {
          const virtualProduct: Product = {
            id: tx.productId ?? tx.id,
            title: tx.productTitle ?? 'Product',
            primaryImageUrl: tx.productImageUrl ?? undefined,
            retailPriceCents: tx.totalRetailCents,
            currency: tx.currency ?? 'USD',
            sku: tx.sku ?? undefined,
            variantId: tx.variantId ?? '',
            inStock: true,
          } as any;
          this.product.set(virtualProduct);
        }
      } catch (err) {
        this.errorMessage.set('Could not load transaction details.');
      } finally {
        this.loading.set(false);
      }
      return;
    }

    if (stateProduct && stateProduct.id) {
      this.product.set(stateProduct);
      this.loading.set(false);
      return;
    }
    const passed = (historyState?.product as Product | undefined);
    if (passed && passed.id) {
      this.product.set(passed);
      this.loading.set(false);
      return;
    }

    const productId = new URLSearchParams(window.location.search).get('product');
    if (productId) {
      this.productService.getProduct(productId).then((p: Product | null) => {
        if (p) this.product.set(p);
        this.loading.set(false);
      }).catch(() => this.loading.set(false));
      return;
    }

    this.loading.set(false);
  }

  onConfirm(): void {
    if (this.status() === 'loading' || this.status() === 'confirmed') return;
    const p = this.product();
    if (!p) return;

    this.status.set('loading');
    this.errorMessage.set(null);

    this._doConfirm(p).catch((err) => {
      this.status.set('error');
      const m = (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err ?? '');
      this.errorMessage.set(m || 'Could not open the payment page. Please try again.');
    });
  }

  private async _doConfirm(p: Product): Promise<void> {
    const origin = this.resolveOrigin();
    const successUrl = `${origin.replace(/\/+$/, '')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${origin.replace(/\/+$/, '')}/checkout/cancel`;
    const usp = new URLSearchParams(window.location.search);
    const anyScanParam =
      this.scanContextFromState() ||
      !!usp.get('gateway') || !!usp.get('gatewayCode') || !!usp.get('token') ||
      !!usp.get('storeId') || !!usp.get('store');

    const tx = this.transaction();
    let originatingStoreId: string | null = null;
    if (!(tx && tx.id)) {
      const variantStoreId = (p as any)?.variantStoreId ?? p.storeId ?? null;
      const browsingHost = this.productService.getBrowsingHostStore()?.storeId ?? null;
      const priorityScore = (name: string | null | undefined): number => {
        const n = String(name ?? '').toLowerCase();
        if (n.startsWith('storea')) return 0;
        if (n.startsWith('storeb')) return 1;
        if (n.includes('brooklyn')) return 2;
        if (n.includes('sole') || n.includes('uptown')) return 3;
        if (n.includes('downtown') || n.includes('kicks')) return 4;
        return 9;
      };
      if (browsingHost) {
        originatingStoreId = browsingHost;
      } else if (anyScanParam) {
        const fallbackList = await this.productService.getStores();
        const filtered = Array.isArray(fallbackList)
          ? fallbackList
              .filter(s => s?.id && String(s.id) !== String(variantStoreId || ''))
              .sort((a, b) => priorityScore(a?.businessName) - priorityScore(b?.businessName))
          : [];
        originatingStoreId = (filtered[0]?.id as string | undefined)
          ?? ([...(Array.isArray(fallbackList) ? fallbackList : [])]
              .sort((a, b) => priorityScore(a?.businessName) - priorityScore(b?.businessName))[0]?.id as string | undefined)
          ?? variantStoreId;
      } else {
        originatingStoreId = variantStoreId;
      }
    }

    const sessionPromise =
      tx && tx.id
        ? this.productService.createCheckoutSession({
            transactionId: tx.id,
            successUrl,
            cancelUrl,
          })
        : this.productService.createCheckoutSession({
            productId: p.id,
            title: p.title,
            primaryImageUrl: p.primaryImageUrl ?? null,
            amountCents: this.cents(),
            currency: 'USD',
            variantId: p.variantId ?? null,
            successUrl,
            cancelUrl,
            originatingStoreId: originatingStoreId ?? undefined,
          });

    const res = await sessionPromise;
    if (res && res.url) {
      this.status.set('confirmed');
      window.location.href = res.url;
    } else {
      throw new Error(res?.message ?? 'Payment provider did not return a checkout URL.');
    }
  }

  private resolveOrigin(): string {
    if (typeof window === 'undefined' || !window.location) {
      return '';
    }
    const override = (window as any).__FRONTEND_PUBLIC_ORIGIN__ as string | undefined;
    if (override && typeof override === 'string' && override.length > 0) {
      try { const u = new URL(override); return u.origin; } catch { /* ignore */ }
    }
    return window.location.origin;
  }
}
