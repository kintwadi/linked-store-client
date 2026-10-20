import { Component, OnInit, signal, inject, ChangeDetectorRef, OnDestroy, WritableSignal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface Transaction {
  id: string;
  createdAt: string | null;
  originatingStoreId: string | null;
  originatingStoreName?: string | null;
  fulfillingStoreId: string | null;
  fulfillingStoreName?: string | null;
  status: string | null;
  totalAmountCents: number | null;
  totalRetailCents?: number | null;
  itemsCount?: number | null;
  lineItems?: Array<any> | null;
  role?: 'HOST' | 'FULFILL' | 'BOTH' | string | null;
  expiresAt?: string | null;
  variantId?: string | null;
  productTitle?: string | null;
  sku?: string | null;
  currency?: string | null;
}

@Component({
  selector: 'app-store-transactions-list',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  styles: [`
    :host { display: block; }

    .panel {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
      display: grid;
    }
    .panel-head {
      padding: 20px 24px 16px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
      border-bottom: 1px solid #f3f4f6;
    }
    .panel-head h2 {
      margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;
      display: inline-flex; align-items: center; gap: 10px;
    }
    .panel-head h2 .ico {
      width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      background: #ede9fe; color: #6d28d9;
      font-size: 15px;
    }
    .panel-head .muted {
      font-size: 12px; color: #6b7280; font-weight: 500;
    }
    .panel-body { padding: 0; display: grid; }
    .panel-body > * + * { border-top: 1px solid #f3f4f6; }

    .table-wrap { overflow-x: auto; }
    table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      font-size: 14px;
    }
    th {
      text-align: left; padding: 14px 18px;
      font-weight: 600; font-size: 12px;
      text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;
      background: #f9fafb;
      position: sticky; top: 0; z-index: 1;
    }
    th:first-child { border-radius: 18px 0 0 0; }
    th:last-child  { border-radius: 0 18px 0 0; }
    td {
      padding: 16px 18px;
      color: #111827; vertical-align: middle;
      border-top: 1px solid #f3f4f6;
    }
    tbody tr { transition: background .15s ease; }
    tbody tr:hover td { background: #fafbff; }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; color: #4b5563;
      font-weight: 500;
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

    .countdown {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 10px; border-radius: 999px;
      background: #fffbeb; color: #92400e;
      font-size: 12px; font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .countdown.soon { background: #fef2f2; color: #991b1b; animation: cdPulse 1.2s ease-in-out infinite; }
    .countdown.done { background: #f3f4f6; color: #6b7280; animation: none; }
    @keyframes cdPulse {
      0%,100% { transform: scale(1); }
      50%     { transform: scale(1.05); }
    }

    .price { font-weight: 700; color: #111827; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 12px;
      border-radius: 999px;
      font-size: 12px; font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: filter .15s ease, transform .15s ease;
    }
    .btn[disabled] { opacity: .55; cursor: not-allowed; }
    .btn:not([disabled]):hover { filter: brightness(0.97); transform: translateY(-1px); }
    .btn.ready { background: #16a34a; color: #fff; border-color: #15803d; }
    .btn.unavail { background: #dc2626; color: #fff; border-color: #b91c1c; }

    .row-actions-cell {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    }
    .row-hl { animation: rowFlash 1.6s ease both; }
    @keyframes rowFlash {
      from { background: #fef9c3; }
      to   { background: transparent; }
    }

    .loading, .empty {
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

    .chip.refunded, .status-badge.refunded { color:#c2410c; background:#fff7ed; border:1px solid #fdba74; font-weight:600; }
    .btn-secondary { background:#fff7ed; color:#c2410c; border:1px solid #fdba74; }
    .btn-secondary svg { flex-shrink: 0; }
  `],
  template: `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2><span class="ico">🧾</span> Transactions</h2>
          <span class="muted">Orders processed through your store — as host or fulfillment partner.</span>
        </div>
      </div>

      <div class="panel-body">
        @if (loading()) {
          <div class="loading">Loading transactions…</div>
        } @else if (transactions().length > 0) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Hold expires</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of transactions(); track tx.id) {
                  <tr [id]="'tx-' + tx.id" [class.row-hl]="justUpdated()[tx.id]">
                    <td>
                      @if (tx.createdAt) {
                        {{ tx.createdAt | date:'MMM d, yyyy HH:mm' }}
                      } @else { — }
                    </td>
                    <td><span class="mono">#{{ tx.id.slice(0, 12) }}</span></td>
                    <td>
                      <span [class.chip]="true" [class.info]="isHost(tx)" [class.purple]="!isHost(tx)">
                        @if (isBoth(tx)) {
                          🏠 Host · 📦 Fulfill
                        } @else if (isHost(tx)) {
                          🏠 Host
                        } @else {
                          📦 Fulfill
                        }
                      </span>
                    </td>
                    <td>
                      @if (refundedTxIds().has(tx.id)) {
                        <span class="chip refunded" title="Transaction status: refunded. This transaction was refunded.">Refunded</span>
                      } @else {
                        <span class="status-badge"
                              [class.ok]="statusClass(tx.status) === 'ok'"
                              [class.warn]="statusClass(tx.status) === 'warn'"
                              [class.err]="statusClass(tx.status) === 'err'"
                              [class.info]="statusClass(tx.status) === 'info'">
                          {{ tx.status || 'PENDING' }}
                        </span>
                      }
                    </td>
                    <td>
                      @if (tx.expiresAt && (tx.status === 'RESERVED' || tx.status === 'PENDING_RESERVATION' || tx.status === 'READY')) {
                        <span class="countdown"
                              [class.soon]="countdownSecondsLeft(tx.expiresAt) < 180 && countdownSecondsLeft(tx.expiresAt) > 0"
                              [class.done]="countdownSecondsLeft(tx.expiresAt) <= 0">
                          ⏱ {{ formatCountdown(tx.expiresAt) }}
                        </span>
                      } @else { — }
                    </td>
                    <td><strong style="font-weight:700;">{{ itemsCount(tx) }}</strong></td>
                    <td class="price">
                      @if (tx.totalAmountCents != null) { {{ '$' + (tx.totalAmountCents / 100).toFixed(2) }} }
                      @else if (tx.totalRetailCents != null) { {{ '$' + (tx.totalRetailCents / 100).toFixed(2) }} }
                      @else { — }
                    </td>
                    <td>
                      <div class="row-actions-cell">
                        @if (tx.status === 'RESERVED' || tx.status === 'PENDING_RESERVATION') {
                          <button class="btn ready"
                                  [disabled]="!!markingReady()[tx.id]"
                                  (click)="markReady(tx)">
                            @if (markingReady()[tx.id]) { … } @else { ✓ } Mark Ready
                          </button>
                          <button class="btn unavail"
                                  [disabled]="!!markingUnavail()[tx.id]"
                                  (click)="markUnavailable(tx)">
                            @if (markingUnavail()[tx.id]) { … } @else { ✗ } Not Available
                          </button>
                        } @else if (tx.status === 'READY') {
                          <span class="chip ok">✓ Confirmed ready</span>
                        }
                        @if (tx.status === 'PAID' || tx.status === 'PICKED_UP') {
                          <button class="btn btn-secondary" type="button" (click)="printInvoice(tx)">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                            Print invoice
                          </button>
                          <a class="btn btn-secondary" [routerLink]="['/admin','refunds', tx.id]" style="display:inline-flex; align-items:center; gap:6px; margin-left:8px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            Refund
                          </a>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty">
            <div class="ico">🧾</div>
            <h4>No transactions yet</h4>
            <p>Once customers place orders, they'll appear here with status and totals.</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class StoreTransactionsListComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  readonly transactions = signal<Transaction[]>([]);
  readonly loading = signal(true);
  readonly markingReady = signal<Record<string, boolean>>({});
  readonly markingUnavail = signal<Record<string, boolean>>({});
  readonly justUpdated = signal<Record<string, boolean>>({});
  readonly refundedTxIds: WritableSignal<Set<string>> = signal(new Set());
  private currentStoreId: string | null = null;
  private tickerHandle: any = null;
  private sseSource: EventSource | null = null;
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.loadTransactions();
    this.tickerHandle = setInterval(() => {
      const any = this.transactions().some(t => t.expiresAt && (t.status === 'RESERVED' || t.status === 'PENDING_RESERVATION' || t.status === 'READY'));
      if (any) this.cdr.markForCheck();
    }, 1000);
    void this.startSse();
  }

  ngOnDestroy(): void {
    if (this.tickerHandle) clearInterval(this.tickerHandle);
    if (this.sseSource) { try { this.sseSource.close(); } catch {} }
  }

  private async startSse(): Promise<void> {
    const api = this.authService.resolveApiBasePublic();
    const token = this.authService.getToken();
    if (!token) return;
    const { storeId, isMe } = this.getStoreIdParam();
    const ssePath = isMe
      ? `/stores/me/sse/events`
      : `/stores/${encodeURIComponent(storeId)}/sse/events`;
    const url = `${api}${ssePath}?access_token=${encodeURIComponent(token)}`;
    if (typeof EventSource === 'undefined') return;
    try {
      this.sseSource = new EventSource(url, { withCredentials: false });
      const types = [
        'REQUESTED', 'FULFILLER_ACCEPTED', 'FULFILLER_REJECTED',
        'RESERVED', 'READY', 'UNAVAILABLE',
        'PAID', 'PICKED_UP', 'CANCELLED', 'EXPIRED',
        'REFUND_COMPLETED', 'REFUND_FAILED',
        'RETURN_RECEIVED', 'INSPECTION_PASSED', 'INSPECTION_FAILED'
      ];
      for (const t of types) {
        this.sseSource.addEventListener(t, (e: any) => {
          try {
            const data = JSON.parse(e.data || 'null');
            if (data && typeof data === 'object') {
              this.applySseTxUpdate(data);
            }
          } catch { /* ignore */ }
        });
      }
    } catch { /* ignore */ }
  }

  private applySseTxUpdate(ev: { transactionId?: string | null; status?: string | null; type?: string; expiresAt?: string | null }): void {
    const txId = ev.transactionId;
    const mapTypeToStatus: Record<string, string> = {
      REQUESTED: 'REQUESTED',
      FULFILLER_ACCEPTED: 'FULFILLER_ACCEPTED',
      FULFILLER_REJECTED: 'FULFILLER_REJECTED',
      RESERVED: 'RESERVED',
      READY: 'READY',
      UNAVAILABLE: 'CANCELED',
      PAID: 'PAID',
      PICKED_UP: 'PICKED_UP',
      CANCELLED: 'CANCELED',
      EXPIRED: 'EXPIRED'
    };
    const nextStatus = ev.status || (ev.type ? mapTypeToStatus[ev.type] : null) || null;
    if (txId) {
      const terminal = new Set(['CANCELED', 'CANCELLED', 'EXPIRED']);
      const isTerminal = nextStatus ? terminal.has(nextStatus.toUpperCase()) : false;
      const existing = this.transactions().find(t => t.id === txId);
      if (existing) {
        if (isTerminal) {
          this.transactions.update(list => list.filter(t => t.id !== txId));
        } else {
          const patch: Partial<Transaction> & { id: string } = { id: txId };
          if (nextStatus) patch.status = nextStatus;
          if (ev.expiresAt) patch.expiresAt = ev.expiresAt;
          this.mergeIncomingTx(patch);
          this.pulseRow(txId);
        }
      } else if (!isTerminal) {
        void this.loadTransactions();
      }
    }
  }

  private getStoreIdParam(): { storeId: string; isMe: boolean } {
    const storeIdParam = this.route.snapshot.parent?.paramMap.get('storeId') ?? 'me';
    return { storeId: storeIdParam, isMe: storeIdParam === 'me' };
  }

  private async loadTransactions(): Promise<void> {
    this.loading.set(true);
    try {
      const api = this.authService.resolveApiBasePublic();
      const { storeId, isMe } = this.getStoreIdParam();
      const pathPart = isMe ? 'me' : encodeURIComponent(storeId);

      if (!isMe) {
        this.currentStoreId = storeId;
      } else {
        try {
          const store = await firstValueFrom(
            this.http.get<{ id: string }>(`${api}/admin/stores/me`)
          );
          this.currentStoreId = store.id;
        } catch {
          this.currentStoreId = null;
        }
      }

      const data = await firstValueFrom(
        this.http.get<Transaction[] | { items?: Transaction[]; data?: Transaction[] }>(
          `${api}/admin/stores/${pathPart}/transactions`
        )
      );
      const arr = Array.isArray(data) ? data : (data.items ?? data.data ?? []);
      const terminal = new Set(['CANCELED', 'CANCELLED', 'EXPIRED']);
      const filtered = (arr as Transaction[]).filter(tx => {
        const s = (tx.status || '').toUpperCase();
        return !terminal.has(s);
      });
      this.transactions.set(filtered);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  private async loadRefundedTxIds(): Promise<void> {
    try {
      const api = this.authService.resolveApiBasePublic();
      const data = await firstValueFrom(
        this.http.get<{ transactionIds: string[] }>(
          `${api}/admin/stores/me/refunded-tx-ids`
        )
      );
      this.refundedTxIds.set(new Set(data.transactionIds || []));
    } catch {
      this.refundedTxIds.set(new Set());
    }
  }

  isHost(tx: Transaction): boolean {
    if (tx.role === 'HOST' || tx.role === 'BOTH') return true;
    if (tx.role === 'FULFILL') return false;
    if (!this.currentStoreId) return true;
    return tx.originatingStoreId === this.currentStoreId;
  }

  isBoth(tx: Transaction): boolean {
    if (tx.role === 'BOTH') return true;
    if (!this.currentStoreId) return false;
    return tx.originatingStoreId === this.currentStoreId && tx.fulfillingStoreId === this.currentStoreId;
  }

  itemsCount(tx: Transaction): number {
    if (tx.itemsCount != null) return tx.itemsCount;
    if (Array.isArray(tx.lineItems)) return tx.lineItems.length;
    return 0;
  }

  formatMoney(cents: number | undefined | null, currency: string | undefined): string {
    if (cents === undefined || cents === null) return '—';
    const c = currency || 'USD';
    const n = Number(cents) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
  }

  statusClass(status: string | null): 'ok' | 'warn' | 'err' | 'info' {
    const s = (status || 'PENDING').toUpperCase();
    if (['COMPLETED', 'PAID', 'FULFILLED', 'SUCCESS', 'CAPTURED', 'READY', 'PICKED_UP'].includes(s)) return 'ok';
    if (['PENDING', 'CREATED', 'PROCESSING', 'AUTHORIZED', 'SHIPPED', 'RESERVED', 'PENDING_RESERVATION'].includes(s)) return 'warn';
    if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(s)) return 'warn';
    if (['CANCELED', 'CANCELLED', 'FAILED', 'DECLINED', 'EXPIRED', 'UNAVAILABLE'].includes(s)) return 'err';
    return 'info';
  }

  countdownSecondsLeft(iso: string | null | undefined): number {
    if (!iso) return 0;
    return Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  }

  formatCountdown(iso: string | null | undefined): string {
    const s = this.countdownSecondsLeft(iso);
    if (s <= 0) return '00:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  private pulseRow(txId: string): void {
    this.justUpdated.update(r => ({ ...r, [txId]: true }));
    setTimeout(() => {
      this.justUpdated.update(r => { const nr = { ...r }; delete nr[txId]; return nr; });
    }, 1700);
  }

  private mergeIncomingTx(update: Partial<Transaction> & { id: string }): void {
    this.transactions.update(list => {
      const idx = list.findIndex(t => t.id === update.id);
      if (idx >= 0) {
        const arr = list.slice();
        arr[idx] = { ...arr[idx], ...update };
        return arr;
      }
      return list;
    });
  }

  async markReady(tx: Transaction): Promise<void> {
    if (this.markingReady()[tx.id]) return;
    this.markingReady.update(r => ({ ...r, [tx.id]: true }));
    try {
      const api = this.authService.resolveApiBasePublic();
      const { isMe } = this.getStoreIdParam();
      const pathPart = isMe ? 'me' : encodeURIComponent(this.currentStoreId || 'me');
      const url = `${api}/admin/stores/${pathPart}/transactions/${encodeURIComponent(tx.id)}/mark-ready`;
      const res = await firstValueFrom(this.http.post<any>(url, {}));
      if (res?.transactionId) {
        this.mergeIncomingTx({ id: tx.id, status: res.status || 'READY' });
        this.pulseRow(tx.id);
      } else {
        await this.loadTransactions();
      }
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Failed to mark ready');
    } finally {
      this.markingReady.update(r => { const nr = { ...r }; delete nr[tx.id]; return nr; });
    }
  }

  async markUnavailable(tx: Transaction): Promise<void> {
    if (this.markingUnavail()[tx.id]) return;
    this.markingUnavail.update(r => ({ ...r, [tx.id]: true }));
    try {
      const api = this.authService.resolveApiBasePublic();
      const { isMe } = this.getStoreIdParam();
      const pathPart = isMe ? 'me' : encodeURIComponent(this.currentStoreId || 'me');
      const url = `${api}/admin/stores/${pathPart}/transactions/${encodeURIComponent(tx.id)}/mark-unavailable`;
      const res = await firstValueFrom(this.http.post<any>(url, {}));
      if (res?.transactionId) {
        this.transactions.update(list => list.filter(t => t.id !== tx.id));
      } else {
        await this.loadTransactions();
      }
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Failed to mark unavailable');
    } finally {
      this.markingUnavail.update(r => { const nr = { ...r }; delete nr[tx.id]; return nr; });
    }
  }

  printInvoice(tx: Transaction): void {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
    if (!popup) return;
    const invoiceHtml = this.buildInvoiceHtml(tx);
    popup.document.open();
    popup.document.write(invoiceHtml);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 150);
  }

  private buildInvoiceHtml(tx: Transaction): string {
    const createdAt = tx.createdAt
      ? new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(tx.createdAt))
      : '—';
    const printedAt = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    const totalCents = tx.totalAmountCents ?? tx.totalRetailCents ?? null;
    const currency = tx.currency ?? 'USD';
    const total = this.formatMoney(totalCents, currency);
    const role = this.isBoth(tx) ? 'Host and Fulfillment' : this.isHost(tx) ? 'Host store' : 'Fulfilling store';
    const productTitle = tx.productTitle || 'Store transaction';
    const sku = tx.sku || '—';
    const qty = this.itemsCount(tx) || 1;
    const originStore = tx.originatingStoreName || 'Origin store';
    const fulfillStore = tx.fulfillingStoreName || 'Fulfilling store';
    const statusClass = this.statusClass(tx.status);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${this.escapeHtml(tx.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%); }
    .sheet { max-width: 920px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 28px; padding: 32px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.10); }
    .hero { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.9fr); gap: 20px; align-items: stretch; margin-bottom: 24px; }
    .hero-main { padding: 24px; border-radius: 24px; background: radial-gradient(circle at top left, rgba(99,102,241,0.18), transparent 45%), linear-gradient(135deg, #111827 0%, #312e81 100%); color: #ffffff; }
    .eyebrow { display: inline-flex; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.14); color: #e0e7ff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .brand { margin: 16px 0 8px; font-size: 30px; font-weight: 800; letter-spacing: -0.03em; }
    .subtitle { margin: 0; font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.82); max-width: 540px; }
    .hero-meta { margin-top: 22px; display: flex; flex-wrap: wrap; gap: 10px; }
    .meta-chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 999px; background: rgba(255,255,255,0.12); color: #f8fafc; font-size: 12px; font-weight: 700; }
    .summary { border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); display: grid; gap: 16px; }
    .summary-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; }
    .summary-total { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; }
    .status-pill { display: inline-flex; width: fit-content; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
    .status-pill.ok { background: #ecfdf5; color: #047857; }
    .status-pill.warn { background: #fffbeb; color: #b45309; }
    .status-pill.err { background: #fef2f2; color: #b91c1c; }
    .status-pill.info { background: #eef2ff; color: #4338ca; }
    .section { margin-top: 18px; border: 1px solid #e2e8f0; border-radius: 22px; padding: 22px; background: #ffffff; }
    .section-title { margin: 0 0 16px; font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .card { border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); min-width: 0; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; font-weight: 700; }
    .value { font-size: 16px; font-weight: 700; word-break: break-word; color: #0f172a; }
    .value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; }
    .route-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .route-card { border-radius: 18px; padding: 18px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .route-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; font-weight: 800; margin-bottom: 8px; }
    .route-name { font-size: 18px; font-weight: 800; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #cbd5e1; }
    td { padding: 16px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; color: #0f172a; }
    th:last-child, td:last-child { text-align: right; }
    .prod-title { font-weight: 800; margin-bottom: 4px; }
    .prod-sub { font-size: 12px; color: #64748b; }
    .totals { margin-top: 18px; margin-left: auto; width: min(320px, 100%); border-top: 1px solid #cbd5e1; padding-top: 14px; display: grid; gap: 10px; }
    .totals-row { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; color: #475569; }
    .totals-row strong { color: #0f172a; }
    .totals-row.grand { font-size: 24px; font-weight: 800; color: #0f172a; padding-top: 4px; }
    .footer-note { margin-top: 18px; font-size: 12px; line-height: 1.7; color: #64748b; }
    @media (max-width: 720px) {
      body { padding: 14px; }
      .sheet { padding: 18px; border-radius: 20px; }
      .hero, .grid, .route-grid { grid-template-columns: 1fr; }
      .summary-total { font-size: 30px; }
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .sheet { max-width: none; border: none; border-radius: 0; padding: 0; box-shadow: none; }
      .hero-main { background: #111827 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .summary, .card, .route-card, .section { break-inside: avoid; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <section class="hero">
      <div class="hero-main">
        <span class="eyebrow">Store Invoice</span>
        <p class="brand">DinRetail Receipt</p>
        <p class="subtitle">Clean printout for store-side reconciliation, pickup records, and internal accounting.</p>
        <div class="hero-meta">
          <span class="meta-chip">Transaction ${this.escapeHtml(tx.id.slice(0, 12))}</span>
          <span class="meta-chip">Printed ${this.escapeHtml(printedAt)}</span>
        </div>
      </div>
      <div class="summary">
        <div class="summary-label">Total amount</div>
        <div class="summary-total">${this.escapeHtml(total)}</div>
        <div class="status-pill ${statusClass}">${this.escapeHtml(tx.status || 'PENDING')}</div>
        <div class="footer-note">Perspective: ${this.escapeHtml(role)}</div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Transaction overview</h2>
      <div class="grid">
        <div class="card"><div class="label">Transaction ID</div><div class="value mono">${this.escapeHtml(tx.id)}</div></div>
        <div class="card"><div class="label">Created at</div><div class="value">${this.escapeHtml(createdAt)}</div></div>
        <div class="card"><div class="label">Currency</div><div class="value">${this.escapeHtml(currency)}</div></div>
        <div class="card"><div class="label">Items</div><div class="value">${this.escapeHtml(String(qty))}</div></div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Store routing</h2>
      <div class="route-grid">
        <div class="route-card">
          <div class="route-kicker">Origin store</div>
          <div class="route-name">${this.escapeHtml(originStore)}</div>
        </div>
        <div class="route-card">
          <div class="route-kicker">Fulfilling store</div>
          <div class="route-name">${this.escapeHtml(fulfillStore)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Invoice line</h2>
      <table>
        <thead>
          <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="prod-title">${this.escapeHtml(productTitle)}</div>
              <div class="prod-sub">${this.escapeHtml(role)}</div>
            </td>
            <td>${this.escapeHtml(sku)}</td>
            <td>${this.escapeHtml(String(qty))}</td>
            <td>${this.escapeHtml(total)}</td>
          </tr>
        </tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><strong>${this.escapeHtml(total)}</strong></div>
        <div class="totals-row"><span>Store record total</span><strong>${this.escapeHtml(total)}</strong></div>
        <div class="totals-row grand"><span>Total</span><span>${this.escapeHtml(total)}</span></div>
      </div>
      <div class="footer-note">This document is generated from the transaction tab for operational and accounting reference.</div>
    </section>
  </div>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
