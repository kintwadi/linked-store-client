import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

type PickupStatusFilter = 'PAID' | 'PICKED_UP' | 'READY';

type PickupTx = {
  id: string;
  status: string;
  totalRetailCents: number;
  wholesalePayoutCents: number;
  arbitrageMarginCents: number;
  currency: string;
  productId?: string;
  productTitle?: string;
  productImageUrl?: string;
  variantId?: string;
  sku?: string;
  variantAttributesJson?: string;
  qrSecureToken?: string;
  qrFallbackCode?: string;
  originatingStoreId?: string;
  fulfillingStoreId?: string;
  stripePaymentIntentId?: string;
  createdAt?: string;
  updatedAt?: string;
  originatingStoreName?: string;
  fulfillingStoreName?: string;
};

@Component({
  selector: 'app-runner-pickup-page',
  standalone: true,
  imports: [CommonModule, RouterLink, QRCodeModule],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px 16px 64px;
      display: grid;
      gap: 20px;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
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
    .header {
      display: grid;
      gap: 8px;
    }
    .page-title { margin: 0; font-size: 28px; font-weight: 700; }
    .page-subtitle {
      margin: 0;
      font-size: 15px;
      color: var(--color-muted);
      line-height: 1.6;
    }
    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--color-border);
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      color: var(--color-muted);
      background: #fff;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--color-ok);
      box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
    }
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      background: #fff;
      border: 1px solid var(--color-border);
      padding: 6px;
      border-radius: 14px;
    }
    .tab {
      appearance: none;
      border: none;
      background: transparent;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab:hover { color: var(--color-ink); }
    .tab.active {
      background: linear-gradient(135deg, var(--color-primary), #8b5cf6);
      color: #fff;
      box-shadow: 0 6px 18px -8px rgba(99, 102, 241, 0.55);
    }
    .toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .btn {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
      border: 1px solid var(--color-border);
      background: #fff;
      color: var(--color-ink);
      cursor: pointer;
      transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
      text-decoration: none;
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 10px 26px -16px rgba(0,0,0,0.3); }
    .btn-primary {
      background: linear-gradient(135deg, var(--color-primary), #8b5cf6);
      border-color: transparent;
      color: #fff;
    }
    .btn-primary:hover { box-shadow: 0 10px 26px -14px rgba(99, 102, 241, 0.65); }
    .btn-ghost { background: #fff; }
    .btn[disabled] { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .card {
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 16px;
      display: grid;
      gap: 12px;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 140px; height: 140px;
      background: radial-gradient(circle, rgba(99,102,241,0.14), transparent 60%);
      pointer-events: none;
    }
    .card-head {
      display: grid;
      grid-template-columns: 64px 1fr auto;
      gap: 12px;
      align-items: center;
      position: relative;
    }
    .thumb {
      width: 64px; height: 64px; border-radius: 12px;
      background: linear-gradient(135deg, #eef2ff, #fdf4ff);
      background-size: cover;
      background-position: center;
      border: 1px solid var(--color-border);
      flex-shrink: 0;
    }
    .card-title { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.3; }
    .card-sub { margin: 2px 0 0; font-size: 12px; color: var(--color-muted); }
    .status {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .status.ok { background: #dcfce7; color: #166534; }
    .status.info { background: #dbeafe; color: #1e40af; }
    .status.warn { background: #fef3c7; color: #92400e; }
    .status.muted { background: #f1f5f9; color: #475569; }
    .store-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 12px;
      color: var(--color-muted);
    }
    .store-row strong { color: var(--color-ink); display: block; font-size: 12px; }
    .qr-wrap {
      display: grid;
      place-items: center;
      padding: 10px;
      background: linear-gradient(135deg, #f8fafc, #fff);
      border: 1px dashed var(--color-border);
      border-radius: 14px;
    }
    .qr-wrap .fallback {
      margin-top: 8px;
      display: grid;
      gap: 2px;
      text-align: center;
    }
    .fb-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.3em;
      padding: 6px 10px;
      border-radius: 10px;
      background: #fff;
      border: 1px solid var(--color-border);
      color: var(--color-ink);
    }
    .fb-label { font-size: 11px; color: var(--color-muted); }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 12px;
    }
    .meta > div {
      background: #fafbff;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 8px 10px;
      display: grid;
      gap: 2px;
    }
    .meta span { color: var(--color-muted); font-size: 11px; }
    .meta strong { color: var(--color-ink); font-size: 13px; font-weight: 700; }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .empty {
      display: grid;
      gap: 12px;
      place-items: center;
      padding: 48px 24px;
      background: #fff;
      border: 1px dashed var(--color-border);
      border-radius: 16px;
      color: var(--color-muted);
      text-align: center;
    }
    .empty h3 { margin: 0; color: var(--color-ink); font-size: 18px; }
    .empty p { margin: 0; font-size: 14px; line-height: 1.6; }
    .page-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .page-info { font-size: 12px; color: var(--color-muted); }
    .copy-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      background: #fff;
      color: var(--color-muted);
      cursor: pointer;
    }
    .copy-chip:hover { color: var(--color-ink); background: #fafafa; }
    @media (max-width: 640px) {
      .page-title { font-size: 22px; }
      .card-head { grid-template-columns: 56px 1fr; }
      .card-head .status { grid-column: 1 / -1; justify-self: start; }
      .store-row, .meta, .actions { grid-template-columns: 1fr; }
    }
  `],
  template: `
    <div class="wrap">
      <div class="top">
        <a routerLink="/" class="back">← Back to home</a>
        <div class="hero-meta">
          <span class="pill"><span class="dot"></span>Live · runner queue</span>
          <span class="pill">Signed in as {{ roleLabel() }}</span>
          <a routerLink="/admin" class="btn btn-ghost">Open dashboard</a>
        </div>
      </div>

      <div class="header">
        <h1 class="page-title">Runner · Pickup queue</h1>
        <p class="page-subtitle">
          All items that have been paid for and are ready for pickup. Show the QR code or the 8-digit fallback to a store associate to verify handoff.
        </p>
      </div>

      <div class="toolbar">
        <div class="tabs" role="tablist" aria-label="Pickup status filter">
          <button
            type="button"
            class="tab"
            [class.active]="filter() === 'PAID'"
            (click)="setFilter('PAID')">
            Ready for pickup · {{ countFor('PAID') }}
          </button>
          <button
            type="button"
            class="tab"
            [class.active]="filter() === 'READY'"
            (click)="setFilter('READY')">
            Accepted (waiting payment) · {{ countFor('READY') }}
          </button>
          <button
            type="button"
            class="tab"
            [class.active]="filter() === 'PICKED_UP'"
            (click)="setFilter('PICKED_UP')">
            Completed · {{ countFor('PICKED_UP') }}
          </button>
        </div>
        <span style="flex:1"></span>
        <button type="button" class="btn btn-ghost" [disabled]="loading()" (click)="reload()">⟳ Reload</button>
        <a routerLink="/merchant/pickup" class="btn btn-primary">Open scanner →</a>
      </div>

      @if (loading()) {
        <div class="empty">
          <h3>Loading pickups…</h3>
          <p>Fetching items assigned to you from the queue.</p>
        </div>
      } @else {
        @if (visible().length === 0) {
          <div class="empty">
            <h3>No pickups here 🎉</h3>
            <p>
              @switch (filter()) {
                @case ('PAID') { Nothing is currently waiting to be picked up. When a customer pays, the item will appear here. }
                @case ('READY') { No stores have accepted a request yet — once they mark an item ready, it will show here until payment completes. }
                @case ('PICKED_UP') { You haven't picked anything up yet in this window. Once you scan items at the store, they will appear here. }
              }
            </p>
            <div style="display:flex; gap:8px; margin-top:8px;">
              <a routerLink="/admin" class="btn btn-primary">Go to dashboard</a>
              <a routerLink="/" class="btn btn-ghost">Browse stores</a>
            </div>
          </div>
        } @else {
          <div class="grid">
            @for (tx of visible(); track tx.id) {
              <article class="card">
                <div class="card-head">
                  <div class="thumb" [attr.style]="tx.productImageUrl ? 'background-image:url(' + tx.productImageUrl + ')' : ''"></div>
                  <div>
                    <h3 class="card-title">{{ tx.productTitle ?? 'Product #' + (tx.productId ?? tx.id).slice(0,8) }}</h3>
                    <p class="card-sub">
                      @if (tx.sku) { SKU <code>{{ tx.sku }}</code> · }
                      {{ tx.fulfillingStoreName ?? (tx.fulfillingStoreId ?? '').slice(0,8) }}
                    </p>
                  </div>
                  <span class="status" [ngClass]="statusClass(tx.status)">{{ tx.status }}</span>
                </div>

                <div class="store-row">
                  <div>
                    <span style="font-size:11px">From (origin)</span>
                    <strong>{{ tx.originatingStoreName ?? 'Store' }}</strong>
                  </div>
                  <div>
                    <span style="font-size:11px">Pickup at (fulfill)</span>
                    <strong>{{ tx.fulfillingStoreName ?? 'Store' }}</strong>
                  </div>
                </div>

                <div class="qr-wrap">
                  @if (tx.qrSecureToken) {
                    <qrcode
                      [qrdata]="tx.qrSecureToken"
                      [width]="220"
                      [errorCorrectionLevel]="'M'"
                      [elementType]="'svg'"
                      [colorDark]="'#1a1a2e'"
                      [colorLight]="'#ffffff'"
                      [margin]="0"></qrcode>
                  } @else {
                    <div style="padding:60px 20px; color:var(--color-muted); font-size:13px; text-align:center;">
                      No QR token available for this item yet.
                    </div>
                  }
                  <div class="fallback">
                    @if (tx.qrFallbackCode) {
                      <div class="fb-code">{{ formattedFallback(tx.qrFallbackCode) }}</div>
                      <div class="fb-label">
                        Fallback code
                        <button type="button" class="copy-chip" (click)="copyText(tx.qrFallbackCode!)">📋 copy</button>
                      </div>
                    } @else {
                      <div class="fb-label">Fallback code unavailable</div>
                    }
                  </div>
                </div>

                <div class="meta">
                  <div>
                    <span>Amount</span>
                    <strong>{{ formatPrice(tx.totalRetailCents, tx.currency) }}</strong>
                  </div>
                  <div>
                    <span>TX short</span>
                    <strong style="font-family:ui-monospace,monospace;">{{ tx.id.slice(0, 8) }}</strong>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{{ tx.createdAt ? formatRelative(tx.createdAt) : '—' }}</strong>
                  </div>
                  <div>
                    <span>Pickup type</span>
                    <strong>Runner handoff</strong>
                  </div>
                </div>

                <div class="actions">
                  <a
                    class="btn btn-primary"
                    [routerLink]="'/merchant/pickup'"
                    [state]="{ prefill: tx.qrSecureToken ?? tx.qrFallbackCode ?? tx.id }">
                    Scan & verify
                  </a>
                  <button
                    type="button"
                    class="btn btn-ghost"
                    (click)="copyText(tx.qrSecureToken ?? tx.qrFallbackCode ?? tx.id)">
                    📋 Copy code
                  </button>
                </div>
              </article>
            }
          </div>

          <div class="page-bar">
            <div class="page-info">
              Showing {{ visible().length }} of {{ totalCount() }} {{ filter() }} items.
            </div>
            <div style="display:flex; gap:8px;">
              <button
                type="button"
                class="btn btn-ghost"
                [disabled]="!hasPrevious()"
                (click)="goPrev()">← Previous</button>
              <button
                type="button"
                class="btn btn-ghost"
                [disabled]="!hasNext()"
                (click)="goNext()">Next →</button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class RunnerPickupPageComponent implements OnInit {
  readonly items = signal<PickupTx[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<PickupStatusFilter>('PAID');
  readonly page = signal(0);
  readonly pageSize = signal(50);
  readonly totalCount = signal(0);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly runnerName = signal<string>('Runner');

  readonly visible = signal<PickupTx[]>([]);

  constructor(
    private readonly products: ProductService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  roleLabel(): string {
    const u = this.auth.currentUser$.getValue();
    const role = u?.role ?? 'RUNNER';
    const email = u?.email ?? '';
    return `${role}${email ? ' · ' + email.split('@')[0] : ''}`;
  }

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirectTo: '/runner/pickup' } });
      return;
    }
    const u = this.auth.currentUser$.getValue();
    if (u?.email) {
      this.runnerName.set(u.email.split('@')[0]);
    }
    this.reload();
  }

  setFilter(f: PickupStatusFilter): void {
    this.filter.set(f);
    this.page.set(0);
    this.reload();
  }

  countFor(status: PickupStatusFilter): number {
    if (status === this.filter()) return this.totalCount();
    return this.items().filter(i => i.status === status).length;
  }

  statusClass(status: string): 'ok' | 'info' | 'warn' | 'muted' {
    const s = String(status ?? '').toUpperCase();
    if (s.includes('PICKED') || s.includes('PAID')) return 'ok';
    if (s.includes('READY') || s.includes('RESERVED')) return 'info';
    if (s.includes('PENDING') || s.includes('EXPIRED') || s.includes('CANCEL') || s.includes('UNAVAILABLE')) return 'muted';
    return 'warn';
  }

  formattedFallback(raw: string): string {
    if (!raw) return '--------';
    const digits = String(raw).replace(/\D/g, '').padStart(8, '0').slice(0, 8);
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
  }

  formatPrice(cents: number, currency = 'USD'): string {
    const v = Number.isFinite(cents) ? cents : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(v / 100);
  }

  formatRelative(iso: string): string {
    try {
      const ms = Date.now() - new Date(iso).getTime();
      const sec = Math.max(1, Math.round(ms / 1000));
      if (sec < 60) return `${sec}s ago`;
      const min = Math.round(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.round(min / 60);
      if (hr < 24) return `${hr}h ago`;
      const d = Math.round(hr / 24);
      return `${d}d ago`;
    } catch {
      return iso;
    }
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const statusToFetch: string = this.filter();
      const res = await this.products.getRunnerPickupList({
        status: statusToFetch,
        page: this.page(),
        pageSize: this.pageSize(),
      });
      this.items.set(res.items ?? []);
      this.visible.set(res.items ?? []);
      this.totalCount.set(Number(res.totalCount ?? res.totalElements ?? 0));
      this.hasNext.set(Boolean(res.hasNext));
      this.hasPrevious.set(Boolean(res.hasPrevious));
    } catch (err) {
      console.error('[runner-pickup] reload failed', err);
      this.items.set([]);
      this.visible.set([]);
      this.totalCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  goNext(): void {
    if (!this.hasNext()) return;
    this.page.set(this.page() + 1);
    this.reload();
  }

  goPrev(): void {
    if (!this.hasPrevious() || this.page() <= 0) return;
    this.page.set(Math.max(0, this.page() - 1));
    this.reload();
  }

  async copyText(text: string): Promise<void> {
    if (!text) return;
    const doFallback = (s: string) => {
      const ta = document.createElement('textarea');
      ta.value = s;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      document.body.removeChild(ta);
    };
    try {
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(text); return; } catch { doFallback(text); return; }
      }
      doFallback(text);
    } catch {
      doFallback(text);
    }
  }
}
