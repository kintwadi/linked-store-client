import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ProductService } from '../../services/product.service';

type StoreRow = any & {
  _onboardingUrl?: string | null;
  _onboardingLoading?: boolean;
  _dashboardSafeUrl?: SafeUrl | null;
  _dashboardUrl?: string | null;
  _dashboardLoading?: boolean;
  country?: string;
};

const COUNTRY_OPTIONS: readonly { code: string; label: string; currency: string }[] = [
  { code: 'US', label: 'United States',                   currency: 'USD' },
  { code: 'GB', label: 'United Kingdom',                  currency: 'GBP' },
  { code: 'DE', label: 'Germany',                         currency: 'EUR' },
  { code: 'FR', label: 'France',                          currency: 'EUR' },
  { code: 'IT', label: 'Italy',                           currency: 'EUR' },
  { code: 'ES', label: 'Spain',                           currency: 'EUR' },
  { code: 'NL', label: 'Netherlands',                     currency: 'EUR' },
  { code: 'BE', label: 'Belgium',                         currency: 'EUR' },
  { code: 'AT', label: 'Austria',                         currency: 'EUR' },
  { code: 'PT', label: 'Portugal',                        currency: 'EUR' },
  { code: 'IE', label: 'Ireland',                         currency: 'EUR' },
  { code: 'SE', label: 'Sweden',                          currency: 'SEK' },
  { code: 'DK', label: 'Denmark',                         currency: 'DKK' },
  { code: 'NO', label: 'Norway',                          currency: 'NOK' },
  { code: 'CH', label: 'Switzerland',                     currency: 'CHF' },
  { code: 'PL', label: 'Poland',                          currency: 'PLN' },
  { code: 'CZ', label: 'Czechia',                         currency: 'CZK' },
  { code: 'HU', label: 'Hungary',                         currency: 'HUF' },
  { code: 'RO', label: 'Romania',                         currency: 'RON' },
  { code: 'BG', label: 'Bulgaria',                        currency: 'BGN' },
  { code: 'HR', label: 'Croatia',                         currency: 'HRK' },
  { code: 'SK', label: 'Slovakia',                        currency: 'EUR' },
  { code: 'SI', label: 'Slovenia',                        currency: 'EUR' },
  { code: 'LT', label: 'Lithuania',                       currency: 'EUR' },
  { code: 'LV', label: 'Latvia',                          currency: 'EUR' },
  { code: 'EE', label: 'Estonia',                         currency: 'EUR' },
  { code: 'LU', label: 'Luxembourg',                      currency: 'EUR' },
  { code: 'CY', label: 'Cyprus',                          currency: 'EUR' },
  { code: 'MT', label: 'Malta',                           currency: 'EUR' },
  { code: 'FI', label: 'Finland',                         currency: 'EUR' },
  { code: 'GR', label: 'Greece',                          currency: 'EUR' },
  { code: 'CA', label: 'Canada',                          currency: 'CAD' },
  { code: 'AU', label: 'Australia',                       currency: 'AUD' },
  { code: 'NZ', label: 'New Zealand',                     currency: 'NZD' },
  { code: 'IS', label: 'Iceland',                         currency: 'ISK' },
  { code: 'LI', label: 'Liechtenstein',                   currency: 'CHF' },
];

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

