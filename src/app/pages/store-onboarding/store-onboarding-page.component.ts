import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProductService } from '../../services/product.service';

const DEFAULT_PUBLIC_ORIGIN = 'https://linked-store.app';

function resolvePublicOrigin(): string {
  if (typeof window === 'undefined') return DEFAULT_PUBLIC_ORIGIN;
  if (window.__FRONTEND_PUBLIC_ORIGIN__) {
    try {
      return new URL(window.__FRONTEND_PUBLIC_ORIGIN__).origin;
    } catch {
      return window.__FRONTEND_PUBLIC_ORIGIN__.replace(/\/+$/, '');
    }
  }
  if (
    window.location?.hostname &&
    !['localhost', '127.0.0.1', '::1', ''].includes(window.location.hostname)
  ) {
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

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
    __FRONTEND_PUBLIC_ORIGIN__?: string;
    __API_BASE_ORIGIN__?: string;
  }
}

@Component({
  selector: 'app-store-onboarding-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 960px;
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
    .stores-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 720px) {
      .stores-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .store-card {
      display: grid;
      gap: 14px;
    }
    .store-card h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .store-meta {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--color-muted);
    }
    .store-location {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
    }
    .badge-subscription {
      background: var(--color-primary-50);
      color: var(--color-primary);
    }
    .pill-onboarded {
      background: #059669;
      color: #fff;
    }
    .pill-not-connected {
      background: #e5e7eb;
      color: #374151;
    }
    .status-checks {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .status-check {
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .status-check.ok {
      background: #ecfdf5;
      color: #059669;
    }
    .status-check.notok {
      background: #fef2f2;
      color: #dc2626;
    }
    .stripe-connect-id {
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--color-muted);
      background: #f9fafb;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      word-break: break-all;
    }
    .card-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .card-actions .btn {
      flex: 1;
      min-width: 160px;
    }
    .empty, .loading, .error {
      padding: 40px 20px;
      text-align: center;
    }
    .empty { color: var(--color-muted); }
    .loading { color: var(--color-muted); }
    .error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm);
    }
  `],
  template: `
    <div class="wrap">
      <a class="back" routerLink="/">← Back to home</a>

      <div class="header">
        <h1 class="page-title">Store Onboarding</h1>
        <p class="page-subtitle">Connect your Stripe account to receive payouts.</p>
      </div>

      @if (loading()) {
        <div class="loading">Loading stores…</div>
      } @else if (error()) {
        <div class="error">{{ error() }}</div>
      } @else if (stores().length === 0) {
        <div class="empty">No stores found.</div>
      } @else {
        <div class="stores-grid">
          @for (store of stores(); track store.id) {
            <div class="card store-card">
              <h3>{{ store.businessName || store.name || 'Unnamed Store' }}</h3>

              <div class="store-meta">
                <span class="store-location">
                  📍
                  @if (store.latitude !== undefined && store.latitude !== null && store.longitude !== undefined && store.longitude !== null) {
                    {{ store.latitude }}, {{ store.longitude }}
                  } @else {
                    Location
                  }
                </span>
              </div>

              <div class="badge-row">
                <span class="badge badge-subscription">
                  {{ store.subscriptionStatus || store.plan || 'Standard' }}
                </span>
                @if (store.onboarded) {
                  <span class="badge pill-onboarded">Onboarded ✓</span>
                } @else {
                  <span class="badge pill-not-connected">Not connected</span>
                }
              </div>

              @if (store.onboarded) {
                <div class="status-checks">
                  <span class="status-check" [class.ok]="store.chargesEnabled" [class.notok]="!store.chargesEnabled">
                    Charges {{ store.chargesEnabled ? '✓' : '✗' }}
                  </span>
                  <span class="status-check" [class.ok]="store.payoutsEnabled" [class.notok]="!store.payoutsEnabled">
                    Payouts {{ store.payoutsEnabled ? '✓' : '✗' }}
                  </span>
                </div>
              }

              @if (store.stripeConnectId) {
                <div class="stripe-connect-id">
                  @if (store.stripeConnectId.startsWith('acct_placeholder') || store.stripeConnectId.startsWith('demo_') || store.stripeConnectId.includes('placeholder')) {
                    (Demo) {{ store.stripeConnectId }}
                  } @else {
                    {{ store.stripeConnectId }}
                  }
                </div>
              }

              <div class="card-actions">
                @if (!store.onboarded) {
                  <button
                    class="btn btn-primary"
                    (click)="onConnectStripe(store)"
                    [disabled]="processingStoreId() === store.id">
                    @if (processingStoreId() === store.id) {
                      Connecting…
                    } @else {
                      Connect Stripe
                    }
                  </button>
                } @else {
                  <button
                    class="btn btn-ghost"
                    (click)="onManageDashboard(store)"
                    [disabled]="processingStoreId() === store.id">
                    @if (processingStoreId() === store.id) {
                      Loading…
                    } @else {
                      Manage Stripe dashboard
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StoreOnboardingPageComponent implements OnInit {
  readonly loading = signal(true);
  readonly stores = signal<any[]>([]);
  readonly error = signal<string | null>(null);
  readonly processingStoreId = signal<string | null>(null);

  constructor(
    private readonly products: ProductService,
    private readonly router: Router,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.loadStores();
  }

  private async loadStores(): Promise<void> {
    const api = resolveApiBase();
    try {
      const res = await firstValueFrom(this.http.get<any>(`${api}/stores`));
      const arr = Array.isArray(res) ? res : (res?.stores ?? res?.data ?? []);
      this.stores.set(arr);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to load stores.';
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async onConnectStripe(store: any): Promise<void> {
    const api = resolveApiBase();
    this.processingStoreId.set(store.id);
    try {
      const origin = resolvePublicOrigin();
      const url = `${origin}/store/onboarding`;
      const res = await firstValueFrom(
        this.http.post<any>(`${api}/connect/onboarding-link`, {
          storeId: store.id,
          refreshUrl: url,
          returnUrl: url,
        })
      );
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error(res?.message ?? 'Stripe did not return an onboarding URL.');
      }
    } catch (err: any) {
      alert(err?.message ?? 'Failed to create Stripe onboarding link.');
    } finally {
      this.processingStoreId.set(null);
    }
  }

  async onManageDashboard(store: any): Promise<void> {
    const api = resolveApiBase();
    this.processingStoreId.set(store.id);
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${api}/connect/login-link`, {
          storeId: store.id,
        })
      );
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener');
      } else {
        throw new Error(res?.message ?? 'Stripe did not return a dashboard URL.');
      }
    } catch (err: any) {
      alert(err?.message ?? 'Failed to create Stripe dashboard link.');
    } finally {
      this.processingStoreId.set(null);
    }
  }
}
