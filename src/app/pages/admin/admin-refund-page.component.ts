import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const api = '/api';

@Component({
  selector: 'app-admin-refund-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styles: [`
    :host {
      display: block;
      --bg: #f8fafc;
      --surface: #ffffff;
      --surface-2: #f1f5f9;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --text-light: #94a3b8;
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --primary-light: #eef2ff;
      --success: #10b981;
      --success-light: #ecfdf5;
      --success-dark: #059669;
      --warning: #f59e0b;
      --danger: #ef4444;
      --accent: #8b5cf6;
      background: var(--bg);
    }

    .wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 32px 64px;
      display: grid;
      gap: 24px;
    }
    @media (max-width: 640px) {
      .wrap { padding: 16px 16px 48px; gap: 16px; }
    }

    .back-link {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.875rem; color: var(--text-muted);
      text-decoration: none; font-weight: 500;
      padding: 8px 0; transition: color 0.15s;
      cursor: pointer;
      border: none; background: none;
      font-family: inherit;
    }
    .back-link:hover { color: var(--text); }

    .hero {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px 32px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px; flex-wrap: wrap;
      box-shadow: 0 1px 2px rgba(15,23,42,0.04);
      position: relative; overflow: visible;
    }
    .hero-left { display: grid; gap: 8px; max-width: 560px; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .hero-badge::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: var(--primary);
    }
    .hero h1 {
      font-size: 1.75rem; font-weight: 700;
      letter-spacing: -0.02em; color: var(--text);
      margin: 0;
    }
    .hero p {
      color: var(--text-muted); font-size: 0.9375rem;
      margin: 0; line-height: 1.5;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 1px 2px rgba(15,23,42,0.04);
      overflow: hidden;
      display: grid;
    }
    .panel-head {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; flex-wrap: wrap;
    }
    .panel-head .section-title-wrap { display: grid; gap: 6px; }
    .panel-head h2 {
      margin: 0; font-size: 1rem; font-weight: 600;
      display: inline-flex; align-items: center; gap: 10px;
      color: var(--text);
    }
    .section-title-wrap h2 {
      margin: 0; font-size: 1rem; font-weight: 600;
      color: var(--text);
    }
    .panel-head .muted {
      font-size: 0.875rem; color: var(--text-muted); font-weight: 400;
    }
    .section-title-wrap .muted {
      font-size: 0.8125rem; color: var(--text-muted); font-weight: 400;
    }
    .panel-body { padding: 0; display: grid; }
    .panel-body > * + * { border-top: 1px solid var(--border); }

    .stat-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 20px 24px;
    }
    @media (max-width: 900px)  { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px)  { .stat-grid { grid-template-columns: 1fr; } }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      position: relative; overflow: hidden;
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(15,23,42,0.04);
      display: grid;
      gap: 4px;
    }
    .stat-label {
      font-size: 0.8125rem; color: var(--text-muted); font-weight: 500;
    }
    .stat-value {
      font-size: 1.5rem; font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .btn-primary {
      font-family: inherit; font-size: 0.875rem; font-weight: 600;
      padding: 10px 20px; border: none;
      border-radius: 10px; background: var(--primary);
      color: #fff; cursor: pointer;
      display: inline-flex; align-items: center; gap: 8px;
      transition: all 0.15s;
      box-shadow: 0 2px 4px rgba(99,102,241,0.25);
      text-decoration: none;
    }
    .btn-primary:hover:not([disabled]) {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(99,102,241,0.3);
    }
    .btn-primary[disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .btn-secondary {
      font-family: inherit; font-size: 0.8125rem; font-weight: 600;
      padding: 8px 14px; border: 1px solid var(--border);
      border-radius: 8px; background: var(--surface);
      color: var(--text); cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.15s; text-decoration: none;
    }
    .btn-secondary:hover:not([disabled]) { background: var(--surface-2); border-color: #cbd5e1; }

    .form-input {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 10px;
      padding: 10px 12px;
      font: inherit;
      color: var(--text);
      box-sizing: border-box;
      transition: all 0.15s;
    }
    .form-input:focus {
      outline: 2px solid var(--primary-light);
      border-color: var(--primary);
    }

    .form-row {
      display: grid;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-group {
      display: grid;
      gap: 6px;
      margin-bottom: 16px;
    }

    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    input[type=number] {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 10px;
      padding: 10px 12px;
      font: inherit;
      color: var(--text);
      box-sizing: border-box;
      transition: all 0.15s;
    }
    input[type=number]:focus {
      outline: 2px solid var(--primary-light);
      border-color: var(--primary);
    }

    textarea {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 10px;
      padding: 10px 12px;
      font: inherit;
      color: var(--text);
      box-sizing: border-box;
      resize: vertical;
      min-height: 90px;
      transition: all 0.15s;
      font-family: inherit;
    }
    textarea:focus {
      outline: 2px solid var(--primary-light);
      border-color: var(--primary);
    }

    .table-wrap { overflow-x: auto; }
    table.table-wrap,
    .panel-body table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 14px;
    }
    thead {
      border-bottom: 1px solid var(--border);
    }
    th {
      text-align: left;
      padding: 14px 16px;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      background: var(--surface-2);
      position: sticky;
      top: 0;
      z-index: 1;
    }
    th:first-child { border-radius: 16px 0 0 0; }
    th:last-child { border-radius: 0 16px 0 0; }
    td {
      padding: 16px;
      color: var(--text);
      vertical-align: middle;
      border-top: 1px solid var(--border);
    }
    tbody tr { transition: background 0.15s ease; }
    tbody tr:hover td { background: #fafbff; }

    .loading, .empty {
      padding: 48px 24px;
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }
    .empty {
      display: grid;
      gap: 8px;
      justify-items: center;
    }
    .empty .ico {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--surface-2);
      color: var(--text-light);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      margin-bottom: 4px;
    }
    .empty h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
    }
    .empty p {
      margin: 0;
      font-size: 13px;
      color: var(--text-muted);
      max-width: 360px;
    }

    .success-banner {
      padding: 20px;
      background: var(--success-light);
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .warn-banner {
      padding: 20px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .success-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--success); color: #fff;
      display: grid; place-items: center; flex-shrink: 0;
      font-weight: 700;
    }
    .warn-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--warning); color: #fff;
      display: grid; place-items: center; flex-shrink: 0;
      font-weight: 700;
    }
    .banner-body { flex: 1; min-width: 0; }
    .banner-title {
      font-weight: 600;
      font-size: 0.9375rem;
      margin-bottom: 2px;
      color: var(--text);
    }
    .banner-desc {
      font-size: 0.8125rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 11px;
      border-radius: 999px; font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.01em;
    }
    .status-badge::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: currentColor; opacity: 0.7;
    }
    .status-badge.success { background: #ecfdf5; color: #059669; }
    .status-badge.info    { background: #eef2ff; color: #4338ca; }
    .status-badge.warn    { background: #fffbeb; color: #b45309; }
    .status-badge.error   { background: #fef2f2; color: #dc2626; }

    .radio-group {
      display: grid;
      gap: 8px;
    }

    .page-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .split-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid var(--border);
    }
    .split-row:last-child { border-bottom: none; }
    .split-label {
      font-weight: 500;
      color: var(--text);
      font-size: 0.9375rem;
    }
    .split-label .muted {
      color: var(--text-muted);
      font-size: 0.8125rem;
      display: block;
      margin-top: 2px;
    }
    .split-amount {
      font-weight: 700;
      font-size: 1.125rem;
      letter-spacing: -0.01em;
    }
    .split-amount.reversed {
      color: var(--danger);
    }

    .details-grid-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px 24px;
      padding: 16px 0;
    }
    @media (max-width: 640px) {
      .details-grid-meta { grid-template-columns: repeat(2, 1fr); }
    }
    .detail-item-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .detail-item-value {
      font-weight: 500;
    }

    .chip {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .chip.paid {
      background: #d1fae5;
      color: #047857;
      border: 1px solid #6ee7b7;
    }
    .chip.refunded {
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #fdba74;
    }

    .history-status {
      font-weight: 600;
      font-size: 0.8125rem;
    }
    .history-status.completed { color: var(--success); }
    .history-status.failed { color: var(--danger); }
    .history-status.processing { color: var(--primary); }

    .form-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }
    .form-label small {
      color: var(--text-muted);
      font-weight: 400;
    }
    .form-control, .form-textarea {
      width: 100%;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 10px;
      padding: 10px 12px;
      font: inherit;
      color: var(--text);
      box-sizing: border-box;
      font-family: inherit;
    }
    .form-control:focus, .form-input:focus, .form-textarea:focus {
      outline: 2px solid var(--primary-light);
      border-color: var(--primary);
    }
    .form-textarea {
      min-height: 90px;
      resize: vertical;
    }

    .radio-row {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 8px;
      cursor: pointer;
      background: var(--surface);
      transition: all 0.15s;
    }
    .radio-row.active {
      border-color: var(--primary);
      background: var(--primary-light);
    }
    .radio-row input[type=radio] {
      margin: 2px 8px 0 0;
      accent-color: var(--primary);
      flex-shrink: 0;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .muted { color: var(--text-muted); }
  `],
  template: `
    <div class="wrap">
      <button type="button" class="back-link" (click)="goBack()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Back to transactions
      </button>

      <div class="page-title-row">
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
          <h1 style="font-size: 1.5rem; font-weight:700; letter-spacing: -0.01em; margin:0;">Issue Refund</h1>
          <span class="chip" [class.paid]="transaction() && transaction()['status']==='PAID'" [class.refunded]="hasSuccessfulRefund()">
            {{ hasSuccessfulRefund() ? 'REFUNDED' : (transaction()?.['status'] ?? 'LOADING') }}
          </span>
        </div>
        <span class="muted" style="font-size:0.875rem; color: var(--text-muted); font-family: ui-monospace, Menlo, monospace;">
          Transaction #{{ txShortId() }}
        </span>
      </div>

      @if (loading()) {
        <div class="empty">
          <div class="ico">⏳</div>
          <h4>Loading transaction…</h4>
          <p>Fetching transaction record and refund history.</p>
        </div>
      } @else {
        @if (error()) {
          <div class="warn-banner" style="margin-bottom: 16px;">
            <div class="warn-icon">!</div>
            <div class="banner-body">
              <div class="banner-title">Could not load refund page</div>
              <div class="banner-desc">{{ error() }}</div>
            </div>
          </div>
        }

        <section class="panel" style="margin-bottom: 16px;">
          <div class="panel-head">
            <div class="section-title-wrap">
              <h2>Transaction Summary</h2>
              <span class="muted">Amounts to be reversed on successful refund</span>
            </div>
          </div>
          <div class="panel-body" style="padding: 20px 24px;">
            <div class="split-row">
              <div class="split-label">
                Retail Total (Customer Charge)
                <span class="muted">Customer-facing amount originally charged on their card</span>
              </div>
              <div class="split-amount">{{ formatMoney(transaction()?.['totalRetailCents'] ?? 0) }}</div>
            </div>
            <div class="split-row">
              <div class="split-label">
                Wholesale payout (Store B Fulfiller)
                <span class="muted">Cost basis originally paid to the fulfilling store</span>
              </div>
              <div class="split-amount reversed">- {{ formatMoney(transaction()?.['wholesalePayoutCents'] ?? 0) }}</div>
            </div>
            <div class="split-row">
              <div class="split-label">
                Broker margin (Store A Originator)
                <span class="muted">Arbitrage gain originally paid to the originating host store</span>
              </div>
              <div class="split-amount reversed">- {{ formatMoney(transaction()?.['arbitrageMarginCents'] ?? 0) }}</div>
            </div>
            <div class="details-grid-meta" style="margin-top: 8px;">
              <div>
                <div class="detail-item-label">Product</div>
                <div class="detail-item-value">{{ transaction()?.['productTitle'] ?? transaction()?.['lineItems']?.[0]?.['productTitle'] ?? '—' }}</div>
              </div>
              <div>
                <div class="detail-item-label">SKU</div>
                <div class="detail-item-value">{{ transaction()?.['sku'] ?? transaction()?.['lineItems']?.[0]?.['sku'] ?? '—' }}</div>
              </div>
              <div>
                <div class="detail-item-label">Items</div>
                <div class="detail-item-value">{{ transaction()?.['itemsCount'] ?? 1 }} unit(s)</div>
              </div>
              <div>
                <div class="detail-item-label">Customer Currency</div>
                <div class="detail-item-value">USD $</div>
              </div>
              <div>
                <div class="detail-item-label">Created</div>
                <div class="detail-item-value">{{ transaction()?.['createdAt'] ?? '—' }}</div>
              </div>
              <div>
                <div class="detail-item-label">Your Role</div>
                <div class="detail-item-value">{{ viewerRoleLabel() }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel" style="margin-bottom: 16px;">
          <div class="panel-head">
            <div class="section-title-wrap">
              <h2>Refund History</h2>
              <span class="muted">{{ refunds().length }} refund(s) recorded against this transaction</span>
            </div>
          </div>
          <div class="panel-body" style="padding: 0;">
            @if (refunds().length === 0) {
              <div class="empty">
                <div class="ico">💳</div>
                <h4>No refunds recorded yet</h4>
                <p>This transaction has not been refunded. Use the form below to issue a full or partial refund.</p>
              </div>
            } @else {
              <div class="table-wrap">
                <table style="width:100%; border-collapse: separate; border-spacing: 0;">
                  <thead style="border-bottom:1px solid var(--border);">
                    <tr>
                      <th style="padding:12px 16px; text-align:left; font-size:0.75rem; font-weight:600; color: var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Date</th>
                      <th style="padding:12px 16px; text-align:left;">Type</th>
                      <th style="padding:12px 16px; text-align:right;">Customer Refund</th>
                      <th style="padding:12px 16px; text-align:right;">Your Share Reversed</th>
                      <th style="padding:12px 16px; text-align:left;">Status</th>
                      <th style="padding:12px 16px; text-align:left;">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of refunds(); track r.id) {
                      <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding: 12px 16px; font-size:0.875rem;">{{ r.createdAt }}</td>
                        <td style="padding:12px 16px;">
                          @if (r.totalRefundedCents === transaction()?.['totalRetailCents']) {
                            <span class="chip" style="background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe;">Full</span>
                          } @else {
                            <span class="chip" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d;">Partial</span>
                          }
                        </td>
                        <td style="padding:12px 16px; text-align:right; font-weight:700; color: var(--danger);">- {{ formatMoney(r.totalRefundedCents ?? 0) }}</td>
                        <td style="padding:12px 16px; text-align:right; font-weight:600; color: var(--text-muted);">- {{ formatMoney(r.perspectiveReversedCents ?? 0) }}</td>
                        <td style="padding:12px 16px;">
                          <span class="history-status" [class.completed]="r.status==='COMPLETED'" [class.failed]="r.status==='FAILED'" [class.processing]="r.status==='PENDING' || r.status==='PROCESSING'">
                            {{ r.status === 'COMPLETED' ? '✓ Successful' : r.status === 'FAILED' ? '✗ Failed' : 'Processing…' }}
                          </span>
                          @if (r.status === 'FAILED' && r.stripeError) {
                            <div style="font-size:0.75rem; color: var(--danger); margin-top:4px;">{{ r.stripeError }}</div>
                          }
                        </td>
                        <td style="padding:12px 16px; font-size:0.8125rem; color: var(--text-muted); max-width:320px;">{{ r.reason || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div class="section-title-wrap">
              <h2>Issue Refund</h2>
              <span class="muted">Symmetric reversal: customer charge, wholesale payout, broker margin all reversed proportionally</span>
            </div>
          </div>
          <div class="panel-body" style="padding: 20px 24px;">
            @if (hasSuccessfulRefund()) {
              <div class="success-banner">
                <div class="success-icon">✓</div>
                <div class="banner-body">
                  <div class="banner-title">This transaction has already been refunded</div>
                  <div class="banner-desc">v1 supports at most 1 refund (full or single-partial) per transaction. For additional partial refunds please use the Stripe dashboard directly.</div>
                </div>
              </div>
            } @else {
              @if (successMsg()) {
                <div class="success-banner" style="margin-bottom: 20px;">
                  <div class="success-icon">✓</div>
                  <div class="banner-body">
                    <div class="banner-title">{{ successMsg() }}</div>
                    <div class="banner-desc">The refund has been processed and both store Connect accounts have had their respective transfers reversed. Funds should appear on customer statements in 5–10 business days.</div>
                  </div>
                </div>
              }
              @if (submissionError()) {
                <div class="warn-banner" style="margin-bottom: 20px;">
                  <div class="warn-icon">!</div>
                  <div class="banner-body">
                    <div class="banner-title">Refund could not be completed</div>
                    <div class="banner-desc">{{ submissionError() }}</div>
                  </div>
                </div>
              }
              <form [formGroup]="refundForm" (ngSubmit)="onSubmit($event)" novalidate>
                <div class="form-group">
                  <label class="form-label">Refund scope</label>
                  <label class="radio-row" [class.active]="refundForm.get('refundType')?.value === 'full'">
                    <input type="radio" formControlName="refundType" value="full" />
                    <span>
                      <span style="font-weight:600;">Full refund</span>
                      <span style="color: var(--text-muted); font-size:0.8125rem; margin-left:8px;">
                        Customer receives <b style="color: var(--danger);">{{ formatMoney(transaction()?.['totalRetailCents'] ?? 0) }}</b> back
                      </span>
                    </span>
                  </label>
                  <label class="radio-row" [class.active]="refundForm.get('refundType')?.value === 'partial'">
                    <input type="radio" formControlName="refundType" value="partial" />
                    <span style="display:grid; gap: 6px; flex:1;">
                      <span style="font-weight:600;">Partial refund</span>
                      <span style="color: var(--text-muted); font-size:0.8125rem;">Enter a custom amount to refund. Both store sides will be reversed proportionally.</span>
                      @if (refundForm.get('refundType')?.value === 'partial') {
                        <input type="number" class="form-input" formControlName="amount" step="0.01" min="0.01" [max]="maxPartialAmount()" placeholder="0.00" style="margin-top:6px; max-width: 200px;" />
                      }
                    </span>
                  </label>
                </div>

                <div class="form-group">
                  <label class="form-label" for="reason">Reason <small>(optional)</small></label>
                  <textarea id="reason" class="form-textarea" formControlName="reason" placeholder="e.g. Customer returned the item, size issue, duplicate charge…"></textarea>
                </div>

                <div style="display: flex; gap:12px; align-items:center; flex-wrap: wrap; justify-content: flex-end; margin-top: 8px;">
                  <button type="button" class="btn-secondary" (click)="goBack()">Cancel</button>
                  <button type="submit" class="btn-primary" [disabled]="submitting() || !canSubmit()">
                    @if (submitting()) { <span class="spinner" style="margin-right:8px;"></span> Processing refund… }
                    @else { <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Issue Refund }
                  </button>
                </div>
              </form>
            }
          </div>
        </section>
      }
    </div>
  `
})
export class AdminRefundPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly txId = this.route.snapshot.paramMap.get('transactionId') ?? '';
  txShortId = () => this.txId ? this.txId.slice(0, 8) + '…' : '—';

  readonly transaction: WritableSignal<any | null> = signal(null);
  readonly refunds: WritableSignal<any[]> = signal([]);
  readonly loading: WritableSignal<boolean> = signal(true);
  readonly submitting: WritableSignal<boolean> = signal(false);
  readonly error: WritableSignal<string | null> = signal(null);
  readonly successMsg: WritableSignal<string | null> = signal(null);
  readonly submissionError: WritableSignal<string | null> = signal(null);

  refundForm: FormGroup;

  constructor() {
    this.refundForm = this.fb.group({
      refundType: ['full'],
      amount: [null as number | null],
      reason: ['']
    });
  }

  hasSuccessfulRefund() {
    return this.refunds().some(r => r.status === 'COMPLETED');
  }

  viewerRoleLabel() {
    return 'Store Admin';
  }

  maxPartialAmount() {
    const t = this.transaction();
    if (!t) return 0.01;
    return (t['totalRetailCents'] ?? 0) / 100;
  }

  canSubmit() {
    if (this.hasSuccessfulRefund()) return false;
    const status: string = this.transaction()?.['status'] ?? '';
    if (status !== 'PAID' && status !== 'PICKED_UP') return false;
    const t = this.refundType();
    if (t === 'full') return true;
    const amt = Number(this.refundForm.get('amount')?.value);
    return !Number.isNaN(amt) && amt > 0 && amt <= this.maxPartialAmount();
  }

  refundType(): string {
    return this.refundForm.get('refundType')?.value ?? 'full';
  }

  formatMoney(cents: number): string {
    if (!cents && cents !== 0) return '—';
    return '$' + (cents / 100).toFixed(2);
  }

  async ngOnInit() {
    if (!this.txId) {
      this.error.set('Missing transactionId in URL');
      this.loading.set(false);
      return;
    }
    try {
      const [tx, history] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${api}/transactions/${encodeURIComponent(this.txId)}`)).catch(() => null),
        firstValueFrom(this.http.get<any[]>(`${api}/admin/transactions/${encodeURIComponent(this.txId)}/refunds`)).catch(() => [] as any[])
      ]);
      this.transaction.set(tx);
      this.refunds.set(Array.isArray(history) ? history : []);
      if (!tx) this.error.set('Transaction not found');
    } catch (e: any) {
      this.error.set(e?.message || 'Network error loading refund page');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(_e?: Event) {
    if (window.history.length > 1) {
      this.router.navigate(['/admin']).catch(() => history.back());
    } else {
      history.back();
    }
  }

  async onSubmit(ev: Event) {
    ev.preventDefault();
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);
    this.submissionError.set(null);
    this.successMsg.set(null);
    try {
      const isFull = this.refundType() === 'full';
      const usdAmt = Number(this.refundForm.get('amount')?.value ?? 0);
      const amountCents = isFull ? null : Math.round(usdAmt * 100);
      const reason = (this.refundForm.get('reason')?.value ?? '').toString().trim() || null;
      const body = isFull && !reason ? null : (reason ? { amountCents, reason } : { amountCents });
      const result: any = await firstValueFrom(this.http.post<any>(
        `${api}/admin/transactions/${encodeURIComponent(this.txId)}/refunds`,
        body ?? {},
        { observe: 'body' }
      ));
      this.refunds.update(list => [result, ...list.filter(r => r.id !== result.id)]);
      if (result.status === 'COMPLETED') {
        const amt = this.formatMoney(result.totalRefundedCents ?? 0);
        this.successMsg.set(`Refund of ${amt} processed successfully.`);
        this.refundForm.patchValue({ refundType: 'full', amount: null, reason: '' });
      } else if (result.status === 'FAILED') {
        this.submissionError.set(result.stripeError || 'Stripe rejected the refund.');
      }
    } catch (e: any) {
      if (e instanceof HttpErrorResponse) {
        const msg = e.error?.error || e.error?.message || e.statusText || 'HTTP ' + e.status;
        this.submissionError.set(msg);
      } else {
        this.submissionError.set(e?.message || 'Unexpected error during refund');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
