import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface Store {
  id: string;
  businessName: string | null;
  subscriptionStatus: string | null;
  onboarded: boolean;
  logoUrl: string | null;
  latitude?: number;
  longitude?: number;
  usersCount?: number;
  transactionCount?: number;
}

type TabKey = 'products' | 'transactions' | 'settings';

@Component({
  selector: 'app-store-dashboard-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 1400px;
      margin: 0 auto;
      padding: 28px 20px 80px;
      display: grid;
      gap: 24px;
    }
    .back {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--color-muted); text-decoration: none; font-size: 14px;
      font-weight: 500;
    }
    .back:hover { color: var(--color-ink, #111827); }

    .hero {
      background: #fff;
      border-radius: 20px;
      padding: 28px 32px;
      color: #111827;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      position: relative;
      overflow: hidden;
      border: 1px solid #f3f4f6;
    }
    .hero::before { display: none; }
    .hero-inner {
      position: relative; z-index: 1;
      display: grid;
      gap: 20px;
    }
    .hero-top {
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px; flex-wrap: wrap;
    }
    .hero-left { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    .logo-or-avatar {
      width: 72px; height: 72px; border-radius: 18px;
      background: #f3f4f6;
      border: 2px solid #e5e7eb;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 28px; color: #4b5563;
      overflow: hidden;
      flex-shrink: 0;
    }
    .logo-or-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .titles { display: grid; gap: 8px; }
    .hero-title { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.01em; color: #111827; }
    .hero-meta {
      display: inline-flex; gap: 10px; flex-wrap: wrap;
      font-size: 13px; color: #6b7280; align-items: center;
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

    .tabs {
      display: inline-flex; gap: 4px; padding: 4px;
      background: #f3f4f6;
      border-radius: 14px;
      justify-self: start;
      border: 1px solid #e5e7eb;
    }
    .tab {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; font-size: 14px; font-weight: 600;
      color: #6b7280; background: transparent;
      border: none; border-radius: 10px; cursor: pointer;
      transition: all 0.18s ease; white-space: nowrap;
      text-decoration: none;
    }
    .tab .ico { font-size: 15px; }
    .tab:hover { color: #111827; background: rgba(255,255,255,0.5); }
    .tab.active {
      background: #fff; color: #111827;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .loading {
      padding: 48px 24px; text-align: center; color: #6b7280; font-size: 14px;
    }
  `],
  template: `
    <div class="wrap">
      <a class="back" routerLink="/admin">← Admin</a>

      @if (storeLoading()) {
        <div class="loading">Loading store…</div>
      } @else if (store()) {
        <header class="hero">
          <div class="hero-inner">
            <div class="hero-top">
              <div class="hero-left">
                <div class="logo-or-avatar">
                  @if (store()!.logoUrl) { <img [src]="store()!.logoUrl" alt="" onerror="this.style.display='none'" /> }
                  @else { 🏪 }
                </div>
                <div class="titles">
                  <h1 class="hero-title">{{ store()!.businessName || 'Store Dashboard' }}</h1>
                  <div class="hero-meta">
                    <span class="status-badge"
                          [class.ok]="store()!.subscriptionStatus === 'ACTIVE'"
                          [class.warn]="store()!.subscriptionStatus === 'SUSPENDED' || store()!.subscriptionStatus === 'PENDING'"
                          [class.err]="store()!.subscriptionStatus === 'CANCELED'"
                          [class.info]="!store()!.subscriptionStatus || store()!.subscriptionStatus === 'TRIAL'">
                      {{ store()!.subscriptionStatus || '—' }}
                    </span>
                    @if (store()!.onboarded) {
                      <span class="status-badge ok">Stripe Connected</span>
                    } @else {
                      <span class="status-badge warn">Stripe Setup Needed</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="tabs" role="tablist">
              <a class="tab" [class.active]="activeTab() === 'products'" routerLink="products">
                <span class="ico">📦</span> Products
              </a>
              <a class="tab" [class.active]="activeTab() === 'transactions'" routerLink="transactions">
                <span class="ico">🧾</span> Transactions
              </a>
              <a class="tab" style="opacity:0.6;pointer-events:none;">
                <span class="ico">⚙️</span> Settings
              </a>
            </div>
          </div>
        </header>

        <router-outlet />
      }
    </div>
  `,
})
export class StoreDashboardShellComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly store = signal<Store | null>(null);
  readonly storeLoading = signal(true);
  readonly activeTab = signal<TabKey>('products');

  private routerSub?: Subscription;

  ngOnInit(): void {
    this.loadStore();
    this.trackActiveTab();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private trackActiveTab(): void {
    const updateFromUrl = () => {
      const url = this.router.url.toLowerCase();
      if (url.includes('/transactions')) {
        this.activeTab.set('transactions');
      } else {
        this.activeTab.set('products');
      }
      this.cdr.markForCheck();
    };
    updateFromUrl();
    this.routerSub = this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) updateFromUrl();
    });
  }

  private async loadStore(): Promise<void> {
    this.storeLoading.set(true);
    try {
      const api = this.authService.resolveApiBasePublic();
      const storeIdParam = this.route.snapshot.paramMap.get('storeId');
      const isMe = storeIdParam === 'me';
      const pathPart = isMe ? 'me' : encodeURIComponent(storeIdParam!);
      const store = await firstValueFrom(
        this.http.get<Store>(`${api}/admin/stores/${pathPart}`)
      );
      this.store.set(store);
    } catch (err) {
      console.error('Failed to load store', err);
    } finally {
      this.storeLoading.set(false);
      this.cdr.markForCheck();
    }
  }
}
