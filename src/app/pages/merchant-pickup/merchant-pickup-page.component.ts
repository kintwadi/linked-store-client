import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProductService } from '../../services/product.service';

function resolveApiBase(): string {
  if (typeof window === 'undefined' || !window.location?.hostname) return '/api';
  const host = window.location.hostname;
  if (['localhost', '127.0.0.1', '::1', ''].includes(host)) return '/api';
  const override = window.__API_BASE_ORIGIN__;
  if (override) {
    try {
      const u = new URL(override);
      return `${u.origin.replace(/\/+$/, '')}/api`;
    } catch {
      return `${override.replace(/\/+$/, '')}/api`;
    }
  }
  return `${window.location.protocol}//${host}:8080/api`;
}

declare global {
  interface Window {
    __API_BASE_ORIGIN__?: string;
  }
}

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
      gap: 12px;
    }
    .result-card h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .result-rows {
      display: grid;
      gap: 8px;
    }
    .result-row {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 12px;
      font-size: 14px;
      padding: 6px 0;
    }
    .result-row .k {
      color: var(--color-muted);
      font-weight: 500;
    }
    .result-row .v {
      color: var(--color-ink);
      word-break: break-word;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: #f9fafb;
      padding: 3px 6px;
      border-radius: 4px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
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
  `],
  template: `
    <div class="wrap">
      <a class="back" routerLink="/">← Back to home</a>

      <div class="header">
        <h1 class="page-title">Merchant Pickup</h1>
        <p class="page-subtitle">Scan runner's pickup QR to verify custody and settle the ledger. If scanning fails, manually enter the 8-digit fallback code.</p>
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
        <div class="error-box">{{ error() }}</div>
      }

      @if (result()) {
        <section class="card result-card">
          <h3>Result</h3>

          <div class="result-rows">
            <div class="result-row">
              <span class="k">Status</span>
              <span class="v">
                <span class="status-badge" [class]="statusClass(result()!.status)">
                  {{ result()!.status || '—' }}
                </span>
              </span>
            </div>

            @if (result()!.transactionId) {
              <div class="result-row">
                <span class="k">Transaction ID</span>
                <span class="v"><span class="mono">{{ result()!.transactionId }}</span></span>
              </div>
            }

            @if (result()!.transactionStatus) {
              <div class="result-row">
                <span class="k">Transaction Status</span>
                <span class="v">
                  <span class="status-badge" [class]="statusClass(result()!.transactionStatus)">
                    {{ result()!.transactionStatus }}
                  </span>
                </span>
              </div>
            }

            @if (result()!.marginAmountCents !== undefined && result()!.marginAmountCents !== null) {
              <div class="result-row">
                <span class="k">Margin</span>
                <span class="v">
                  {{ formatMargin(result()!.marginAmountCents, result()!.currency) }}
                </span>
              </div>
            }

            @if (result()!.currency) {
              <div class="result-row">
                <span class="k">Currency</span>
                <span class="v">{{ result()!.currency }}</span>
              </div>
            }

            @if (result()!.marginToStoreId) {
              <div class="result-row">
                <span class="k">Margin to Store</span>
                <span class="v"><span class="mono">{{ result()!.marginToStoreId }}</span></span>
              </div>
            }

            <div class="result-row">
              <span class="k">Stripe Transfer</span>
              <span class="v">
                @if (result()!.stripeTransferId) {
                  <span class="mono">{{ result()!.stripeTransferId }}</span>
                } @else {
                  (transfer failed / pending)
                }
              </span>
            </div>

            @if (result()!.qrScannedAt) {
              <div class="result-row">
                <span class="k">QR Scanned At</span>
                <span class="v">{{ result()!.qrScannedAt }}</span>
              </div>
            }

            @if (result()!.message) {
              <div class="result-row">
                <span class="k">Message</span>
                <span class="v">
                  <span class="message-box info">{{ result()!.message }}</span>
                </span>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class MerchantPickupPageComponent {
  readonly loading = signal(false);
  readonly tokenInput = signal('');
  readonly verifying = signal(false);
  readonly result = signal<any>(null);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly products: ProductService,
    private readonly http: HttpClient,
  ) {}

  async onVerify(): Promise<void> {
    const token = this.tokenInput().trim();
    if (!token) return;

    this.verifying.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      const res = await this.products.verifyPickup(token);
      this.result.set(res);
    } catch (err: any) {
      const msg = err?.message ?? 'Verification failed. Please check the credential and try again.';
      this.error.set(msg);
    } finally {
      this.verifying.set(false);
    }
  }

  formatMargin(cents: number, currency: string | undefined): string {
    const cur = currency || 'USD';
    return this.products.formatPrice(cents, cur);
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
