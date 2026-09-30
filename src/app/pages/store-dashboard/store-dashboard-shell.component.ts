import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import {
  SubscriptionPlanService,
  StoreSubscriptionState,
  StoreSubscriptionCancelResult
} from '../../services/subscription-plan.service';

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

type TabKey = 'products' | 'transactions' | 'returns' | 'subscription' | 'settings';

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
    .banner.success, .banner.ok { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .banner.success .banner-ico, .banner.ok .banner-ico { background: #d1fae5; color: #047857; }
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

    /* ============ RETURNS TAB UPGRADE ============ */
    .ret-kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    }
    @media (max-width: 900px) { .ret-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .ret-kpi-grid { grid-template-columns: 1fr; } }
    .ret-kpi {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 16px;
      padding: 18px 20px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: all 0.2s;
    }
    .ret-kpi::before {
      content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%;
    }
    .ret-kpi.tot::before { background: linear-gradient(180deg, #8b5cf6, #ec4899); }
    .ret-kpi.under::before { background: linear-gradient(180deg, #f59e0b, #ef4444); }
    .ret-kpi.pass::before { background: linear-gradient(180deg, #10b981, #06b6d4); }
    .ret-kpi.rej::before { background: linear-gradient(180deg, #64748b, #334155); }
    .ret-kpi:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -14px rgba(0,0,0,0.18); }
    .ret-kpi-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
    .ret-kpi-label { font-size: 13px; color: #6b7280; font-weight: 500; }
    .ret-kpi-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: grid; place-items: center;
    }
    .ret-kpi.tot .ret-kpi-icon { background: #f3e8ff; color: #6d28d9; }
    .ret-kpi.under .ret-kpi-icon { background: #fff7ed; color: #c2410c; }
    .ret-kpi.pass .ret-kpi-icon { background: #d1fae5; color: #047857; }
    .ret-kpi.rej .ret-kpi-icon { background: #f1f5f9; color: #475569; }
    .ret-kpi-val { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: #111827; }
    .ret-kpi-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }

    .filter-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
    }
    .filter-seg {
      display: inline-flex; padding: 4px; gap: 4px;
      background: #f3f4f6; border: 1px solid #e5e7eb;
      border-radius: 12px; flex-wrap: wrap;
    }
    .filter-seg-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 16px; border: 0; background: transparent;
      border-radius: 8px; cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 600;
      color: #6b7280; transition: all 0.18s ease;
    }
    .filter-seg-btn:hover { color: #111827; background: rgba(255,255,255,0.6); }
    .filter-seg-btn.active {
      background: #fff; color: #111827;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .filter-seg-btn .cnt {
      display: inline-grid; place-items: center;
      min-width: 22px; height: 22px; padding: 0 7px;
      border-radius: 999px;
      font-size: 11px; font-weight: 700;
      background: #e5e7eb; color: #4b5563;
      transition: all 0.18s ease;
    }
    .filter-seg-btn.active .cnt { background: #eef2ff; color: #4338ca; }
    .filter-search {
      display: flex; align-items: center; gap: 8px;
      padding: 0 12px 0 0;
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .filter-search:focus-within {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    }
    .filter-search svg { flex-shrink: 0; margin-left: 12px; color: #6b7280; }
    .filter-search input {
      border: 0; outline: 0; background: transparent;
      padding: 10px 0; font-family: inherit; font-size: 13px;
      color: #111827; width: 220px;
    }
    .filter-search input::placeholder { color: #9ca3af; }
    .filter-search button {
      border: 0; padding: 6px 12px; margin-left: 4px;
      border-radius: 7px; cursor: pointer;
      background: #6366f1; color: #fff;
      font-family: inherit; font-size: 12px; font-weight: 600;
      transition: background 0.15s;
    }
    .filter-search button:hover { background: #4f46e5; }

    .ret-empty {
      padding: 72px 24px;
      display: grid; gap: 16px; justify-items: center; text-align: center;
    }
    .ret-empty-ico {
      width: 96px; height: 96px; border-radius: 28px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, #eef2ff 0%, #f3e8ff 100%);
      margin-bottom: 4px;
      position: relative;
    }
    .ret-empty-ico svg { color: #6366f1; }
    .ret-empty h4 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
    .ret-empty p { margin: 0; font-size: 13px; color: #6b7280; max-width: 420px; line-height: 1.6; }
    .ret-empty-tips {
      margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
    }
    .ret-empty-tip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px;
      background: #fff; border: 1px solid #f3f4f6;
      border-radius: 10px;
      font-size: 12px; color: #6b7280; font-weight: 500;
    }
    .ret-empty-tip svg { color: #6366f1; }

    .loading-block {
      padding: 64px 24px; text-align: center;
      color: #6b7280; font-size: 14px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .sub-panel-head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 4px 2px;
    }
    .sub-title-main { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
    .sub-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

    .sub-card {
      background: #fff;
      border: 1px solid #eef2f7;
      border-radius: 18px;
      box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 8px 30px -10px rgba(15,23,42,0.08);
      padding: 24px;
      display: grid;
      gap: 20px;
    }
    .sub-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px 28px;
    }
    .sub-plan-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: #94a3b8;
    }
    .sub-plan-name { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; display: flex; align-items: center; gap: 8px; }
    .sub-status-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
    .sub-period-val { font-size: 14px; color: #0f172a; font-weight: 600; margin-top: 4px; }
    .sub-note { font-size: 12px; color: #b45309; }

    .status-pill {
      display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 600;
    }
    .status-pill.ok { background: #ecfdf5; color: #065f46; }
    .status-pill.warn { background: #fff7ed; color: #9a3412; }
    .status-pill.err { background: #fef2f2; color: #991b1b; }

    .chip {
      display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px;
      font-size: 11px; font-weight: 600;
    }
    .chip.warn { background: #fff7ed; color: #9a3412; }

    .sub-actions {
      display: flex; gap: 10px; flex-wrap: wrap; padding-top: 6px; border-top: 1px dashed #e2e8f0;
    }
    .btn, .btn-primary, .btn-danger, .btn-ghost {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 600;
      border: 1px solid transparent; cursor: pointer; text-decoration: none;
      transition: transform .06s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
      white-space: nowrap;
    }
    .btn:disabled, .btn-primary:disabled, .btn-danger:disabled { opacity: 0.65; cursor: progress; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #fff;
      box-shadow: 0 10px 24px -12px rgba(99,102,241,0.7);
    }
    .btn-primary:hover { transform: translateY(-1px); }
    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      box-shadow: 0 10px 24px -12px rgba(239,68,68,0.7);
    }
    .btn-danger:hover { transform: translateY(-1px); }
    .btn-ghost {
      background: #f8fafc; color: #0f172a; border-color: #e2e8f0;
    }
    .btn-ghost:hover { background: #f1f5f9; }

    .btn svg { width: 16px; height: 16px; flex: 0 0 auto; }
    .btn-primary svg, .btn-danger svg { stroke: currentColor; fill: none; }
    .btn-danger svg:nth-child(1) { animation: spin 1s linear infinite; }

    .alert {
      padding: 12px 14px; border-radius: 14px; font-size: 13px;
      border: 1px solid transparent;
    }
    .alert.ok { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
    .alert.danger { background: #fef2f2; border-color: #fecaca; color: #991b1b; }

    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
      display: grid; place-items: center; z-index: 9999;
      padding: 24px; backdrop-filter: blur(2px);
    }
    .modal {
      width: 100%; max-width: 440px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.35);
      padding: 28px;
      display: grid; gap: 18px;
      animation: modalPop .18s ease-out;
    }
    @keyframes modalPop {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to   { opacity: 1; transform: translateY(0)   scale(1);   }
    }
    .modal-title {
      font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;
      display: flex; align-items: center; gap: 10px;
    }
    .modal-title-icon {
      width: 34px; height: 34px; border-radius: 10px;
      background: linear-gradient(135deg, #fef2f2, #fee2e2);
      color: #dc2626; font-size: 18px;
      display: grid; place-items: center; flex: 0 0 auto;
    }
    .modal-body {
      font-size: 14px; line-height: 1.55; color: #475569;
      display: grid; gap: 12px;
    }
    .modal-summary {
      background: #fff7ed; border: 1px solid #fed7aa;
      padding: 12px 14px; border-radius: 14px;
      color: #9a3412; font-size: 13px;
      display: grid; gap: 4px;
    }
    .modal-summary strong { color: #7c2d12; }
    .modal-actions {
      display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;
      padding-top: 4px;
    }

    .sub-summary.sub-empty {
      display: grid; grid-template-columns: 48px 1fr; gap: 14px;
      padding: 8px 2px 4px;
    }
    .sub-empty-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #eef2ff, #f0abfc33);
      display: grid; place-items: center; font-size: 22px;
    }
    .sub-empty-title { font-size: 16px; font-weight: 700; color: #0f172a; }
    .sub-empty-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
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
              @if (canAccessSubscription()) {
                <a class="tab" [class.active]="activeTab() === 'subscription'" (click)="activeTab.set('subscription')">
                  Subscription
                </a>
              }
              <a class="tab" style="opacity:0.6;pointer-events:none;">
                <span class="ico">⚙️</span> Settings
              </a>
            </div>
          </div>
        </header>

        @if (stripeReturnBanner().kind === 'success') {
          <div class="banner ok" style="margin-bottom: 20px;">
            <div class="banner-text">
              <div class="banner-title">Subscription started</div>
              <div class="banner-msg">Your subscription has been activated. You can manage it from the Subscription tab below.</div>
            </div>
          </div>
        } @else if (stripeReturnBanner().kind === 'canceled') {
          <div class="banner warn" style="margin-bottom: 20px;">
            <div class="banner-text">
              <div class="banner-title">Subscription setup canceled</div>
              <div class="banner-msg">You returned before completing checkout. No charges were made. You can restart the subscription process from the onboarding page any time.</div>
            </div>
          </div>
        }

        @switch (activeTab()) {
          @case ('returns') {
            <div style="display: grid; gap: 20px;">
              <section class="ret-kpi-grid">
                <div class="ret-kpi tot">
                  <div class="ret-kpi-top">
                    <div class="ret-kpi-label">Total Returns</div>
                    <div class="ret-kpi-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>
                    </div>
                  </div>
                  <div class="ret-kpi-val">{{ returnsCounts()?.totalCount ?? 0 }}</div>
                  <div class="ret-kpi-sub">All inspection records for this store</div>
                </div>
                <div class="ret-kpi under">
                  <div class="ret-kpi-top">
                    <div class="ret-kpi-label">Awaiting Action</div>
                    <div class="ret-kpi-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                  </div>
                  <div class="ret-kpi-val">{{ returnsCounts()?.underInspectionCount ?? 0 }}</div>
                  <div class="ret-kpi-sub">Items awaiting your inspection</div>
                </div>
                <div class="ret-kpi pass">
                  <div class="ret-kpi-top">
                    <div class="ret-kpi-label">Passed &amp; Restocked</div>
                    <div class="ret-kpi-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                  </div>
                  <div class="ret-kpi-val">
                    {{ (returnsCounts()?.passedCount ?? 0) + (returnsCounts()?.restockedCount ?? 0) }}
                  </div>
                  <div class="ret-kpi-sub">{{ returnsCounts()?.passedCount ?? 0 }} passed · {{ returnsCounts()?.restockedCount ?? 0 }} restocked</div>
                </div>
                <div class="ret-kpi rej">
                  <div class="ret-kpi-top">
                    <div class="ret-kpi-label">Rejected</div>
                    <div class="ret-kpi-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                    </div>
                  </div>
                  <div class="ret-kpi-val">{{ returnsCounts()?.rejectedCount ?? 0 }}</div>
                  <div class="ret-kpi-sub">Items that failed quality check</div>
                </div>
              </section>

              @if (returnsSuccess()) {
                <div class="banner success" style="margin-bottom: 0;">
                  <span class="banner-ico">✅</span>
                  <div class="banner-text">
                    <div class="banner-title">Success</div>
                    <div class="banner-msg">{{ returnsSuccess() }}</div>
                  </div>
                </div>
              }
              @if (returnsError()) {
                <div class="banner danger" style="margin-bottom: 0;">
                  <span class="banner-ico">⚠️</span>
                  <div class="banner-text">
                    <div class="banner-title">Error</div>
                    <div class="banner-msg">{{ returnsError() }}</div>
                  </div>
                </div>
              }

              <section class="panel">
                <div class="panel-head">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <h2>
                      <span class="ico">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>
                      </span>
                      Returns &amp; Inspections
                    </h2>
                    <span class="muted">Store-scoped view · partner actions only</span>
                  </div>
                </div>

                <div style="padding: 16px 22px; border-bottom: 1px solid #f3f4f6;">
                  <div class="filter-bar">
                    <div class="filter-seg" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        [attr.aria-selected]="returnsFilterStatus() === null"
                        class="filter-seg-btn"
                        [class.active]="returnsFilterStatus() === null"
                        (click)="returnsFilterStatus.set(null); loadReturns()">
                        All
                        <span class="cnt">{{ returnsCounts()?.totalCount ?? 0 }}</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        [attr.aria-selected]="returnsFilterStatus() === 'UNDER_INSPECTION'"
                        class="filter-seg-btn"
                        [class.active]="returnsFilterStatus() === 'UNDER_INSPECTION'"
                        (click)="returnsFilterStatus.set('UNDER_INSPECTION'); loadReturns()">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Under Inspection
                        <span class="cnt">{{ returnsCounts()?.underInspectionCount ?? 0 }}</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        [attr.aria-selected]="returnsFilterStatus() === 'RESTOCKED'"
                        class="filter-seg-btn"
                        [class.active]="returnsFilterStatus() === 'RESTOCKED'"
                        (click)="returnsFilterStatus.set('RESTOCKED'); loadReturns()">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        Restocked
                        <span class="cnt">{{ returnsCounts()?.restockedCount ?? 0 }}</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        [attr.aria-selected]="returnsFilterStatus() === 'REJECTED'"
                        class="filter-seg-btn"
                        [class.active]="returnsFilterStatus() === 'REJECTED'"
                        (click)="returnsFilterStatus.set('REJECTED'); loadReturns()">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                        Rejected
                        <span class="cnt">{{ returnsCounts()?.rejectedCount ?? 0 }}</span>
                      </button>
                    </div>

                    <div class="filter-search">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      <input
                        type="text"
                        placeholder="Search SKU or product…"
                        [value]="returnsSearch()"
                        (keyup.enter)="onSearchEnter($event)"
                      />
                      <button type="button" (click)="loadReturns()">Search</button>
                    </div>
                  </div>
                </div>

                <div class="panel-body" style="padding: 0;">
                  @if (returnsLoading()) {
                    <div class="loading-block">
                      <div style="display: inline-flex; align-items: center; gap: 10px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 0.8s linear infinite; color: #6366f1;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        Loading returns and inspections…
                      </div>
                    </div>
                  } @else if (returns().length === 0) {
                    <div class="ret-empty">
                      <div class="ret-empty-ico">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>
                      </div>
                      <h4>@if (returnsFilterStatus() === null) { No returns found } @else if (returnsFilterStatus() === 'UNDER_INSPECTION') { No under inspection records } @else if (returnsFilterStatus() === 'RESTOCKED') { No restocked records } @else { No rejected records }</h4>
                      <p>
                        @if (returnsFilterStatus() === null) {
                          Returns for this store will appear here once refunds complete and items are queued for physical inspection. Approve items to restock inventory back to the shelf.
                        } @else {
                          Try switching filters or adjusting your search query to find what you need.
                        }
                      </p>
                      @if (returnsFilterStatus() === null) {
                        <div class="ret-empty-tips">
                          <div class="ret-empty-tip">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
                            Approve to return stock to inventory
                          </div>
                          <div class="ret-empty-tip">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            Only the fulfilling store approves/rejects
                          </div>
                          <div class="ret-empty-tip">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            All actions are audited in refund records
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style="min-width: 220px;">Product</th>
                            <th>Partner Store</th>
                            <th>Qty</th>
                            <th>Received</th>
                            <th>Status</th>
                            <th style="min-width: 220px;">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of returns(); track row.id) {
                            <tr>
                              <td>
                                <div class="cell-identity">
                                  <div class="logo-or-avatar" style="width:40px;height:40px;border-radius:10px;font-size:16px;">
                                    @if (row.productImageUrl) { <img [src]="row.productImageUrl" alt="" onerror="this.style.display='none'" /> }
                                    @else {
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                                    }
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
                              <td><span class="cell-title" style="font-weight: 700;">{{ row.quantity ?? 1 }}</span></td>
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
                                      @if (actingRowId() === row.id) { ⏳ } @else {
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      }
                                      Approve
                                    </button>
                                    <button
                                      class="btn btn-danger btn-xs"
                                      [disabled]="actingRowId() === row.id"
                                      (click)="onRejectReturn(row)">
                                      @if (actingRowId() === row.id) { ⏳ } @else {
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                                      }
                                      Reject
                                    </button>
                                  } @else if (!row.canAct && row.status === 'UNDER_INSPECTION') {
                                    <span class="chip info">
                                      Inspection pending at {{ store()!.id === row.fulfillingStoreId ? row.originatingStoreName : row.fulfillingStoreName }}
                                    </span>
                                  } @else if (row.transactionId) {
                                    <button class="btn btn-ghost btn-xs" (click)="navigateToRefund(row.transactionId)">
                                      View Refund →
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

                  @if (returns().length > 0) {
                    <div class="pagination" style="border-top: 1px solid #f3f4f6;">
                      <div class="pagination-info">
                        Page {{ returnsPage() + 1 }} · size {{ returnsSize() }}
                      </div>
                      <div class="pagination-buttons">
                        <button class="btn-ghost btn-xs" [disabled]="returnsPage() === 0" (click)="prevPage()">← Prev</button>
                        <button class="btn-ghost btn-xs" [disabled]="returns().length < returnsSize()" (click)="nextPage()">Next →</button>
                      </div>
                    </div>
                  }
                </div>
              </section>
            </div>
          }
          @case ('subscription') {
            <section class="sub-panel" style="display: grid; gap: 20px;">
              <header class="sub-panel-head">
                <div class="sub-title">
                  <div class="sub-title-main">Subscription</div>
                  <div class="sub-subtitle">Manage your plan and recurring billing for this store.</div>
                </div>
                @if (storeSubscriptionLoading()) {
                  <span class="status-badge info">Loading…</span>
                } @else if (subState()?.isSubscribed) {
                  <span class="status-badge ok" [class.warn]="subState()?.cancelAtPeriodEnd">
                    {{ subState()?.cancelAtPeriodEnd ? 'Cancels at period end' : (subState()?.status ?? 'Active') }}
                  </span>
                } @else {
                  <span class="status-badge warn">Not subscribed</span>
                }
              </header>

              <div class="sub-card">
                @if (storeSubscriptionLoading()) {
                  <div class="loading-block">Loading subscription…</div>
                } @else if (subIsOnlyApiError()) {
                  <div class="alert danger">
                    <span>Could not load subscription details: {{ subStateErrorMessage() }}</span>
                  </div>
                } @else if (subState()?.isSubscribed || (subState()?.cancelAtPeriodEnd ?? false)) {
                  <div class="sub-summary">
                    <div class="sub-plan">
                      <div class="sub-plan-label">Current plan</div>
                      <div class="sub-plan-name">
                        {{ planDisplayName() }}
                        @if (subState()?.cancelAtPeriodEnd) {
                          <span class="chip warn">Cancels soon</span>
                        }
                      </div>
                    </div>
                    <div class="sub-status">
                      <div class="sub-plan-label">Status</div>
                      <div class="sub-status-row">
                        <span class="status-pill"
                              [class.ok]="subState()?.status === 'ACTIVE' || subState()?.status === 'TRIALING'"
                              [class.warn]="subState()?.status === 'PAST_DUE' || (subState()?.cancelAtPeriodEnd ?? false)"
                              [class.err]="subState()?.status === 'CANCELED' || subState()?.status === 'SUSPENDED'">
                          {{ subState()?.status ?? '—' }}
                        </span>
                        @if (subState()?.cancelAtPeriodEnd) {
                          <span class="sub-note">Access remains enabled until the end of the paid period.</span>
                        }
                      </div>
                    </div>
                    @if (subState()?.currentPeriodEnd) {
                      <div class="sub-period">
                        <div class="sub-plan-label">Current period ends</div>
                        <div class="sub-period-val">{{ formatIsoDate(subState()!.currentPeriodEnd!) }}</div>
                      </div>
                    }
                    @if (subState()?.trialEnd && (subState()?.status === 'TRIALING')) {
                      <div class="sub-period">
                        <div class="sub-plan-label">Trial ends</div>
                        <div class="sub-period-val">{{ formatIsoDate(subState()!.trialEnd!) }}</div>
                      </div>
                    }
                    @if (subState()?.canceledAt && (subState()?.cancelAtPeriodEnd ?? false)) {
                      <div class="sub-period">
                        <div class="sub-plan-label">Canceled at</div>
                        <div class="sub-period-val">{{ formatIsoDate(subState()!.canceledAt!) }}</div>
                      </div>
                    }
                  </div>

                  @if (subError()) {
                    <div class="alert danger">
                      <span>{{ subError() }}</span>
                    </div>
                  }
                  @if (subSuccess()) {
                    <div class="alert ok">
                      <span>{{ subSuccess() }}</span>
                    </div>
                  }

                  <div class="sub-actions">
                    @if (!(subState()?.cancelAtPeriodEnd ?? false)) {
                      <button class="btn btn-danger" [disabled]="subUnsubscribing()" (click)="onUnsubscribe()">
                        @if (subUnsubscribing()) {
                          Canceling subscription…
                        } @else {
                          Unsubscribe
                        }
                      </button>
                    } @else {
                      <button class="btn btn-ghost" style="opacity: 0.7; pointer-events: none;">
                        Already marked to cancel
                      </button>
                    }
                  </div>
                } @else {
                  <div class="sub-summary sub-empty">
                    <div class="sub-empty-icon">💡</div>
                    <div class="sub-empty-title">This store is not currently subscribed.</div>
                    <div class="sub-empty-sub">Pick a plan to unlock full platform features, order volume, and Stripe billing.</div>
                    <div class="sub-actions" style="margin-top: 8px;">
                      <a class="btn btn-primary" [routerLink]="['/pricing']" [queryParams]="{ store: store()?.id ?? null }" queryParamsHandling="merge">
                        View subscription plans
                      </a>
                      <a class="btn btn-ghost" [routerLink]="['/onboarding']">
                        Go to onboarding
                      </a>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
          @default {
            <router-outlet />
          }
        }
      }

      @if (subConfirmVisible()) {
        <div class="modal-overlay" (click)="onCancelUnsubscribe()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-title">
              <div class="modal-title-icon">⚠</div>
              Cancel subscription for <strong>{{ store()?.businessName ?? 'this store' }}</strong>?
            </div>
            <div class="modal-body">
              <div>
                @if (subConfirmIsTrial()) {
                  You are currently on a <strong>free trial</strong>.
                  @if (subConfirmTrialEnds()) {
                    Your trial ends on <strong>{{ subConfirmTrialEnds() }}</strong>.
                  }
                  If you cancel now, you will lose access immediately when the trial ends — no charges will be made to your card.
                } @else {
                  This is <strong>not</strong> an immediate cancellation. Your subscription stays active and fully usable until the end of the billing period you have already paid for. No further charges will be made after that date.
                }
              </div>
              <div class="modal-summary">
                @if (subConfirmIsTrial()) {
                  <div><strong>What happens next</strong></div>
                  <div>• Free trial continues with full access until <strong>{{ subConfirmPeriodEnd() }}</strong></div>
                  <div>• <strong>No charge</strong> will be made to your card on that date</div>
                  <div>• You can reactivate at any time to start a paid subscription before or after the trial ends</div>
                } @else {
                  <div><strong>What happens next</strong></div>
                  <div>• Access remains fully enabled until <strong>{{ subConfirmPeriodEnd() }}</strong> (already paid)</div>
                  <div>• You will <strong>not</strong> be charged again on the next renewal date</div>
                  <div>• You can reactivate any time before that date to continue uninterrupted</div>
                }
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" (click)="onCancelUnsubscribe()" [disabled]="subUnsubscribing()">
                Keep subscription
              </button>
              <button class="btn btn-danger" (click)="onConfirmUnsubscribe()" [disabled]="subUnsubscribing()">
                @if (subUnsubscribing()) {
                  Canceling…
                } @else {
                  Yes, cancel at period end
                }
              </button>
            </div>
          </div>
        </div>
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
  private readonly permissionService = inject(PermissionService);
  private readonly subscriptionPlanService = inject(SubscriptionPlanService);

  readonly store = signal<Store | null>(null);
  readonly storeLoading = signal(true);
  readonly activeTab = signal<TabKey>('products');

  readonly subState = signal<StoreSubscriptionState | null>(null);
  readonly storeSubscriptionLoading = signal(false);
  readonly subUnsubscribing = signal(false);
  readonly subError = signal<string | null>(null);
  readonly subSuccess = signal<string | null>(null);
  readonly subConfirmVisible = signal(false);
  readonly subConfirmPeriodEnd = computed<string>(() => {
    const s = this.subState();
    if (!s) return 'the end of your current access window';
    // Trial access ends at trial end, not at (potentially-fallback) period end
    if (s.status === 'TRIALING' && s.trialEnd) {
      try { return this.formatIsoDate(s.trialEnd); } catch { /* fall through */ }
    }
    if (s.currentPeriodEnd) {
      try { return this.formatIsoDate(s.currentPeriodEnd); } catch { /* fall through */ }
    }
    if (s.status === 'TRIALING' && s.trialEnd) {
      try { return this.formatIsoDate(s.trialEnd); } catch { /* ignore */ }
    }
    return s.status === 'TRIALING'
      ? 'your free trial end date'
      : 'the end of your current paid period';
  });
  readonly subConfirmIsTrial = computed<boolean>(() => {
    const s = this.subState();
    return !!s && s.status === 'TRIALING';
  });
  readonly subConfirmTrialEnds = computed<string>(() => {
    const s = this.subState();
    if (!s || !s.trialEnd) return '';
    try { return this.formatIsoDate(s.trialEnd); } catch { return ''; }
  });

  readonly subStateErrorMessage = computed<string | null>(() => {
    const s = this.subState() as any;
    if (s && typeof s?.error === 'string' && s.error) return String(s.error);
    return null;
  });
  readonly subIsOnlyApiError = computed<boolean>(() => {
    const err = this.subStateErrorMessage();
    if (!err) return false;
    const s = this.subState();
    if (!s) return false;
    if (s.isSubscribed) return false;
    if (s.cancelAtPeriodEnd) return false;
    return true;
  });

  readonly stripeReturnBanner = signal<{ kind: 'success' | 'canceled' | null; storeId?: string | null }>({ kind: null });
  private routeSub?: Subscription;

  readonly canAccessSubscription = computed(() => {
    const s = this.store();
    const u = this.authService.currentUser$.getValue();
    if (!u) return false;
    return this.permissionService.canAccessSubscription(s?.id ?? u.storeId ?? undefined);
  });

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
    this.watchActiveTabSubscription();
    this.watchActiveTabReturns();

    this.routeSub = this.route.queryParams.subscribe(qp => {
      const v = typeof qp?.['subscription'] === 'string' ? qp['subscription'] : '';
      if (v === 'success') {
        this.stripeReturnBanner.set({ kind: 'success', storeId: (qp?.['store'] as string | undefined) ?? null });
        queueMicrotask(() => this.loadStoreSubscription());
      } else if (v === 'canceled') {
        this.stripeReturnBanner.set({ kind: 'canceled', storeId: (qp?.['store'] as string | undefined) ?? null });
        queueMicrotask(() => this.loadStoreSubscription());
      } else {
        this.stripeReturnBanner.set({ kind: null });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSub) this.routerSub.unsubscribe();
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  private trackActiveTab(): void {
    const updateFromUrl = () => {
      const url = this.router.url.toLowerCase();
      if (url.includes('/transactions')) {
        this.activeTab.set('transactions');
      } else if (url.includes('/returns')) {
        this.activeTab.set('returns');
      } else if (url.includes('/subscription') || this.activeTab() === 'subscription') {
        this.activeTab.set('subscription');
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

  private watchActiveTabSubscription(): void {
    queueMicrotask(() => {
      if (this.activeTab() === 'subscription') {
        this.loadStoreSubscription();
      }
    });
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        if (this.activeTab() === 'subscription') {
          this.loadStoreSubscription();
        }
      }
    });
  }

  async loadStoreSubscription(): Promise<void> {
    const storeId = await this.waitForStoreId(25, 200);
    if (!storeId) return;
    this.storeSubscriptionLoading.set(true);
    this.subError.set(null);
    try {
      const sub = await this.subscriptionPlanService.getStoreSubscription(storeId);
      this.subState.set(sub);
      if ((sub as any)?.error) {
        this.subError.set(String((sub as any).error));
      }
    } catch (err: any) {
      this.subState.set(null);
      this.subError.set((typeof err?.message === 'string' ? err.message : null) ?? 'Could not load subscription details.');
    } finally {
      this.storeSubscriptionLoading.set(false);
    }
  }

  private async waitForStoreId(maxAttempts: number, intervalMs: number): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const direct = String(this.store()?.id ?? this.authService.currentUser$.getValue()?.storeId ?? '');
      if (direct && direct.length > 0 && direct !== 'null' && direct !== 'undefined') return direct;
      const routeStoreId = this.route.snapshot.paramMap.get('storeId');
      if (routeStoreId && routeStoreId !== 'me' && routeStoreId.length > 0) return routeStoreId;
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return null;
  }

  onUnsubscribe(): void {
    const storeId = this.store()?.id ?? this.authService.currentUser$.getValue()?.storeId;
    if (!storeId) return;
    this.subConfirmVisible.set(true);
  }

  onCancelUnsubscribe(): void {
    if (this.subUnsubscribing()) return;
    this.subConfirmVisible.set(false);
  }

  async onConfirmUnsubscribe(): Promise<void> {
    const storeId = this.store()?.id ?? this.authService.currentUser$.getValue()?.storeId;
    if (!storeId) return;
    this.subUnsubscribing.set(true);
    this.subError.set(null);
    this.subSuccess.set(null);
    try {
      const result: StoreSubscriptionCancelResult =
        await this.subscriptionPlanService.cancelStoreSubscription(storeId);
      if (!result.canceled) {
        this.subError.set(result.error || 'Could not cancel subscription. Please try again.');
        return;
      }
      this.subSuccess.set(result.message || 'Subscription set to cancel at the end of the billing period.');
      this.subConfirmVisible.set(false);
      await this.loadStoreSubscription();
    } catch (err: any) {
      this.subError.set(
        (typeof err?.message === 'string' ? err.message : null) ??
        'Could not cancel subscription. Please try again or contact support.'
      );
    } finally {
      this.subUnsubscribing.set(false);
    }
  }

  planDisplayName(): string {
    const s = this.subState();
    if (!s) return 'Standard';
    if (s.planCode) {
      const pc = String(s.planCode).toUpperCase();
      if (pc === 'PRO') return 'Pro Plan';
      if (pc === 'PLUS') return 'Plus Plan';
      if (pc === 'ENTERPRISE' || pc === 'CUSTOM') return 'Enterprise Plan';
      return `${pc} Plan`;
    }
    return (s.status === 'TRIALING') ? 'Free Trial' : (s.isSubscribed ? 'Standard subscription' : '—');
  }

  formatIsoDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return iso;
    }
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
      if (this.activeTab() === 'subscription') {
        queueMicrotask(() => this.loadStoreSubscription());
      }
    } catch (err) {
      console.error('Failed to load store', err);
    } finally {
      this.storeLoading.set(false);
      this.cdr.markForCheck();
    }
  }
}
