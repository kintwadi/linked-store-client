import { Component, OnInit, signal, computed, inject, ChangeDetectorRef, SecurityContext, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth.service';

type TabKey = 'stores' | 'users' | 'transactions';

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
  _read?: boolean;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule, DatePipe],
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

    /* ============ HERO HEADER ============ */
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
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px; flex-wrap: wrap;
    }
    .hero-left { display: grid; gap: 10px; max-width: 680px; }
    .hero-greet {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 5px 12px; border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      font-size: 13px; font-weight: 600;
      justify-self: start;
    }
    .hero-title { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.01em; color: #111827; }
    .hero-subtitle { margin: 0; font-size: 15px; color: #6b7280; line-height: 1.5; max-width: 600px; }
    .hero-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: flex-end; }
    .user-chip {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 14px 8px 8px;
      background: #f9fafb;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
    }
    .user-chip.purple {
      background: #f5f3ff;
      border-color: #ede9fe;
    }
    .avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: #f3f4f6;
      display: inline-flex; align-items: center; justify-content: center;
      font-weight: 700; color: #374151; font-size: 15px;
      flex-shrink: 0;
    }
    .avatar.cyan { background: #e0f2fe; color: #0369a1; }
    .avatar.blue { background: #dbeafe; color: #1d4ed8; }
    .avatar.purple { background: #f3f4f6; color: #374151; }
    .avatar.green { background: #d1fae5; color: #047857; }
    .avatar.gray { background: #f3f4f6; color: #4b5563; }
    .avatar.pink { background: #fce7f3; color: #9d174d; }
    .user-chip .meta { display: grid; line-height: 1.15; }
    .user-chip .name { font-size: 14px; font-weight: 700; color: #111827; }
    .user-chip .badge-role {
      font-size: 11px; font-weight: 600; padding: 2px 8px;
      background: #eef2ff;
      color: #4338ca;
      border-radius: 999px; margin-top: 2px;
      width: fit-content;
    }

    /* ============ STAT KPI CARDS ============ */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    @media (max-width: 1024px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 540px)  { .stat-grid { grid-template-columns: 1fr; } }

    .stat-card {
      position: relative;
      background: #fff;
      border-radius: 16px;
      padding: 20px 22px;
      border: 1px solid #f3f4f6;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px -14px rgba(0,0,0,0.18);
    }
    .stat-card::before {
      content: '';
      position: absolute; top: 0; left: 0; bottom: 0;
      width: 4px;
      border-radius: 16px 0 0 16px;
    }
    .stat-card.stores::before   { background: linear-gradient(180deg, #4f46e5, #7c3aed); }
    .stat-card.onboarded::before { background: linear-gradient(180deg, #10b981, #06b6d4); }
    .stat-card.users::before    { background: linear-gradient(180deg, #f59e0b, #ef4444); }
    .stat-card.tx::before       { background: linear-gradient(180deg, #8b5cf6, #ec4899); }
    .stat-top {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
    }
    .stat-icon {
      width: 42px; height: 42px; border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 22px; line-height: 1;
      flex-shrink: 0;
    }
    .stat-card.stores    .stat-icon { background: #eef2ff; color: #4338ca; }
    .stat-card.onboarded .stat-icon { background: #d1fae5; color: #059669; }
    .stat-card.users     .stat-icon { background: #fef3c7; color: #b45309; }
    .stat-card.tx        .stat-icon { background: #ede9fe; color: #6d28d9; }
    .stat-label {
      font-size: 13px; color: #6b7280; font-weight: 500; letter-spacing: 0.01em;
    }
    .stat-value {
      font-size: 28px; font-weight: 800; color: #111827;
      letter-spacing: -0.02em; margin-top: 6px; line-height: 1;
    }
    .stat-sub {
      margin-top: 8px; font-size: 12px; color: #6b7280; font-weight: 500;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .stat-sub .dot-ok  { color: #10b981; }
    .stat-sub .dot-warn{ color: #f59e0b; }
    .stat-sub .dot-err { color: #ef4444; }

    /* ============ TABS ============ */
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
    }
    .tab .ico { font-size: 15px; }
    .tab:hover { color: #111827; background: rgba(255,255,255,0.5); }
    .tab.active {
      background: #fff; color: #111827;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    /* ============ CARD SECTIONS ============ */
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
      background: var(--color-primary-50); color: var(--color-primary);
      font-size: 15px;
    }
    .panel-head .muted {
      font-size: 12px; color: #6b7280; font-weight: 500;
    }
    .panel-body { padding: 0; display: grid; }
    .panel-body > * + * { border-top: 1px solid #f3f4f6; }

    /* ============ TOASTS ============ */
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
      animation: toastIn .25s ease-out;
      border: 1px solid transparent;
    }
    @keyframes toastIn { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
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
    .toast.info    { background: #eff6ff; border-color: #bfdbfe; }
    .toast.info .t-ico    { background: #3b82f6; }

    /* ============ TABLES ============ */
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
    tbody tr:hover td:first-child { border-radius: 0; }

    .cell-identity {
      display: flex; align-items: center; gap: 12px;
    }
    .cell-text { display: grid; gap: 3px; }
    .cell-title { font-weight: 700; color: #111827; font-size: 14px; }
    .cell-meta  { font-size: 12px; color: #6b7280; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; color: #4b5563;
    }

    /* Status badge + chip upgrades */
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

    /* Row action pills */
    .row-actions {
      display: flex; gap: 6px; flex-wrap: wrap;
    }
    .row-actions .btn {
      padding: 6px 11px; font-size: 12px; font-weight: 600;
      border-radius: 8px; gap: 5px;
    }
    .row-actions .btn .ico { font-size: 12px; }
    .row-actions .btn-danger { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
    .row-actions .btn-danger:hover { background: #fee2e2; color: #991b1b; }
    .row-actions .btn-primary-stripe {
      background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;
    }
    .row-actions .btn-primary-stripe:hover { background: #d1fae5; }
    .row-actions .btn-secondary-warn {
      background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa;
    }
    .row-actions .btn-secondary-warn:hover { background: #ffedd5; }

    /* ============ STORE ADMIN CARD VIEW ============ */
    .store-hero {
      position: relative;
      border-radius: 18px 18px 0 0;
      background: #fff;
      padding: 28px 28px 36px;
      color: #111827;
      overflow: hidden;
      border-bottom: 1px solid #f3f4f6;
    }
    .store-hero::after { display: none; }
    .store-hero-inner {
      position: relative; z-index: 1;
      display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    }
    .store-hero .logo-or-avatar {
      width: 80px; height: 80px; border-radius: 20px;
      background: #f3f4f6;
      border: 2px solid #e5e7eb;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 30px; color: #4b5563;
      overflow: hidden;
      flex-shrink: 0;
    }
    .store-hero .logo-or-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .store-hero .titles { display: grid; gap: 6px; }
    .store-hero .store-name {
      font-size: 26px; font-weight: 800; letter-spacing: -0.01em; margin: 0; color: #111827;
    }
    .store-hero .store-meta {
      display: inline-flex; gap: 10px; flex-wrap: wrap;
      font-size: 13px; color: #6b7280;
    }
    .store-hero .store-meta .status-badge {
      background: #ecfdf5;
      color: #047857;
    }
    .store-hero .store-meta .status-badge::before { background: #10b981; }

    .store-body { padding: 0; display: grid; }
    .store-quick-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0;
    }
    @media (max-width: 900px) { .store-quick-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 520px) { .store-quick-grid { grid-template-columns: 1fr; } }
    .quick-stat {
      padding: 20px 24px;
      border-right: 1px solid #f3f4f6;
      display: grid; gap: 4px;
    }
    .quick-stat:last-child { border-right: none; }
    .quick-stat .k { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .quick-stat .v { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
    .quick-stat .sub { font-size: 12px; color: #9ca3af; }

    .info-section {
      padding: 22px 24px;
      display: grid; gap: 16px;
    }
    .info-section + .info-section { border-top: 1px solid #f3f4f6; }
    .info-row-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 14px 24px;
    }
    @media (max-width: 600px) { .info-row-grid { grid-template-columns: 1fr; } }
    .info-item { display: grid; gap: 3px; }
    .info-item .k { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .info-item .v { font-size: 14px; color: #111827; font-weight: 500; }

    .banner {
      padding: 16px 18px;
      border-radius: 14px;
      display: flex; align-items: flex-start; gap: 12px;
    }
    .banner .banner-ico {
      width: 36px; height: 36px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .banner .banner-text { display: grid; gap: 3px; flex: 1; }
    .banner .banner-title { font-size: 14px; font-weight: 700; color: #111827; }
    .banner .banner-msg   { font-size: 13px; color: #4b5563; line-height: 1.5; }
    .banner .banner-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .banner.info    { background: #eff6ff; border: 1px solid #bfdbfe; }
    .banner.info    .banner-ico { background: #dbeafe; color: #1d4ed8; }
    .banner.success { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .banner.success .banner-ico { background: #d1fae5; color: #047857; }
    .banner.warn    { background: #fffbeb; border: 1px solid #fde68a; }
    .banner.warn    .banner-ico { background: #fef3c7; color: #b45309; }
    .banner.danger  { background: #fef2f2; border: 1px solid #fecaca; }
    .banner.danger  .banner-ico { background: #fee2e2; color: #b91c1c; }

    .actions-row {
      display: flex; gap: 10px; flex-wrap: wrap;
    }

    /* ============ FORMS ============ */
    .form-panel {
      margin: 0 24px 20px;
      padding: 20px 22px;
      background: #f9fafb;
      border: 1px dashed #d1d5db;
      border-radius: 14px;
      display: grid; gap: 16px;
    }
    .form-panel-head {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;
    }
    .form-panel-title {
      font-size: 15px; font-weight: 700; color: #111827;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .form-panel-title .ico {
      width: 24px; height: 24px; border-radius: 7px;
      background: #eef2ff; color: #4338ca;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px;
    }
    .form-grid-2 {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
    }
    @media (max-width: 700px) { .form-grid-2 { grid-template-columns: 1fr; } }
    .form-field { display: grid; gap: 6px; }
    .form-field label {
      font-size: 13px; font-weight: 600; color: #374151;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .form-field label .req { color: #ef4444; }
    .form-field input, .form-field select, .form-field textarea {
      width: 100%; box-sizing: border-box; padding: 11px 13px; font-size: 14px;
      color: #111827; background: #fff;
      border: 1px solid #d1d5db; border-radius: 10px;
      font-family: inherit;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
      outline: none; border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .form-footer {
      display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
      padding-top: 4px;
    }

    /* ============ PAGINATION ============ */
    .pagination {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 16px 24px; flex-wrap: wrap;
      border-top: 1px solid #f3f4f6;
    }
    .pagination-info { font-size: 13px; color: #6b7280; font-weight: 500; }
    .pagination-buttons { display: flex; gap: 8px; }

    .access-denied { text-align: center; padding: 48px 24px; }
    .access-denied h2 { margin: 0 0 8px; font-size: 24px; color: #dc2626; }
    .access-denied p  { margin: 0 0 20px; color: var(--color-muted); }

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

    /* ============ MODAL UPGRADE ============ */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(17, 24, 39, 0.6);
      backdrop-filter: blur(4px);
      display: grid; place-items: start center;
      padding: 48px 16px; z-index: 50;
      animation: fadeIn 0.18s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    .modal {
      width: 100%; max-width: 620px;
      background: #fff; border-radius: 18px;
      box-shadow: 0 40px 80px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05);
      display: grid; gap: 0; overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(.2,.9,.3,1);
    }
    @keyframes slideUp { from { transform: translateY(16px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
    .modal-header {
      padding: 20px 24px;
      display: flex; align-items: flex-start;
      gap: 14px;
      background: linear-gradient(180deg, #f9fafb 0%, #fff 100%);
      border-bottom: 1px solid #f3f4f6;
    }
    .modal-header.danger {
      background: linear-gradient(180deg, #fef2f2 0%, #fff 100%);
      border-bottom-color: #fecaca;
    }
    .modal-title {
      display: inline-flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    .modal-title .ico {
      width: 34px; height: 34px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .modal-title.edit .ico    { background: #eef2ff; color: #4338ca; }
    .modal-title.delete .ico  { background: #fee2e2; color: #b91c1c; }
    .modal-title-text {
      display: grid;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .modal-title-text .muted { font-size: 12px; }
    .modal-header h3 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
    .modal-close {
      width: 32px; height: 32px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent; border: 0; cursor: pointer;
      font-size: 20px; line-height: 1; color: #6b7280;
      transition: background .15s;
      flex-shrink: 0;
      margin-left: auto;
    }
    .modal-close:hover { background: #f3f4f6; color: #111827; }
    .modal-body {
      padding: 22px 24px;
      display: grid; gap: 18px;
      max-height: 68vh; overflow-y: auto;
    }
    .modal-body .form-panel {
      margin: 0; padding: 0; background: transparent; border: 0;
    }
    .modal-footer {
      padding: 16px 24px; border-top: 1px solid #f3f4f6;
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; flex-wrap: wrap;
      background: #fafafa;
    }
    .modal-footer .buttons { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .confirm-text { font-size: 14px; color: #374151; line-height: 1.6; }
    .confirm-text strong { color: #b91c1c; }
    .confirm-box-list {
      background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 12px; padding: 14px 16px 14px 14px;
      font-size: 13px; color: #991b1b;
      display: grid; gap: 6px;
      list-style: none;
      margin: 0;
    }
    .confirm-box-list li {
      display: flex; align-items: center; gap: 8px;
      line-height: 1.4;
    }
    .confirm-box-list li .ico {
      flex-shrink: 0;
      width: 18px;
      display: inline-flex;
      justify-content: center;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; background: #f3f4f6; padding: 3px 7px; border-radius: 6px;
      font-weight: 500;
    }

    /* ============ NOTIFICATION BELL / DROPDOWN / TOASTS ============ */
    .bell-wrap {
      position: relative;
      display: inline-flex;
    }
    .bell-btn {
      position: relative;
      width: 44px; height: 44px;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #374151;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 20px;
      cursor: pointer;
      transition: background .15s ease, box-shadow .15s ease, transform .15s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .bell-btn:hover { background: #f9fafb; transform: translateY(-1px); box-shadow: 0 6px 14px -8px rgba(0,0,0,0.22); }
    .bell-btn.pulse { animation: bellPulse 1.2s ease; }
    @keyframes bellPulse {
      0%   { box-shadow: 0 0 0 0 rgba(109,40,217, 0.35); }
      70%  { box-shadow: 0 0 0 14px rgba(109,40,217, 0); }
      100% { box-shadow: 0 0 0 0 rgba(109,40,217, 0); }
    }
    .bell-badge {
      position: absolute;
      top: -3px; right: -3px;
      min-width: 20px; height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      font-size: 11px; font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center;
      border: 2px solid #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .bell-panel {
      position: absolute;
      right: 0; top: calc(100% + 10px);
      width: min(420px, calc(100vw - 40px));
      max-height: 60vh;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 20px 50px -20px rgba(0,0,0,0.25);
      overflow: hidden;
      z-index: 60;
      display: grid;
      grid-template-rows: auto 1fr auto;
    }
    .bell-panel-head {
      padding: 14px 18px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid #f3f4f6;
      background: #fafbff;
    }
    .bell-panel-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: #111827; display: inline-flex; align-items: center; gap: 8px; }
    .bell-clear {
      background: none; border: none; padding: 4px 10px;
      font-size: 12px; font-weight: 600; color: #6d28d9; cursor: pointer; border-radius: 999px;
    }
    .bell-clear:hover { background: #ede9fe; }
    .bell-list {
      overflow-y: auto;
      padding: 8px 0;
    }
    .bell-item {
      padding: 12px 18px;
      display: grid;
      grid-template-columns: 44px 1fr auto;
      gap: 12px;
      align-items: flex-start;
      cursor: pointer;
      border: none; background: none; text-align: left; width: 100%;
      border-bottom: 1px solid #f9fafb;
      transition: background .12s ease;
    }
    .bell-item:last-child { border-bottom: none; }
    .bell-item:hover { background: #fafbff; }
    .bell-item.unread { background: #faf5ff; }
    .bell-thumb {
      width: 44px; height: 44px; border-radius: 10px;
      background: #f3f4f6;
      overflow: hidden;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .bell-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .bell-body { display: grid; gap: 4px; min-width: 0; }
    .bell-title {
      font-size: 13px; font-weight: 700; color: #111827;
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .bell-title .ev {
      font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px;
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    .ev.RESERVED     { background: #ede9fe; color: #6d28d9; }
    .ev.READY        { background: #dcfce7; color: #166534; }
    .ev.UNAVAILABLE  { background: #fee2e2; color: #991b1b; }
    .ev.PAID         { background: #dbeafe; color: #1e40af; }
    .ev.PICKED_UP    { background: #d1fae5; color: #065f46; }
    .ev.CANCELLED    { background: #f3f4f6; color: #4b5563; }
    .ev.EXPIRED      { background: #fef3c7; color: #92400e; }
    .bell-sub { font-size: 12px; color: #6b7280; line-height: 1.4; }
    .bell-time {
      font-size: 11px; font-weight: 600; color: #9ca3af; white-space: nowrap;
    }
    .bell-empty {
      padding: 30px 20px;
      text-align: center; color: #9ca3af; font-size: 13px;
      display: grid; gap: 6px; justify-items: center;
    }
    .bell-empty .ico { font-size: 26px; }
    .bell-foot {
      padding: 10px 18px;
      border-top: 1px solid #f3f4f6;
      background: #f9fafb;
      font-size: 11px; color: #9ca3af; font-weight: 500;
      display: flex; align-items: center; gap: 6px;
    }
    .dot-live {
      width: 7px; height: 7px; border-radius: 50%;
      background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.18);
      animation: liveBlink 2s ease-in-out infinite;
    }
    @keyframes liveBlink {
      0%,100% { opacity: 1; }
      50%     { opacity: 0.5; }
    }

    /* Toast stack */
    .toast-stack {
      position: fixed;
      top: 20px; right: 20px;
      z-index: 100;
      display: grid;
      gap: 10px;
      width: min(380px, calc(100vw - 40px));
    }
    .toast {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #6d28d9;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 20px 40px -18px rgba(0,0,0,0.25);
      display: grid;
      grid-template-columns: 40px 1fr auto;
      gap: 12px;
      align-items: flex-start;
      animation: toastIn .28s ease both;
    }
    .toast.RESERVED    { border-left-color: #6d28d9; }
    .toast.READY       { border-left-color: #16a34a; }
    .toast.UNAVAILABLE { border-left-color: #dc2626; }
    .toast.PAID        { border-left-color: #2563eb; }
    .toast.PICKED_UP   { border-left-color: #059669; }
    .toast.CANCELLED   { border-left-color: #6b7280; }
    .toast.EXPIRED     { border-left-color: #d97706; }
    @keyframes toastIn {
      from { transform: translateX(12px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    .toast.leave { animation: toastOut .22s ease forwards; }
    @keyframes toastOut {
      to { transform: translateX(20px); opacity: 0; }
    }
    .toast-thumb {
      width: 40px; height: 40px; border-radius: 10px;
      background: #f3f4f6; overflow: hidden;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .toast-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .toast-body { display: grid; gap: 3px; min-width: 0; }
    .toast-title { font-size: 13px; font-weight: 700; color: #111827; }
    .toast-sub   { font-size: 12px; color: #6b7280; line-height: 1.4; }
    .toast-close {
      background: none; border: none; color: #9ca3af; cursor: pointer;
      width: 22px; height: 22px; border-radius: 6px; font-size: 14px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .toast-close:hover { background: #f3f4f6; color: #374151; }
  `],
  template: `
    <!-- SSE Toast stack -->
    <div class="toast-stack">
      @for (t of toasts(); track t.id) {
        <div class="toast"
             [class]="t.type"
             [class.leave]="t.leaving"
             (click)="dismissToast(t.id)"
             role="status">
          <div class="toast-thumb">
            @if (t.productImageUrl) {
              <img [src]="t.productImageUrl" alt="" onerror="this.style.display='none'" />
            } @else {
              {{ toastIcon(t.type) }}
            }
          </div>
          <div class="toast-body">
            <div class="toast-title">
              {{ toastTitle(t) }}
            </div>
            <div class="toast-sub">
              {{ t.productTitle || 'Transaction update' }}
              @if (t.expiresAt) {
                <span style="margin-left: 6px;">· Expires in {{ formatCountdown(t.expiresAt) }}</span>
              }
            </div>
          </div>
          <button class="toast-close" (click)="$event.stopPropagation(); dismissToast(t.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>

    <div class="wrap">
      <a class="back" routerLink="/">← Back to home</a>

      <!-- Floating toasts -->
      <div class="toasts">
        @if (stripeFallback()) {
          <div class="toast info">
            <span class="t-ico">🔗</span>
            <div class="t-body">
              <span class="t-title">Popup blocked — open manually</span>
              <span class="t-msg">
                <a [href]="stripeFallback()!.url" target="_blank" rel="noopener noreferrer"
                   style="color:#2563eb;text-decoration:underline;font-weight:600;">
                  ➜ {{ stripeFallback()!.label }}
                </a>
              </span>
            </div>
          </div>
        }
        @if (storesSuccess()) {
          <div class="toast success">
            <span class="t-ico">✓</span>
            <div class="t-body"><span class="t-title">Success</span><span class="t-msg">{{ storesSuccess() }}</span></div>
          </div>
        }
        @if (storesError()) {
          <div class="toast error">
            <span class="t-ico">!</span>
            <div class="t-body"><span class="t-title">Something went wrong</span><span class="t-msg">{{ storesError() }}</span></div>
          </div>
        }
        @if (userSuccess()) {
          <div class="toast success">
            <span class="t-ico">✓</span>
            <div class="t-body"><span class="t-title">Success</span><span class="t-msg">{{ userSuccess() }}</span></div>
          </div>
        }
        @if (userError()) {
          <div class="toast error">
            <span class="t-ico">!</span>
            <div class="t-body"><span class="t-title">Something went wrong</span><span class="t-msg">{{ userError() }}</span></div>
          </div>
        }
        @if (editStoreError()) {
          <div class="toast error">
            <span class="t-ico">!</span>
            <div class="t-body"><span class="t-title">Save failed</span><span class="t-msg">{{ editStoreError() }}</span></div>
          </div>
        }
      </div>

      @if (!isAdminish()) {
        <div class="card access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <a class="btn btn-primary" routerLink="/">Return to home</a>
        </div>
      } @else {

        <!-- ============ HERO ============ -->
        <header class="hero">
          <div class="hero-inner">
            <div class="hero-left">
              <span class="hero-greet">
                @if (isGlobalAdmin()) { 🌐 Global Control Center } @else { 🏪 Your Store Dashboard }
              </span>
              <h1 class="hero-title">Welcome back, {{ greetingName() }}</h1>
              <p class="hero-subtitle">
                @if (isGlobalAdmin()) {
                  Oversee every store, manage operators, review payouts, and monitor the network in real time.
                } @else {
                  Manage your store, set up Stripe payments, handle your team, and track customer orders — all from one place.
                }
              </p>
            </div>
            <div class="hero-right">
              <!-- SSE Notification Bell -->
              <div class="bell-wrap">
                <button class="bell-btn"
                        [class.pulse]="bellPulse()"
                        (click)="toggleBellPanel()"
                        [attr.aria-label]="'Notifications · ' + unreadCount() + ' unread'">
                  🔔
                  @if (unreadCount() > 0) {
                    <span class="bell-badge">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
                  }
                </button>
                @if (bellPanelOpen()) {
                  <div class="bell-panel" role="dialog" aria-label="Notifications">
                    <div class="bell-panel-head">
                      <h3>🔔 Notifications</h3>
                      <button class="bell-clear" (click)="clearEvents()" [disabled]="events().length === 0">Clear all</button>
                    </div>
                    <div class="bell-list">
                      @if (events().length === 0) {
                        <div class="bell-empty">
                          <div class="ico">📭</div>
                          <div>No notifications yet</div>
                          <div style="font-size: 11px;">New requests &amp; updates will appear here.</div>
                        </div>
                      } @else {
                        @for (ev of events(); track ev.eventId || ev.transactionId + '_' + ev.createdAt) {
                          <button type="button" class="bell-item"
                                  [class.unread]="!ev._read"
                                  (click)="onEventClick(ev)">
                            <div class="bell-thumb">
                              @if (ev.productImageUrl) {
                                <img [src]="ev.productImageUrl" alt="" onerror="this.style.display='none'" />
                              } @else {
                                {{ toastIcon(ev.type) }}
                              }
                            </div>
                            <div class="bell-body">
                              <div class="bell-title">
                                <span class="ev" [class]="ev.type">{{ ev.type }}</span>
                                <span>{{ toastTitle(ev) }}</span>
                              </div>
                              <div class="bell-sub">
                                @if (ev.productTitle) { {{ ev.productTitle }} }
                                @if (ev.sku) { <span class="mono" style="margin-left:6px;">{{ ev.sku }}</span> }
                                @if (ev.expiresAt && (ev.type === 'RESERVED' || ev.type === 'READY')) {
                                  <div style="margin-top:4px;">⏱ Expires in <b>{{ formatCountdown(ev.expiresAt) }}</b></div>
                                }
                                @if (ev.message) { <div style="margin-top:2px;opacity:.85;">{{ ev.message }}</div> }
                              </div>
                            </div>
                            <div class="bell-time">{{ formatRelativeTime(ev.createdAt) }}</div>
                          </button>
                        }
                      }
                    </div>
                    <div class="bell-foot">
                      <span class="dot-live"></span>
                      @if (sseConnected()) { Live · real-time updates }
                      @else { Connecting… (will auto-reconnect) }
                    </div>
                  </div>
                }
              </div>

              <div class="user-chip">
                <div class="avatar" [class.purple]="isGlobalAdmin()" [class.cyan]="!isGlobalAdmin()">
                  {{ avatarInitials(currentUser()) }}
                </div>
                <div class="meta">
                  <span class="name">{{ currentUser()?.name || currentUser()?.email }}</span>
                  <span class="badge-role">
                    @if (isGlobalAdmin()) { Global Admin }
                    @else if (currentUser()?.role === 'OWNER') { Owner }
                    @else if (currentUser()?.role === 'STORE_ADMIN') { Store Admin }
                    @else { {{ currentUser()?.role || 'Operator' }} }
                  </span>
                </div>
              </div>
              <button class="btn btn-secondary"
                      (click)="onLogout()" [disabled]="loggingOut()">
                @if (loggingOut()) { Logging out… } @else { Log out }
              </button>
            </div>
          </div>
        </header>

        <!-- ============ KPI STAT CARDS ============ -->
        <section class="stat-grid">
          <div class="stat-card stores">
            <div class="stat-top">
              <div>
                <div class="stat-label">Total Stores</div>
                <div class="stat-value">{{ kpiTotalStores() }}</div>
              </div>
              <div class="stat-icon">🏪</div>
            </div>
            <div class="stat-sub"><span class="dot-ok">●</span> {{ kpiActiveStores() }} active · {{ kpiSuspendedStores() }} suspended</div>
          </div>
          <div class="stat-card onboarded">
            <div class="stat-top">
              <div>
                <div class="stat-label">Stripe Connected</div>
                <div class="stat-value">{{ kpiOnboarded() }}<span style="font-size:14px;color:#6b7280;font-weight:600;"> / {{ kpiTotalStores() }}</span></div>
              </div>
              <div class="stat-icon">💳</div>
            </div>
            <div class="stat-sub"><span [class]="kpiOnboardedPct() >= 80 ? 'dot-ok' : 'dot-warn'">●</span> {{ kpiOnboardedPct() }}% onboarding coverage</div>
          </div>
          <div class="stat-card users">
            <div class="stat-top">
              <div>
                <div class="stat-label">Team Members</div>
                <div class="stat-value">{{ kpiTotalUsers() }}</div>
              </div>
              <div class="stat-icon">👥</div>
            </div>
            <div class="stat-sub"><span class="dot-ok">●</span> {{ kpiActiveUsers() }} active · {{ kpiAdminUsers() }} admin</div>
          </div>
          <div class="stat-card tx">
            <div class="stat-top">
              <div>
                <div class="stat-label">Transactions</div>
                <div class="stat-value">{{ totalTxVolume() }}</div>
              </div>
              <div class="stat-icon">📦</div>
            </div>
            <div class="stat-sub"><span class="dot-ok">●</span> {{ txTotalCount() }} total · {{ activeTab() === 'transactions' ? 'showing below' : 'tab Transactions' }}</div>
          </div>
        </section>

        <!-- ============ TABS ============ -->
        <div class="tabs">
          <button class="tab" [class.active]="activeTab() === 'stores'" (click)="activeTab.set('stores')">
            <span class="ico">🏪</span> Stores
          </button>
          <button class="tab" [class.active]="activeTab() === 'users'" (click)="activeTab.set('users')">
            <span class="ico">👥</span> Users
          </button>
          <button class="tab" [class.active]="activeTab() === 'transactions'" (click)="activeTab.set('transactions')">
            <span class="ico">📦</span> Transactions
          </button>
        </div>

        <!-- ============ STORES TAB ============ -->
        @if (activeTab() === 'stores') {
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2><span class="ico">🏪</span> @if (isGlobalAdmin()) { All Stores } @else { My Store }</h2>
                <span class="muted">
                  @if (isGlobalAdmin()) { Manage every location in the network, from onboarding to subscription status. }
                  @else { Review your store details, complete Stripe onboarding, and manage settings. }
                </span>
              </div>
              @if (isGlobalAdmin()) {
                <button class="btn btn-primary" (click)="showAddStore.set(!showAddStore())">
                  @if (showAddStore()) { ✕ Cancel } @else { ＋ New store }
                </button>
              }
            </div>

            @if (isGlobalAdmin() && showAddStore()) {
              <form class="form-panel" [formGroup]="addStoreForm" (ngSubmit)="onCreateStore()">
                <div class="form-panel-head">
                  <div class="form-panel-title"><span class="ico">＋</span> Register a new store</div>
                  <span class="muted">Fields with <span style="color:#ef4444;">*</span> are required</span>
                </div>
                <div class="form-grid-2">
                  <div class="form-field">
                    <label for="s-name">Business name <span class="req">*</span></label>
                    <input id="s-name" formControlName="businessName" type="text" placeholder="e.g. Brooklyn Sneaker Co." />
                  </div>
                  <div class="form-field">
                    <label for="s-sub">Subscription status</label>
                    <select id="s-sub" formControlName="subscriptionStatus">
                      <option value="ACTIVE">🟢 ACTIVE</option>
                      <option value="PENDING">🟡 PENDING</option>
                      <option value="SUSPENDED">🟠 SUSPENDED</option>
                      <option value="CANCELED">🔴 CANCELED</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="s-lat">Latitude <span class="req">*</span></label>
                    <input id="s-lat" formControlName="latitude" type="number" step="any" placeholder="40.708978" />
                  </div>
                  <div class="form-field">
                    <label for="s-lng">Longitude <span class="req">*</span></label>
                    <input id="s-lng" formControlName="longitude" type="number" step="any" placeholder="-73.956555" />
                  </div>
                  <div class="form-field">
                    <label for="s-logo">Logo URL</label>
                    <input id="s-logo" formControlName="logoUrl" type="text" placeholder="https://... (optional)" />
                  </div>
                  <div class="form-field">
                    <label for="s-hero">Hero image URL</label>
                    <input id="s-hero" formControlName="heroImageUrl" type="text" placeholder="https://... (optional)" />
                  </div>
                </div>
                <div class="form-footer">
                  <button type="button" class="btn btn-secondary" (click)="showAddStore.set(false)">Cancel</button>
                  <button type="submit" class="btn btn-primary"
                          [disabled]="creatingStore() || !addStoreForm.valid">
                    @if (creatingStore()) { Creating… } @else { ✓ Create store }
                  </button>
                </div>
              </form>
            }

            <div class="panel-body">
              @if (storesLoading()) {
                <div class="loading">Loading stores…</div>
              } @else if (isGlobalAdmin()) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="min-width: 260px;">Store</th>
                        <th>Location</th>
                        <th>Onboarded</th>
                        <th>Subscription</th>
                        <th>Users</th>
                        <th>Tx</th>
                        <th style="min-width: 420px;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (store of stores(); track store.id) {
                        <tr>
                          <td>
                            <div class="cell-identity">
                              <div class="avatar purple">🏪</div>
                              <div class="cell-text">
                                <span class="cell-title">{{ store.businessName || '—' }}</span>
                                <span class="cell-meta mono">{{ store.id?.slice(0, 14) }}…</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            @if (store.latitude != null) {
                              <span class="mono">📍 {{ store.latitude }}, {{ store.longitude }}</span>
                            } @else { — }
                          </td>
                          <td>
                            <span class="status-badge"
                                  [class.ok]="store.onboarded" [class.warn]="!store.onboarded">
                              {{ store.onboarded ? 'Ready' : 'Setup needed' }}
                            </span>
                          </td>
                          <td>
                            <span class="status-badge"
                                  [class.ok]="store.subscriptionStatus === 'ACTIVE'"
                                  [class.warn]="store.subscriptionStatus === 'PENDING' || store.subscriptionStatus === 'SUSPENDED'"
                                  [class.err]="store.subscriptionStatus === 'CANCELED'"
                                  [class.info]="!store.subscriptionStatus || store.subscriptionStatus === 'TRIAL'">
                              {{ store.subscriptionStatus || '—' }}
                            </span>
                          </td>
                          <td><strong style="font-weight:700;">{{ store.usersCount ?? 0 }}</strong></td>
                          <td><strong style="font-weight:700;">{{ store.transactionCount ?? 0 }}</strong></td>
                          <td>
                            <div class="row-actions">
                              <button class="btn btn-secondary" (click)="openEditStore(store)">
                                <span class="ico">✎</span> Edit
                              </button>
                              <button class="btn"
                                      [class.btn-secondary-warn]="!(store.subscriptionStatus === 'SUSPENDED' || store.subscriptionStatus === 'CANCELED')"
                                      [class.btn-secondary]="store.subscriptionStatus === 'SUSPENDED' || store.subscriptionStatus === 'CANCELED'"
                                      [disabled]="suspending[store.id]"
                                      (click)="toggleSuspendStore(store)">
                                <span class="ico">
                                  @if (store.subscriptionStatus === 'SUSPENDED' || store.subscriptionStatus === 'CANCELED') { ✓ } @else { 🔒 }
                                </span>
                                @if (store.subscriptionStatus === 'SUSPENDED' || store.subscriptionStatus === 'CANCELED') { Activate } @else { Suspend }
                              </button>
                              <button class="btn btn-primary-stripe"
                                      [disabled]="onboarding[store.id]"
                                      (click)="onboardStore(store)">
                                <span class="ico">💳</span>
                                @if (store.onboarded) { Re-onboard } @else { Setup Stripe }
                              </button>
                              <button class="btn btn-secondary" [routerLink]="['/admin', 'stores', store.id]">
                                <span class="ico">🏬</span> Store Admin
                              </button>
                              @if (store.onboarded) {
                                @if (store._dashboardSafeUrl) {
                                  <a class="btn btn-secondary"
                                     [href]="store._dashboardSafeUrl"
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     (click)="loginLinkStore(store)">
                                    <span class="ico">↗</span> Stripe
                                  </a>
                                } @else {
                                  <button class="btn btn-secondary"
                                          [disabled]="loginLinking[store.id]"
                                          (click)="loginLinkStore(store)">
                                    <span class="ico">↗</span>
                                    @if (store._dashboardLoading || loginLinking[store.id]) { Loading… } @else { Stripe }
                                  </button>
                                }
                              }
                              <button class="btn btn-danger"
                                      [disabled]="deleting[store.id]"
                                      (click)="openDeleteStore(store)">
                                <span class="ico">🗑</span> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="7">
                            <div class="empty">
                              <div class="ico">🏪</div>
                              <h4>No stores yet</h4>
                              <p>Click <b>+ New store</b> above to register your first store in the network.</p>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <!-- STORE ADMIN: My Store pretty card -->
                @if (myStore()) {
                  <div>
                    <div class="store-hero">
                      <div class="store-hero-inner">
                        <div class="logo-or-avatar">
                          @if (myStore()!.logoUrl) { <img [src]="myStore()!.logoUrl" alt="" onerror="this.style.display='none'" /> }
                          @else { 🏪 }
                        </div>
                        <div class="titles">
                          <h2 class="store-name">{{ myStore()!.businessName || 'Your Store' }}</h2>
                          <div class="store-meta">
                            <span class="status-badge"
                                  [class.ok]="myStore()!.subscriptionStatus === 'ACTIVE'"
                                  [class.warn]="myStore()!.subscriptionStatus === 'SUSPENDED' || myStore()!.subscriptionStatus === 'PENDING'"
                                  [class.err]="myStore()!.subscriptionStatus === 'CANCELED'">
                              {{ myStore()!.subscriptionStatus || '—' }}
                            </span>
                            <span>ID: <span style="font-family:ui-monospace;opacity:.95;">{{ myStore()!.id?.slice(0,12) }}…</span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="store-quick-grid">
                      <div class="quick-stat">
                        <span class="k">Team members</span>
                        <span class="v">{{ myStore()!.usersCount ?? 0 }}</span>
                        <span class="sub">across all roles</span>
                      </div>
                      <div class="quick-stat">
                        <span class="k">Transactions</span>
                        <span class="v">{{ myStore()!.transactionCount ?? 0 }}</span>
                        <span class="sub">total orders</span>
                      </div>
                      <div class="quick-stat">
                        <span class="k">Stripe status</span>
                        <span class="v" [style.color]="myStore()!.onboarded ? '#059669' : '#b45309'">
                          {{ myStore()!.onboarded ? 'Connected' : 'Pending' }}
                        </span>
                        <span class="sub">{{ myStore()!.onboarded ? 'payouts enabled' : 'onboarding required' }}</span>
                      </div>
                      <div class="quick-stat">
                        <span class="k">Location</span>
                        <span class="v" style="font-size:16px;">📍</span>
                        <span class="sub mono">{{ myStore()!.latitude }}, {{ myStore()!.longitude }}</span>
                      </div>
                    </div>

                    <div class="info-section">
                      <h3 style="font-size:15px;font-weight:700;margin:0;">Store details</h3>
                      <div class="info-row-grid">
                        <div class="info-item"><span class="k">Store ID</span><span class="v"><span class="mono">{{ myStore()!.id }}</span></span></div>
                        <div class="info-item"><span class="k">Business name</span><span class="v">{{ myStore()!.businessName || '—' }}</span></div>
                        <div class="info-item"><span class="k">Latitude</span><span class="v">{{ myStore()!.latitude }}</span></div>
                        <div class="info-item"><span class="k">Longitude</span><span class="v">{{ myStore()!.longitude }}</span></div>
                      </div>
                    </div>

                    <div class="info-section">
                      @if (myStore()!.onboarded) {
                        <div class="banner success">
                          <div class="banner-ico">✅</div>
                          <div class="banner-text">
                            <div class="banner-title">Stripe Connect enabled</div>
                            <div class="banner-msg">
                              Your account is fully onboarded. Customers can pay, and settlements will flow directly to your bank.
                              You can re-visit onboarding any time to update your information or payout settings.
                            </div>
                            <div class="banner-actions">
                              <a class="btn btn-primary" [routerLink]="['/admin','stores', myStore()?.id]"
                                 style="background:var(--color-primary);border-color:var(--color-primary);color:#fff;box-shadow:var(--shadow-sm);">
                                🛍 Manage Products &amp; Inventory
                              </a>
                              <button class="btn btn-ghost" style="background:#fff;color:#047857;border:1px solid #a7f3d0;"
                                      [disabled]="onboarding['me']" (click)="onboardMyStore()">
                                🔄 Re-open Stripe Onboarding
                              </button>
                              @if (myStore()?._dashboardSafeUrl) {
                                <a class="btn btn-secondary"
                                   style="background:#047857;color:#fff;border-color:#047857;"
                                   [href]="myStore()!._dashboardSafeUrl"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   (click)="loginLinkMyStore()">
                                  ↗ Open Stripe Dashboard
                                </a>
                              } @else {
                                <button class="btn btn-secondary"
                                        style="background:#047857;color:#fff;border-color:#047857;"
                                        [disabled]="loginLinking['me']" (click)="loginLinkMyStore()">
                                  ↗ Open Stripe Dashboard
                                </button>
                              }
                            </div>
                          </div>
                        </div>
                      } @else {
                        <div class="banner warn">
                          <div class="banner-ico">⚠️</div>
                          <div class="banner-text">
                            <div class="banner-title">You need to complete Stripe onboarding</div>
                            <div class="banner-msg">
                              Before customers can pay for orders fulfilled by your store, we need to set up your Stripe Express
                              account. This takes about 3 minutes. You'll need bank account details for payouts.
                            </div>
                            <div class="banner-actions">
                              <a class="btn btn-primary" [routerLink]="['/admin','stores', myStore()?.id]"
                                 style="background:var(--color-primary);border-color:var(--color-primary);color:#fff;box-shadow:var(--shadow-sm);">
                                🛍 Manage Products &amp; Inventory
                              </a>
                              <button class="btn btn-primary"
                                      style="background:#b45309;border-color:#b45309;"
                                      [disabled]="onboarding['me']" (click)="onboardMyStore()">
                                💳 Complete Stripe Onboarding →
                              </button>
                              @if (myStore()?.onboarded) {
                                @if (myStore()?._dashboardSafeUrl) {
                                  <a class="btn btn-secondary"
                                     [href]="myStore()!._dashboardSafeUrl"
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     (click)="loginLinkMyStore()">
                                    ↗ Open Stripe Dashboard
                                  </a>
                                } @else {
                                  <button class="btn btn-secondary"
                                          [disabled]="loginLinking['me']" (click)="loginLinkMyStore()">
                                    ↗ Open Stripe Dashboard
                                  </button>
                                }
                              }
                            </div>
                          </div>
                        </div>
                      }
                    </div>

                    <div class="info-section">
                      <div class="actions-row">
                        <button class="btn btn-secondary" (click)="openEditMyStore()">
                          ✎ Edit store details
                        </button>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="empty">
                    <div class="ico">🏪</div>
                    <h4>No store information available</h4>
                    <p>Your account may not be linked to a store yet. Please contact support.</p>
                  </div>
                }
              }
            </div>
          </section>
        }

        @if (activeTab() === 'users') {
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2><span class="ico">👥</span> @if (isGlobalAdmin()) { All Operators } @else { My Team }</h2>
                <span class="muted">
                  @if (isGlobalAdmin()) { Invite team members, assign roles, and manage access across every store. }
                  @else { Manage your in-store team and their permissions. }
                </span>
              </div>
              <button class="btn btn-primary" (click)="showAddUser.set(!showAddUser())" [disabled]="addingUser()">
                @if (showAddUser()) { <span class="ico">✕</span> Cancel } @else { <span class="ico">＋</span> Add operator }
              </button>
            </div>

            @if (showAddUser()) {
              <form class="form-panel" [formGroup]="addUserForm" (ngSubmit)="onAddUser()">
                <div class="form-panel-head">
                  <div class="form-panel-title"><span class="ico">＋</span> @if (isGlobalAdmin()) { Add a new operator } @else { Invite team member }</div>
                  <span class="muted">Fields with <span style="color:#ef4444;">*</span> are required</span>
                </div>
                <div class="form-grid-2">
                  <div class="form-field">
                    <label for="u-email">Email <span class="req">*</span></label>
                    <input id="u-email" type="email" formControlName="email" placeholder="user@example.com" />
                  </div>
                  <div class="form-field">
                    <label for="u-name">Full name <span class="req">*</span></label>
                    <input id="u-name" type="text" formControlName="name" placeholder="Jane Doe" />
                  </div>
                  <div class="form-field">
                    <label for="u-role">Role</label>
                    <select id="u-role" formControlName="role">
                      @if (isGlobalAdmin()) {
                        <option value="OWNER">👑 Owner</option>
                      }
                      <option value="STORE_ADMIN">🛠 Store Admin</option>
                      <option value="CLERK">🧾 Clerk / Front Desk</option>
                      <option value="RUNNER">🏃 Runner / Fulfillment</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="u-phone">Phone</label>
                    <input id="u-phone" type="text" formControlName="phone" placeholder="+1 555 000 0000" />
                  </div>
                  @if (isGlobalAdmin()) {
                    <div class="form-field">
                      <label for="u-store">Store</label>
                      <select id="u-store" formControlName="storeId">
                        <option [value]="null" disabled>-- Select a store --</option>
                        @for (s of stores(); track s.id) {
                          <option [value]="s.id">{{ s.businessName || s.id }}</option>
                        }
                      </select>
                    </div>
                  }
                  <div class="form-field">
                    <label for="u-password">Password <span class="req">*</span></label>
                    <input id="u-password" type="password" formControlName="password" placeholder="At least 8 characters" autocomplete="new-password" />
                  </div>
                </div>
                <div class="form-footer">
                  <button type="button" class="btn btn-secondary" (click)="showAddUser.set(false)">Cancel</button>
                  <button type="submit" class="btn btn-primary" [disabled]="addingUser() || !addUserForm.valid">
                    @if (addingUser()) { Saving… } @else { <span class="ico">✓</span> Save operator }
                  </button>
                </div>
              </form>
            }

            <div class="panel-body">
              @if (usersLoading()) {
                <div class="loading">Loading users…</div>
              } @else if (users().length > 0) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="min-width: 240px;">Operator</th>
                        <th>Store</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th style="min-width: 240px;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (u of users(); track u.id || u.userId) {
                        <tr>
                          <td>
                            <div class="cell-identity">
                              <div class="avatar"
                                   [class.purple]="u.isGlobalAdmin || u.role === 'OWNER'"
                                   [class.blue]="u.role === 'STORE_ADMIN'"
                                   [class.gray]="u.role !== 'STORE_ADMIN' && !u.isGlobalAdmin && u.role !== 'OWNER'">
                                {{ avatarInitials(u) }}
                              </div>
                              <div class="cell-text">
                                <span class="cell-title">
                                  {{ u.name || u.fullName || '—' }}
                                  @if (u.isGlobalAdmin) { <span class="chip purple" style="margin-left:6px;">GLOBAL ADMIN</span> }
                                </span>
                                <span class="cell-meta">{{ u.email }}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            @if (u.storeName) {
                              <span class="mono">🏪 {{ u.storeName }}</span>
                            } @else {
                              <span class="muted">—</span>
                            }
                          </td>
                          <td>
                            <span class="chip"
                                  [class.purple]="u.isGlobalAdmin || u.role === 'OWNER'"
                                  [class.ok]="u.role === 'GLOBAL_ADMIN'"
                                  [class.warn]="u.role === 'STORE_ADMIN'"
                                  [class.info]="u.role === 'CLERK' || u.role === 'RUNNER'">
                              @if (u.role === 'OWNER' || u.isGlobalAdmin) { 👑 }
                              @else if (u.role === 'STORE_ADMIN') { 🛠 }
                              @else if (u.role === 'CLERK') { 🧾 }
                              @else if (u.role === 'RUNNER') { 🏃 }
                              {{ u.role || '—' }}
                            </span>
                          </td>
                          <td>
                            <span class="status-badge"
                                  [class.ok]="!u.status || u.status === 'ACTIVE'"
                                  [class.err]="u.status === 'SUSPENDED' || u.status === 'DELETED' || u.status === 'DISABLED'"
                                  [class.warn]="u.status === 'INVITED' || u.status === 'PENDING'">
                              {{ u.status || 'ACTIVE' }}
                            </span>
                            @if (u.hasPassword === false) { <span class="chip warn" style="margin-left:6px;">No password</span> }
                          </td>
                          <td>
                            <div class="row-actions">
                              <button class="btn"
                                      [class.btn-secondary-warn]="!(u.status === 'SUSPENDED' || u.status === 'DELETED' || u.status === 'DISABLED')"
                                      [class.btn-secondary]="u.status === 'SUSPENDED' || u.status === 'DELETED' || u.status === 'DISABLED'"
                                      [disabled]="togglingUserStatus[u.id || u.userId]"
                                      (click)="onToggleUserStatus(u)">
                                <span class="ico">
                                  @if (u.status === 'SUSPENDED' || u.status === 'DELETED' || u.status === 'DISABLED') { ✓ } @else { 🔒 }
                                </span>
                                @if (u.status === 'SUSPENDED' || u.status === 'DELETED' || u.status === 'DISABLED') { Activate } @else { Suspend }
                              </button>
                              @if (!u.isGlobalAdmin || u.id !== currentUser()?.userId) {
                                <button class="btn btn-danger"
                                        [disabled]="deletingUser[u.id || u.userId]"
                                        (click)="openDeleteUser(u)">
                                  <span class="ico">🗑</span> Remove
                                </button>
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
                  <div class="ico">👥</div>
                  <h4>No operators yet</h4>
                  <p>@if (isGlobalAdmin()) { Add your first team member above to help manage the network. } @else { Invite your first team member to help run the store. }</p>
                </div>
              }
            </div>
          </section>
        }

        @if (activeTab() === 'transactions') {
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2><span class="ico">📦</span> Transactions</h2>
                <span class="muted">Track every split-ledger order from originating host to fulfilling neighbor store.</span>
              </div>
            </div>

            <div class="panel-body">
              @if (txLoading()) {
                <div class="loading">Loading transactions…</div>
              } @else if (transactions().length > 0) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="min-width: 160px;">ID</th>
                        <th style="min-width: 280px;">Stores</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (tx of pagedTransactions(); track tx.id) {
                        <tr>
                          <td><span class="mono">{{ tx.id?.slice(0, 14) }}…</span></td>
                          <td>
                            @if (tx.originatingStoreName && tx.fulfillingStoreName && tx.originatingStoreName !== tx.fulfillingStoreName) {
                              <div style="display: grid; gap: 4px;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                  <span class="chip purple" style="font-size:11px;">HOST</span>
                                  <span>{{ tx.originatingStoreName }}</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px;">
                                  <span class="chip ok" style="font-size:11px;">FULFILL</span>
                                  <span>{{ tx.fulfillingStoreName }}</span>
                                </div>
                              </div>
                            } @else {
                              <span class="mono">🏪 {{ tx.originatingStoreName || tx.fulfillingStoreName || tx.storeName || '—' }}</span>
                            }
                          </td>
                          <td>
                            <span class="status-badge" [class]="txStatusClass(tx.status)">
                              {{ tx.status || '—' }}
                            </span>
                          </td>
                          <td><strong style="font-weight:700;">{{ formatMoney(tx.totalRetailCents ?? tx.totalCents ?? tx.amountCents, tx.currency) }}</strong></td>
                          <td>{{ tx.createdAt | date:'short' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="pagination">
                  <span class="pagination-info">
                    @if (transactions().length > 0) {
                      Page {{ txPage() + 1 }} / {{ totalTxPages() }} · {{ pageStart() + 1 }}–{{ pageEnd() }} of {{ txTotalCount() }}
                    } @else { 0 records }
                  </span>
                  <div class="pagination-buttons">
                    <button class="btn btn-secondary" (click)="txPage.set(txPage() - 1)" [disabled]="txPage() === 0">← Prev</button>
                    <button class="btn btn-secondary" (click)="txPage.set(txPage() + 1)"
                            [disabled]="pageEnd() >= (transactions().length)">Next →</button>
                  </div>
                </div>
              } @else {
                <div class="empty">
                  <div class="ico">📦</div>
                  <h4>No transactions yet</h4>
                  <p>Orders flowing through the split-ledger network will appear here.</p>
                </div>
              }
            </div>
          </section>
        }
      }

      <!-- Edit Store Modal -->
      @if (editStoreOpen()) {
        <div class="modal-backdrop" (click.self)="closeEditStore()">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-store-title">
            <div class="modal-header">
              <div class="modal-title edit">
                <span class="ico">✎</span>
              </div>
              <div class="modal-title-text">
                <h3 id="edit-store-title">
                  @if (editStoreIsMine()) { Edit my store } @else { Edit store }
                </h3>
                <span class="muted">Update location details, subscription state, and branding.</span>
              </div>
              <button class="modal-close" (click)="closeEditStore()" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
              <form style="padding: 0; margin-top: 0; background: transparent;"
                    [formGroup]="editStoreForm" (ngSubmit)="onSubmitEditStore()">
                <div class="form-grid-2">
                  <div class="form-field">
                    <label for="es-name">Business name <span class="req">*</span></label>
                    <input id="es-name" formControlName="businessName" type="text" />
                  </div>
                  <div class="form-field">
                    <label for="es-sub">Subscription status</label>
                    <select id="es-sub" formControlName="subscriptionStatus">
                      <option value="ACTIVE">🟢 ACTIVE</option>
                      <option value="PENDING">🟡 PENDING</option>
                      <option value="TRIAL">🔵 TRIAL</option>
                      <option value="SUSPENDED">🟠 SUSPENDED</option>
                      <option value="CANCELED">🔴 CANCELED</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="es-lat">Latitude <span class="req">*</span></label>
                    <input id="es-lat" formControlName="latitude" type="number" step="any" />
                  </div>
                  <div class="form-field">
                    <label for="es-lng">Longitude <span class="req">*</span></label>
                    <input id="es-lng" formControlName="longitude" type="number" step="any" />
                  </div>
                  <div class="form-field">
                    <label for="es-logo">Logo URL</label>
                    <input id="es-logo" formControlName="logoUrl" type="text" placeholder="https://… (optional)" />
                  </div>
                  <div class="form-field">
                    <label for="es-hero">Hero image URL</label>
                    <input id="es-hero" formControlName="heroImageUrl" type="text" placeholder="https://… (optional)" />
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeEditStore()">Cancel</button>
              <button class="btn btn-primary" (click)="onSubmitEditStore()"
                      [disabled]="savingEditStore() || !editStoreForm.valid">
                @if (savingEditStore()) { <span class="ico">⟳</span> Saving… } @else { <span class="ico">✓</span> Save changes }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Store Modal -->
      @if (deleteStoreOpen()) {
        <div class="modal-backdrop" (click.self)="closeDeleteStore()">
          <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="del-store-title">
            <div class="modal-header danger">
              <div class="modal-title delete">
                <span class="ico">🗑</span>
              </div>
              <div class="modal-title-text">
                <h3 id="del-store-title">Cancel store subscription</h3>
                <span class="muted">This store will become inactive and leave the network.</span>
              </div>
              <button class="modal-close" (click)="closeDeleteStore()" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
              <p class="confirm-text">
                You are about to <strong>cancel the subscription</strong> of store
                <strong>"{{ deleteStoreTarget()?.businessName || '' }}"</strong>.
              </p>
              <ul class="confirm-box-list">
                <li><span class="ico">✕</span> Store will no longer appear in customer search results</li>
                <li><span class="ico">🛒</span> No new orders can be hosted or fulfilled</li>
                <li><span class="ico">📝</span> Historical records and transactions are kept for audit</li>
                <li><span class="ico">⚠️</span> This action cannot be undone through the dashboard</li>
              </ul>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeDeleteStore()">Keep store</button>
              <button class="btn btn-danger-filled"
                      [disabled]="deleting[deleteStoreTarget()?.id]"
                      (click)="confirmDeleteStore()">
                @if (deleting[deleteStoreTarget()?.id]) { <span class="ico">⟳</span> Canceling… } @else { <span class="ico">🗑</span> Yes, cancel subscription }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete User Modal -->
      @if (deleteUserOpen()) {
        <div class="modal-backdrop" (click.self)="closeDeleteUser()">
          <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="del-user-title">
            <div class="modal-header danger">
              <div class="modal-title delete">
                <span class="ico">🗑</span>
              </div>
              <div class="modal-title-text">
                <h3 id="del-user-title">Remove operator</h3>
                <span class="muted">Revoke all access from this team member.</span>
              </div>
              <button class="modal-close" (click)="closeDeleteUser()" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
              <p class="confirm-text">
                Remove <strong>{{ deleteUserTarget()?.name || deleteUserTarget()?.email }}</strong>
                ({{ deleteUserTarget()?.email }}) from this system?
              </p>
              <ul class="confirm-box-list">
                <li><span class="ico">🔑</span> All login tokens and sessions will be immediately revoked</li>
                <li><span class="ico">🚫</span> Operator can no longer sign in or access the dashboard</li>
                <li><span class="ico">📋</span> Record is soft-deleted (status DELETED) — not erased</li>
                <li><span class="ico">↺</span> A global admin can re-invite the same email later</li>
              </ul>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeDeleteUser()">Keep operator</button>
              <button class="btn btn-danger-filled"
                      [disabled]="deletingUser[deleteUserTarget()?.id]"
                      (click)="confirmDeleteUser()">
                @if (deletingUser[deleteUserTarget()?.id]) { <span class="ico">⟳</span> Removing… } @else { <span class="ico">🗑</span> Yes, remove operator }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardPageComponent implements OnInit, OnDestroy {
  readonly fb = inject(FormBuilder);
  readonly http = inject(HttpClient);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  readonly activeTab = signal<TabKey>('stores');
  readonly currentUser = signal<AuthUser | null>(null);

  readonly stores = signal<any[]>([]);
  readonly storesLoading = signal(false);
  readonly storesError = signal<string | null>(null);
  readonly storesSuccess = signal<string | null>(null);
  readonly myStore = signal<any | null>(null);
  readonly users = signal<any[]>([]);
  readonly usersLoading = signal(false);
  readonly userError = signal<string | null>(null);
  readonly userSuccess = signal<string | null>(null);
  readonly showAddUser = signal(false);
  readonly addingUser = signal(false);
  readonly addUserForm: FormGroup;

  readonly transactions = signal<any[]>([]);
  readonly txTotalCount = signal(0);
  readonly txTotalPages = signal(0);
  readonly txLoading = signal(false);
  readonly txError = signal<string | null>(null);
  readonly txPage = signal(0);
  readonly txPageSize = 10;

  readonly loggingOut = signal(false);

  readonly showAddStore = signal(false);
  readonly creatingStore = signal(false);
  readonly addStoreForm: FormGroup;

  // Edit store modal
  readonly editStoreOpen = signal(false);
  readonly editStoreTarget = signal<any | null>(null);
  readonly editStoreIsMine = signal(false);
  readonly savingEditStore = signal(false);
  readonly editStoreError = signal<string | null>(null);
  readonly editStoreForm: FormGroup;

  // Delete store modal
  readonly deleteStoreOpen = signal(false);
  readonly deleteStoreTarget = signal<any | null>(null);

  // Delete user modal
  readonly deleteUserOpen = signal(false);
  readonly deleteUserTarget = signal<any | null>(null);

  readonly onboarding: Record<string, boolean> = {};
  readonly loginLinking: Record<string, boolean> = {};
  readonly suspending: Record<string, boolean> = {};
  readonly deleting: Record<string, boolean> = {};
  readonly togglingUserStatus: Record<string, boolean> = {};
  readonly deletingUser: Record<string, boolean> = {};

  readonly stripeFallback = signal<{ url: SafeUrl; label: string } | null>(null);

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private touch(): void { this.cdr.markForCheck(); }

  readonly isGlobalAdmin = computed(() => {
    const u = this.currentUser();
    return !!(u?.isGlobalAdmin || u?.role === 'GLOBAL_ADMIN');
  });

  readonly isAdminish = computed(() => {
    const u = this.currentUser();
    return !!(
      u?.isGlobalAdmin ||
      u?.role === 'GLOBAL_ADMIN' ||
      u?.role === 'STORE_ADMIN' ||
      u?.role === 'OWNER'
    );
  });

  readonly pagedTransactions = computed(() => {
    const start = this.txPage() * this.txPageSize;
    return this.transactions().slice(start, start + this.txPageSize);
  });

  readonly pageStart = computed(() => this.txPage() * this.txPageSize);
  readonly pageEnd = computed(() => Math.min(this.pageStart() + this.txPageSize, this.transactions().length));
  readonly totalTxPages = computed(() => Math.max(1, Math.ceil((this.txTotalCount() || this.transactions().length) / this.txPageSize)));

  readonly greetingName = computed(() => {
    const u = this.currentUser();
    if (!u) return 'there';
    const full = u.name;
    if (full) {
      const first = full.split(' ')[0];
      if (first) return first.charAt(0).toUpperCase() + first.slice(1);
    }
    if (u.email) {
      const at = u.email.indexOf('@');
      const local = at > 0 ? u.email.slice(0, at) : u.email;
      if (local) return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return 'there';
  });

  readonly kpiTotalStores = computed(() => this.stores().length);
  readonly kpiActiveStores = computed(() =>
    this.stores().filter((s: any) => s.subscriptionStatus === 'ACTIVE').length
  );
  readonly kpiSuspendedStores = computed(() =>
    this.stores().filter((s: any) => s.subscriptionStatus === 'SUSPENDED' || s.subscriptionStatus === 'CANCELED').length
  );
  readonly kpiOnboarded = computed(() =>
    this.stores().filter((s: any) => !!s.onboarded).length
  );
  readonly kpiOnboardedPct = computed(() => {
    const tot = this.kpiTotalStores();
    if (!tot) return 0;
    return Math.round((this.kpiOnboarded() * 100) / tot);
  });
  readonly kpiTotalUsers = computed(() => this.users().length);
  readonly kpiActiveUsers = computed(() =>
    this.users().filter((u: any) => !u.status || u.status === 'ACTIVE' || u.status === 'INVITED').length
  );
  readonly kpiAdminUsers = computed(() =>
    this.users().filter((u: any) =>
      u.role === 'GLOBAL_ADMIN' || u.role === 'OWNER' || u.role === 'STORE_ADMIN' || u.isGlobalAdmin
    ).length
  );
  readonly totalTxVolume = computed(() => {
    const list = this.transactions();
    if (!list.length) return this.formatMoney(0, 'USD');
    let total = 0;
    for (const tx of list) {
      total += Number(tx.totalRetailCents ?? tx.totalCents ?? tx.amountCents ?? 0);
    }
    const sample = list.find((t: any) => t.currency);
    return this.formatMoney(total, sample?.currency ?? 'USD');
  });

  avatarInitials(u: any): string {
    if (!u) return 'U';
    const full = u.name || u.fullName;
    if (full) {
      const parts = full.trim().split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        let out = '';
        for (let i = 0; i < Math.min(2, parts.length); i++) {
          out += parts[i].charAt(0).toUpperCase();
        }
        if (out) return out;
      }
    }
    if (u.email) {
      const ch = u.email.charAt(0).toUpperCase();
      if (ch) return ch;
    }
    return 'U';
  }

  constructor() {
    this.currentUser.set(this.authService.currentUser$.getValue());
    this.addUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', [Validators.required]],
      role: ['STORE_ADMIN', [Validators.required]],
      phone: [''],
      storeId: [null as string | null],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
    this.addStoreForm = this.fb.group({
      businessName: ['', [Validators.required]],
      subscriptionStatus: ['ACTIVE'],
      latitude: [40.7128, [Validators.required]],
      longitude: [-74.0060, [Validators.required]],
      logoUrl: [''],
      heroImageUrl: [''],
    });
    this.editStoreForm = this.fb.group({
      id: [null as string | null],
      businessName: ['', [Validators.required]],
      subscriptionStatus: ['ACTIVE'],
      latitude: [null as number | null, [Validators.required]],
      longitude: [null as number | null, [Validators.required]],
      logoUrl: [''],
      heroImageUrl: [''],
    });
  }

  private api(): string {
    return this.authService.resolveApiBasePublic();
  }

  ngOnInit(): void {
    if (!this.isAdminish()) return;
    // 1s ticker to update countdown timers in UI (bell panel + toasts)
    this.sseTick = setInterval(() => {
      if (this.events().some(e => e.expiresAt) || this.toasts().some(t => t.expiresAt)) {
        this.cdr.markForCheck();
      }
    }, 1000);
    void this.refreshMe().then(() => {
      void this.loadStores().finally(() => {
        void this.startSse();
      });
      void this.loadUsers();
      void this.loadTransactions();
    });
  }

  private async refreshMe(): Promise<void> {
    try {
      const u = await this.authService.me();
      this.currentUser.set(u);
    } catch {
      /* ignore */
    }
  }

  clearStoreMessagesSoon(): void {
    setTimeout(() => { this.storesError.set(null); this.storesSuccess.set(null); }, 4000);
  }
  clearUserMessagesSoon(): void {
    setTimeout(() => { this.userError.set(null); this.userSuccess.set(null); }, 4000);
  }

  // ---------------- STORES ----------------

  private async loadStores(): Promise<void> {
    this.storesLoading.set(true);
    this.storesError.set(null);
    try {
      const api = this.api();
      let arr: any[] = [];
      let mine: any | null = null;
      if (this.isGlobalAdmin()) {
        const res = await firstValueFrom(this.http.get<any>(`${api}/admin/stores`));
        arr = Array.isArray(res) ? res : (res?.stores ?? res?.data ?? []);
      } else {
        try {
          mine = await firstValueFrom(this.http.get<any>(`${api}/admin/stores/me`));
          arr = [mine];
          this.myStore.set(this.decorateStripeFields(mine));
        } catch (err: any) {
          this.myStore.set(null);
          arr = [];
          this.storesError.set(err?.error?.message ?? err?.message ?? 'Could not load your store.');
        }
      }
      arr = arr.map(s => this.decorateStripeFields(s));
      this.stores.set(arr);
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to load stores.');
    } finally {
      this.storesLoading.set(false);
    }
  }

  private decorateStripeFields(s: any): any {
    if (!s) return s;
    return {
      ...s,
      _onboardingUrl: null,
      _onboardingLoading: false,
      _dashboardUrl: null,
      _dashboardSafeUrl: null,
      _dashboardLoading: false,
    };
  }

  private async ensureOnboardingLink(store: any, opts: { me?: boolean } = {}): Promise<string | null> {
    // Do NOT cache onboarding URLs: if backend returns status==='error' we MUST surface the error alert
    // to the user (and re-request when they retry). If we cached a null after a 503, the next click would
    // short-circuit before re-requesting.
    store._onboardingUrl = null;
    if (store._onboardingLoading) {
      return await new Promise<string | null>(resolve => {
        const start = Date.now();
        const iv = window.setInterval(() => {
          if (store._onboardingUrl || !store._onboardingLoading || Date.now() - start > 20000) {
            window.clearInterval(iv);
            resolve(store._onboardingUrl ?? null);
          }
        }, 80);
      });
    }
    store._onboardingLoading = true;
    const api = this.api();
    const body = {
      returnUrl: `${window.location.origin}/admin`,
      refreshUrl: `${window.location.origin}/admin`,
    };
    try {
      const urlTail = opts.me
        ? `/admin/stores/me/connect/onboarding-link`
        : `/admin/stores/${encodeURIComponent(store.id)}/connect/onboarding-link`;
      const res: any = await firstValueFrom(this.http.post(`${api}${urlTail}`, body));
      if (!res || res.status === 'error' || !res.url) {
        const msg = res?.message ?? 'Stripe did not return an onboarding URL.';
        throw new Error(msg);
      }
      const u: string = res.url;
      store._onboardingUrl = u;
      return u;
    } finally {
      store._onboardingLoading = false;
      this.touch();
    }
  }

  private async ensureDashboardLink(store: any, opts: { me?: boolean } = {}): Promise<string | null> {
    // LoginLinks are short-lived (minutes). Never use cached values or the user can end up on a
    // Stripe 404 a day later. Also: backend now returns 503 status==='error' with a message when
    // no real URL could be generated; we must show that, not navigate to a null/empty URL.
    store._dashboardUrl = null;
    store._dashboardSafeUrl = null;
    if (store._dashboardLoading) {
      return await new Promise<string | null>(resolve => {
        const start = Date.now();
        const iv = window.setInterval(() => {
          if (store._dashboardUrl || !store._dashboardLoading || Date.now() - start > 20000) {
            window.clearInterval(iv);
            resolve(store._dashboardUrl ?? null);
          }
        }, 80);
      });
    }
    store._dashboardLoading = true;
    const api = this.api();
    try {
      const urlTail = opts.me
        ? `/admin/stores/me/connect/login-link`
        : `/admin/stores/${encodeURIComponent(store.id)}/connect/login-link`;
      const res: any = await firstValueFrom(this.http.post(`${api}${urlTail}`, {}));
      if (!res || res.status === 'error' || !res.url) {
        const msg = res?.message ?? 'Stripe did not return a dashboard URL.';
        throw new Error(msg);
      }
      const u: string = res.url;
      store._dashboardUrl = u;
      store._dashboardSafeUrl = this.sanitizer.bypassSecurityTrustUrl(u);
      return u;
    } finally {
      store._dashboardLoading = false;
      this.touch();
    }
  }

  async onCreateStore(): Promise<void> {
    if (!this.addStoreForm.valid) return;
    this.creatingStore.set(true);
    this.storesError.set(null);
    this.storesSuccess.set(null);
    try {
      const api = this.api();
      const v = this.addStoreForm.value;
      const payload = {
        businessName: v.businessName,
        subscriptionStatus: v.subscriptionStatus || undefined,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        logoUrl: v.logoUrl || undefined,
        heroImageUrl: v.heroImageUrl || undefined,
      };
      const created: any = await firstValueFrom(this.http.post(`${api}/admin/stores`, payload));
      this.addStoreForm.reset({
        businessName: '', subscriptionStatus: 'ACTIVE',
        latitude: 40.7128, longitude: -74.0060, logoUrl: '', heroImageUrl: '',
      });
      this.showAddStore.set(false);
      this.storesSuccess.set(`Store “${created.businessName}” created.`);
      this.clearStoreMessagesSoon();
      await this.loadStores();
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to create store.');
    } finally {
      this.creatingStore.set(false);
    }
  }

  openEditStore(store: any): void {
    this.editStoreTarget.set(store);
    this.editStoreIsMine.set(false);
    this.editStoreError.set(null);
    this.editStoreForm.patchValue({
      id: store.id,
      businessName: store.businessName ?? '',
      subscriptionStatus: store.subscriptionStatus ?? 'ACTIVE',
      latitude: store.latitude ?? null,
      longitude: store.longitude ?? null,
      logoUrl: store.logoUrl ?? '',
      heroImageUrl: store.heroImageUrl ?? '',
    });
    this.editStoreOpen.set(true);
  }

  openEditMyStore(): void {
    const mine = this.myStore();
    if (!mine) return;
    this.editStoreTarget.set(mine);
    this.editStoreIsMine.set(true);
    this.editStoreError.set(null);
    this.editStoreForm.patchValue({
      id: mine.id,
      businessName: mine.businessName ?? '',
      subscriptionStatus: mine.subscriptionStatus ?? 'ACTIVE',
      latitude: mine.latitude ?? null,
      longitude: mine.longitude ?? null,
      logoUrl: mine.logoUrl ?? '',
      heroImageUrl: mine.heroImageUrl ?? '',
    });
    this.editStoreOpen.set(true);
  }

  closeEditStore(): void {
    this.editStoreOpen.set(false);
    this.editStoreTarget.set(null);
    this.editStoreIsMine.set(false);
    this.editStoreError.set(null);
  }

  async onSubmitEditStore(): Promise<void> {
    if (!this.editStoreForm.valid) return;
    const store = this.editStoreTarget();
    if (!store) return;
    this.savingEditStore.set(true);
    this.editStoreError.set(null);
    try {
      const api = this.api();
      const v = this.editStoreForm.value;
      const payload = {
        businessName: v.businessName,
        subscriptionStatus: v.subscriptionStatus || undefined,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        logoUrl: v.logoUrl || undefined,
        heroImageUrl: v.heroImageUrl || undefined,
      };
      const path = this.editStoreIsMine()
        ? `${api}/admin/stores/me`
        : `${api}/admin/stores/${encodeURIComponent(store.id)}`;
      const updated: any = await firstValueFrom(this.http.put(path, payload));
      this.editStoreOpen.set(false);
      this.editStoreTarget.set(null);
      if (this.editStoreIsMine()) {
        this.myStore.set(updated);
      }
      this.storesSuccess.set(`Saved changes to “${updated.businessName}”.`);
      this.clearStoreMessagesSoon();
      await this.loadStores();
    } catch (err: any) {
      this.editStoreError.set(err?.error?.message ?? err?.message ?? 'Failed to save changes.');
    } finally {
      this.savingEditStore.set(false);
    }
  }

  async toggleSuspendStore(store: any): Promise<void> {
    const id = store.id;
    if (!id) return;
    this.suspending[id] = true;
    this.touch();
    try {
      const api = this.api();
      const curr = store.subscriptionStatus;
      const next = (curr === 'SUSPENDED' || curr === 'CANCELED') ? 'ACTIVE' : 'SUSPENDED';
      await firstValueFrom(this.http.put(`${api}/admin/stores/${encodeURIComponent(id)}/subscription-status`, {
        subscriptionStatus: next,
      }));
      this.storesSuccess.set(`Store ${next === 'SUSPENDED' ? 'suspended' : 'activated'}.`);
      this.clearStoreMessagesSoon();
      await this.loadStores();
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to update status.');
    } finally {
      this.suspending[id] = false;
      this.touch();
    }
  }

  openDeleteStore(store: any): void {
    this.deleteStoreTarget.set(store);
    this.deleteStoreOpen.set(true);
  }
  closeDeleteStore(): void {
    this.deleteStoreTarget.set(null);
    this.deleteStoreOpen.set(false);
  }
  async confirmDeleteStore(): Promise<void> {
    const store = this.deleteStoreTarget();
    if (!store?.id) return;
    this.deleting[store.id] = true;
    this.touch();
    try {
      const api = this.api();
      await firstValueFrom(this.http.delete(`${api}/admin/stores/${encodeURIComponent(store.id)}`));
      this.deleteStoreOpen.set(false);
      this.deleteStoreTarget.set(null);
      this.storesSuccess.set(`Subscription canceled for “${store.businessName}”.`);
      this.clearStoreMessagesSoon();
      await this.loadStores();
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to delete store.');
    } finally {
      this.deleting[store.id] = false;
      this.touch();
    }
  }

  // ---- Stripe onboarding / login link ----

  async onboardStore(store: any): Promise<void> {
    const id = store.id;
    if (!id) {
      this.storesError.set('Store record has no id — please refresh and try again.');
      this.clearStoreMessagesSoon();
      return;
    }
    this.stripeFallback.set(null);
    this.onboarding[id] = true;
    this.touch();
    this.storesError.set(null);
    try {
      const url = await this.ensureOnboardingLink(store);
      if (!url) throw new Error('No URL returned from Stripe.');
      this.storesSuccess.set('Opening Stripe onboarding…');
      this.clearStoreMessagesSoon();
      await this.loadStores();
      // Current-tab redirect. Stripe explicitly returns users here via returnUrl/refreshUrl, so this is the correct flow.
      // This CANNOT be blocked by a popup blocker — unlike window.open().
      window.location.assign(url);
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to generate Stripe onboarding link.');
    } finally {
      this.onboarding[id] = false;
      this.touch();
    }
  }

  async loginLinkStore(store: any): Promise<void> {
    const id = store.id;
    if (!id) {
      this.storesError.set('Store record has no id — please refresh and try again.');
      this.clearStoreMessagesSoon();
      return;
    }
    this.stripeFallback.set(null);
    this.loginLinking[id] = true;
    this.touch();
    try {
      const url = await this.ensureDashboardLink(store);
      if (!url) throw new Error('Could not generate Stripe dashboard link.');
      if (store._dashboardSafeUrl) {
        // Pre-warmed anchor in template is already rendered with href + target=_blank. User followed it; nothing more.
        if (store.chargesEnabled === false || store.payoutsEnabled === false) {
          this.storesSuccess.set(
            `Stripe account not fully ready: chargesEnabled=${store.chargesEnabled}, payoutsEnabled=${store.payoutsEnabled}.`
          );
          this.clearStoreMessagesSoon();
        }
        return;
      }
      // Not yet pre-warmed → fallback to current-tab redirect (impossible to block).
      window.location.assign(url);
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to open Stripe dashboard.');
    } finally {
      this.loginLinking[id] = false;
      this.touch();
    }
  }

  async onboardMyStore(): Promise<void> {
    const store = this.myStore();
    if (!store) {
      this.storesError.set('No store information loaded — refresh and try again.');
      this.clearStoreMessagesSoon();
      return;
    }
    this.stripeFallback.set(null);
    this.onboarding['me'] = true;
    this.touch();
    this.storesError.set(null);
    try {
      const url = await this.ensureOnboardingLink(store, { me: true });
      if (!url) throw new Error('No URL returned.');
      await this.loadStores();
      // Current-tab redirect (popup-blocker proof).
      window.location.assign(url);
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to generate onboarding link.');
    } finally {
      this.onboarding['me'] = false;
      this.touch();
    }
  }

  async loginLinkMyStore(): Promise<void> {
    const store = this.myStore();
    if (!store) {
      this.storesError.set('No store information loaded — refresh and try again.');
      this.clearStoreMessagesSoon();
      return;
    }
    this.stripeFallback.set(null);
    this.loginLinking['me'] = true;
    this.touch();
    try {
      const url = await this.ensureDashboardLink(store, { me: true });
      if (!url) throw new Error('Could not generate Stripe dashboard link.');
      if (store.chargesEnabled === false || store.payoutsEnabled === false) {
        this.storesSuccess.set(
          `Account not fully ready: chargesEnabled=${store.chargesEnabled}, payoutsEnabled=${store.payoutsEnabled}.`
        );
        this.clearStoreMessagesSoon();
      }
      // Fallback (if anchor somehow wasn't rendered yet): current-tab redirect. Unreachable normally.
      if (!store._dashboardSafeUrl) window.location.assign(url);
    } catch (err: any) {
      this.storesError.set(err?.error?.message ?? err?.message ?? 'Failed to open Stripe dashboard.');
    } finally {
      this.loginLinking['me'] = false;
      this.touch();
    }
  }

  // ---------------- USERS ----------------

  private async loadUsers(): Promise<void> {
    this.usersLoading.set(true);
    this.userError.set(null);
    try {
      const api = this.api();
      const res = await firstValueFrom(this.http.get<any>(`${api}/admin/users`));
      const arr = Array.isArray(res) ? res : (res?.users ?? res?.data ?? []);
      this.users.set(arr);
    } catch (err: any) {
      this.userError.set(err?.error?.message ?? err?.message ?? 'Failed to load users.');
    } finally {
      this.usersLoading.set(false);
    }
  }

  async onAddUser(): Promise<void> {
    if (!this.addUserForm.valid) return;
    this.addingUser.set(true);
    this.userError.set(null);
    this.userSuccess.set(null);
    try {
      const api = this.api();
      const v = this.addUserForm.value;
      const payload: Record<string, any> = {
        email: v.email,
        name: v.name,
        role: v.role,
        phone: v.phone || undefined,
        password: v.password,
      };
      if (this.isGlobalAdmin()) {
        payload['storeId'] = v.storeId || null;
      } else {
        const u = this.currentUser();
        if (u?.storeId) payload['storeId'] = u.storeId;
      }
      await firstValueFrom(this.http.post(`${api}/admin/users`, payload));
      this.addUserForm.reset({ role: 'STORE_ADMIN' });
      this.showAddUser.set(false);
      this.userSuccess.set('Operator added.');
      this.clearUserMessagesSoon();
      await this.loadUsers();
    } catch (err: any) {
      this.userError.set(err?.error?.message ?? err?.message ?? 'Failed to create operator.');
    } finally {
      this.addingUser.set(false);
    }
  }

  async onToggleUserStatus(user: any): Promise<void> {
    const id = user.id || user.userId;
    if (!id) return;
    this.togglingUserStatus[id] = true;
    this.touch();
    try {
      const api = this.api();
      const suspended = user.status === 'SUSPENDED' || user.status === 'DELETED' || user.status === 'DISABLED';
      const nextStatus = suspended ? 'ACTIVE' : 'SUSPENDED';
      await firstValueFrom(this.http.put(`${api}/admin/users/${encodeURIComponent(id)}`, { status: nextStatus }));
      this.userSuccess.set(`Operator ${nextStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`);
      this.clearUserMessagesSoon();
      await this.loadUsers();
    } catch (err: any) {
      this.userError.set(err?.error?.message ?? err?.message ?? 'Failed to update status.');
    } finally {
      this.togglingUserStatus[id] = false;
      this.touch();
    }
  }

  openDeleteUser(u: any): void {
    this.deleteUserTarget.set(u);
    this.deleteUserOpen.set(true);
  }
  closeDeleteUser(): void {
    this.deleteUserTarget.set(null);
    this.deleteUserOpen.set(false);
  }
  async confirmDeleteUser(): Promise<void> {
    const u = this.deleteUserTarget();
    const id = u?.id || u?.userId;
    if (!id) return;
    this.deletingUser[id] = true;
    this.touch();
    try {
      const api = this.api();
      await firstValueFrom(this.http.delete(`${api}/admin/users/${encodeURIComponent(id)}`));
      this.deleteUserOpen.set(false);
      this.deleteUserTarget.set(null);
      this.userSuccess.set(`Removed operator ${u?.name || u?.email}.`);
      this.clearUserMessagesSoon();
      await this.loadUsers();
    } catch (err: any) {
      this.userError.set(err?.error?.message ?? err?.message ?? 'Failed to remove operator.');
    } finally {
      this.deletingUser[id] = false;
      this.touch();
    }
  }

  // ---------------- TRANSACTIONS ----------------

  private async loadTransactions(): Promise<void> {
    this.txLoading.set(true);
    this.txError.set(null);
    try {
      const api = this.api();
      const page = this.txPage();
      const size = this.txPageSize;
      const u = this.currentUser();
      const qp = new URLSearchParams();
      qp.set('page', String(page));
      qp.set('pageSize', String(size));
      if (!this.isGlobalAdmin() && u?.storeId) {
        qp.set('storeId', u.storeId);
      }
      const res = await firstValueFrom(this.http.get<any>(`${api}/admin/transactions?${qp.toString()}`));
      if (res && typeof res === 'object' && !Array.isArray(res)) {
        const items = Array.isArray(res.items) ? res.items : [];
        this.transactions.set(items);
        this.txTotalCount.set(Number(res.totalCount ?? items.length));
        this.txTotalPages.set(Number(res.totalPages ?? Math.ceil(items.length / size)));
      } else {
        const arr = Array.isArray(res) ? res : [];
        this.transactions.set(arr);
        this.txTotalCount.set(arr.length);
        this.txTotalPages.set(Math.max(1, Math.ceil(arr.length / size)));
      }
    } catch (err: any) {
      this.txError.set(err?.error?.message ?? err?.message ?? 'Failed to load transactions.');
    } finally {
      this.txLoading.set(false);
    }
  }

  // ---------------- MISC ----------------

  async onLogout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      await this.authService.logout();
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    } finally {
      this.loggingOut.set(false);
    }
  }

  txStatusClass(s: string): string {
    if (!s) return 'info';
    const lower = s.toLowerCase();
    if (lower.includes('complete') || lower.includes('settled') || lower.includes('success') || lower.includes('paid')) return 'ok';
    if (lower.includes('fail') || lower.includes('cancel') || lower.includes('refund') || lower.includes('error')) return 'err';
    if (lower.includes('pend') || lower.includes('process') || lower.includes('hold')) return 'warn';
    return 'info';
  }

  formatMoney(cents: number | undefined | null, currency: string | undefined): string {
    if (cents === undefined || cents === null) return '—';
    const c = currency || 'USD';
    const n = Number(cents) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
  }

  // ============ SSE NOTIFICATIONS ============
  private sseSource: EventSource | null = null;
  private sseTick: any = null;
  private sseDismissTimers: Record<string, any> = {};

  readonly events = signal<SseEventShape[]>([]);
  readonly toasts = signal<Array<SseEventShape & { id: string; leaving?: boolean }>>([]);
  readonly bellPanelOpen = signal(false);
  readonly bellPulse = signal(false);
  readonly sseConnected = signal(false);

  readonly unreadCount = computed(() =>
    this.events().filter(e => !e._read && (e.type === 'RESERVED' || e.type === 'READY' || e.type === 'UNAVAILABLE' || e.type === 'PAID' || e.type === 'PICKED_UP' || e.type === 'CANCELLED' || e.type === 'EXPIRED')).length
  );

  private documentClickListener = (e: MouseEvent) => {
    if (!this.bellPanelOpen()) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (!target.closest('.bell-wrap')) this.bellPanelOpen.set(false);
  };

  toggleBellPanel(): void {
    this.bellPanelOpen.set(!this.bellPanelOpen());
    if (this.bellPanelOpen()) {
      setTimeout(() => document.addEventListener('click', this.documentClickListener, { once: true } as any), 0);
    }
  }

  clearEvents(): void {
    this.events.set([]);
  }

  private pushEvent(ev: SseEventShape): void {
    ev._read = false;
    this.events.update(list => {
      const dedup = list.filter(x => !(x.transactionId && ev.transactionId && x.transactionId === ev.transactionId && x.type === ev.type));
      return [ev, ...dedup].slice(0, 200);
    });
    // Badge pulse
    this.bellPulse.set(true);
    setTimeout(() => this.bellPulse.set(false), 1200);
    // Toast for important events
    if (['RESERVED', 'READY', 'UNAVAILABLE', 'PAID', 'PICKED_UP', 'CANCELLED', 'EXPIRED'].includes(ev.type)) {
      const toastId = 't_' + (ev.eventId || (Date.now() + '_' + Math.random().toString(36).slice(2, 7)));
      const t = { ...ev, id: toastId, leaving: false };
      this.toasts.update(list => [t, ...list].slice(0, 4));
      this.scheduleToastDismiss(toastId, 8000);
    }
  }

  private scheduleToastDismiss(id: string, ms: number): void {
    if (this.sseDismissTimers[id]) clearTimeout(this.sseDismissTimers[id]);
    this.sseDismissTimers[id] = setTimeout(() => this.dismissToast(id), ms);
  }

  dismissToast(id: string): void {
    this.toasts.update(list => list.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => {
      this.toasts.update(list => list.filter(t => t.id !== id));
      if (this.sseDismissTimers[id]) { clearTimeout(this.sseDismissTimers[id]); delete this.sseDismissTimers[id]; }
    }, 260);
  }

  toastIcon(type: string): string {
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

  toastTitle(ev: SseEventShape): string {
    switch (ev.type) {
      case 'RESERVED':    return 'New customer request';
      case 'READY':       return 'Item marked ready';
      case 'UNAVAILABLE': return 'Item marked unavailable';
      case 'PAID':        return 'Payment received';
      case 'PICKED_UP':   return 'Order picked up';
      case 'CANCELLED':   return 'Reservation cancelled';
      case 'EXPIRED':     return 'Reservation expired';
      default:            return ev.status ? `Status: ${ev.status}` : 'Update';
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

  formatRelativeTime(iso: string | null | undefined): string {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  }

  onEventClick(ev: SseEventShape): void {
    ev._read = true;
    this.events.update(list => list.slice());
    const storeId = ev.fulfillingStoreId || ev.storeId;
    if (storeId && ev.transactionId) {
      void this.router.navigate(['/admin', 'stores', storeId, 'transactions'], {
        fragment: 'tx-' + ev.transactionId,
      });
      this.bellPanelOpen.set(false);
    }
  }

  private async startSse(): Promise<void> {
    const api = this.api();
    const token = this.authService.getToken();
    if (!token) return;
    let url = this.isGlobalAdmin()
      ? `${api}/admin/sse/events`
      : `${api}/stores/${encodeURIComponent(this.currentStoreIdForSse() || 'me')}/sse/events`;
    url += '?access_token=' + encodeURIComponent(token);

    try {
      const recentLimit = 100;
      const recentUrl = this.isGlobalAdmin()
        ? `${api}/admin/sse/events/recent?limit=${recentLimit}`
        : `${api}/stores/${encodeURIComponent(this.currentStoreIdForSse() || 'me')}/sse/events/recent?limit=${recentLimit}`;
      const headers: Record<string, string> = { Authorization: 'Bearer ' + token };
      const recent = await firstValueFrom(this.http.get<any[]>(recentUrl, { headers })).catch(() => [] as any[]);
      if (Array.isArray(recent)) {
        for (let i = recent.length - 1; i >= 0; i--) {
          const r = recent[i];
          if (r && typeof r === 'object') this.pushEvent(r as SseEventShape);
        }
      }
    } catch { /* ignore */ }

    if (typeof EventSource === 'undefined') return;
    try {
      this.sseSource = new EventSource(url, { withCredentials: false });
      this.sseSource.onopen = () => { this.sseConnected.set(true); this.touch(); };
      this.sseSource.onerror = () => { this.sseConnected.set(false); this.touch(); };
      this.sseSource.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data && typeof data === 'object') this.pushEvent(data as SseEventShape);
        } catch { /* ignore */ }
      };
      const types = ['RESERVED', 'READY', 'UNAVAILABLE', 'PAID', 'PICKED_UP', 'CANCELLED', 'EXPIRED'];
      for (const t of types) {
        this.sseSource.addEventListener(t, (e: any) => {
          try {
            const data = JSON.parse(e.data || 'null');
            if (data && typeof data === 'object') {
              if (!data.type) data.type = t;
              this.pushEvent(data as SseEventShape);
            }
          } catch { /* ignore */ }
        });
      }
    } catch { /* ignore */ }
  }

  private currentStoreIdForSse(): string | null {
    if (this.isGlobalAdmin()) return null;
    const mine = this.myStore();
    if (mine?.id) return mine.id;
    const arr = this.stores();
    if (arr.length === 1 && arr[0]?.id) return arr[0].id;
    return null;
  }

  stopSse(): void {
    if (this.sseTick) { clearInterval(this.sseTick); this.sseTick = null; }
    if (this.sseSource) { try { this.sseSource.close(); } catch { /* ignore */ } this.sseSource = null; }
    this.sseConnected.set(false);
    Object.keys(this.sseDismissTimers).forEach(k => {
      clearTimeout(this.sseDismissTimers[k]); delete this.sseDismissTimers[k];
    });
  }

  ngOnDestroy(): void {
    this.stopSse();
    document.removeEventListener('click', this.documentClickListener);
  }
}
