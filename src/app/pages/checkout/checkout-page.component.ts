import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { Product } from '../../shared/models/product.model';
import { ProductService } from '../../services/product.service';

type CheckoutStatus = 'reserved' | 'loading' | 'confirmed' | 'error';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, RouterLink, QRCodeModule],
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

    .token-card {
      padding: 22px 20px;
      background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      display: grid;
      gap: 18px;
      justify-items: center;
    }
    .token-card .label {
      justify-self: stretch;
      text-align: left;
      font-size: 12px;
      color: var(--color-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .qr-wrap {
      background: #fff;
      padding: 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
    }
    .qr-wrap ::ng-deep img,
    .qr-wrap ::ng-deep canvas,
    .qr-wrap ::ng-deep svg {
      display: block;
      width: 240px !important;
      height: 240px !important;
    }
    .fallback-block {
      width: 100%;
      display: grid;
      gap: 6px;
      text-align: center;
      background: #fff;
      padding: 14px 16px;
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-sm);
    }
    .fallback-block .sub {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: var(--color-muted);
      text-transform: uppercase;
    }
    .fallback-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 0.32em;
      color: var(--color-ink);
      line-height: 1.1;
      padding: 8px 4px 4px;
    }
    .fallback-code.grp {
      letter-spacing: 0.24em;
    }
    .token-row {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 4px;
      border-top: 1px dashed var(--color-border);
    }
    .token-row .k {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--color-muted);
      text-transform: uppercase;
    }
    .token-row .v {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: var(--color-ink);
      word-break: break-all;
    }
    .copy-btn {
      background: transparent;
      border: 1px solid var(--color-border);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      color: var(--color-muted);
      flex-shrink: 0;
    }
    .copy-btn:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .copy-btn.copied {
      border-color: #059669;
      color: #059669;
      background: #ecfdf5;
    }

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

        @if (transaction()?.qrSecureToken) {
          <div class="token-card">
            <div class="label">Runner pickup credentials</div>

            <div class="qr-wrap">
              <qrcode
                [qrdata]="transaction()!.qrSecureToken!"
                [width]="240"
                [errorCorrectionLevel]="'M'"
                [elementType]="'svg'"
                [ariaLabel]="'Pickup QR code'">
              </qrcode>
            </div>

            <div class="fallback-block">
              <div class="sub">If scanning fails — enter 8-digit code at the store</div>
              @if (formattedFallback()) {
                <div class="fallback-code grp" title="Fallback pickup code">{{ formattedFallback() }}</div>
              } @else {
                <div class="fallback-code grp" style="font-size:22px; letter-spacing:0.2em;">—</div>
              }
              @if (transaction()?.qrFallbackCode) {
                <button
                  type="button"
                  class="copy-btn"
                  [class.copied]="copiedFallback()"
                  (click)="copyFallback(transaction()!.qrFallbackCode!)">
                  @if (copiedFallback()) { Copied ✓ } @else { Copy code }
                </button>
              }
            </div>

            <div class="token-row">
              <div style="min-width:0; display:grid; gap:2px; flex:1;">
                <span class="k">Secure token</span>
                <span class="v">{{ truncateToken(transaction()!.qrSecureToken) }}</span>
              </div>
              <button
                type="button"
                class="copy-btn"
                [class.copied]="copiedToken()"
                (click)="copyToken(transaction()!.qrSecureToken)">
                @if (copiedToken()) { Copied ✓ } @else { Copy }
              </button>
            </div>
          </div>
        }

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
            <div class="row"><span>Tax (estimated)</span><span>{{ formattedTax() }}</span></div>
            <div class="row"><span>Delivery</span><span>Free</span></div>
            <div class="row total"><span>Total</span><span>{{ formattedTotal() }}</span></div>
          </div>
        </section>

        @if (transaction()) {
          <section class="card ledger">
            <h2>Ledger breakdown</h2>
            <div class="rows">
              <div class="row">
                <span>Wholesale to Fulfilling Store</span>
                <span>{{ formatPrice(transaction()!.wholesalePayoutCents ?? 0, transaction()!.currency) }}</span>
              </div>
              <div class="row">
                <span>Originating Store margin</span>
                <span>{{ formatPrice(transaction()!.arbitrageMarginCents ?? 0, transaction()!.currency) }}</span>
              </div>
              <div class="row">
                <span>Platform fee</span>
                <span>{{ formatPrice(0, transaction()!.currency) }}</span>
              </div>
            </div>
          </section>
        }

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
  readonly copiedToken = signal(false);
  readonly copiedFallback = signal(false);

  readonly cents = computed(() => this.product()?.retailPriceCents ?? 0);
  readonly formattedPrice = computed(() => this.formatPrice(this.cents()));
  readonly formattedTax   = computed(() => this.formatPrice(Math.round(this.cents() * 0.08)));
  readonly formattedTotal = computed(() => this.formatPrice(Math.round(this.cents() * 1.08)));
  readonly formattedFallback = computed(() => {
    const raw = this.transaction()?.qrFallbackCode as string | undefined;
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '').padStart(8, '0').slice(0, 8);
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
  });

  formatPrice(cents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  truncateToken(token: string): string {
    if (!token || token.length <= 12) return token;
    return token.slice(0, 6) + '…' + token.slice(-4);
  }

  copyToken(token: string): void {
    if (!token) return;
    this.copiedToken.set(false);
    this.doCopy(token).then(() => {
      this.copiedToken.set(true);
      window.setTimeout(() => this.copiedToken.set(false), 1500);
    });
  }

  copyFallback(code: string): void {
    if (!code) return;
    this.copiedFallback.set(false);
    this.doCopy(code.replace(/\D/g, '')).then(() => {
      this.copiedFallback.set(true);
      window.setTimeout(() => this.copiedFallback.set(false), 1500);
    });
  }

  private doCopy(text: string): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text));
      }
      return Promise.resolve(this.fallbackCopy(text));
    } catch {
      return Promise.resolve(this.fallbackCopy(text));
    }
  }

  private fallbackCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(ta);
  }

  constructor(
    private readonly router: Router,
    private readonly productService: ProductService,
  ) {}

  async ngOnInit(): Promise<void> {
    const nav = this.router.getCurrentNavigation();
    const txId =
      (nav?.extras?.state as any)?.transactionId ??
      (history.state as any)?.transactionId ??
      new URLSearchParams(window.location.search).get('tx');

    if (txId) {
      this.loading.set(true);
      try {
        const tx = await this.productService.getTransaction(txId);
        if (!tx.qrFallbackCode && (history.state as any)?.qrFallbackCode) {
          (tx as any).qrFallbackCode = (history.state as any).qrFallbackCode;
        }
        this.transaction.set(tx);
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
      } catch (err) {
        this.errorMessage.set('Could not load transaction details.');
      } finally {
        this.loading.set(false);
      }
      return;
    }

    const state = nav?.extras?.state as { product?: Product } | undefined;
    const passed = state?.product ?? (history.state?.product as Product | undefined);

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

    try {
      const origin = this.resolveOrigin();
      const successUrl = `${origin.replace(/\/+$/, '')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl  = `${origin.replace(/\/+$/, '')}/checkout/cancel`;

      const tx = this.transaction();
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
            });

      sessionPromise.then((res) => {
        if (res && res.url) {
          this.status.set('confirmed');
          window.location.href = res.url;
        } else {
          throw new Error(res?.message ?? 'Payment provider did not return a checkout URL.');
        }
      }).catch((err) => {
        this.status.set('error');
        const m = (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err ?? '');
        this.errorMessage.set(m || 'Could not open the payment page. Please try again.');
      });
    } catch (err) {
      this.status.set('error');
      this.errorMessage.set('Could not open the payment page. Please try again.');
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
