import { Component, OnInit, signal, inject, computed, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CanPipe } from '../../pipes/can.pipe';

interface InventoryVariant {
  variantId: string;
  productId?: string;
  productTitle: string | null;
  productDescription?: string | null;
  productImageUrl?: string | null;
  variantImageUrl?: string | null;
  productGalleryImageUrls?: string[] | null;
  variantGalleryImageUrls?: string[] | null;
  storeId?: string | null;
  storeName?: string | null;
  sku: string | null;
  wholesalePriceCents: number | null;
  retailPriceCents: number | null;
  stockQuantity: number | null;
  status: string | null;
  createdAt?: string | null;
}

interface StoreTotals {
  storeId: string;
  storeName: string;
  count: number;
}

interface StatusTotals {
  key: string;
  count: number;
}

interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  storeTotals?: StoreTotals[] | null;
  statusTotals?: StatusTotals[] | null;
}

type ViewMode = 'store' | 'unified';

const STATUS_STYLES: Record<string, { cssClass: string; dot: string; bar: string; pillClass: string }> = {
  ACTIVE:        { cssClass: 'high', dot: '#10b981', bar: '#10b981', pillClass: 'active' },
  DRAFT:         { cssClass: 'medium', dot: '#9ca3af', bar: '#f59e0b', pillClass: 'draft' },
  PENDING:       { cssClass: 'medium', dot: '#f59e0b', bar: '#f59e0b', pillClass: 'pending' },
  OUT_OF_STOCK:  { cssClass: 'low',    dot: '#ef4444', bar: '#ef4444', pillClass: 'out-of-stock' },
  INACTIVE:      { cssClass: 'low',    dot: '#d1d5db', bar: '#9ca3af', pillClass: 'inactive' },
  ARCHIVED:      { cssClass: 'low',    dot: '#9ca3af', bar: '#9ca3af', pillClass: 'archived' },
  DISABLED:      { cssClass: 'low',    dot: '#6b7280', bar: '#6b7280', pillClass: 'archived' },
};

const STATUS_DOTS: Record<string, string> = {
  ACTIVE: '#10b981',
  DRAFT: '#6b7280',
  PENDING: '#f59e0b',
  OUT_OF_STOCK: '#ef4444',
  INACTIVE: '#d1d5db',
  ARCHIVED: '#6b7280',
  DISABLED: '#374151',
};

const PILL_CLASS_FROM_KEY: Record<string, string> = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  PENDING: 'pending',
  OUT_OF_STOCK: 'out-of-stock',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
};

