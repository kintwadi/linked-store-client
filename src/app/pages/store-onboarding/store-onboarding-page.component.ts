import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import {
  SubscriptionPlanService,
  SubscriptionCheckoutResult,
  StoreSubscriptionState,
} from '../../services/subscription-plan.service';
import {
  resolveApiBase,
  resolveApiBasePublic,
  resolvePublicOrigin,
  PROD_FRONTEND_HOSTNAME,
  PROD_BACKEND_ORIGIN,
} from '../../shared/utils/origins.helper';

type StoreRow = any & {
  _onboardingUrl?: string | null;
  _onboardingLoading?: boolean;
  _dashboardSafeUrl?: SafeUrl | null;
  _dashboardUrl?: string | null;
  _dashboardLoading?: boolean;
  country?: string;
  _isSubscribed?: boolean;
  _cancelAtPeriodEnd?: boolean;
  _status?: string | null;
  _currentPeriodEnd?: string | null;
  _trialEnd?: string | null;
  _planCode?: string | null;
  _planDisplayName?: string | null;
};

const COUNTRY_OPTIONS: readonly { code: string; label: string; currency: string }[] = [
  { code: 'US', label: 'United States',                   currency: 'USD' },
  { code: 'GB', label: 'United Kingdom',                  currency: 'GBP' },
  { code: 'DE', label: 'Germany',                         currency: 'EUR' },
  { code: 'FR', label: 'France',                          currency: 'EUR' },
  { code: 'IT', label: 'Italy',                           currency: 'EUR' },
  { code: 'ES', label: 'Spain',                           currency: 'EUR' },
  { code: 'NL', label: 'Netherlands',                     currency: 'EUR' },
  { code: 'BE', label: 'Belgium',                         currency: 'EUR' },
  { code: 'AT', label: 'Austria',                         currency: 'EUR' },
  { code: 'PT', label: 'Portugal',                        currency: 'EUR' },
  { code: 'IE', label: 'Ireland',                         currency: 'EUR' },
  { code: 'SE', label: 'Sweden',                          currency: 'SEK' },
  { code: 'DK', label: 'Denmark',                         currency: 'DKK' },
  { code: 'NO', label: 'Norway',                          currency: 'NOK' },
  { code: 'CH', label: 'Switzerland',                     currency: 'CHF' },
  { code: 'PL', label: 'Poland',                          currency: 'PLN' },
  { code: 'CZ', label: 'Czechia',                         currency: 'CZK' },
  { code: 'HU', label: 'Hungary',                         currency: 'HUF' },
  { code: 'RO', label: 'Romania',                         currency: 'RON' },
  { code: 'BG', label: 'Bulgaria',                        currency: 'BGN' },
  { code: 'HR', label: 'Croatia',                         currency: 'HRK' },
  { code: 'SK', label: 'Slovakia',                        currency: 'EUR' },
  { code: 'SI', label: 'Slovenia',                        currency: 'EUR' },
  { code: 'LT', label: 'Lithuania',                       currency: 'EUR' },
  { code: 'LV', label: 'Latvia',                          currency: 'EUR' },
  { code: 'EE', label: 'Estonia',                         currency: 'EUR' },
  { code: 'LU', label: 'Luxembourg',                      currency: 'EUR' },
  { code: 'CY', label: 'Cyprus',                          currency: 'EUR' },
  { code: 'MT', label: 'Malta',                           currency: 'EUR' },
  { code: 'FI', label: 'Finland',                         currency: 'EUR' },
  { code: 'GR', label: 'Greece',                          currency: 'EUR' },
  { code: 'CA', label: 'Canada',                          currency: 'CAD' },
  { code: 'AU', label: 'Australia',                       currency: 'AUD' },
  { code: 'NZ', label: 'New Zealand',                     currency: 'NZD' },
  { code: 'IS', label: 'Iceland',                         currency: 'ISK' },
  { code: 'LI', label: 'Liechtenstein',                   currency: 'CHF' },
];

const DEFAULT_PUBLIC_ORIGIN = 'https://dinretail.com';

