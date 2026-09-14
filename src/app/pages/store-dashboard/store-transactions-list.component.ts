import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
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
  itemsCount?: number | null;
  lineItems?: Array<any> | null;
  role?: 'HOST' | 'FULFILL' | 'BOTH' | string | null;
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

    .price { font-weight: 700; color: #111827; }

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
                  <th>Items</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of transactions(); track tx.id) {
                  <tr>
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
                    <td><strong style="font-weight:700;">{{ itemsCount(tx) }}</strong></td>
                    <td class="price">
                      @if (tx.totalAmountCents != null) { {{ '$' + (tx.totalAmountCents / 100).toFixed(2) }} }
                      @else { — }
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
export class StoreTransactionsListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  readonly transactions = signal<Transaction[]>([]);
  readonly loading = signal(true);

  private currentStoreId: string | null = null;

  ngOnInit(): void {
    this.loadTransactions();
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
    if (['COMPLETED', 'PAID', 'FULFILLED', 'SUCCESS', 'CAPTURED'].includes(s)) return 'ok';
    if (['PENDING', 'CREATED', 'PROCESSING', 'AUTHORIZED', 'SHIPPED'].includes(s)) return 'info';
    if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(s)) return 'warn';
    if (['CANCELED', 'CANCELLED', 'FAILED', 'DECLINED', 'EXPIRED'].includes(s)) return 'err';
    return 'info';
  }
}