@Component({
  selector: 'app-store-products-list',
  standalone: true,
  imports: [CommonModule, RouterLink, CanPipe, FormsModule],
  styles: [`
    :host {
      display: block;
      background: var(--gray-50, #f9fafb);
      min-height: 100%;
    }

    :host {
      --primary: #4f46e5;
      --primary-light: #eef2ff;
      --primary-dark: #3730a3;
      --accent: #7c3aed;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #3b82f6;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-400: #9ca3af;
      --gray-500: #6b7280;
      --gray-600: #4b5563;
      --gray-700: #374151;
      --gray-800: #1f2937;
      --gray-900: #111827;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      --radius-sm: 8px;
      --radius: 12px;
      --radius-lg: 16px;
    }

    /* ---------- Main Layout ---------- */
    .main-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px 20px 32px;
    }
    .main-layout.with-sidebar {
      grid-template-columns: 280px minmax(0, 1fr);
    }
    @media (max-width: 1024px) {
      .main-layout.with-sidebar {
        grid-template-columns: 1fr;
        padding: 16px;
      }
    }

    /* ---------- Sidebar ---------- */
    .sidebar {
      position: sticky;
      top: 88px;
      height: fit-content;
    }
    @media (max-width: 1024px) {
      .sidebar { position: static; }
    }
    .filter-card {
      background: #fff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      padding: 24px;
      box-shadow: var(--shadow-sm);
    }
    .filter-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .filter-header-icon {
      width: 32px; height: 32px;
      background: var(--primary-light);
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      color: var(--primary);
    }
    .filter-header-icon svg { width: 16px; height: 16px; stroke: currentColor; }
    .filter-title {
      font-size: 16px; font-weight: 700; color: var(--gray-900);
      margin: 0;
    }
    .filter-subtitle {
      font-size: 13px; color: var(--gray-500);
      margin: 0 0 24px 0; line-height: 1.5;
    }
    .filter-section { margin-bottom: 24px; }
    .filter-section:last-child { margin-bottom: 0; }
    .filter-section-title {
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--gray-500);
      margin: 0 0 14px 0;
      display: flex; align-items: center; justify-content: space-between;
    }
    .filter-count {
      background: var(--gray-100); color: var(--gray-600);
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
      text-transform: none; letter-spacing: 0;
    }

    .filter-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer; user-select: none;
      transition: background .2s ease;
      margin-bottom: 2px;
    }
    .filter-item:hover { background: var(--gray-50); }
    .filter-item.active { background: var(--primary-light); }

    .filter-checkbox {
      width: 18px; height: 18px;
      border: 2px solid var(--gray-300);
      border-radius: 5px;
      display: flex; align-items: center; justify-content: center;
      transition: all .2s ease;
      flex-shrink: 0;
      color: transparent;
    }
    .filter-item.active .filter-checkbox {
      background: var(--primary); border-color: var(--primary); color: #fff;
    }
    .filter-checkbox svg {
      width: 11px; height: 11px;
    }

    .filter-item-label {
      flex: 1; min-width: 0;
      font-size: 13.5px; font-weight: 500; color: var(--gray-700);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .filter-item-count {
      font-size: 12px; font-weight: 600; color: var(--gray-400);
      background: var(--gray-100);
      padding: 2px 8px; border-radius: 10px;
      min-width: 24px; text-align: center;
    }
    .filter-item.active .filter-item-count {
      background: rgba(79, 70, 229, 0.15); color: var(--primary);
    }

    /* ---------- Status Pills ---------- */
    .status-pills {
      display: flex; flex-wrap: wrap; gap: 8px;
    }
    .status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 500;
      border: 1.5px solid var(--gray-200);
      background: #fff; color: var(--gray-600);
      cursor: pointer; user-select: none;
      transition: all .2s ease;
    }
    .status-pill:hover {
      border-color: var(--gray-300); background: var(--gray-50);
    }
    .status-pill.active {
      border-color: var(--primary); background: var(--primary-light); color: var(--primary);
    }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.active         { background: var(--success); }
    .status-dot.draft          { background: var(--gray-400); }
    .status-dot.pending        { background: var(--warning); }
    .status-dot.out-of-stock   { background: var(--danger); }
    .status-dot.inactive       { background: var(--gray-300); }
    .status-dot.archived       { background: var(--gray-400); }

    .clear-filters {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: var(--radius-sm);
      font-size: 13px; font-weight: 500; color: var(--gray-500);
      cursor: pointer; border: 0; background: none;
      margin-top: 12px;
      transition: all .2s ease;
    }
    .clear-filters:hover {
      color: var(--danger); background: #fef2f2;
    }
    .clear-filters svg { width: 14px; height: 14px; }

    /* ---------- Main Content ---------- */
    .main-content { min-width: 0; }

    .content-card {
      background: #fff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      animation: fadeIn 0.4s ease-out;
    }
    .filter-card {
      animation: fadeIn 0.4s ease-out 0.1s both;
    }

    .content-header {
      padding: 32px 32px 24px;
    }
    .content-header-top {
      display: flex; align-items: flex-start; gap: 16px;
      margin-bottom: 12px;
    }
    .content-title-icon {
      width: 48px; height: 48px;
      background: var(--primary-light);
      border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: var(--primary);
    }
    .content-title-icon svg {
      width: 24px; height: 24px; stroke: currentColor; fill: none;
    }
    .content-title-group { flex: 1; min-width: 0; }
    .content-title {
      font-size: 28px; font-weight: 700; color: var(--gray-900);
      margin: 0 0 8px 0; letter-spacing: -0.01em;
    }
    .content-description {
      font-size: 15px; color: var(--gray-500);
      line-height: 1.6; margin: 0;
    }

    .item-count-badge {
      display: inline-flex; align-items: center;
      background: var(--gray-100);
      padding: 8px 16px; border-radius: 20px;
      font-size: 14px; font-weight: 500; color: var(--gray-700);
      margin-top: 20px;
    }
    .item-count-badge strong { color: var(--primary-dark); font-weight: 700; }

    /* ---------- Search Bar ---------- */
    .search-bar {
      position: relative;
      margin-top: 20px;
    }
    .search-bar input {
      width: 100%;
      padding: 14px 100px 14px 48px;
      border: 1.5px solid var(--gray-200);
      border-radius: var(--radius);
      font-size: 15px; font-family: inherit;
      background: var(--gray-50);
      transition: all .2s ease;
      color: var(--gray-800);
    }
    .search-bar input:focus {
      outline: none;
      border-color: var(--primary);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    .search-bar input::placeholder { color: var(--gray-400); }

    .search-icon {
      position: absolute;
      left: 16px; top: 50%; transform: translateY(-50%);
      width: 20px; height: 20px; color: var(--gray-400);
    }
    .search-icon svg { width: 100%; height: 100%; stroke: currentColor; fill: none; }

    .search-bar-actions {
      position: absolute;
      right: 12px; top: 50%; transform: translateY(-50%);
      display: flex; gap: 8px;
    }
    .search-action-btn {
      width: 32px; height: 32px;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-sm);
      background: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .2s ease;
      color: var(--gray-500);
    }
    .search-action-btn:hover {
      border-color: var(--primary); color: var(--primary); background: var(--primary-light);
    }
    .search-action-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; }

    .search-clear {
      position: absolute;
      right: 92px; top: 50%; transform: translateY(-50%);
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 0; background: transparent;
      color: var(--gray-400);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700;
    }
    .search-clear:hover {
      background: var(--gray-100); color: var(--gray-700);
    }

    /* ---------- Product Table ---------- */
    @media (max-width: 1024px) {
      .table-wrap { overflow-x: auto; }
    }
    .product-table {
      width: 100%; border-collapse: collapse;
    }
    .product-table thead th {
      padding: 16px 24px; text-align: left;
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--gray-500);
      background: var(--gray-50);
      border-bottom: 1px solid var(--gray-200);
      white-space: nowrap;
    }
    .product-table thead th:first-child { padding-left: 32px; }
    .product-table thead th:last-child  { padding-right: 32px; }

    .product-table tbody tr {
      border-bottom: 1px solid var(--gray-100);
      transition: background .15s ease;
      animation: fadeIn 0.3s ease-out both;
    }
    .product-table tbody tr:nth-child(1) { animation-delay: 0.05s; }
    .product-table tbody tr:nth-child(2) { animation-delay: 0.10s; }
    .product-table tbody tr:nth-child(3) { animation-delay: 0.15s; }
    .product-table tbody tr:nth-child(4) { animation-delay: 0.20s; }
    .product-table tbody tr:nth-child(5) { animation-delay: 0.25s; }
    .product-table tbody tr:nth-child(6) { animation-delay: 0.30s; }
    .product-table tbody tr:nth-child(7) { animation-delay: 0.35s; }
    .product-table tbody tr:nth-child(8) { animation-delay: 0.40s; }
    .product-table tbody tr:hover { background: var(--gray-50); }
    .product-table tbody tr:last-child { border-bottom: none; }

    .product-table td {
      padding: 20px 24px; vertical-align: middle;
    }
    .product-table td:first-child { padding-left: 32px; }
    .product-table td:last-child  { padding-right: 32px; }

    @media (max-width: 640px) {
      .content-header { padding: 24px 20px; }
      .product-table td, .product-table th { padding: 16px; }
    }

    /* Store chip inside product cell (unified view) */
    .store-chip-inline {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px;
      background: rgba(79,70,229,0.08);
      color: var(--primary-dark);
      font-size: 11.5px; font-weight: 700; letter-spacing: 0.01em;
      margin-bottom: 8px;
      width: fit-content;
    }
    .store-chip-inline::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: var(--primary);
    }

    .product-cell {
      display: flex; align-items: center; gap: 16px;
      width: 100%;
    }
    .product-cell-main {
      display: flex; align-items: center; gap: 16px; min-width: 0; flex: 1;
    }
    .product-thumb {
      width: 56px; height: 56px;
      border-radius: var(--radius-sm);
      background: var(--gray-100);
      border: 1px solid var(--gray-200);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; overflow: hidden; color: var(--gray-400);
      font-size: 22px;
    }
    .product-thumb img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .product-thumb svg { width: 28px; height: 28px; stroke: currentColor; fill: none; }

    .product-info { min-width: 0; flex: 1; }
    .product-name {
      font-size: 15px; font-weight: 600; color: var(--gray-900);
      margin: 0 0 4px 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 300px;
    }
    .product-desc {
      font-size: 13px; color: var(--gray-500);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 300px; margin: 0 0 6px 0;
    }
    .product-meta {
      display: flex; align-items: center; gap: 6px;
    }
    .product-meta-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; color: var(--gray-500);
      background: var(--gray-100);
      padding: 3px 8px; border-radius: 4px;
    }
    .product-meta-tag svg { width: 10px; height: 10px; fill: currentColor; }

    .row-actions-inline {
      margin-left: auto; display: inline-flex; align-items: center;
      gap: 6px; flex-shrink: 0;
    }
    .btn-ico {
      width: 30px; height: 30px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 8px;
      border: 1.5px solid var(--gray-200);
      background: #fff; color: var(--gray-500);
      font-size: 13px; cursor: pointer;
      text-decoration: none;
      transition: all .12s ease;
    }
    .btn-ico:hover {
      background: var(--gray-50); border-color: var(--gray-300); color: var(--gray-700);
    }
    .btn-ico.danger { color: #b91c1c; border-color: #fecaca; }
    .btn-ico.danger:hover { background: #fef2f2; }

    /* ---------- SKU ---------- */
    .sku-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px; color: var(--gray-600);
      background: var(--gray-100);
      padding: 6px 12px; border-radius: 6px;
      display: inline-block; white-space: nowrap;
    }

    /* ---------- Prices ---------- */
    .price-retail {
      font-size: 16px; font-weight: 700; color: var(--gray-900);
    }
    .price-wholesale {
      font-size: 16px; font-weight: 700; color: var(--primary);
    }

    /* ---------- Stock Indicator ---------- */
    .stock-indicator {
      display: inline-flex; align-items: center; gap: 10px;
    }
    .stock-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .stock-dot.high   { background: var(--success); }
    .stock-dot.medium { background: var(--warning); }
    .stock-dot.low    { background: var(--danger); }

    .stock-bar {
      width: 48px; height: 4px; background: var(--gray-200);
      border-radius: 2px; overflow: hidden; flex-shrink: 0;
    }
    .stock-bar-fill {
      height: 100%; border-radius: 2px; transition: width .3s ease;
    }
    .stock-bar-fill.high   { background: var(--success); }
    .stock-bar-fill.medium { background: var(--warning); }
    .stock-bar-fill.low    { background: var(--danger); }

    .stock-value {
      font-size: 15px; font-weight: 700; min-width: 20px;
    }
    .stock-value.high   { color: var(--success); }
    .stock-value.medium { color: var(--warning); }
    .stock-value.low    { color: var(--danger); }

    /* ---------- QR Button ---------- */
    .qr-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border: 1.5px solid var(--gray-200);
      border-radius: var(--radius-sm);
      background: #fff; color: var(--gray-700);
      font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all .2s ease;
      text-decoration: none;
    }
    .qr-btn:hover {
      border-color: var(--primary); color: var(--primary); background: var(--primary-light);
    }
    .qr-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; }

    /* ---------- Table Footer ---------- */
    .table-footer {
      padding: 20px 32px;
      border-top: 1px solid var(--gray-100);
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
      background: var(--gray-50);
    }
    @media (max-width: 640px) {
      .table-footer {
        padding: 16px 20px;
        flex-direction: column; gap: 16px;
      }
    }
    .table-footer-info {
      font-size: 14px; color: var(--gray-500); font-weight: 500;
    }
    .table-footer-info strong { color: var(--gray-900); font-weight: 700; }

    .table-footer-actions {
      display: flex; align-items: center; gap: 10px;
    }

    .btn-icon {
      width: 40px; height: 40px;
      border: 1.5px solid var(--gray-200);
      border-radius: var(--radius-sm);
      background: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .2s ease;
      color: var(--gray-500);
    }
    .btn-icon:hover:not(:disabled) {
      border-color: var(--primary); color: var(--primary); background: var(--primary-light);
    }
    .btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-icon svg { width: 18px; height: 18px; stroke: currentColor; fill: none; }

    .pager-numbers {
      display: inline-flex; align-items: center; gap: 6px;
    }
    .pager-num {
      width: 36px; height: 36px;
      border-radius: 8px;
      border: 1.5px solid var(--gray-200);
      background: #fff; color: var(--gray-600);
      font-size: 13px; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .12s ease;
    }
    .pager-num:hover {
      border-color: var(--gray-300); background: var(--gray-50);
    }
    .pager-num.active {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-color: var(--primary); color: #fff;
      box-shadow: 0 2px 6px rgba(79,70,229,0.25);
    }
    .pager-ellipsis {
      color: var(--gray-400); font-size: 13px; font-weight: 700;
      width: 24px; text-align: center;
      user-select: none;
    }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: #fff; border: 0;
      border-radius: var(--radius-sm);
      font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all .2s ease;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
      text-decoration: none;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
    }
    .btn-primary svg { width: 16px; height: 16px; stroke: currentColor; fill: none; }

    /* ---------- Loading / Empty ---------- */
    .loading, .empty {
      padding: 64px 24px;
      text-align: center;
      color: var(--gray-500); font-size: 14px;
    }
    .empty {
      display: grid; gap: 10px; justify-items: center;
    }
    .empty .ico {
      width: 64px; height: 64px; border-radius: 18px;
      background: var(--gray-100); color: var(--gray-400);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 28px; margin-bottom: 6px;
    }
    .empty h4 { margin: 0; font-size: 17px; font-weight: 700; color: var(--gray-900); letter-spacing: -0.01em; }
    .empty p  { margin: 0; font-size: 13.5px; color: var(--gray-500); max-width: 380px; line-height: 1.5; }

    /* ---------- Animations ---------- */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
  template: `
    <div class="main-layout" [class.with-sidebar]="mode() === 'unified'">
      @if (mode() === 'unified') {
        <aside class="sidebar">
          <div class="filter-card">
            <div class="filter-header">
              <div class="filter-header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </div>
              <h3 class="filter-title">Filters</h3>
            </div>
            <p class="filter-subtitle">Narrow down the catalog by store or status.</p>

            <div class="filter-section">
              <div class="filter-section-title">
                Store
                <span class="filter-count">{{ storeTotals().length }}</span>
              </div>
              <div class="store-list">
                @for (s of storeTotals(); track s.storeId) {
                  <div class="filter-item"
                       [class.active]="selectedStoreIds().has(s.storeId)"
                       (click)="toggleStoreFilter(s.storeId)">
                    <span class="filter-checkbox">
                      @if (selectedStoreIds().has(s.storeId)) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      }
                    </span>
                    <span class="filter-item-label">{{ s.storeName }}</span>
                    <span class="filter-item-count">{{ s.count }}</span>
                  </div>
                }
                @if (storeTotals().length === 0 && !loading()) {
                  <div style="padding: 8px 12px; font-size: 12.5px; color: var(--gray-400);">No stores match current filters.</div>
                }
              </div>
            </div>

            <div class="filter-section">
              <div class="filter-section-title">Status</div>
              <div class="status-pills">
                @for (st of statusList; track st.key) {
                  <div class="status-pill"
                       [class.active]="selectedStatuses().has(st.key)"
                       (click)="toggleStatusFilter(st.key)">
                    <span class="status-dot" [class]="st.pillClass"></span>
                    {{ st.label }}
                  </div>
                }
              </div>
            </div>

            <button type="button" class="clear-filters" (click)="clearFilters()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Clear all
            </button>
          </div>
        </aside>
      }

      <main class="main-content">
        <div class="content-card">
          <div class="content-header">
            <div class="content-header-top">
              <div class="content-title-icon">
                @if (mode() === 'unified') {
                  <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                }
              </div>
              <div class="content-title-group">
                <h1 class="content-title">
                  @if (mode() === 'unified') { All Products }
                  @else { Products &amp; Inventory }
                </h1>
                <p class="content-description">
                  @if (mode() === 'unified') { Unified catalog across every store. Browse the network inventory and generate QR share codes for any product. }
                  @else { Manage your catalog, pricing, and stock levels. }
                </p>
              </div>
            </div>

            <div class="item-count-badge">
              Showing <strong>{{ formatRange(fromItem(), toItem()) }}</strong> of <strong>{{ totalElements() }}</strong> items
            </div>

            <div class="search-bar">
              <span class="search-icon">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                placeholder="Search by product name, description, or SKU..."
              />
              @if (searchQuery()) {
                <button type="button" class="search-clear" title="Clear search" (click)="clearSearch()">✕</button>
              }
              <div class="search-bar-actions">
                <button type="button" class="search-action-btn" (click)="focusFilters()" title="Filter">
                  <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                </button>
                <button type="button" class="search-action-btn" title="Settings">
                  <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          @if (loading()) {
            <div class="loading">Loading inventory&hellip;</div>
          } @else if (content().length > 0) {
            <div class="table-wrap">
              <table class="product-table">
                <thead>
                  <tr>
                    <th style="min-width: 120px;">QR</th>
                    <th style="min-width: 260px;">Product</th>
                    <th style="min-width: 100px;">Retail</th>
                    <th style="min-width: 110px;">Wholesale</th>
                    <th style="min-width: 110px;">Stock</th>
                    <th style="min-width: 160px;">SKU</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of content(); track v.variantId) {
                    <tr>
                      <td>
                        @if (v | can:'qr': (v.storeId ?? '')) {
                          <a class="qr-btn"
                             [routerLink]="['/p', v.productId ?? v.variantId, 'qr']"
                             target="_blank" rel="noopener" title="Generate QR code">
                            <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="3" y="3" width="7" height="7"></rect>
                              <rect x="14" y="3" width="7" height="7"></rect>
                              <rect x="14" y="14" width="7" height="7"></rect>
                              <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            QR
                          </a>
                        }
                      </td>
                      <td>
                        <div class="product-cell">
                          <div class="product-cell-main">
                            <div class="product-stack" style="display:flex;flex-direction:column;min-width:0;">
                              @if (mode() === 'unified' && v.storeName) {
                                <span class="store-chip-inline">{{ v.storeName }}</span>
                              }
                              <div style="display:flex;align-items:center;gap:16px;">
                                <div class="product-thumb">
                                  @if (v.variantImageUrl || v.productImageUrl) {
                                    <img [src]="v.variantImageUrl || v.productImageUrl" alt="" onerror="this.style.display='none'" />
                                  }
                                  @if (!v.variantImageUrl && !v.productImageUrl) {
                                    <svg viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                      <path d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path>
                                    </svg>
                                  }
                                </div>
                                <div class="product-info">
                                  <p class="product-name">{{ v.productTitle || 'Untitled' }}</p>
                                  @if (v.productDescription) {
                                    <p class="product-desc">{{ v.productDescription.slice(0, 64) }}{{ v.productDescription.length > 64 ? '&hellip;' : '' }}</p>
                                  }
                                  @if (galleryCount(v) > 0) {
                                    <div class="product-meta">
                                      <span class="product-meta-tag">
                                        <svg viewBox="0 0 24 24">
                                          <rect x="3" y="3" width="7" height="7"/>
                                          <rect x="14" y="3" width="7" height="7"/>
                                          <rect x="3" y="14" width="7" height="7"/>
                                          <rect x="14" y="14" width="7" height="7"/>
                                        </svg>
                                        {{ galleryCount(v) }}
                                      </span>
                                    </div>
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                          @if ((mode() === 'store' && ((v | can:'edit':storeId()) || (v | can:'delete':storeId()))) ||
                              (mode() !== 'store' && ((v | can:'edit': (v.storeId ?? '')) || (v | can:'delete': (v.storeId ?? ''))))) {
                            <div class="row-actions-inline">
                              @if (mode() === 'store' && (v | can:'edit':storeId())) {
                                <a class="btn-ico" [routerLink]="['./', v.variantId]" title="Edit">✎</a>
                              }
                              @if (mode() !== 'store' && (v | can:'edit': (v.storeId ?? ''))) {
                                <a class="btn-ico" [routerLink]="['/admin','stores', v.storeId, 'products', v.variantId]" title="Edit">✎</a>
                              }
                              @if (mode() === 'store' && (v | can:'delete':storeId())) {
                                <button type="button" class="btn-ico danger" (click)="onDeleteProduct(v)" title="Delete">🗑</button>
                              }
                              @if (mode() !== 'store' && (v | can:'delete': (v.storeId ?? ''))) {
                                <button type="button" class="btn-ico danger" (click)="onDeleteProduct(v)" title="Delete">🗑</button>
                              }
                            </div>
                          }
                        </div>
                      </td>
                      <td>
                        <span class="price-retail">{{ formatCentsToDollar(v.retailPriceCents) }}</span>
                      </td>
                      <td>
                        <span class="price-wholesale">{{ formatCentsToDollar(v.wholesalePriceCents) }}</span>
                      </td>
                      <td>
                        <div class="stock-indicator">
                          <span class="stock-dot" [class]="stockTier(v)"></span>
                          <span class="stock-bar">
                            <span class="stock-bar-fill"
                                  [class]="stockTier(v)"
                                  [style.width.%]="stockPercent(v)"></span>
                          </span>
                          <span class="stock-value" [class]="stockTier(v)">
                            {{ formatStockQuantity(v.stockQuantity) }}
                          </span>
                        </div>
                      </td>
                      <td>
                        @if (v.sku) { <span class="sku-code">{{ v.sku }}</span> }
                        @else { <span style="color:var(--gray-400);">&mdash;</span> }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="empty">
              <div class="ico">📦</div>
              @if (totalElements() === 0 && !hasAnyFilter()) {
                @if (mode() === 'unified') {
                  <h4>No products on the network yet</h4>
                  <p>Ask store owners to add inventory to enable browsing and QR sharing.</p>
                } @else {
                  <h4>No products yet</h4>
                  <p>Click <b>"+ Add product"</b> above to create your first inventory item.</p>
                }
              } @else {
                <h4>No matches</h4>
                <p>Try clearing the search or filters to see more results.</p>
              }
            </div>
          }

          <div class="table-footer">
            <div class="table-footer-info">
              Showing <strong>{{ formatRange(fromItem(), toItem()) }}</strong> of <strong>{{ totalElements() }}</strong> products
            </div>
            <div class="table-footer-actions">
              <button type="button"
                      class="btn-icon"
                      [disabled]="firstPage() || loading()"
                      (click)="prevPage()"
                      title="Previous">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>

              <div class="pager-numbers">
                @for (n of pageNumbers(); track n.label) {
                  @if (n.type === 'num') {
                    <button type="button"
                            class="pager-num"
                            [class.active]="n.value === page()"
                            [disabled]="loading()"
                            (click)="goToPage(n.value!)">
                      {{ (n.value! + 1) }}
                    </button>
                  } @else {
                    <span class="pager-ellipsis">&hellip;</span>
                  }
                }
              </div>

              <button type="button"
                      class="btn-icon"
                      [disabled]="lastPage() || loading()"
                      (click)="nextPage()"
                      title="Next">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>

              @if (mode() === 'store' && (storeId() | can:'create')) {
                <a class="btn-primary" [routerLink]="['./new']">
                  <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  Add Product
                </a>
              }
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class StoreProductsListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // ===== Core state =====
  readonly mode = signal<ViewMode>('store');
  readonly storeId = signal<string>('');

  readonly loading = signal(true);
  readonly content = signal<InventoryVariant[]>([]);

  // ===== Pagination state =====
  readonly page = signal(0);
  readonly size = signal(6);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);

  // ===== Sidebar totals =====
  readonly storeTotals = signal<StoreTotals[]>([]);
  readonly statusTotals = signal<StatusTotals[]>([]);

  // ===== Filters =====
  readonly searchQuery = signal('');
  readonly debouncedSearchQuery = signal('');
  readonly selectedStoreIds = signal<Set<string>>(new Set());
  readonly selectedStatuses = signal<Set<string>>(new Set(['ACTIVE', 'DRAFT', 'PENDING', 'OUT_OF_STOCK', 'ARCHIVED']));

  // ===== Constants =====
  readonly statusList: { key: string; label: string; dot: string; pillClass: string }[] = [
    { key: 'ACTIVE',       label: 'Active',       dot: STATUS_DOTS['ACTIVE'],       pillClass: PILL_CLASS_FROM_KEY['ACTIVE'] },
    { key: 'DRAFT',        label: 'Draft',        dot: STATUS_DOTS['DRAFT'],        pillClass: PILL_CLASS_FROM_KEY['DRAFT'] },
    { key: 'PENDING',      label: 'Pending',      dot: STATUS_DOTS['PENDING'],      pillClass: PILL_CLASS_FROM_KEY['PENDING'] },
    { key: 'OUT_OF_STOCK', label: 'Out of stock', dot: STATUS_DOTS['OUT_OF_STOCK'], pillClass: PILL_CLASS_FROM_KEY['OUT_OF_STOCK'] },
    { key: 'INACTIVE',     label: 'Inactive',     dot: STATUS_DOTS['INACTIVE'],     pillClass: PILL_CLASS_FROM_KEY['INACTIVE'] },
    { key: 'ARCHIVED',     label: 'Archived',     dot: STATUS_DOTS['ARCHIVED'],     pillClass: PILL_CLASS_FROM_KEY['ARCHIVED'] },
  ];

  // ===== Computed =====
  readonly fromItem = computed<number>(() => {
    const total = this.totalElements();
    if (total === 0) return 0;
    return this.page() * this.size() + 1;
  });

  readonly toItem = computed<number>(() => {
    const total = this.totalElements();
    if (total === 0) return 0;
    return Math.min((this.page() + 1) * this.size(), total);
  });

  readonly firstPage = computed(() => this.page() === 0);
  readonly lastPage = computed(() => this.page() >= Math.max(0, this.totalPages() - 1));

  readonly pageNumbers = computed<Array<{ type: 'num' | 'ellipsis'; value?: number; label: string }>>(() => {
    const totalPages = Math.max(1, this.totalPages());
    const current = this.page();
    const result: Array<{ type: 'num' | 'ellipsis'; value?: number; label: string }> = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        result.push({ type: 'num', value: i, label: String(i + 1) });
      }
      return result;
    }
    // Always show first, last, current±1; ellipsis in between gaps
    const windows = new Set<number>();
    windows.add(0);
    windows.add(totalPages - 1);
    windows.add(current);
    if (current - 1 >= 0) windows.add(current - 1);
    if (current + 1 < totalPages) windows.add(current + 1);
    const sorted = Array.from(windows).sort((a, b) => a - b);
    let prev = -1;
    for (const n of sorted) {
      if (prev !== -1 && n - prev > 1) {
        result.push({ type: 'ellipsis', label: '…' });
      }
      result.push({ type: 'num', value: n, label: String(n + 1) });
      prev = n;
    }
    return result;
  });

  // ===== Search debounce =====
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Flag read inside effect; declare before effect field initialization so value exists.
  private _initialDone = false;

  constructor() {
    // Constructor = injection context. effect() registered here (NG0203-compliant).
    effect(() => {
      const p = this.page();
      const sz = this.size();
      const q = this.debouncedSearchQuery();
      const sid = this.selectedStoreIds();
      const sts = this.selectedStatuses();
      const mode = this.mode();
      const storeId = this.storeId();
      // Don't double-trigger initial load
      if (this._initialDone) {
        void this.fetchPage({ page: p, size: sz, query: q, storeIds: sid, statuses: sts, mode, storeId });
      }
    }, { allowSignalWrites: true });

    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
  }

  ngOnInit(): void {
    const storeIdParam = this.route.snapshot.parent?.paramMap.get('storeId');
    const routeData = (this.route.snapshot.data ?? {}) as { unifiedView?: boolean };
    if (routeData.unifiedView) {
      this.mode.set('unified');
      this.storeId.set('');
      this.size.set(6);
    } else {
      const isMe = storeIdParam === 'me';
      const pathPart = isMe ? 'me' : (storeIdParam ?? '');
      this.storeId.set(pathPart);
      this.mode.set('store');
      this.size.set(10);
    }
    void this.initialFetch();
  }

  private async initialFetch(): Promise<void> {
    await this.fetchPage({
      page: this.page(),
      size: this.size(),
      query: this.debouncedSearchQuery(),
      storeIds: this.selectedStoreIds(),
      statuses: this.selectedStatuses(),
      mode: this.mode(),
      storeId: this.storeId(),
    });
    this._initialDone = true;
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    // Debounce: reset page, then schedule debounced query signal write after 300ms
    // (effect depends on debouncedSearchQuery, not raw searchQuery — so no fetch per keystroke).
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.page.set(0);
    this.searchTimer = setTimeout(() => {
      this.debouncedSearchQuery.set(value);
    }, 300);
  }

  clearSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchQuery.set('');
    this.debouncedSearchQuery.set('');
    this.page.set(0);
  }

  toggleStoreFilter(id: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const next = new Set(this.selectedStoreIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedStoreIds.set(next);
    this.page.set(0);
  }

  toggleStatusFilter(key: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const next = new Set(this.selectedStatuses());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.selectedStatuses.set(next);
    this.page.set(0);
  }

  clearFilters(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchQuery.set('');
    this.debouncedSearchQuery.set('');
    this.selectedStoreIds.set(new Set());
    this.selectedStatuses.set(new Set(['ACTIVE', 'DRAFT', 'PENDING', 'OUT_OF_STOCK', 'ARCHIVED']));
    this.page.set(0);
  }

  focusFilters(): void {
    if (this.mode() !== 'unified') return;
    const el = document.querySelector('.sidebar') as HTMLElement | null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  prevPage(): void {
    if (this.page() > 0) this.page.set(this.page() - 1);
  }
  nextPage(): void {
    if (this.page() < this.totalPages() - 1) this.page.set(this.page() + 1);
  }
  goToPage(n: number): void {
    if (n !== this.page() && n >= 0 && n < this.totalPages()) {
      this.page.set(n);
    }
  }

  hasAnyFilter(): boolean {
    return this.searchQuery().length > 0
      || this.selectedStoreIds().size > 0
      || this.selectedStatuses().size < 5;
  }

  galleryCount(v: InventoryVariant): number {
    const vg = v.variantGalleryImageUrls ?? [];
    const pg = v.productGalleryImageUrls ?? [];
    return new Set([...vg, ...pg]).size;
  }

  stockTier(v: InventoryVariant): 'high' | 'medium' | 'low' {
    const st = (v.status ?? 'ACTIVE');
    if (st === 'OUT_OF_STOCK' || st === 'INACTIVE' || st === 'ARCHIVED' || st === 'DISABLED') return 'low';
    if (st === 'DRAFT' || st === 'PENDING') return 'medium';
    const q = v.stockQuantity;
    if (q == null) return 'low';
    if (q <= 0) return 'low';
    if (q < 5) return 'medium';
    return 'high';
  }

  stockPercent(v: InventoryVariant): number {
    const q = v.stockQuantity;
    if (q == null) return 0;
    if (q <= 0) return 12;
    if (q <= 3) return 30;
    if (q <= 9) return 55;
    if (q <= 20) return 75;
    return 100;
  }

  formatCentsToDollar(cents: number | null | undefined): string {
    if (cents == null) return '\u2014';
    return '$' + (cents / 100).toFixed(2);
  }

  formatStockQuantity(qty: number | null | undefined): string {
    if (qty == null) return '\u2014';
    return String(qty);
  }

  formatRange(from: number, to: number): string {
    if (from === 0 && to === 0) return '0\u20130';
    return String(from) + '\u2013' + String(to);
  }

  onDeleteProduct(v: InventoryVariant): void {
    if (confirm(`Delete product "${v.productTitle || 'Untitled'}"? This cannot be undone.`)) {
      void this.deleteProduct(v);
    }
  }

  private async deleteProduct(v: InventoryVariant): Promise<void> {
    try {
      const api = this.authService.resolveApiBasePublic();
      const targetStoreId = (v.storeId ?? this.storeId());
      const pathPart = targetStoreId === 'me' ? 'me' : encodeURIComponent(targetStoreId);
      await firstValueFrom(
        this.http.delete<void>(
          `${api}/admin/stores/${pathPart}/inventory/${encodeURIComponent(v.variantId)}`
        )
      );
      // Remove from current content and decrement totals
      this.content.update(list => list.filter(p => p.variantId !== v.variantId));
      this.totalElements.update(t => Math.max(0, t - 1));
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Failed to delete product. Please try again.');
    }
  }

  private async fetchPage(opts: {
    page: number; size: number; query: string;
    storeIds: Set<string>; statuses: Set<string>;
    mode: ViewMode; storeId: string;
  }): Promise<void> {
    this.loading.set(true);
    try {
      const api = this.authService.resolveApiBasePublic();
      const params = this.buildParams(opts);
      let url: string;
      if (opts.mode === 'unified') {
        url = `${api}/admin/stores/inventory/all`;
      } else {
        const pathPart = opts.storeId === 'me' ? 'me' : encodeURIComponent(opts.storeId);
        url = `${api}/admin/stores/${pathPart}/inventory`;
      }
      const data = await firstValueFrom(
        this.http.get<PaginatedResponse<InventoryVariant>>(url, { params })
      );
      if (data && Array.isArray(data.content)) {
        this.content.set(data.content);
        this.page.set(Number(data.page) || 0);
        this.size.set(Number(data.size) || opts.size);
        this.totalElements.set(Number(data.totalElements) || 0);
        this.totalPages.set(Number(data.totalPages) || 0);
        if (Array.isArray(data.storeTotals)) {
          const normalized = data.storeTotals
            .filter(s => s && s.storeId)
            .map(s => ({ storeId: String(s.storeId), storeName: s.storeName ?? 'Unknown store', count: Number(s.count) || 0 }))
            .sort((a, b) => a.storeName.localeCompare(b.storeName));
          this.storeTotals.set(normalized);
        } else if (opts.mode !== 'unified') {
          // Per store mode: synthetic store total for sidebar-less
        }
        if (Array.isArray(data.statusTotals)) {
          this.statusTotals.set(data.statusTotals.map(s => ({ key: s.key ?? '', count: Number(s.count) || 0 })));
        }
      } else if (Array.isArray((data as unknown as { content?: unknown }).content)) {
        // Shape may be present; fallback in case of odd typing
      } else if (Array.isArray(data as unknown)) {
        // Backwards compatible flat list
        const arr = data as unknown as InventoryVariant[];
        this.content.set(arr);
        this.totalElements.set(arr.length);
        this.totalPages.set(1);
      }
    } catch (err) {
      console.error('Failed to fetch paginated inventory', err);
      this.content.set([]);
      this.totalElements.set(0);
      this.totalPages.set(0);
      alert('Failed to load inventory. Please refresh the page.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildParams(opts: {
    page: number; size: number; query: string;
    storeIds: Set<string>; statuses: Set<string>;
    mode: ViewMode; storeId: string;
  }): HttpParams {
    let params = new HttpParams();
    params = params.set('page', String(opts.page));
    params = params.set('size', String(opts.size));
    if (opts.query.trim().length > 0) {
      params = params.set('query', opts.query.trim());
    }
    // Unified mode: pass selectedStoreIds (if any) to backend, otherwise backend uses all visible stores
    if (opts.mode === 'unified' && opts.storeIds.size > 0) {
      for (const sid of Array.from(opts.storeIds).sort()) {
        params = params.append('storeIds', sid);
      }
    }
    // Always pass selected statuses (unless ALL known non-empty default = skip = pass none to let backend default?
    // Actually backend: null statuses → default non-inactive. If user has any status selected differently → pass explicitly
    const defaults = ['ACTIVE', 'DRAFT', 'PENDING', 'OUT_OF_STOCK', 'ARCHIVED'];
    const selectedSorted = Array.from(opts.statuses).sort();
    const defaultSorted = [...defaults].sort();
    const sameDefault =
      selectedSorted.length === defaultSorted.length &&
      selectedSorted.every((v, i) => v === defaultSorted[i]);
    if (!sameDefault) {
      for (const st of selectedSorted) {
        params = params.append('statuses', st);
      }
    }
    return params;
  }
}
