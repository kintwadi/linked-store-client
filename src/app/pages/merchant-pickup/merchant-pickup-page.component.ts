import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProductService } from '../../services/product.service';
import {
  resolveApiBase,
  resolveApiBasePublic,
} from '../../shared/utils/origins.helper';

@Component({
  selector: 'app-merchant-pickup-page',
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
    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .page-subtitle {
      margin: 0;
      font-size: 15px;
      color: var(--color-muted);
      line-height: 1.6;
    }
    .header {
      display: grid;
      gap: 8px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--color-primary-50);
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .form-card {
      display: grid;
      gap: 14px;
    }
    .form-card label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-ink);
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      font-size: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      line-height: 1.5;
      color: var(--color-ink);
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      resize: vertical;
      min-height: 120px;
    }
    textarea:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-50);
    }
    textarea::placeholder {
      color: var(--color-muted);
      font-family: inherit;
    }
    .result-card {
      display: grid;
      gap: 18px;
    }
    .result-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .result-card h3,
    .result-head h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .result-subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      color: var(--color-muted);
      line-height: 1.5;
    }
    .result-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-secondary {
      background: #fff;
      color: var(--color-ink);
      border: 1px solid var(--color-border);
    }
    .result-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .summary-pill {
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 14px;
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .summary-pill .label {
      font-size: 12px;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
    }
    .summary-pill .value {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-ink);
      line-height: 1.2;
      word-break: break-word;
    }
    .settlement-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .settlement-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: #fff;
      padding: 16px;
      display: grid;
      gap: 12px;
      min-width: 0;
    }
    .settlement-card.highlight {
      background: linear-gradient(180deg, #fcfcff 0%, #f7f5ff 100%);
      border-color: #d9d6fe;
    }
    .settlement-card h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--color-ink);
    }
    .settlement-amount {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.1;
      color: var(--color-ink);
      word-break: break-word;
    }
    .settlement-copy {
      display: grid;
      gap: 8px;
    }
    .settlement-meta {
      display: grid;
      gap: 8px;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 128px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    .meta-row .k {
      color: var(--color-muted);
      font-weight: 500;
    }
    .meta-row .v {
      color: var(--color-ink);
      word-break: break-word;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .info-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: #fff;
      padding: 16px;
      display: grid;
      gap: 12px;
      min-width: 0;
    }
    .info-card h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: var(--color-ink);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: #f9fafb;
      padding: 3px 6px;
      display: inline-block;
      max-width: 100%;
      overflow-wrap: anywhere;
      border-radius: 4px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.ok {
      background: #ecfdf5;
      color: #059669;
    }
    .status-badge.warn {
      background: #fffbeb;
      color: #b45309;
    }
    .status-badge.err {
      background: #fef2f2;
      color: #dc2626;
    }
    .status-badge.info {
      background: var(--color-primary-50);
      color: var(--color-primary);
    }
    .error-box {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      font-size: 14px;
      display: grid;
      gap: 12px;
    }
    .error-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .message-box {
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      font-size: 13px;
    }
    .message-box.info {
      background: var(--color-primary-50);
      color: var(--color-primary);
    }
    .invoice-note {
      font-size: 12px;
      color: var(--color-muted);
      line-height: 1.5;
    }
    @media (max-width: 640px) {
      .wrap {
        padding: 18px 12px 40px;
        gap: 16px;
      }
      .page-title {
        font-size: 24px;
      }
      .result-summary,
      .settlement-grid,
      .info-grid {
        grid-template-columns: 1fr;
      }
      .meta-row {
        grid-template-columns: 1fr;
        gap: 4px;
      }
      .result-actions {
        width: 100%;
      }
      .result-actions .btn {
        flex: 1 1 100%;
      }
      .summary-pill .value,
      .settlement-amount {
        font-size: 22px;
      }
    }
    @media print {
      .back,
      .form-card,
      .error-box,
      .print-hide {
        display: none !important;
      }
      .wrap {
        max-width: none;
        margin: 0;
        padding: 0;
        gap: 16px;
      }
      .card,
      .settlement-card,
      .info-card,
      .summary-pill {
        box-shadow: none !important;
        border-color: #d1d5db !important;
        break-inside: avoid;
      }
      .result-card {
        border: none !important;
        padding: 0 !important;
      }
      .result-head {
        margin-bottom: 8px;
      }
    }
  `],
  template: `
    <div class="wrap">
      <a class="back" [routerLink]="backLink()">← {{ backLabel() }}</a>

      <div class="header">
        <span class="eyebrow">Pickup settlement</span>
        <h1 class="page-title">{{ pageTitle() }}</h1>
        <p class="page-subtitle">{{ pageSubtitle() }}</p>
      </div>

      <section class="card form-card">
        <label for="pickup-token">Pickup Credential</label>
        <textarea
          id="pickup-token"
          rows="5"
          #txt
          placeholder="Paste ls_ QR payload here… OR enter the 8-digit fallback code (e.g. 1234 5678)"
          [value]="tokenInput()"
          (input)="tokenInput.set($any($event.target).value);"></textarea>

        <button
          class="btn btn-primary btn-block"
          (click)="onVerify()"
          [disabled]="verifying() || !tokenInput().trim()">
          @if (verifying()) {
            Verifying and settling…
          } @else {
            Verify and Settle
          }
        </button>
      </section>

      @if (error()) {
        <div class="error-box">
          <span>{{ error() }}</span>
          @if (needsSignIn()) {
            <div class="error-actions print-hide">
              <button class="btn btn-primary" type="button" (click)="signIn()">
                Sign in to verify pickups
              </button>
            </div>
          }
        </div>
      }

      @if (result()) {
        <section class="card result-card">
          <div class="result-head">
            <div>
              <h3>Settlement receipt</h3>
              <p class="result-subtitle">
                Pickup has been verified. Use this receipt for handoff confirmation and invoice printing.
              </p>
            </div>
            <div class="result-actions print-hide">
              <button class="btn btn-secondary" type="button" (click)="printInvoice()">
                Print invoice
              </button>
            </div>
          </div>

          <div class="result-summary">
            <div class="summary-pill">
              <span class="label">Verification</span>
              <span class="value">
                <span class="status-badge" [class]="statusClass(result()!.status)">
                  {{ result()!.status || '—' }}
                </span>
              </span>
            </div>
            <div class="summary-pill">
              <span class="label">Transaction status</span>
              <span class="value">
                @if (result()!.transactionStatus) {
                  <span class="status-badge" [class]="statusClass(result()!.transactionStatus)">
                    {{ result()!.transactionStatus }}
                  </span>
                } @else {
                  —
                }
              </span>
            </div>
            <div class="summary-pill">
              <span class="label">Currency</span>
              <span class="value">{{ result()!.currency || '—' }}</span>
            </div>
          </div>

          <div class="settlement-grid">
            @if (result()!.wholesaleAmountCents !== undefined && result()!.wholesaleAmountCents !== null) {
              <section class="settlement-card highlight">
                <h4>Transfer A: Wholesale to owner</h4>
                <div class="settlement-amount">{{ formatMargin(result()!.wholesaleAmountCents, result()!.currency) }}</div>
                <div class="settlement-meta">
                  @if (result()!.wholesaleToStoreId) {
                    <div class="meta-row">
                      <span class="k">Store</span>
                      <span class="v"><span class="mono">{{ result()!.wholesaleToStoreId }}</span></span>
                    </div>
                  }
                  <div class="meta-row">
                    <span class="k">Transfer ID</span>
                    <span class="v">
                      @if (result()!.wholesaleTransferId) {
                        <span class="mono">{{ result()!.wholesaleTransferId }}</span>
                      } @else {
                        transfer failed / pending
                      }
                    </span>
                  </div>
                </div>
              </section>
            }

            @if (result()!.marginToOriginatingCents !== undefined && result()!.marginToOriginatingCents !== null) {
              <section class="settlement-card">
                <h4>Transfer B: Margin to brokerage</h4>
                <div class="settlement-amount">{{ formatMargin(result()!.marginToOriginatingCents, result()!.currency) }}</div>
                <div class="settlement-meta">
                  @if (result()!.marginToStoreId) {
                    <div class="meta-row">
                      <span class="k">Store</span>
                      <span class="v"><span class="mono">{{ result()!.marginToStoreId }}</span></span>
                    </div>
                  }
                  <div class="meta-row">
                    <span class="k">Transfer ID</span>
                    <span class="v">
                      @if (result()!.stripeTransferId) {
                        <span class="mono">{{ result()!.stripeTransferId }}</span>
                      } @else {
                        transfer failed / pending
                      }
                    </span>
                  </div>
                </div>
              </section>
            }
          </div>

          <div class="info-grid">
            <section class="info-card">
              <h4>Settlement details</h4>
              <div class="settlement-copy">
                @if (result()!.transactionId) {
                  <div class="meta-row">
                    <span class="k">Transaction ID</span>
                    <span class="v"><span class="mono">{{ result()!.transactionId }}</span></span>
                  </div>
                }
                @if (result()!.platformFeeCents !== undefined && result()!.platformFeeCents !== null && result()!.platformFeeCents > 0) {
                  <div class="meta-row">
                    <span class="k">Platform fee retained</span>
                    <span class="v">{{ formatMargin(result()!.platformFeeCents, result()!.currency) }}</span>
                  </div>
                }
                @if (result()!.arbitrageMarginCents !== undefined && result()!.arbitrageMarginCents !== null) {
                  <div class="meta-row">
                    <span class="k">Gross arbitrage margin</span>
                    <span class="v">{{ formatMargin(result()!.arbitrageMarginCents, result()!.currency) }}</span>
                  </div>
                }
                @if (result()!.qrScannedAt) {
                  <div class="meta-row">
                    <span class="k">Verified at</span>
                    <span class="v">{{ formatDateTime(result()!.qrScannedAt) }}</span>
                  </div>
                }
              </div>
            </section>

            <section class="info-card">
              <h4>Invoice note</h4>
              @if (result()!.message) {
                <div class="message-box info">{{ result()!.message }}</div>
              }
              <div class="invoice-note">
                Print this receipt for pickup records, store reconciliation, or internal accounting follow-up.
              </div>
            </section>
          </div>
        </section>
      }
    </div>
  `,
})
export class MerchantPickupPageComponent implements OnInit {
  readonly loading = signal(false);
  readonly tokenInput = signal('');
  readonly verifying = signal(false);
  readonly result = signal<any>(null);
  readonly error = signal<string | null>(null);
  readonly needsSignIn = signal(false);

  constructor(
    private readonly products: ProductService,
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const queryPickup = this.route.snapshot.queryParamMap.get('pickup');
    const navPrefill = (history.state?.prefill ?? '') as string;
    const initial = this.normalizePickupCredential(queryPickup || navPrefill || '');
    if (initial) {
      this.tokenInput.set(initial);
    }
  }

  private currentStoreId(): string | null {
    let cursor: ActivatedRoute | null = this.route;
    while (cursor) {
      const storeId = cursor.snapshot.paramMap.get('storeId');
      if (storeId) return storeId;
      cursor = cursor.parent;
    }
    return null;
  }

  inDashboardContext(): boolean {
    return this.router.url.includes('/admin/stores/');
  }

  backLink(): string[] {
    const storeId = this.currentStoreId();
    if (this.inDashboardContext() && storeId) {
      return ['/admin', 'stores', storeId, 'transactions'];
    }
    return ['/'];
  }

  backLabel(): string {
    return this.inDashboardContext() ? 'Back to dashboard' : 'Back to home';
  }

  pageTitle(): string {
    return this.inDashboardContext() ? 'Pickup Verification' : 'Merchant Pickup';
  }

  pageSubtitle(): string {
    if (this.inDashboardContext()) {
      return 'The fulfilling store scans the runner-provided QR code or manually enters the fallback code to verify pickup and release funds to all participant accounts.';
    }
    return "Scan runner's pickup QR to verify custody and settle the ledger. If scanning fails, manually enter the 8-digit fallback code.";
  }

  private normalizePickupCredential(raw: string): string {
    const input = (raw ?? '').trim();
    if (!input) return '';
    if (!/^https?:\/\//i.test(input)) {
      return input;
    }
    try {
      const url = new URL(input);
      const pickup = url.searchParams.get('pickup');
      if (pickup && pickup.trim()) {
        return pickup.trim();
      }
      const secureToken = url.searchParams.get('secureToken');
      if (secureToken && secureToken.trim()) {
        return secureToken.trim();
      }
      const fallbackCode = url.searchParams.get('fallbackCode');
      if (fallbackCode && fallbackCode.trim()) {
        return fallbackCode.trim();
      }
      return input;
    } catch {
      return input;
    }
  }

  async onVerify(): Promise<void> {
    const token = this.normalizePickupCredential(this.tokenInput());
    if (!token) return;

    this.verifying.set(true);
    this.error.set(null);
    this.needsSignIn.set(false);
    this.result.set(null);
    this.tokenInput.set(token);

    try {
      const res = await this.products.verifyPickup(token);
      this.result.set(res);
    } catch (err: any) {
      const status = Number(err?.status ?? 0);
      const backendMessage =
        (typeof err?.error?.message === 'string' && err.error.message.trim()) ||
        (typeof err?.error === 'string' && err.error.trim()) ||
        '';
      let message = backendMessage;
      if (!message) {
        if (status === 401) {
          message = 'Your session has expired. Please sign in again to verify this pickup.';
        } else if (status === 403) {
          message =
            'Your account is not allowed to verify pickups for this store. Sign in with a store team account of the fulfilling store.';
        } else {
          message = err?.message ?? 'Verification failed. Please check the credential and try again.';
        }
      }
      this.error.set(message);
      this.needsSignIn.set(status === 401 || status === 403);
    } finally {
      this.verifying.set(false);
    }
  }

  /** Full pickup link for the current context, so a sign-in can return here. */
  private pickupRedirectTarget(): string {
    const token = (this.tokenInput() || '').trim();
    const path = this.inDashboardContext() ? this.router.url.split('?')[0] : '/merchant/pickup';
    return token ? `${path}?pickup=${encodeURIComponent(token)}` : path;
  }

  async signIn(): Promise<void> {
    await this.router.navigate(['/staff-login'], {
      queryParams: { redirectTo: this.pickupRedirectTarget() },
    });
  }

  formatMargin(cents: number, currency: string | undefined): string {
    const cur = currency || 'USD';
    return this.products.formatPrice(cents, cur);
  }

  formatDateTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  printInvoice(): void {
    window.print();
  }

  statusClass(s: string): string {
    if (!s) return 'info';
    const lower = s.toLowerCase();
    if (lower.includes('ok') || lower.includes('success') || lower.includes('settled') || lower.includes('verified') || lower.includes('complete')) {
      return 'ok';
    }
    if (lower.includes('fail') || lower.includes('error') || lower.includes('reject') || lower.includes('cancel')) {
      return 'err';
    }
    if (lower.includes('pend') || lower.includes('wait') || lower.includes('process')) {
      return 'warn';
    }
    return 'info';
  }
}
