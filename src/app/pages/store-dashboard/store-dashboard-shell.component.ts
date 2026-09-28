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

type TabKey = 'products' | 'transactions' | 'returns' | 'settings';

interface InspectionRow {
  id: string;
  refundId: string | null;
  transactionId: string | null;
  variantId: string | null;
  productId: string | null;
  productTitle: string | null;
  sku: string | null;
  productImageUrl: string | null;
  fulfillingStoreId: string | null;
  fulfillingStoreName: string | null;
  originatingStoreId: string | null;
  originatingStoreName: string | null;
  quantity: number | null;
  status: string | null;
  notes: string | null;
  createdAt: string | null;
  inspectedAt: string | null;
  canAct: boolean;
}

interface InspectionCounts {
  underInspectionCount: number;
  passedCount: number;
  rejectedCount: number;
  restockedCount: number;
  totalCount: number;
}

interface PaginatedInspections {
  content: InspectionRow[];
  counts: InspectionCounts | null;
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

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

    .tab-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 1px 7px; border-radius: 999px;
      font-size: 11px; font-weight: 800; letter-spacing: 0.01em;
      margin-left: 2px;
    }
    .tab-badge.warn { background: #fff7ed; color: #9a3412; }

    .two-col {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 960px) { .two-col { grid-template-columns: 1fr; } }
    .side-col .panel, .main-col .panel {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
      display: grid;
    }
    .panel-head {
      padding: 18px 22px 14px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
      border-bottom: 1px solid #f3f4f6;
    }
    .panel-head h2 {
      margin: 0; font-size: 16px; font-weight: 700; letter-spacing: -0.01em;
      display: inline-flex; align-items: center; gap: 8px; color: #111827;
    }
    .panel-head h2 .ico {
      width: 28px; height: 28px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      background: #eef2ff; color: #4338ca; font-size: 14px;
    }
    .panel-head .muted { font-size: 12px; color: #6b7280; font-weight: 500; }
    .panel-body { padding: 0; display: grid; }
    .panel-body > * + * { border-top: 1px solid #f3f4f6; }

    .filter-section { padding: 16px 20px; }
    .filter-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      color: #6b7280; margin-bottom: 10px;
    }
    .chip-list { display: grid; gap: 6px; }
    .chip-list .chip {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; font-size: 12px; font-weight: 600;
      border-radius: 10px; border: 1px solid transparent; cursor: pointer;
      transition: all 0.15s ease; background: #f9fafb; color: #374151;
    }
    .chip-list .chip:hover { background: #f3f4f6; }
    .chip-list .chip.active { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; }
    .chip-list .chip.ok.active { border-color: #a7f3d0; background: #ecfdf5; color: #047857; }
    .chip-list .chip.warn.active { border-color: #fed7aa; background: #fff7ed; color: #9a3412; }
    .chip-list .chip.err.active { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    .chip-count {
      font-size: 11px; font-weight: 800;
      padding: 1px 7px; border-radius: 999px; background: #fff;
      color: #4b5563; min-width: 22px; text-align: center;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.04);
    }

    .search-wrap { display: block; }
    .form-input {
      width: 100%; box-sizing: border-box; padding: 10px 12px;
      font-size: 13px; color: #111827; background: #fff;
      border: 1px solid #d1d5db; border-radius: 10px;
      font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease;
    }
    .form-input:focus {
      outline: none; border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    }

    .pagination {
      padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; flex-wrap: wrap;
    }
    .pagination-info { font-size: 12px; color: #6b7280; font-weight: 500; }
    .pagination-buttons { display: flex; gap: 6px; }

    .btn-ghost {
      font-family: inherit; font-size: 12px; font-weight: 600;
      padding: 7px 12px; border: 1px solid #e5e7eb;
      border-radius: 8px; background: #fff; color: #374151; cursor: pointer;
      transition: all 0.15s;
    }
    .btn-ghost:hover { background: #f9fafb; }
    .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-xs { font-size: 11px; padding: 5px 10px; border-radius: 7px; }

    .btn-success {
      font-family: inherit; font-weight: 600;
      padding: 7px 12px; border: 1px solid #a7f3d0; background: #ecfdf5; color: #047857;
      border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
      transition: all 0.15s;
    }
    .btn-success:hover { background: #d1fae5; }
    .btn-success:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-danger {
      font-family: inherit; font-weight: 600;
      padding: 7px 12px; border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c;
      border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
      transition: all 0.15s;
    }
    .btn-danger:hover { background: #fee2e2; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

    .chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; font-size: 11px; font-weight: 700;
      border-radius: 999px; background: #eef2ff; color: #4338ca;
      letter-spacing: 0.02em;
    }
    .chip.warn { background: #fff7ed; color: #9a3412; }
    .chip.err  { background: #fef2f2; color: #991b1b; }
    .chip.ok   { background: #ecfdf5; color: #047857; }
    .chip.purple { background: #f3e8ff; color: #6b21a8; }
    .chip.info   { background: #eff6ff; color: #1d4ed8; }

    .banner {
      padding: 14px 16px;
      border-radius: 14px;
      display: flex; align-items: flex-start; gap: 12px;
      margin-bottom: 16px;
    }
    .banner .banner-ico {
      width: 30px; height: 30px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .banner .banner-text { display: grid; gap: 2px; flex: 1; }
    .banner .banner-title { font-size: 13px; font-weight: 700; color: #111827; }
    .banner .banner-msg   { font-size: 12px; color: #4b5563; line-height: 1.5; }
    .banner.info    { background: #eff6ff; border: 1px solid #bfdbfe; }
    .banner.info    .banner-ico { background: #dbeafe; color: #1d4ed8; }
    .banner.success { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .banner.success .banner-ico { background: #d1fae5; color: #047857; }
    .banner.warn    { background: #fffbeb; border: 1px solid #fde68a; }
    .banner.warn    .banner-ico { background: #fef3c7; color: #b45309; }
    .banner.danger  { background: #fef2f2; border: 1px solid #fecaca; }
    .banner.danger  .banner-ico { background: #fee2e2; color: #b91c1c; }

    .table-wrap { overflow-x: auto; }
    table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      font-size: 13px;
    }
    th {
      text-align: left; padding: 12px 16px;
      font-weight: 600; font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;
      background: #f9fafb; position: sticky; top: 0; z-index: 1;
    }
    th:first-child { border-radius: 18px 0 0 0; }
    th:last-child  { border-radius: 0 18px 0 0; }
    td {
      padding: 14px 16px;
      color: #111827; vertical-align: middle;
      border-top: 1px solid #f3f4f6;
    }
    tbody tr { transition: background .15s ease; }
    tbody tr:hover td { background: #fafbff; }

    .cell-identity { display: flex; align-items: center; gap: 10px; }
    .cell-text { display: grid; gap: 2px; }
    .cell-title { font-weight: 700; color: #111827; font-size: 13px; }
    .cell-meta  { font-size: 11px; color: #6b7280; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px; color: #4b5563; background: #f3f4f6;
      padding: 2px 6px; border-radius: 5px; font-weight: 500;
    }

    .row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .row-actions .btn { padding: 5px 10px; font-size: 11px; font-weight: 600; border-radius: 7px; gap: 4px; }
    .row-actions .btn .ico { font-size: 11px; }

    .empty {
      padding: 48px 24px; text-align: center; color: #6b7280; font-size: 14px;
      display: grid; gap: 6px; justify-items: center;
    }
    .empty .ico {
      width: 48px; height: 48px; border-radius: 14px;
      background: #f3f4f6; color: #9ca3af;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 22px; margin-bottom: 2px;
    }
    .empty h4 { margin: 0; font-size: 15px; font-weight: 700; color: #111827; }
    .empty p  { margin: 0; font-size: 12px; color: #6b7280; max-width: 340px; }
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
              <a class="tab" [class.active]="activeTab() === 'returns'" (click)="activeTab.set('returns')">
                <span class="ico">🔄</span> Returns
                @if (returnsCounts() && returnsCounts()!.underInspectionCount > 0) {
                  <span class="tab-badge warn">{{ returnsCounts()!.underInspectionCount }}</span>
                }
              </a>
              <a class="tab" style="opacity:0.6;pointer-events:none;">
                <span class="ico">⚙️</span> Settings
              </a>
            </div>
          </div>
        </header>

        @switch (activeTab()) {
          @case ('returns') {
            @if (returnsSuccess()) {
              <div class="banner success">
                <span class="banner-ico">✅</span>
                <div class="banner-text">
                  <div class="banner-title">Success</div>
                  <div class="banner-msg">{{ returnsSuccess() }}</div>
                </div>
              </div>
            }
            @if (returnsError()) {
              <div class="banner danger">
                <span class="banner-ico">⚠️</span>
                <div class="banner-text">
                  <div class="banner-title">Error</div>
                  <div class="banner-msg">{{ returnsError() }}</div>
                </div>
              </div>
            }
            <div class="two-col">
              <aside class="side-col">
                <div class="panel">
                  <div class="panel-head">
                    <h2><span class="ico">🔍</span> Filters</h2>
                  </div>
                  <div class="panel-body">
                    <div class="filter-section">
                      <div class="filter-title">Status</div>
                      <div class="chip-list">
                        <button class="chip" [class.ok]="!returnsFilterStatus()" (click)="returnsFilterStatus.set(null); loadReturns()">
                          All <span class="chip-count">{{ returnsCounts()?.totalCount ?? 0 }}</span>
                        </button>
                        <button class="chip warn" [class.active]="returnsFilterStatus() === 'UNDER_INSPECTION'" (click)="returnsFilterStatus.set('UNDER_INSPECTION'); loadReturns()">
                          Under Inspection <span class="chip-count">{{ returnsCounts()?.underInspectionCount ?? 0 }}</span>
                        </button>
                        <button class="chip ok" [class.active]="returnsFilterStatus() === 'RESTOCKED'" (click)="returnsFilterStatus.set('RESTOCKED'); loadReturns()">
                          Restocked <span class="chip-count">{{ returnsCounts()?.restockedCount ?? 0 }}</span>
                        </button>
                        <button class="chip err" [class.active]="returnsFilterStatus() === 'REJECTED'" (click)="returnsFilterStatus.set('REJECTED'); loadReturns()">
                          Rejected <span class="chip-count">{{ returnsCounts()?.rejectedCount ?? 0 }}</span>
                        </button>
                      </div>
                    </div>
                    <div class="filter-section">
                      <div class="filter-title">Search</div>
                      <div class="search-wrap">
                        <input
                          class="form-input"
                          type="text"
                          placeholder="Search SKU or product…"
                          [value]="returnsSearch()"
                          (keyup.enter)="onSearchEnter($event)"
                        />
                      </div>
                    </div>
                    <div class="pagination">
                      <div class="pagination-info">
                        Page {{ returnsPage() + 1 }} · size {{ returnsSize() }}
                      </div>
                      <div class="pagination-buttons">
                        <button class="btn-ghost btn-xs" [disabled]="returnsPage() === 0" (click)="prevPage()">← Prev</button>
                        <button class="btn-ghost btn-xs" [disabled]="returns().length < returnsSize()" (click)="nextPage()">Next →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              <section class="main-col">
                <div class="panel">
                  <div class="panel-head">
                    <div class="section-title-wrap">
                      <h2><span class="ico">🔄</span> Returns &amp; Inspections</h2>
                      <span class="muted">Store-scoped view · partner actions only</span>
                    </div>
                  </div>
                  <div class="panel-body">
                    @if (returnsLoading()) {
                      <div class="loading">Loading returns…</div>
                    } @else if (returns().length === 0) {
                      <div class="empty">
                        <span class="ico">📭</span>
                        <h4>No returns found</h4>
                        <p>Returns for this store will appear here once refunds complete and items are queued for inspection.</p>
                      </div>
                    } @else {
                      <div class="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Partner Store</th>
                              <th>Qty</th>
                              <th>Refunded at</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of returns(); track row.id) {
                              <tr>
                                <td>
                                  <div class="cell-identity">
                                    <div class="logo-or-avatar" style="width:40px;height:40px;border-radius:10px;font-size:16px;">
                                      @if (row.productImageUrl) { <img [src]="row.productImageUrl" alt="" onerror="this.style.display='none'" /> }
                                      @else { 📦 }
                                    </div>
                                    <div class="cell-text">
                                      <div class="cell-title">{{ row.productTitle || '—' }}</div>
                                      <div class="cell-meta"><span class="mono">{{ row.sku || 'N/A' }}</span></div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div class="cell-text">
                                    @if (store() && store()!.id === row.fulfillingStoreId) {
                                      <div class="cell-title">{{ row.originatingStoreName || '—' }}</div>
                                      <div class="cell-meta">Partner (origin)</div>
                                    } @else {
                                      <div class="cell-title">{{ row.fulfillingStoreName || '—' }}</div>
                                      <div class="cell-meta">Partner (fulfilling)</div>
                                    }
                                  </div>
                                </td>
                                <td><span class="cell-title">{{ row.quantity ?? 1 }}</span></td>
                                <td>
                                  <div class="cell-text">
                                    <div class="cell-title">{{ row.createdAt ? (row.createdAt | slice:0:10) : '—' }}</div>
                                    <div class="cell-meta">{{ row.createdAt ? (row.createdAt | slice:11:16) : '' }}</div>
                                  </div>
                                </td>
                                <td>
                                  <span [class]="formatStatusChip(row.status).cls">{{ formatStatusChip(row.status).label }}</span>
                                </td>
                                <td>
                                  <div class="row-actions">
                                    @if (row.canAct && row.status === 'UNDER_INSPECTION') {
                                      <button
                                        class="btn btn-success btn-xs"
                                        [disabled]="actingRowId() === row.id"
                                        (click)="onApproveReturn(row)">
                                        @if (actingRowId() === row.id) { ⏳ } @else { ✓ }
                                        Approve
                                      </button>
                                      <button
                                        class="btn btn-danger btn-xs"
                                        [disabled]="actingRowId() === row.id"
                                        (click)="onRejectReturn(row)">
                                        @if (actingRowId() === row.id) { ⏳ } @else { ✕ }
                                        Reject
                                      </button>
                                    } @else if (!row.canAct && row.status === 'UNDER_INSPECTION') {
                                      <span class="chip info">
                                        Inspection pending at {{ store()!.id === row.fulfillingStoreId ? row.originatingStoreName : row.fulfillingStoreName }}
                                      </span>
                                    } @else if (row.transactionId) {
                                      <button class="btn btn-ghost btn-xs" (click)="navigateToRefund(row.transactionId)">
                                        View Refund
                                      </button>
                                    }
                                  </div>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                </div>
              </section>
            </div>
          }
          @default {
            <router-outlet />
          }
        }
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

  readonly returns = signal<InspectionRow[]>([]);
  readonly returnsLoading = signal(false);
  readonly returnsCounts = signal<InspectionCounts | null>(null);
  readonly returnsFilterStatus = signal<string | null>(null);
  readonly returnsSearch = signal('');
  readonly returnsPage = signal(0);
  readonly returnsSize = signal(20);
  readonly actingRowId = signal<string | null>(null);
  readonly returnsError = signal<string | null>(null);
  readonly returnsSuccess = signal<string | null>(null);

  private routerSub?: Subscription;

  ngOnInit(): void {
    this.loadStore();
    this.trackActiveTab();
    this.watchActiveTabReturns();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private trackActiveTab(): void {
    const updateFromUrl = () => {
      const url = this.router.url.toLowerCase();
      if (url.includes('/transactions')) {
        this.activeTab.set('transactions');
      } else if (url.includes('/returns')) {
        this.activeTab.set('returns');
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

  private watchActiveTabReturns(): void {
    queueMicrotask(() => {
      if (this.activeTab() === 'returns') {
        this.loadReturns();
      }
    });
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        if (this.activeTab() === 'returns') {
          this.loadReturns();
        }
      }
    });
  }

  async loadReturns(): Promise<void> {
    this.returnsLoading.set(true);
    this.returnsError.set(null);
    try {
      const api = this.authService.resolveApiBasePublic();
      const params = new URLSearchParams();
      params.set('page', String(this.returnsPage()));
      params.set('size', String(this.returnsSize()));
      if (this.returnsFilterStatus()) {
        params.set('status', this.returnsFilterStatus()!);
      }
      if (this.returnsSearch().trim()) {
        params.set('search', this.returnsSearch().trim());
      }
      const result = await firstValueFrom(
        this.http.get<PaginatedInspections>(`${api}/admin/returns?${params.toString()}`)
      );
      this.returns.set(result.content || []);
      this.returnsCounts.set(result.counts || null);
    } catch (err) {
      console.error('Failed to load returns', err);
      this.returnsError.set('Failed to load returns list.');
    } finally {
      this.returnsLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async onApproveReturn(row: InspectionRow): Promise<void> {
    if (!row.canAct || this.actingRowId()) return;
    const confirmed = window.confirm('Approve return — restock to live inventory?');
    if (!confirmed) return;
    this.actingRowId.set(row.id);
    this.returnsError.set(null);
    try {
      const api = this.authService.resolveApiBasePublic();
      await firstValueFrom(
        this.http.post<InspectionRow>(`${api}/admin/returns/${row.id}/approve`, { notes: '' })
      );
      this.returnsSuccess.set('Return approved and restocked to inventory.');
      setTimeout(() => this.returnsSuccess.set(null), 3500);
      const idx = this.returns().findIndex(r => r.id === row.id);
      if (idx >= 0) {
        const updated = [...this.returns()];
        updated[idx] = { ...updated[idx], status: 'RESTOCKED', canAct: false };
        this.returns.set(updated);
      }
      setTimeout(() => this.loadReturns(), 500);
    } catch (err) {
      console.error('Failed to approve return', err);
      this.returnsError.set('Failed to approve return. The item may already have been processed.');
    } finally {
      this.actingRowId.set(null);
      this.cdr.markForCheck();
    }
  }

  async onRejectReturn(row: InspectionRow): Promise<void> {
    if (!row.canAct || this.actingRowId()) return;
    const reason = window.prompt('Reason for rejection (required):') || 'No reason provided';
    this.actingRowId.set(row.id);
    this.returnsError.set(null);
    try {
      const api = this.authService.resolveApiBasePublic();
      await firstValueFrom(
        this.http.post<InspectionRow>(`${api}/admin/returns/${row.id}/reject`, { notes: reason })
      );
      this.returnsSuccess.set('Return rejected; item not restocked.');
      setTimeout(() => this.returnsSuccess.set(null), 3500);
      const idx = this.returns().findIndex(r => r.id === row.id);
      if (idx >= 0) {
        const updated = [...this.returns()];
        updated[idx] = { ...updated[idx], status: 'REJECTED', canAct: false, notes: reason };
        this.returns.set(updated);
      }
      setTimeout(() => this.loadReturns(), 500);
    } catch (err) {
      console.error('Failed to reject return', err);
      this.returnsError.set('Failed to reject return.');
    } finally {
      this.actingRowId.set(null);
      this.cdr.markForCheck();
    }
  }

  formatStatusChip(status: string | null): { cls: string; label: string } {
    switch (status) {
      case 'UNDER_INSPECTION':
        return { cls: 'chip warn', label: 'Under Inspection' };
      case 'PASSED_INSPECTION':
        return { cls: 'chip info', label: 'Passed Inspection' };
      case 'RESTOCKED':
        return { cls: 'chip ok', label: 'Restocked' };
      case 'REJECTED':
        return { cls: 'chip err', label: 'Rejected' };
      default:
        return { cls: 'chip purple', label: status || '—' };
    }
  }

  navigateToRefund(txId: string | null): void {
    if (txId) {
      this.router.navigate(['/admin', 'refunds', txId]);
    }
  }

  onSearchEnter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.returnsSearch.set(input.value || '');
    this.loadReturns();
  }

  prevPage(): void {
    if (this.returnsPage() > 0) {
      this.returnsPage.set(this.returnsPage() - 1);
      this.loadReturns();
    }
  }

  nextPage(): void {
    if (this.returns().length >= this.returnsSize()) {
      this.returnsPage.set(this.returnsPage() + 1);
      this.loadReturns();
    }
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
