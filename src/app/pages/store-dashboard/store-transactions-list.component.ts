import { Component, OnInit, signal, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface Transaction {
  id: string;
  createdAt: string | null;
  originatingStoreId: string | null;
  fulfillingStoreId: string | null;
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
}

@Component({
  selector: 'app-store-transactions-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
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
                      <span class="status-badge"
                            [class.ok]="statusClass(tx.status) === 'ok'"
                            [class.warn]="statusClass(tx.status) === 'warn'"
                            [class.err]="statusClass(tx.status) === 'err'"
                            [class.info]="statusClass(tx.status) === 'info'">
                        {{ tx.status || 'PENDING' }}
                      </span>
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
  private currentStoreId: string | null = null;
  private tickerHandle: any = null;
  private sseSource: EventSource | null = null;

  ngOnInit(): void {
    this.loadTransactions();
    this.tickerHandle = setInterval(() => {
      const any = this.transactions().some(t => t.expiresAt && (t.status === 'RESERVED' || t.status === 'PENDING_RESERVATION' || t.status === 'READY'));
      if (any) this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.tickerHandle) clearInterval(this.tickerHandle);
    if (this.sseSource) { try { this.sseSource.close(); } catch {} }
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
      this.transactions.set(arr as Transaction[]);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
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
        this.mergeIncomingTx({ id: tx.id, status: res.status || 'CANCELED' });
        this.pulseRow(tx.id);
      } else {
        await this.loadTransactions();
      }
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Failed to mark unavailable');
    } finally {
      this.markingUnavail.update(r => { const nr = { ...r }; delete nr[tx.id]; return nr; });
    }
  }
}