function guessCountryCode(store: any): string | null {
  const knowns: Array<[RegExp, string]> = [
    [/\b(US|United States|U\.S\.|USA)\b/i, 'US'],
    [/\b(Germany|Deutschland|DE)\b/i, 'DE'],
    [/\b(France|Français|FR)\b/i, 'FR'],
    [/\b(UK|United Kingdom|Britain|England|Scotland|Wales|GB)\b/i, 'GB'],
    [/\b(Spain|España|ES)\b/i, 'ES'],
    [/\b(Italy|Italia|IT)\b/i, 'IT'],
    [/\b(Netherlands|Nederland|NL)\b/i, 'NL'],
    [/\b(Belgium|Belgi[ëe]|BE)\b/i, 'BE'],
    [/\b(Austria|Österreich|AT)\b/i, 'AT'],
    [/\b(Portugal|PT)\b/i, 'PT'],
    [/\b(Ireland|IE)\b/i, 'IE'],
    [/\b(Sweden|Sverige|SE)\b/i, 'SE'],
    [/\b(Denmark|Danmark|DK)\b/i, 'DK'],
    [/\b(Norway|Norge|NO)\b/i, 'NO'],
    [/\b(Switzerland|Schweiz|Suisse|CH)\b/i, 'CH'],
    [/\b(Poland|Polska|PL)\b/i, 'PL'],
    [/\b(Czechia|Czech|Česko|CZ)\b/i, 'CZ'],
    [/\b(Hungary|Magyarország|HU)\b/i, 'HU'],
    [/\b(Romania|România|RO)\b/i, 'RO'],
    [/\b(Bulgaria|България|BG)\b/i, 'BG'],
    [/\b(Croatia|Hrvatska|HR)\b/i, 'HR'],
    [/\b(Canada|CA)\b/i, 'CA'],
    [/\b(Australia|AU)\b/i, 'AU'],
    [/\b(New Zealand|NZ|Aotearoa)\b/i, 'NZ'],
  ];
  const hay = [store.businessAddress, store.city, store.country, store.region, store.state, store.street, store.displayName, store.businessName]
    .filter(Boolean).join(' | ');
  for (const [rx, code] of knowns) if (rx.test(hay)) return code;
  return null;
}