function guessCountryCode(store: any): string | null {
  const knowns: Array<[RegExp, string]> = [
    [/\b(US|United States|U\.S\.|USA)\b/i, 'US'],
    [/\b(Germany|Deutschland|DE)\b/i, 'DE'],
    [/\b(France|Français|FR)\b/i, 'FR'],
    [/\b(UK|United Kingdom|Britain|England|Scotland|Wales|GB)\b/i, 'GB'],
    [/\b(Spain|España|ES)\b/i, 'ES'],
    [/\b(Italy|Italia|IT)\b/i, 'IT'],
    [/\b(Netherlands|Nederland|NL)\b/i, 'NL'],
    [/\b(Belgium|Belgi[ëe]|BE)\b/i, 'BE'],
    [/\b(Austria|Österreich|AT)\b/i, 'AT'],
    [/\b(Portugal|PT)\b/i, 'PT'],
    [/\b(Ireland|IE)\b/i, 'IE'],
    [/\b(Sweden|Sverige|SE)\b/i, 'SE'],
    [/\b(Denmark|Danmark|DK)\b/i, 'DK'],
    [/\b(Norway|Norge|NO)\b/i, 'NO'],
    [/\b(Switzerland|Schweiz|Suisse|CH)\b/i, 'CH'],
    [/\b(Poland|Polska|PL)\b/i, 'PL'],
    [/\b(Czechia|Czech|Česko|CZ)\b/i, 'CZ'],
    [/\b(Hungary|Magyarország|HU)\b/i, 'HU'],
    [/\b(Romania|România|RO)\b/i, 'RO'],
    [/\b(Bulgaria|България|BG)\b/i, 'BG'],
    [/\b(Croatia|Hrvatska|HR)\b/i, 'HR'],
    [/\b(Canada|CA)\b/i, 'CA'],
    [/\b(Australia|AU)\b/i, 'AU'],
    [/\b(New Zealand|NZ|Aotearoa)\b/i, 'NZ'],
  ];
  const hay = [store.businessAddress, store.city, store.country, store.region, store.state, store.street, store.displayName, store.businessName]
    .filter(Boolean).join(' | ');
  for (const [rx, code] of knowns) if (rx.test(hay)) return code;
  return null;
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
    .country-row {
      display: grid;
      gap: 6px;
    }
    .country-row label {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }
    .country-row select {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--color-border);
      background: #fff;
      font-size: 14px;
      color: #111827;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
    }
    .country-row select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.15);
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
                  <div class="country-row" style="width:100%;min-width:240px;">
                    <label for="country-{{ store.id }}">Merchant country</label>
                    <select id="country-{{ store.id }}"
                            [value]="store.country || 'US'"
                            (change)="onCountryChange(store, $any($event.target).value)">
                      @for (c of COUNTRY_OPTIONS; track c.code) {
                        <option [value]="c.code">{{ c.label }} · {{ c.currency }}</option>
                      }
                    </select>
                  </div>
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
                  @if (store._dashboardSafeUrl) {
                    <a
                      class="btn btn-ghost"
                      [href]="store._dashboardSafeUrl"
                      target="_blank"
                      rel="noopener noreferrer">
                      Manage Stripe dashboard
                    </a>
                  } @else {
                    <button
                      class="btn btn-ghost"
                      (click)="onManageDashboard(store)"
                      [disabled]="processingStoreId() === store.id">
                      @if (processingStoreId() === store.id || store._dashboardLoading) {
                        Loading…
                      } @else {
                        Manage Stripe dashboard
                      }
                    </button>
                  }
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
  readonly stores = signal<StoreRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly processingStoreId = signal<string | null>(null);
  readonly COUNTRY_OPTIONS = COUNTRY_OPTIONS;

  constructor(
    private readonly products: ProductService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadStores();
  }

  onCountryChange(store: StoreRow, value: string): void {
    store.country = value || 'US';
    store._onboardingUrl = null;
  }

  private async loadStores(): Promise<void> {
    const api = resolveApiBase();
    try {
      const res = await firstValueFrom(this.http.get<any>(`${api}/stores`));
      const arrRaw: StoreRow[] = Array.isArray(res) ? res : (res?.stores ?? res?.data ?? []);
      const arr = arrRaw.map(s => ({
        ...s,
        country: guessCountryCode(s) || 'US',
        _onboardingUrl: null,
        _onboardingLoading: false,
        _dashboardUrl: null,
        _dashboardSafeUrl: null,
        _dashboardLoading: false,
      }));
      this.stores.set(arr);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to load stores.';
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  private async ensureOnboardingLink(store: StoreRow): Promise<string | null> {
    if (store._onboardingUrl) return store._onboardingUrl;
    if (store._onboardingLoading) {
      return await new Promise(resolve => {
        const start = Date.now();
        const iv = window.setInterval(() => {
          if (store._onboardingUrl || !store._onboardingLoading || Date.now() - start > 15000) {
            window.clearInterval(iv);
            resolve(store._onboardingUrl ?? null);
          }
        }, 80);
      });
    }
    store._onboardingLoading = true;
    const api = resolveApiBase();
    const origin = resolvePublicOrigin();
    const url = `${origin}/store/onboarding`;
    try {
      const country = (store.country || 'US').toUpperCase();
      const defaultCurrency = COUNTRY_OPTIONS.find(o => o.code === country)?.currency || 'USD';
      const res = await firstValueFrom(
        this.http.post<any>(`${api}/connect/onboarding-link`, {
          storeId: store.id,
          refreshUrl: url,
          returnUrl: url,
          country,
          defaultCurrency,
        })
      );
      if (!res || res.status === 'error' || !res.url) {
        const msg = res?.message ?? 'Stripe did not return an onboarding URL.';
        throw new Error(msg);
      }
      const u: string = res.url;
      store._onboardingUrl = u;
      return u;
    } catch (err: any) {
      const message = err?.error?.message
        ?? err?.message
        ?? 'Failed to create Stripe onboarding link.';
      throw new Error(message);
    } finally {
      store._onboardingLoading = false;
    }
  }

  private async ensureDashboardLink(store: StoreRow): Promise<string | null> {
    // Do NOT cache LoginLinks: they expire in minutes and fail the next day with a Stripe 404.
    // Always request a fresh one. Also skip the Loading poll loop (we don't cache anymore).
    store._dashboardLoading = true;
    store._dashboardUrl = null;
    store._dashboardSafeUrl = null;
    const api = resolveApiBase();
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${api}/connect/login-link`, { storeId: store.id })
      );
      if (!res || res.status === 'error' || !res.url) {
        const msg = res?.message ?? 'Stripe did not return a dashboard URL.';
        throw new Error(msg);
      }
      const u: string = res.url;
      store._dashboardUrl = u;
      store._dashboardSafeUrl = this.sanitizer.bypassSecurityTrustUrl(u);
      return u;
    } catch (err: any) {
      const message = err?.error?.message
        ?? err?.message
        ?? 'Stripe Express dashboard session could not be created.';
      throw new Error(message);
    } finally {
      store._dashboardLoading = false;
    }
  }

  async onConnectStripe(store: StoreRow): Promise<void> {
    this.processingStoreId.set(store.id);
    try {
      const url = await this.ensureOnboardingLink(store);
      if (!url) throw new Error('Stripe did not return an onboarding URL.');
      // Navigate the CURRENT tab. Stripe explicitly returns users here via returnUrl/refreshUrl.
      // This is the most reliable flow — it cannot be blocked by popup blockers.
      window.location.assign(url);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to create Stripe onboarding link.');
    } finally {
      this.processingStoreId.set(null);
    }
  }

  async onManageDashboard(store: StoreRow): Promise<void> {
    // First try: pre-warmed anchor (link is already rendered, click cannot be blocked).
    if (store._dashboardUrl) {
      // Anchor already works via href — nothing to do (native click follows href).
      return;
    }
    // Not ready yet: fetch in-background, then open current-tab fallback (popup-proof).
    this.processingStoreId.set(store.id);
    try {
      const url = await this.ensureDashboardLink(store);
      if (!url) throw new Error('Stripe did not return a dashboard URL.');
      // Force-open in current tab (cannot be blocked) as a fallback — user will return via back.
      window.location.assign(url);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to open Stripe dashboard.');
    } finally {
      this.processingStoreId.set(null);
    }
  }
}
