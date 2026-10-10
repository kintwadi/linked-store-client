import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';

interface StoreCard {
  id: string;
  businessName: string;
  logoUrl?: string | null;
  address?: string | null;
  postalCode?: string | null;
  gatewayCode?: string | null;
  onboarded?: boolean;
  subscriptionStatus?: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      width: 100%;
      position: relative;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f9fafb;
      color: #111827;
      overflow-x: hidden;
    }

    .bg-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.5;
      pointer-events: none;
      z-index: 0;
    }
    .bg-orb.orb-1 {
      width: 520px; height: 520px;
      top: -180px; left: -120px;
      background: radial-gradient(circle, #818cf8 0%, rgba(129,140,248,0) 70%);
    }
    .bg-orb.orb-2 {
      width: 560px; height: 560px;
      bottom: -200px; right: -160px;
      background: radial-gradient(circle, #a78bfa 0%, rgba(167,139,250,0) 70%);
    }

    .page {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      width: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    header {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: #111827;
      font-size: 22px;
      font-weight: 700;
      text-decoration: none;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .brand-icon::after {
      content: '';
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-login {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }
    .btn-login:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(79, 70, 229, 0.35);
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      padding: 10px 20px;
      border-radius: 10px;
      background: #fff;
      color: #4f46e5;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      border: 1px solid #e5e7eb;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-secondary:hover { background: #f5f3ff; }

    /* Hero */
    .hero {
      text-align: center;
      padding: 40px 24px 24px;
      max-width: 720px;
      margin: 0 auto;
    }
    .hero h1 {
      font-size: clamp(28px, 5vw, 44px);
      font-weight: 800;
      line-height: 1.1;
      margin: 0 0 14px;
      background: linear-gradient(135deg, #111827 0%, #4f46e5 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      font-size: 16px;
      color: #6b7280;
      margin: 0;
      line-height: 1.6;
    }

    /* Stores grid */
    .section {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px 80px;
    }
    .section-title {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .section-title h2 {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      color: #111827;
    }
    .section-title .count {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }

    .store-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      cursor: default;
      position: relative;
      overflow: hidden;
    }
    .store-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(79, 70, 229, 0.12);
      border-color: #c7d2fe;
    }
    .store-head {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .store-logo {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 20px;
      color: #fff;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      overflow: hidden;
    }
    .store-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
    }
    .store-meta {
      min-width: 0;
    }
    .store-name {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .store-code {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 500;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }
    .store-addr {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.5;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .store-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: auto;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .badge.connected {
      background: #ecfdf5;
      color: #047857;
    }
    .badge.connected::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .badge.subscription {
      background: #eef2ff;
      color: #4338ca;
    }

    /* Loading + empty */
    .state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: #9ca3af;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e5e7eb;
      border-top-color: #4f46e5;
      border-radius: 50%;
      margin: 0 auto 14px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .state h3 {
      color: #374151;
      font-size: 18px;
      margin: 0 0 8px;
      font-weight: 600;
    }
    .state p { margin: 0; font-size: 14px; }

    @media (max-width: 600px) {
      header { padding: 16px; }
      .hero { padding: 24px 16px 12px; }
      .section { padding: 24px 16px 60px; }
      .nav-actions .btn-secondary { display: none; }
    }
  `],
  template: `
    <div class="page">
      <div class="bg-orb orb-1" aria-hidden="true"></div>
      <div class="bg-orb orb-2" aria-hidden="true"></div>

      <header>
        <div class="brand">
          <span class="brand-icon"></span>
          <span>Vicinity</span>
        </div>
        <div class="nav-actions">
          <a class="btn-secondary" routerLink="/signup">Sign up</a>
          <a class="btn-login" routerLink="/login">Log in</a>
        </div>
      </header>

      <section class="hero">
        <h1>Discover stores near you</h1>
        <p>Browse connected local stores, their products, and shop with confidence through a single hyperlocal network.</p>
      </section>

      <section class="section">
        <div class="section-title">
          <h2>Connected Stores</h2>
          @if (!loading()) {
            <span class="count">{{ stores().length }} store{{ stores().length === 1 ? '' : 's' }}</span>
          }
        </div>

        <div class="grid">
          @if (loading()) {
            <div class="state">
              <div class="spinner"></div>
              <h3>Loading stores…</h3>
            </div>
          } @else if (stores().length === 0) {
            <div class="state">
              <h3>No connected stores yet</h3>
              <p>Check back soon — new stores join the network every day.</p>
            </div>
          } @else {
            @for (store of stores(); track store.id) {
              <div class="store-card">
                <div class="store-head">
                  <div class="store-logo">
                    @if (store.logoUrl) {
                      <img [src]="store.logoUrl" [alt]="store.businessName" onerror="this.style.display='none'" />
                    } @else {
                      {{ initials(store.businessName) }}
                    }
                  </div>
                  <div class="store-meta">
                    <h3 class="store-name" [title]="store.businessName">{{ store.businessName || 'Unnamed Store' }}</h3>
                    @if (store.gatewayCode) {
                      <div class="store-code">Code: {{ store.gatewayCode }}</div>
                    }
                  </div>
                </div>
                @if (store.address || store.postalCode) {
                  <p class="store-addr">{{ locationLine(store) }}</p>
                }
                <div class="store-badges">
                  <span class="badge connected">Connected</span>
                  @if (store.subscriptionStatus) {
                    <span class="badge subscription">{{ store.subscriptionStatus }}</span>
                  }
                </div>
              </div>
            }
          }
        </div>
      </section>
    </div>
  `,
})
export class LandingPageComponent implements OnInit {
  readonly stores = signal<StoreCard[]>([]);
  readonly loading = signal<boolean>(true);

  constructor(private readonly products: ProductService) {}

  async ngOnInit(): Promise<void> {
    try {
      const all = await this.products.getStores();
      const connected = (Array.isArray(all) ? all : [])
        .filter((s: any) => s && (s.onboarded === true || s.subscriptionStatus === 'ACTIVE'))
        .map((s: any) => ({
          id: String(s.id),
          businessName: String(s.businessName ?? ''),
          logoUrl: s.logoUrl ?? null,
          address: s.address ?? null,
          postalCode: s.postalCode ?? null,
          gatewayCode: s.gatewayCode ?? null,
          onboarded: s.onboarded ?? false,
          subscriptionStatus: s.subscriptionStatus ?? null,
        }));
      this.stores.set(connected);
    } catch {
      this.stores.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  initials(name: string): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  }

  locationLine(store: StoreCard): string {
    return [store.address, store.postalCode].filter((v) => !!v).join(', ');
  }
}