@Component({
  selector: 'app-store-onboarding-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: block; }

    /* ====== Background & hero gradient + blobs ====== */
    .wrap {
      position: relative;
      max-width: 1080px;
      margin: 0 auto;
      padding: 28px 20px 64px;
      display: grid;
      gap: 24px;
      overflow: hidden;
      min-height: calc(100vh - 64px);
      background:
        radial-gradient(1200px 600px at 0% -10%, rgba(99,102,241,0.10), transparent 60%),
        radial-gradient(900px 500px at 110% 10%, rgba(236,72,153,0.08), transparent 60%),
        linear-gradient(180deg, #fafbff 0%, #ffffff 40%, #f8faff 100%);
    }
    .blob { position: absolute; filter: blur(80px); opacity: 0.65; pointer-events: none; border-radius: 9999px; }
    .blob-1 { width: 360px; height: 360px; top: -120px; left: -80px; background: rgba(99,102,241,0.30); }
    .blob-2 { width: 420px; height: 420px; top: 40px; right: -120px; background: rgba(236,72,153,0.22); }
    .blob-3 { width: 320px; height: 320px; bottom: -120px; left: 30%; background: rgba(59,130,246,0.22); }

    .back {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.2s ease;
    }
    .back:hover { color: #111827; }
    .back svg { width: 14px; height: 14px; }

    /* ====== Hero header ====== */
    .hero {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 18px;
      padding: 14px 4px 4px;
    }
    .hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .hero-text { display: grid; gap: 10px; max-width: 640px; }
    .eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(99,102,241,0.10);
      color: #4338ca;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      width: fit-content;
    }
    .eyebrow .dot {
      width: 6px; height: 6px; border-radius: 999px;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }
    .page-title {
      margin: 0;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #4c1d95 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .page-subtitle {
      margin: 0;
      font-size: 16px;
      color: #64748b;
      line-height: 1.65;
    }
    .hero-cta {
      align-self: flex-end;
      display: inline-flex;
    }
    .btn-hero {
      appearance: none;
      border: 0;
      cursor: pointer;
      padding: 13px 22px;
      border-radius: 14px;
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
      box-shadow:
        0 10px 25px -10px rgba(99,102,241,0.55),
        0 2px 4px rgba(15,23,42,0.06),
        inset 0 1px 0 rgba(255,255,255,0.25);
      display: inline-flex; align-items: center; gap: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
      text-decoration: none;
    }
    .btn-hero:hover { transform: translateY(-1px); filter: brightness(1.03); box-shadow: 0 14px 30px -10px rgba(99,102,241,0.65), 0 3px 6px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.25); }
    .btn-hero:active { transform: translateY(0); }
    .btn-hero svg { width: 14px; height: 14px; }

    /* ====== Summary strip ====== */
    .summary {
      position: relative; z-index: 1;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 620px) { .summary { grid-template-columns: 1fr; } }
    .summary-item {
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(148,163,184,0.18);
      display: grid;
      gap: 4px;
    }
    .summary-label { font-size: 12px; color: #64748b; font-weight: 500; }
    .summary-value { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; color: #0f172a; }
    .summary-sub { font-size: 12px; color: #475569; }

    /* ====== Stores grid ====== */
    .stores-grid {
      position: relative; z-index: 1;
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    @media (min-width: 820px) {
      .stores-grid { grid-template-columns: 1fr 1fr; }
    }

    /* ====== Store card (glassmorphism) ====== */
    .store-card {
      position: relative;
      display: grid;
      gap: 18px;
      padding: 22px 22px 20px;
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.88));
      border: 1px solid rgba(148,163,184,0.22);
      box-shadow:
        0 10px 30px -12px rgba(15,23,42,0.10),
        0 4px 10px -4px rgba(15,23,42,0.06),
        inset 0 1px 0 rgba(255,255,255,0.9);
      overflow: hidden;
      opacity: 0;
      transform: translateY(14px);
      animation: fadeInUp 0.5s cubic-bezier(.2,.7,.2,1) forwards;
    }
    .store-card:nth-child(1) { animation-delay: 0.05s; }
    .store-card:nth-child(2) { animation-delay: 0.15s; }
    .store-card:nth-child(3) { animation-delay: 0.25s; }
    .store-card:nth-child(4) { animation-delay: 0.35s; }
    .store-card::before {
      content: '';
      position: absolute;
      top: 0; left: -30%;
      width: 160%; height: 180px;
      background: linear-gradient(115deg, transparent 40%, rgba(99,102,241,0.10) 50%, transparent 60%);
      pointer-events: none;
    }
    .card-glow {
      position: absolute;
      width: 280px; height: 280px;
      top: -80px; right: -80px;
      background: radial-gradient(circle at center, rgba(99,102,241,0.16), transparent 70%);
      filter: blur(10px);
      pointer-events: none;
    }

    .card-head {
      position: relative; z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: flex-start;
    }
    .card-title-group { display: grid; gap: 6px; min-width: 0; }
    .card-title-row {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .card-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #0f172a;
      line-height: 1.2;
    }
    .plan-badge {
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      overflow: hidden;
      isolation: isolate;
    }
    .plan-badge.pro {
      color: #fff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      box-shadow: 0 4px 12px -4px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.3);
    }
    .plan-badge.standard {
      color: #1e40af;
      background: linear-gradient(135deg, #dbeafe, #bfdbfe);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
    }
    .plan-badge::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
      transform: translateX(-60%);
      animation: shine 3s linear infinite;
      pointer-events: none;
      z-index: -1;
    }
    .badge-shine-pro::after { animation-duration: 2.8s; }
    .store-id-sub {
      font-size: 12px;
      color: #64748b;
      display: inline-flex; align-items: center; gap: 6px;
    }

    /* Status ring (big circular status) */
    .status-ring-wrap {
      position: relative;
      width: 72px; height: 72px;
      flex-shrink: 0;
    }
    .status-ring {
      width: 72px; height: 72px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: conic-gradient(from 0deg, #10b981, #34d399 60%, rgba(16,185,129,0.15) 100%);
      padding: 3px;
      box-shadow:
        0 8px 20px -8px rgba(16,185,129,0.4),
        inset 0 1px 0 rgba(255,255,255,0.4);
      transition: box-shadow 0.2s ease;
    }
    .status-ring.pending {
      background: conic-gradient(from 0deg, #f59e0b, #fbbf24 60%, rgba(245,158,11,0.15) 100%);
      box-shadow:
        0 8px 20px -8px rgba(245,158,11,0.4),
        inset 0 1px 0 rgba(255,255,255,0.4);
    }
    .status-ring-inner {
      width: 100%; height: 100%;
      border-radius: 999px;
      background: #fff;
      display: grid; place-items: center;
      box-shadow: inset 0 1px 0 rgba(148,163,184,0.12);
    }
    .status-ring svg { width: 26px; height: 26px; }

    /* KPI row */
    .kpi-row {
      position: relative; z-index: 1;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .kpi {
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(248,250,252,0.85);
      border: 1px solid rgba(148,163,184,0.18);
      display: grid; gap: 2px;
    }
    .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
    .kpi-value { font-size: 14px; font-weight: 700; color: #0f172a; display: inline-flex; align-items: center; gap: 6px; }
    .check-svg { width: 14px; height: 14px; stroke: #059669; stroke-width: 2.6; fill: none; }
    .x-svg { width: 14px; height: 14px; stroke: #dc2626; stroke-width: 2.6; fill: none; }
    .kpi-value.ok { color: #059669; }
    .kpi-value.notok { color: #dc2626; }

    /* Feature checklist */
    .feature-list {
      position: relative; z-index: 1;
      display: grid;
      gap: 8px;
    }
    .feature {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(248,250,252,0.7);
      border: 1px solid rgba(148,163,184,0.16);
      transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    }
    .feature:hover {
      background: rgba(255,255,255,1);
      border-color: rgba(99,102,241,0.26);
      transform: translateX(2px);
    }
    .feature-ico {
      flex-shrink: 0;
      width: 22px; height: 22px;
      border-radius: 8px;
      display: grid; place-items: center;
      background: rgba(99,102,241,0.12);
      color: #4f46e5;
      transition: transform 0.2s ease;
    }
    .feature:hover .feature-ico { transform: scale(1.12); }
    .feature-ico svg { width: 13px; height: 13px; }
    .feature-text { display: grid; gap: 2px; min-width: 0; }
    .feature-label { font-size: 13px; font-weight: 600; color: #0f172a; }
    .feature-sub { font-size: 12px; color: #64748b; word-break: break-all; }

    /* Country select row */
    .country-row {
      position: relative; z-index: 1;
      display: grid;
      gap: 8px;
    }
    .country-row label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .country-row select {
      width: 100%;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(148,163,184,0.28);
      background: #fff;
      font-size: 14px;
      font-weight: 500;
      color: #0f172a;
      box-shadow:
        0 1px 2px rgba(15,23,42,0.04),
        inset 0 1px 0 rgba(255,255,255,0.9);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .country-row select:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.14);
    }

    /* Action row */
    .card-actions {
      position: relative; z-index: 1;
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    @media (min-width: 520px) {
      .card-actions.two { grid-template-columns: 1.2fr 0.9fr; }
    }

    .btn {
      appearance: none;
      border: 0;
      cursor: pointer;
      padding: 13px 18px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      text-decoration: none;
      transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
      text-wrap: balance;
      text-align: center;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn svg { width: 15px; height: 15px; }

    .btn-primary {
      color: #fff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
      box-shadow:
        0 10px 22px -10px rgba(99,102,241,0.55),
        0 2px 6px rgba(15,23,42,0.06),
        inset 0 1px 0 rgba(255,255,255,0.25);
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.03); box-shadow: 0 14px 28px -10px rgba(99,102,241,0.65), 0 3px 6px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.25); }
    .btn-primary:active:not(:disabled) { transform: translateY(0); }
    .btn-primary:disabled {
      cursor: not-allowed;
      background: #e2e8f0 !important;
      color: #475569 !important;
      box-shadow: inset 0 0 0 1px #cbd5e1;
      opacity: 1;
    }

    .btn-ghost {
      color: #334155;
      background: #fff;
      border: 1px solid rgba(148,163,184,0.32);
      box-shadow: 0 1px 2px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
    }
    .btn-ghost:hover:not(:disabled) { background: #f8fafc; border-color: rgba(99,102,241,0.30); color: #4f46e5; }

    .btn-subscribe {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%);
    }

    .subscription-error {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 14px;
      border-radius: 14px;
      background: linear-gradient(180deg, #fff1f2, #ffe4e6);
      border: 1px solid #fecdd3;
      color: #9f1239;
      font-size: 13px;
      line-height: 1.45;
      box-shadow: 0 2px 6px rgba(190, 24, 93, 0.06);
    }
    .subscription-error svg {
      width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px;
      color: #e11d48;
    }

    .link-secondary {
      font-size: 12px;
      color: #64748b;
      text-decoration: none;
      display: inline-flex; align-items: center; gap: 6px;
      justify-self: end;
      padding: 4px 2px;
      transition: color 0.2s ease;
    }
    .link-secondary:hover { color: #4f46e5; text-decoration: underline; }
    .link-secondary svg { width: 12px; height: 12px; }

    /* Empty / loading / error */
    .empty, .loading, .error {
      position: relative; z-index: 1;
      padding: 56px 24px;
      text-align: center;
      border-radius: 20px;
    }
    .empty {
      background: rgba(255,255,255,0.85);
      border: 1px dashed rgba(148,163,184,0.32);
      color: #64748b;
      font-size: 15px;
    }
    .loading {
      background: rgba(255,255,255,0.85);
      border: 1px solid rgba(148,163,184,0.18);
      color: #64748b;
      font-size: 15px;
    }
    .error {
      background: #fff1f2;
      color: #9f1239;
      border: 1px solid #fecdd3;
      font-size: 15px;
    }

    /* ====== Animations ====== */
    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(14px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes shine {
      0% { transform: translateX(-60%); }
      100% { transform: translateX(60%); }
    }
  `],
  template: `
    <div class="wrap">
      <span class="blob blob-1"></span>
      <span class="blob blob-2"></span>
      <span class="blob blob-3"></span>

      <a class="back" [routerLink]="backToDashboardLink()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Back to dashboard
      </a>

      <section class="hero">
        <div class="hero-top">
          <div class="hero-text">
            <span class="eyebrow">
              <span class="dot"></span>
              PAYOUTS &amp; SUBSCRIPTION SETUP
            </span>
            <h1 class="page-title">Store Onboarding</h1>
            <p class="page-subtitle">Connect your Stripe account to receive payouts, then start your subscription plan to unlock all platform features and order volume.</p>
          </div>
          <div class="hero-cta">
            <a class="btn-hero" routerLink="/pricing">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              View subscription plans
            </a>
          </div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Stores you manage</span>
            <span class="summary-value">{{ visibleStores().length }}</span>
            <span class="summary-sub">{{ isGlobalAdmin() ? 'Global Admin · all stores' : 'Single store scope' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Fully onboarded</span>
            <span class="summary-value">{{ onboardedCount() }}</span>
            <span class="summary-sub">Stripe charges + payouts enabled</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Awaiting setup</span>
            <span class="summary-value">{{ pendingCount() }}</span>
            <span class="summary-sub">Stores that still need Stripe connect</span>
          </div>
        </div>
      </section>

      @if (loading()) {
        <div class="loading">Loading stores…</div>
      } @else if (error()) {
        <div class="error">{{ error() }}</div>
      } @else if (visibleStores().length === 0) {
        <div class="empty">No stores found.</div>
      } @else {
        <div class="stores-grid">
          @for (store of visibleStores(); track store.id) {
            <article class="store-card">
              <span class="card-glow"></span>

              <header class="card-head">
                <div class="card-title-group">
                  <div class="card-title-row">
                    <h2 class="card-title">{{ store.businessName || store.name || 'Unnamed Store' }}</h2>
                    <span
                      class="plan-badge badge-shine-pro"
                      [class.pro]="isProPlan(store)"
                      [class.standard]="!isProPlan(store)">
                      {{ planLabel(store) }}
                    </span>
                  </div>
                  <span class="store-id-sub">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    @if (store.latitude !== undefined && store.latitude !== null && store.longitude !== undefined && store.longitude !== null) {
                      {{ store.latitude }}, {{ store.longitude }}
                    } @else {
                      No location set
                    }
                  </span>
                </div>

                <div class="status-ring-wrap" [title]="store.onboarded ? 'Onboarded — payouts ready' : 'Stripe setup needed'">
                  <div class="status-ring" [class.pending]="!store.onboarded">
                    <div class="status-ring-inner">
                      @if (store.onboarded) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      }
                    </div>
                  </div>
                </div>
              </header>

              <div class="kpi-row">
                <div class="kpi">
                  <span class="kpi-label">Charges</span>
                  @if (store.onboarded) {
                    <span class="kpi-value" [class.ok]="store.chargesEnabled" [class.notok]="!store.chargesEnabled">
                      @if (store.chargesEnabled) {
                        <svg class="check-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        Enabled
                      } @else {
                        <svg class="x-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Pending
                      }
                    </span>
                  } @else {
                    <span class="kpi-value" style="color:#94a3b8;">—</span>
                  }
                </div>
                <div class="kpi">
                  <span class="kpi-label">Payouts</span>
                  @if (store.onboarded) {
                    <span class="kpi-value" [class.ok]="store.payoutsEnabled" [class.notok]="!store.payoutsEnabled">
                      @if (store.payoutsEnabled) {
                        <svg class="check-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        Enabled
                      } @else {
                        <svg class="x-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Pending
                      }
                    </span>
                  } @else {
                    <span class="kpi-value" style="color:#94a3b8;">—</span>
                  }
                </div>
              </div>

              <div class="feature-list">
                <div class="feature">
                  <span class="feature-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.6"/><polyline points="21 3 12 12"/></svg>
                  </span>
                  <div class="feature-text">
                    <span class="feature-label">
                      {{ store.onboarded ? 'Stripe account connected' : 'Connect Stripe to receive payouts' }}
                    </span>
                    @if (store.onboarded) {
                      <span class="feature-sub">
                        Status: Charges {{ store.chargesEnabled ? '✓' : '✗' }} · Payouts {{ store.payoutsEnabled ? '✓' : '✗' }}
                      </span>
                    } @else {
                      <span class="feature-sub">Takes ~2 minutes. No coding required.</span>
                    }
                  </div>
                </div>

                <div class="feature">
                  <span class="feature-ico" style="background: rgba(16,185,129,0.12); color: #047857;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </span>
                  <div class="feature-text">
                    <span class="feature-label">Current plan</span>
                    <span class="feature-sub">{{ resolveStorePlanDisplayName(store) }}{{ resolveStorePlanStatusSuffix(store) }}</span>
                  </div>
                </div>

                @if (store.stripeConnectId) {
                  <div class="feature">
                    <span class="feature-ico" style="background: rgba(30,41,59,0.10); color: #334155;">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                    </span>
                    <div class="feature-text">
                      <span class="feature-label">Stripe Connect ID</span>
                      <span class="feature-sub">
                        @if (store.stripeConnectId.startsWith('acct_placeholder') || store.stripeConnectId.startsWith('demo_') || store.stripeConnectId.includes('placeholder')) {
                          (Demo) {{ store.stripeConnectId }}
                        } @else {
                          {{ store.stripeConnectId }}
                        }
                      </span>
                    </div>
                  </div>
                }
              </div>

              @if (!store.onboarded) {
                <div class="card-actions">
                  <div class="country-row">
                    <label for="country-{{ store.id }}">Merchant country</label>
                    <select id="country-{{ store.id }}"
                            [value]="store.country || 'US'"
                            (change)="onCountryChange(store, $any($event.target).value)">
                      @for (c of COUNTRY_OPTIONS; track c.code) {
                        <option [value]="c.code">{{ c.label }} · {{ c.currency }}</option>
                      }
                    </select>
                  </div>
                  <button
                    class="btn btn-primary"
                    (click)="onConnectStripe(store)"
                    [disabled]="processingStoreId() === store.id">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"/><path d="M12 8v4l3 2"/></svg>
                    @if (processingStoreId() === store.id) {
                      Creating Stripe onboarding link…
                    } @else {
                      Connect Stripe account
                    }
                  </button>
                </div>
              } @else {
                <div class="card-actions">
                  <button
                    class="btn btn-primary btn-subscribe"
                    (click)="onStartSubscription(store)"
                    [disabled]="matchesStore(startingSubscriptionForStoreId(), store) || isStoreAlreadySubscribed(store)"
                    style="padding: 16px 24px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      @if (matchesStore(startingSubscriptionForStoreId(), store)) {
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      } @else if (!isStoreAlreadySubscribed(store)) {
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      } @else if (isStoreMarkedToCancel(store)) {
                        <path d="M12 2v10"/><circle cx="12" cy="20" r="1"/>
                        <path d="M4.93 4.93l14.14 14.14"/>
                      } @else {
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      }
                    </svg>
                    {{ resolveStoreSubButtonText(store) }}
                  </button>
                </div>

                @if (matchesStore(subscriptionCheckoutError()?.storeId, store)) {
                  <div class="subscription-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>{{ subscriptionCheckoutError()!.message }}</span>
                  </div>
                }
              }
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class StoreOnboardingPageComponent implements OnInit {
  readonly loading = signal(true);
  readonly stores = signal<StoreRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly processingStoreId = signal<string | null>(null);
  readonly COUNTRY_OPTIONS = COUNTRY_OPTIONS;

  private readonly authService = inject(AuthService);

  readonly isGlobalAdmin = computed(() => {
    const u = this.authService.currentUser$.getValue();
    return !!(u?.isGlobalAdmin || u?.role === 'GLOBAL_ADMIN');
  });

  readonly currentStoreId = computed(() => {
    const u = this.authService.currentUser$.getValue();
    return u?.storeId || null;
  });

  readonly visibleStores = computed(() => {
    const all = this.stores();
    if (this.isGlobalAdmin()) return all;
    const storeId = this.currentStoreId();
    if (!storeId) return [];
    return all.filter(s => s.id === storeId || String(s.id) === String(storeId));
  });

  readonly onboardedCount = computed(() => this.visibleStores().filter(s => !!s.onboarded).length);
  readonly pendingCount = computed(() => this.visibleStores().length - this.onboardedCount());

  private readonly subscriptionPlanService = inject(SubscriptionPlanService);
  private readonly router2 = inject(Router);

  readonly startingSubscriptionForStoreId = signal<string | null>(null);
  readonly subscriptionCheckoutError = signal<{ storeId: string; message: string } | null>(null);

  readonly backToDashboardLink = computed(() => {
    if (this.isGlobalAdmin()) {
      return '/admin';
    }
    const stores = this.visibleStores();
    const firstId = stores.length > 0 ? String(stores[0].id) : null;
    const fallbackId = this.currentStoreId();
    const storeId = firstId ?? (fallbackId != null ? String(fallbackId) : null);
    if (!storeId) {
      return '/admin';
    }
    return `/admin/stores/${storeId}/products`;
  });

  planLabel(s: StoreRow): string {
    const raw = (s.subscriptionStatus || s.plan || 'Standard') as string;
    const lower = raw.toLowerCase();
    if (lower.includes('pro')) return 'PRO';
    if (lower.includes('enterprise') || lower.includes('custom')) return 'CUSTOM';
    if (lower.includes('free')) return 'FREE';
    if (lower === 'active') return 'Standard';
    return raw.length > 16 ? 'Standard' : raw;
  }

  isProPlan(s: StoreRow): boolean {
    return this.planLabel(s) === 'PRO' || this.planLabel(s) === 'Standard';
  }

  resolveSelectedPlanCode(s: StoreRow): 'PRO' | 'CUSTOM' {
    const label = this.planLabel(s);
    if (label === 'CUSTOM') return 'CUSTOM';
    return 'PRO';
  }

  toStoreId(s: StoreRow): string {
    return String(s?.id ?? '');
  }

  matchesStore(storeId: string | null | undefined, s: StoreRow): boolean {
    if (storeId == null) return false;
    return String(storeId) === this.toStoreId(s);
  }

  async onStartSubscription(store: StoreRow): Promise<void> {
    const storeId = String(store.id);
    this.subscriptionCheckoutError.set(null);
    this.startingSubscriptionForStoreId.set(storeId);
    try {
      const planCode = this.resolveSelectedPlanCode(store);
      const result: SubscriptionCheckoutResult = await this.subscriptionPlanService
        .startSubscriptionCheckout(storeId, planCode, 'monthly');
      if (result.type === 'CHECKOUT' && result.url) {
        this.subscriptionCheckoutError.set(null);
        window.location.assign(result.url);
        return;
      }
      if (result.type === 'CONTACT_SALES') {
        this.subscriptionCheckoutError.set(null);
        const target = result.pricingPageUrl || '/pricing';
        await this.router2.navigateByUrl(target);
        return;
      }
      this.subscriptionCheckoutError.set({
        storeId,
        message: result?.message || 'Subscription checkout could not be started.',
      });
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Subscription checkout failed unexpectedly.';
      this.subscriptionCheckoutError.set({ storeId, message: msg });
    } finally {
      if (this.startingSubscriptionForStoreId() === storeId) {
        this.startingSubscriptionForStoreId.set(null);
      }
    }
  }

  constructor(
    private readonly products: ProductService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadStores();
  }

  onCountryChange(store: StoreRow, value: string): void {
    store.country = value || 'US';
    store._onboardingUrl = null;
  }

  private async loadStores(): Promise<void> {
    const api = resolveApiBase();
    try {
      const res = await firstValueFrom(this.http.get<any>(`${api}/stores`));
      const arrRaw: StoreRow[] = Array.isArray(res) ? res : (res?.stores ?? res?.data ?? []);
      const arr = arrRaw.map(s => ({
        ...s,
        country: guessCountryCode(s) || 'US',
        _onboardingUrl: null,
        _onboardingLoading: false,
        _dashboardUrl: null,
        _dashboardSafeUrl: null,
        _dashboardLoading: false,
        _isSubscribed: false,
      }));
      this.stores.set(arr);
      await this.enrichStoreSubscriptionStatuses(arr);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to load stores.';
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  private async enrichStoreSubscriptionStatuses(stores: StoreRow[]): Promise<void> {
    try {
      await Promise.all(stores.map(async (s) => {
        const storeId = String(s.id);
        if (!storeId) return;
        const st = (s.subscriptionStatus || s.plan_status || s.sub_status || '')
          .toString()
          .toUpperCase();

        // Fast-path ONLY when we're CERTAIN there is no subscription
        // (terminated state). For ACTIVE/TRIALING/PAST_DUE we MUST call the API
        // to learn cancelAtPeriodEnd, plan info, and period end dates.
        const columnTerminated =
          st === 'CANCELED' || st === 'EXPIRED' || st === 'SUSPENDED' || st === 'FREE' || st === '';
        if (columnTerminated) {
          s._isSubscribed = false;
          s._cancelAtPeriodEnd = false;
          s._status = st || 'FREE';
          return;
        }

        try {
          const sub: StoreSubscriptionState =
            await this.subscriptionPlanService.getStoreSubscription(storeId);
          s._isSubscribed = !!sub && !!sub.isSubscribed;
          s._cancelAtPeriodEnd = !!sub?.cancelAtPeriodEnd;
          s._status = sub?.status ?? (st || null);
          s._currentPeriodEnd = sub?.currentPeriodEnd ?? null;
          s._trialEnd = sub?.trialEnd ?? null;
          s._planCode = sub?.planCode ?? null;
          s._planDisplayName = sub?.planDisplayName ?? null;
        } catch {
          // If API call fails (403 no permission, no auth, etc.), fall back to row-level subscriptionStatus
          s._isSubscribed = st === 'ACTIVE' || st === 'TRIALING' || st === 'PAST_DUE';
          s._cancelAtPeriodEnd = false;
          s._status = st || null;
          s._currentPeriodEnd = null;
          s._trialEnd = null;
          s._planCode = null;
          s._planDisplayName = null;
        }
      }));
      // Trigger change detection by re-setting the array references after enrichment
      this.stores.set([...this.stores()]);
    } catch {
      // Non-fatal: no enrichment, buttons fall back to subscriptionStatus column logic
    }
  }

  isStoreAlreadySubscribed(s: StoreRow): boolean {
    if (s?._isSubscribed === true) return true;
    const st = (s?.subscriptionStatus || s?.plan_status || s?.sub_status || '')
      .toString()
      .toUpperCase();
    return st === 'ACTIVE' || st === 'TRIALING' || st === 'PAST_DUE';
  }

  isStoreMarkedToCancel(s: StoreRow): boolean {
    return s?._cancelAtPeriodEnd === true;
  }

  resolveStoreSubButtonText(s: StoreRow): string {
    if (this.matchesStore(this.startingSubscriptionForStoreId(), s)) {
      return 'Starting Stripe subscription…';
    }
    if (this.isStoreAlreadySubscribed(s)) {
      if (this.isStoreMarkedToCancel(s)) {
        const date = s._currentPeriodEnd;
        if (date) {
          try {
            const d = new Date(date);
            const pretty = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            return `Current plan · marked to cancel (${pretty})`;
          } catch { /* fall through */ }
        }
        return 'Current plan · marked to cancel at period end';
      }
      return 'Current plan — subscription active';
    }
    const code = this.resolveSelectedPlanCode(s);
    return `Start subscription process (${code === 'CUSTOM' ? 'Custom/Enterprise' : 'Pro Plan'})`;
  }

  resolveStorePlanDisplayName(s: StoreRow): string {
    if (s?._planDisplayName) return s._planDisplayName;
    if (s?._planCode === 'PRO') return 'Pro Plan';
    if (s?._planCode === 'CUSTOM') return 'Custom / Enterprise';
    return this.planLabel(s) + ' subscription';
  }

  resolveStorePlanStatusSuffix(s: StoreRow): string {
    if (this.isStoreMarkedToCancel(s)) {
      const date = s._currentPeriodEnd;
      if (date) {
        try {
          const d = new Date(date);
          const pretty = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          return ` · Marked to cancel (${pretty})`;
        } catch { /* fall through */ }
      }
      return ' · Marked to cancel';
    }
    if (s?._status) return ' · ' + s._status;
    if (s?.subscriptionStatus) return ' · ' + s.subscriptionStatus;
    return '';
  }

  private async ensureOnboardingLink(store: StoreRow): Promise<string | null> {
    if (store._onboardingUrl) return store._onboardingUrl;
    if (store._onboardingLoading) {
      return await new Promise(resolve => {
        const start = Date.now();
        const iv = window.setInterval(() => {
          if (store._onboardingUrl || !store._onboardingLoading || Date.now() - start > 15000) {
            window.clearInterval(iv);
            resolve(store._onboardingUrl ?? null);
          }
        }, 80);
      });
    }
    store._onboardingLoading = true;
    const api = resolveApiBase();
    const origin = resolvePublicOrigin();
    const url = `${origin}/store/onboarding`;
    try {
      const country = (store.country || 'US').toUpperCase();
      const defaultCurrency = COUNTRY_OPTIONS.find(o => o.code === country)?.currency || 'USD';
      const res = await firstValueFrom(
        this.http.post<any>(`${api}/connect/onboarding-link`, {
          storeId: store.id,
          refreshUrl: url,
          returnUrl: url,
          country,
          defaultCurrency,
        })
      );
      if (!res || res.status === 'error' || !res.url) {
        const msg = res?.message ?? 'Stripe did not return an onboarding URL.';
        throw new Error(msg);
      }
      const u: string = res.url;
      store._onboardingUrl = u;
      return u;
    } catch (err: any) {
      const message = err?.error?.message
        ?? err?.message
        ?? 'Failed to create Stripe onboarding link.';
      throw new Error(message);
    } finally {
      store._onboardingLoading = false;
    }
  }

  private async ensureDashboardLink(store: StoreRow): Promise<string | null> {
    // Do NOT cache LoginLinks: they expire in minutes and fail the next day with a Stripe 404.
    // Always request a fresh one. Also skip the Loading poll loop (we don't cache anymore).
    store._dashboardLoading = true;
    store._dashboardUrl = null;
    store._dashboardSafeUrl = null;
    const api = resolveApiBase();
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${api}/connect/login-link`, { storeId: store.id })
      );
      if (!res || res.status === 'error' || !res.url) {
        const msg = res?.message ?? 'Stripe did not return a dashboard URL.';
        throw new Error(msg);
      }
      const u: string = res.url;
      store._dashboardUrl = u;
      store._dashboardSafeUrl = this.sanitizer.bypassSecurityTrustUrl(u);
      return u;
    } catch (err: any) {
      const message = err?.error?.message
        ?? err?.message
        ?? 'Stripe Express dashboard session could not be created.';
      throw new Error(message);
    } finally {
      store._dashboardLoading = false;
    }
  }

  async onConnectStripe(store: StoreRow): Promise<void> {
    this.processingStoreId.set(store.id);
    try {
      const url = await this.ensureOnboardingLink(store);
      if (!url) throw new Error('Stripe did not return an onboarding URL.');
      // Navigate the CURRENT tab. Stripe explicitly returns users here via returnUrl/refreshUrl.
      // This is the most reliable flow — it cannot be blocked by popup blockers.
      window.location.assign(url);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to create Stripe onboarding link.');
    } finally {
      this.processingStoreId.set(null);
    }
  }

  async onManageDashboard(store: StoreRow): Promise<void> {
    // First try: pre-warmed anchor (link is already rendered, click cannot be blocked).
    if (store._dashboardUrl) {
      // Anchor already works via href — nothing to do (native click follows href).
      return;
    }
    // Not ready yet: fetch in-background, then open current-tab fallback (popup-proof).
    this.processingStoreId.set(store.id);
    try {
      const url = await this.ensureDashboardLink(store);
      if (!url) throw new Error('Stripe did not return a dashboard URL.');
      // Force-open in current tab (cannot be blocked) as a fallback — user will return via back.
      window.location.assign(url);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to open Stripe dashboard.');
    } finally {
      this.processingStoreId.set(null);
    }
  }
}
