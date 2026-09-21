import { Component, OnInit, signal, inject, ChangeDetectorRef, OnDestroy, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth.service';

interface SseEventShape {
  eventId?: string | null;
  type: 'RESERVED' | 'READY' | 'UNAVAILABLE' | 'PAID' | 'PICKED_UP' | 'CANCELLED' | 'EXPIRED' | string;
  createdAt?: string | null;
  transactionId?: string | null;
  storeId?: string | null;
  fulfillingStoreId?: string | null;
  originatingStoreId?: string | null;
  variantId?: string | null;
  productId?: string | null;
  productTitle?: string | null;
  productImageUrl?: string | null;
  sku?: string | null;
  retailPrice?: number | null;
  currency?: string | null;
  expiresAt?: string | null;
  countdownSeconds?: number | null;
  qrFallbackCode?: string | null;
  runnerId?: string | null;
  status?: string | null;
  message?: string | null;
  variantAttributes?: Record<string, string | number | boolean | null> | null;
  originatingStoreName?: string | null;
  fulfillingStoreName?: string | null;
  storeName?: string | null;
  _read?: boolean;
  _stockQuantity?: number | null;
  _stockLoading?: boolean;
  _stockError?: boolean;
  _actionPending?: 'accept' | 'deny' | null;
}

@Component({
  selector: 'app-admin-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  styles: [`
    :host { display: block; }
    .wrap {
      max-width: 1100px;
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
      border: 1px solid #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .hero-title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.01em; color: #111827; }
    .hero-sub { margin: 4px 0 0; font-size: 14px; color: #6b7280; }
    .conn-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px; font-weight: 700;
    }
    .conn-badge.ok { background: #ecfdf5; color: #059669; }
    .conn-badge.bad { background: #fef2f2; color: #b91c1c; }
    .conn-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #22c55e;
    }
    .conn-badge.bad .conn-dot { background: #ef4444; }

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

    .ev-badge {
      font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    .ev-badge.RESERVED     { background: #ede9fe; color: #6d28d9; }
    .ev-badge.READY        { background: #dcfce7; color: #166534; }
    .ev-badge.UNAVAILABLE  { background: #fee2e2; color: #991b1b; }
    .ev-badge.PAID         { background: #dbeafe; color: #1e40af; }
    .ev-badge.PICKED_UP    { background: #d1fae5; color: #065f46; }
    .ev-badge.CANCELLED    { background: #f3f4f6; color: #4b5563; }
    .ev-badge.EXPIRED      { background: #fef3c7; color: #92400e; }

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

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; background: #f3f4f6; padding: 3px 7px; border-radius: 6px;
      font-weight: 500;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #e5e7eb;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .stock-line {
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .stock-line.ok { color: #059669; }
    .stock-line.zero { color: #dc2626; }
    .stock-line.err { color: #b45309; }

    .loading, .empty, .error-box {
      padding: 48px 24px; text-align: center; color: #6b7280; font-size: 14px;
    }
    .empty {
      display: grid; gap: 8px; justify-items: center;
    }
    .empty .ico {
      width: 56px; height: 56px; border-radius: 16px;
      background: #f3f4f6; color: #9ca3af;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 26px; margin-bottom: 4px;
    }
    .empty h4 { margin: 0; font-size: 16px; font-weight: 700; color: #111827; }
    .empty p  { margin: 0; font-size: 13px; color: #6b7280; max-width: 360px; }

    .error-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 14px;
      color: #b91c1c;
      font-weight: 500;
    }

    .cards {
      display: grid;
      gap: 16px;
    }

    .notif-card {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
      display: grid;
      grid-template-columns: 120px 1fr;
      min-width: 720px;
      max-width: 100%;
      transition: box-shadow .18s ease, transform .18s ease;
      cursor: pointer;
    }
    .notif-card:hover {
      box-shadow: 0 10px 24px -12px rgba(0,0,0,0.14);
      transform: translateY(-1px);
    }
    @media (max-width: 860px) {
      .notif-card { grid-template-columns: 1fr; min-width: 0; }
    }
    .notif-card.unread {
      background: #faf5ff;
      border-color: #ede9fe;
    }
    .card-thumb {
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 44px;
      min-height: 140px;
      overflow: hidden;
    }
    .card-thumb img {
      width: 100%;
      height: 100%;
      min-height: 140px;
      object-fit: cover;
      display: block;
    }
    .card-body {
      padding: 18px 20px;
      display: grid;
      gap: 12px;
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .card-head-left {
      display: grid;
      gap: 6px;
      min-width: 0;
      flex: 1;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
    }
    .card-meta-top {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .card-time {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 500;
      white-space: nowrap;
    }
    .card-meta {
      display: grid;
      gap: 6px;
    }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #4b5563;
    }
    .meta-row strong {
      color: #111827;
      font-weight: 600;
    }
    .store-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;
    }
    .countdown {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #9a3412;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .qr-fallback {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #4338ca;
      background: #eef2ff;
      border: 1px solid #e0e7ff;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      transition: background .15s ease, transform .1s ease, box-shadow .15s ease;
      border: 1px solid transparent;
      cursor: pointer;
    }
    .btn:active { transform: translateY(1px); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-primary {
      background: var(--color-primary, #4f46e5);
      color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
    .btn-primary:hover:not(:disabled) { background: var(--color-primary-600, #4338ca); }
    .btn-secondary-warn {
      background: #fff7ed;
      color: #9a3412;
      border: 1px solid #fed7aa;
    }
    .btn-secondary-warn:hover:not(:disabled) { background: #ffedd5; }
    .btn-danger-filled {
      background: #ef4444;
      color: #fff;
      border: 1px solid #ef4444;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
    .btn-danger-filled:hover:not(:disabled) { background: #dc2626; border-color: #dc2626; }

    .card-open-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #6d28d9;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 999px;
      text-decoration: none;
      cursor: pointer;
      transition: background .15s ease;
      white-space: nowrap;
    }
    .card-open-link:hover { background: #ede9fe; }

    .toasts {
      position: fixed; right: 24px; bottom: 24px;
      display: grid; gap: 10px; z-index: 100;
      pointer-events: none;
    }
    .toast {
      min-width: 300px; max-width: 440px;
      padding: 12px 16px 12px 14px;
      border-radius: 12px;
      box-shadow: 0 12px 32px -10px rgba(0,0,0,0.25);
      display: flex; align-items: flex-start; gap: 10px;
      pointer-events: auto;
      border: 1px solid transparent;
    }
    .toast .t-ico {
      width: 22px; height: 22px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0; margin-top: 1px; color: #fff; font-weight: 700;
    }
    .toast .t-body { display: grid; gap: 2px; flex: 1; }
    .toast .t-title { font-size: 14px; font-weight: 700; color: #111827; }
    .toast .t-msg   { font-size: 13px; color: #4b5563; line-height: 1.4; }
    .toast.success { background: #ecfdf5; border-color: #a7f3d0; }
    .toast.success .t-ico { background: #10b981; }
    .toast.error   { background: #fef2f2; border-color: #fecaca; }
    .toast.error .t-ico   { background: #ef4444; }
  `],
  template: `
    <div class="toasts">
      @if (toastSuccess()) {
        <div class="toast success">
          <span class="t-ico">✓</span>
          <div class="t-body"><span class="t-title">Success</span><span class="t-msg">{{ toastSuccess() }}</span></div>
        </div>
      }
      @if (toastError()) {
        <div class="toast error">
          <span class="t-ico">!</span>
          <div class="t-body"><span class="t-title">Something went wrong</span><span class="t-msg">{{ toastError() }}</span></div>
        </div>
      }
    </div>

    <div class="wrap">
      <a class="back" routerLink="/admin">← Back to dashboard</a>

      <header class="hero">
        <div>
          <h1 class="hero-title">🔔 All Notifications</h1>
          <p class="hero-sub">Every reservation, status change, and update — one searchable timeline.</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary" style="font-size:13px;padding:8px 14px;border-radius:999px;"
                  (click)="clearResolvedEvents()"
                  [disabled]="visibleEvents().length === 0">
            🧹 Clear resolved
          </button>
          <div class="conn-badge" [class.ok]="connected()" [class.bad]="!connected()">
            <span class="conn-dot"></span>
            @if (connected()) { Connected · live stream }
            @else { Loading notifications… }
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">
          <div><span class="spinner" style="width:20px;height:20px;border-width:3px;"></span></div>
          <div style="margin-top:10px;">Loading notifications…</div>
        </div>
      } @else if (error()) {
        <div class="error-box">{{ error() }}</div>
      } @else if (visibleEvents().length === 0) {
        <div class="empty">
          <div class="ico">📭</div>
          <h4>No notifications yet</h4>
          <p>New reservation requests and transaction updates will appear here as they happen.</p>
        </div>
      } @else {
        <div class="cards">
          @for (ev of visibleEvents(); track ev.eventId || (ev.transactionId + '_' + ev.createdAt)) {
            <div class="notif-card" [class.unread]="!ev._read"
                 (click)="openRequestDetail(ev)">
              <div class="card-thumb">
                @if (ev.productImageUrl) {
                  <img [src]="ev.productImageUrl" alt="" onerror="this.style.display='none'" />
                } @else {
                  {{ eventIcon(ev.type) }}
                }
              </div>
              <div class="card-body">
                <div class="card-head">
                  <div class="card-head-left">
                    <div class="card-meta-top">
                      <span class="ev-badge" [class]="ev.type">{{ ev.type }}</span>
                      <span class="card-title">{{ ev.productTitle || 'Transaction update' }}</span>
                    </div>
                    <div class="card-meta-top">
                      @if (ev.sku) { <span class="mono">SKU {{ ev.sku }}</span> }
                      @if (ev.variantAttributes) {
                        @for (attr of variantAttrList(ev.variantAttributes); track attr.key) {
                          <span class="chip info">{{ attr.key }}: {{ attr.val }}</span>
                        }
                      }
                    </div>
                  </div>
                  <div class="card-meta-top" style="gap:12px;">
                    <a type="button"
                       class="card-open-link"
                       (click)="$event.stopPropagation(); openRequestDetail(ev)"
                       href="javascript:void(0)">
                      Open detail →
                    </a>
                    <span class="card-time">
                      {{ ev.createdAt | date:'medium' }}
                    </span>
                  </div>
                </div>

                <div class="card-meta">
                  @if ((ev.originatingStoreName || ev.fulfillingStoreName) && ev.originatingStoreName !== ev.fulfillingStoreName) {
                    <div class="store-row">
                      @if (ev.originatingStoreName) {
                        <span class="chip purple">🏪 FROM {{ ev.originatingStoreName }}</span>
                      }
                      @if (ev.fulfillingStoreName) {
                        <span class="chip ok">🏬 TO {{ ev.fulfillingStoreName }}</span>
                      }
                    </div>
                  } @else if (ev.storeName) {
                    <div class="meta-row">
                      <span>Store:</span>
                      <strong>{{ ev.storeName }}</strong>
                    </div>
                  }

                  <div class="meta-row">
                    @if (ev.transactionId) {
                      <span>TX:</span>
                      <span class="mono">{{ ev.transactionId.slice(0, 16) }}…</span>
                    }
                    @if (ev.retailPrice != null) {
                      <span style="margin-left: 8px;">Total:</span>
                      <strong>{{ formatMoney(ev.retailPrice, ev.currency) }}</strong>
                    }
                  </div>

                  @if (ev.variantId) {
                    <div class="stock-line"
                         [class.ok]="evStockAvail(ev)"
                         [class.zero]="evStockZero(ev)"
                         [class.err]="evStockErr(ev)">
                      @if (evStockLoading(ev)) {
                        <span class="spinner"></span>
                        <span>Checking stock availability…</span>
                      } @else if (evStockErr(ev)) {
                        <span>⚠ Could not load stock for this variant</span>
                      } @else if (evStockLoaded(ev)) {
                        <span>📦 {{ evStockQty(ev) }} item{{ evStockQty(ev) === 1 ? '' : 's' }} remaining</span>
                      }
                    </div>
                  }

                  @if (ev.expiresAt && (ev.type === 'RESERVED' || ev.type === 'READY')) {
                    <div>
                      <span class="countdown">
                        ⏱ Expires in <b>{{ formatCountdown(ev.expiresAt) }}</b>
                      </span>
                    </div>
                  }

                  @if (ev.qrFallbackCode) {
                    <div>
                      <span class="qr-fallback">
                        🔐 QR fallback: <span class="mono" style="background:#fff;padding:2px 6px;">{{ ev.qrFallbackCode }}</span>
                      </span>
                    </div>
                  }

                  @if (ev.message) {
                    <div class="meta-row" style="color:#4b5563;">
                      💬 {{ ev.message }}
                    </div>
                  }
                </div>

                @if (ev.type === 'RESERVED' || ev.type === 'READY') {
                  <div class="card-actions" (click)="$event.stopPropagation()">
                    <button type="button"
                            class="btn btn-primary"
                            [disabled]="evAcceptDisabled(ev)"
                            (click)="acceptEvent(ev)">
                      @if (evAcceptPending(ev)) {
                        <span class="spinner" style="width:14px;height:14px;border-top-color:#fff;border-width:2px;"></span>
                      } @else { ✓ }
                      Mark Ready
                    </button>
                    <button type="button"
                            class="btn btn-secondary-warn"
                            [disabled]="evActionPending(ev)"
                            (click)="denyEvent(ev)">
                      @if (evDenyPending(ev)) {
                        <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
                      } @else { ✕ }
                      Mark Unavailable
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminNotificationsPageComponent implements OnInit, OnDestroy {
  readonly http = inject(HttpClient);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  readonly cdr = inject(ChangeDetectorRef);

  private readonly TERMINAL_GRACE_MS = 5 * 60 * 1000;
  // PAID/PICKED_UP are a short audit trail only — drop fast so old "payment received" events
  // don't clutter the list for hours.
  private readonly SUCCESS_RETENTION_MS = 5 * 60 * 1000;

  readonly events = signal<SseEventShape[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly connected = signal(false);
  readonly toastSuccess = signal<string | null>(null);
  readonly toastError = signal<string | null>(null);

  private isTerminalType(t: string): boolean {
    return t === 'EXPIRED' || t === 'CANCELLED' || t === 'UNAVAILABLE';
  }
  private isSuccessType(t: string): boolean {
    return t === 'PAID' || t === 'PICKED_UP';
  }
  private ageMs(ev: SseEventShape, nowMs: number): number {
    if (!ev.createdAt) return 0;
    try {
      const t = new Date(ev.createdAt).getTime();
      return isFinite(t) ? Math.max(0, nowMs - t) : 0;
    } catch { return 0; }
  }
  private isEventStale(ev: SseEventShape, nowMs: number): boolean {
    const t = ev.type;
    if (t === 'RESERVED' || t === 'READY') {
      if (ev.expiresAt) {
        try { return new Date(ev.expiresAt).getTime() <= nowMs; } catch { /* ignore */ }
      }
      return false;
    }
    if (this.isTerminalType(t)) return this.ageMs(ev, nowMs) >= this.TERMINAL_GRACE_MS;
    if (this.isSuccessType(t)) return this.ageMs(ev, nowMs) >= this.SUCCESS_RETENTION_MS;
    return false;
  }

  readonly visibleEvents = computed(() => {
    const now = Date.now();
    return this.events().filter(ev => !this.isEventStale(ev, now));
  });

  clearResolvedEvents(): void {
    const now = Date.now();
    this.events.update(list =>
      list.filter(ev => {
        if (this.isTerminalType(ev.type)) return false;
        if (this.isSuccessType(ev.type)) return false;
        return true;
      })
    );
    this.touch();
  }

  private runGc(): void {
    const now = Date.now();
    let touched = false;
    this.events.update(list => {
      // (1) dedup per transactionId, keep newest
      const byTx = new Map<string, SseEventShape>();
      const noTx: SseEventShape[] = [];
      for (const ev of list) {
        const tx = ev.transactionId;
        if (!tx) { noTx.push(ev); continue; }
        const existing = byTx.get(tx);
        if (!existing) { byTx.set(tx, ev); continue; }
        const exT = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const evT = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
        if (evT >= exT) { byTx.set(tx, ev); touched = true; }
      }
      const deduped: SseEventShape[] = [];
      byTx.forEach(v => deduped.push(v));
      deduped.push(...noTx);
      if (deduped.length !== list.length) touched = true;

      const out: SseEventShape[] = [];
      for (const ev of deduped) {
        if (this.isEventStale(ev, now)) { touched = true; continue; }
        if ((ev.type === 'RESERVED' || ev.type === 'READY') && ev.expiresAt) {
          try {
            if (new Date(ev.expiresAt).getTime() <= now) {
              out.push({ ...ev, type: 'EXPIRED', status: 'EXPIRED', _read: true });
              touched = true;
              continue;
            }
          } catch { /* ignore */ }
        }
        out.push(ev);
      }
      return touched ? out : list;
    });
    if (touched) this.touch();
  }

  currentUser: AuthUser | null = null;
  globalAdmin = false;

  private sseTick: any = null;
  private gcTick: any = null;

  private api(): string {
    return this.authService.resolveApiBasePublic();
  }

  private touch(): void { this.cdr.markForCheck(); }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser$.getValue();
    this.globalAdmin = !!(this.currentUser?.isGlobalAdmin || this.currentUser?.role === 'GLOBAL_ADMIN');

    this.sseTick = setInterval(() => {
      if (this.events().some(e => e.expiresAt)) {
        this.cdr.markForCheck();
      }
    }, 1000);

    this.gcTick = setInterval(() => this.runGc(), 60 * 1000);

    void this.loadRecent();
  }

  ngOnDestroy(): void {
    if (this.sseTick) { clearInterval(this.sseTick); this.sseTick = null; }
    if (this.gcTick) { clearInterval(this.gcTick); this.gcTick = null; }
  }

  private async loadRecent(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const api = this.api();
      const token = this.authService.getToken();
      if (!token) {
        this.error.set('Not authenticated.');
        return;
      }
      const headers: Record<string, string> = { Authorization: 'Bearer ' + token };
      const limit = 200;
      const url = this.globalAdmin
        ? `${api}/admin/sse/events/recent?limit=${limit}`
        : `${api}/stores/me/sse/events/recent?limit=${limit}`;
      const res = await firstValueFrom(this.http.get<any>(url, { headers }));
      const arr = Array.isArray(res) ? res : ((res as any)?.events ?? (res as any)?.data ?? (res as any)?.items ?? []);
      const shaped: SseEventShape[] = [];
      for (let i = arr.length - 1; i >= 0; i--) {
        const r = arr[i];
        if (r && typeof r === 'object') shaped.push(r as SseEventShape);
      }
      // Client-side safety dedup: at most one row per transactionId (newest wins).
      const byTx = new Map<string, SseEventShape>();
      const noTx: SseEventShape[] = [];
      for (const ev of shaped) {
        const tx = ev.transactionId;
        if (!tx) { noTx.push(ev); continue; }
        const existing = byTx.get(tx);
        if (!existing) { byTx.set(tx, ev); continue; }
        const exT = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const evT = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
        if (evT >= exT) byTx.set(tx, ev);
      }
      const deduped: SseEventShape[] = [];
      byTx.forEach(v => deduped.push(v));
      deduped.push(...noTx);
      this.events.set(deduped);
      this.connected.set(true);
      this.runGc();
      void this.hydrateStock();
    } catch (err: any) {
      this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load notifications.');
    } finally {
      this.loading.set(false);
      this.touch();
    }
  }

  async hydrateStock(): Promise<void> {
    const api = this.api();
    const evs = this.events();
    const work: Array<SseEventShape> = [];
    for (const ev of evs) {
      if (
        ev.variantId &&
        typeof ev['_stockQuantity'] !== 'number' &&
        !ev['_stockLoading']
      ) {
        work.push(ev);
      }
    }
    if (work.length === 0) return;
    for (const ev of work) {
      ev['_stockLoading'] = true;
      ev['_stockError'] = false;
    }
    this.events.update(list => list.slice());
    this.touch();
    for (const ev of work) {
      try {
        const res = await firstValueFrom(
          this.http.get<any>(`${api}/products/variants/${encodeURIComponent(ev.variantId!)}`)
        ).catch(() => null);
        const variant = res?.variant ?? res;
        const stock = variant?.stockQuantity;
        if (typeof stock === 'number') {
          ev['_stockQuantity'] = stock;
        } else {
          ev['_stockError'] = true;
        }
      } catch {
        ev['_stockError'] = true;
      } finally {
        ev['_stockLoading'] = false;
      }
    }
    this.events.update(list => list.slice());
    this.touch();
  }

  variantAttrList(attrs: Record<string, any> | null | undefined): Array<{ key: string; val: string }> {
    if (!attrs) return [];
    const out: Array<{ key: string; val: string }> = [];
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v == null) continue;
      out.push({ key: k, val: String(v) });
    }
    return out;
  }

  eventIcon(type: string): string {
    switch (type) {
      case 'RESERVED':    return '⏳';
      case 'READY':       return '✅';
      case 'UNAVAILABLE': return '🚫';
      case 'PAID':        return '💳';
      case 'PICKED_UP':   return '📦';
      case 'CANCELLED':   return '🗙';
      case 'EXPIRED':     return '⏰';
      default:            return '🔔';
    }
  }

  formatCountdown(iso: string | null | undefined): string {
    if (!iso) return '—';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  formatMoney(cents: number | undefined | null, currency: string | undefined | null): string {
    if (cents === undefined || cents === null) return '—';
    const c = currency || 'USD';
    const n = Number(cents) / 100;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
    } catch {
      return '$' + n.toFixed(2);
    }
  }

  openRequestDetail(ev: SseEventShape): void {
    ev._read = true;
    this.events.update(list => list.slice());
    const txId = ev.transactionId;
    if (txId) {
      void this.router.navigate(['/admin', 'requests', txId]);
    }
  }

  evStockLoaded(ev: SseEventShape): boolean { return typeof ev['_stockQuantity'] === 'number'; }
  evStockAvail(ev: SseEventShape): boolean { return typeof ev['_stockQuantity'] === 'number' && (ev['_stockQuantity'] as number) > 0; }
  evStockZero(ev: SseEventShape): boolean { return typeof ev['_stockQuantity'] === 'number' && (ev['_stockQuantity'] as number) <= 0; }
  evStockErr(ev: SseEventShape): boolean { return !!ev['_stockError']; }
  evStockLoading(ev: SseEventShape): boolean { return !!ev['_stockLoading']; }
  evStockQty(ev: SseEventShape): number { return typeof ev['_stockQuantity'] === 'number' ? (ev['_stockQuantity'] as number) : 0; }
  evAcceptPending(ev: SseEventShape): boolean { return ev['_actionPending'] === 'accept'; }
  evDenyPending(ev: SseEventShape): boolean { return ev['_actionPending'] === 'deny'; }
  evActionPending(ev: SseEventShape): boolean { return !!ev['_actionPending']; }
  evAcceptDisabled(ev: SseEventShape): boolean { return this.evActionPending(ev) || this.evStockZero(ev); }

  private showSuccess(msg: string): void {
    this.toastSuccess.set(msg);
    setTimeout(() => {
      if (this.toastSuccess() === msg) this.toastSuccess.set(null);
    }, 3500);
  }

  private showError(msg: string): void {
    this.toastError.set(msg);
    setTimeout(() => {
      if (this.toastError() === msg) this.toastError.set(null);
    }, 4500);
  }

  async acceptEvent(ev: SseEventShape): Promise<void> {
    if (!ev.transactionId) return;
    ev['_actionPending'] = 'accept';
    ev._read = true;
    this.events.update(list => list.slice());
    this.touch();
    const api = this.api();
    const token = this.authService.getToken();
    try {
      const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};
      let url: string;
      const storeId = ev.fulfillingStoreId || ev.storeId || this.currentUser?.storeId;
      if (this.globalAdmin && storeId) {
        url = `${api}/admin/stores/${encodeURIComponent(storeId)}/transactions/${encodeURIComponent(ev.transactionId)}/mark-ready`;
      } else {
        url = `${api}/admin/stores/me/transactions/${encodeURIComponent(ev.transactionId)}/mark-ready`;
      }
      await firstValueFrom(this.http.post<any>(url, {}, { headers }));
      ev.type = 'READY';
      this.events.update(list => {
        const dedup = list.filter(x => !(x.transactionId && ev.transactionId && x.transactionId === ev.transactionId && x !== ev));
        return [ev, ...dedup];
      });
      this.showSuccess('Item marked ready.');
    } catch (err: any) {
      this.showError(err?.error?.message ?? err?.message ?? 'Failed to mark ready.');
    } finally {
      ev['_actionPending'] = null;
      this.events.update(list => list.slice());
      this.touch();
    }
  }

  async denyEvent(ev: SseEventShape): Promise<void> {
    if (!ev.transactionId) return;
    ev['_actionPending'] = 'deny';
    ev._read = true;
    this.events.update(list => list.slice());
    this.touch();
    const api = this.api();
    const token = this.authService.getToken();
    try {
      const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};
      let url: string;
      const storeId = ev.fulfillingStoreId || ev.storeId || this.currentUser?.storeId;
      if (this.globalAdmin && storeId) {
        url = `${api}/admin/stores/${encodeURIComponent(storeId)}/transactions/${encodeURIComponent(ev.transactionId)}/mark-unavailable`;
      } else {
        url = `${api}/admin/stores/me/transactions/${encodeURIComponent(ev.transactionId)}/mark-unavailable`;
      }
      await firstValueFrom(this.http.post<any>(url, {}, { headers }));
      ev.type = 'UNAVAILABLE';
      this.events.update(list => {
        const dedup = list.filter(x => !(x.transactionId && ev.transactionId && x.transactionId === ev.transactionId && x !== ev));
        return [ev, ...dedup];
      });
      this.showSuccess('Item marked unavailable.');
    } catch (err: any) {
      this.showError(err?.error?.message ?? err?.message ?? 'Failed to mark unavailable.');
    } finally {
      ev['_actionPending'] = null;
      this.events.update(list => list.slice());
      this.touch();
    }
  }
}
