import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, filter, timeout, catchError } from 'rxjs';
import { PricingPlan, PricingPlanFeature, SubscriptionPlanService, StoreSubscriptionState } from '../../services/subscription-plan.service';
import { AuthService } from '../../services/auth.service';

const FALLBACK_PLANS: PricingPlan[] = [
  {
    tier: 'PRO',
    displayName: 'Pro Plan',
    description: 'For growing businesses',
    monthlyPriceCents: 2900,
    annualPriceCents: 27600,
    annualDiscountPercent: 20,
    billingLabelMonthly: 'Billed monthly',
    billingLabelAnnual: 'Billed $276 annually',
    currency: 'USD',
    trialDays: 30,
    monthlyOrderLimit: 100,
    badges: ['Recommended'],
    features: [
      { label: '30 days free trial', included: true },
      { label: 'Unlimited connected stores', included: true },
      { label: 'Up to 100 monthly orders', included: true },
      { label: 'Standard API & webhooks access', included: true },
      { label: 'Email support (24-hour response time)', included: true },
    ] as PricingPlanFeature[],
  },
  {
    tier: 'CUSTOM',
    displayName: 'Custom Plan',
    description: 'For large stores & enterprises',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    annualDiscountPercent: 0,
    billingLabelMonthly: 'Tailored for scale',
    billingLabelAnnual: 'Tailored for scale',
    currency: 'USD',
    trialDays: 0,
    monthlyOrderLimit: null,
    badges: ['Enterprise'],
    features: [
      { label: 'Everything in Pro Plan', included: true, highlight: true },
      { label: 'Unlimited monthly orders & high-volume processing', included: true },
      { label: 'Dedicated account manager', included: true },
      { label: 'Custom integrations & higher API rate limits', included: true },
      { label: 'Custom SLA & priority onboarding', included: true },
      { label: 'Advanced security & SAML SSO log-in', included: true },
    ] as PricingPlanFeature[],
  },
];

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; }

    .pricing-wrap {
      min-height: 100vh;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #eef2ff 100%);
      color: #1e293b;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .bg-decor {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .bg-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.4;
    }
    .bg-blob.indigo {
      width: 480px; height: 480px;
      background: #6366f1;
      top: -160px; right: -160px;
    }
    .bg-blob.violet {
      width: 420px; height: 420px;
      background: #8b5cf6;
      bottom: -140px; left: -140px;
    }
    .bg-blob.amber {
      width: 560px; height: 560px;
      background: #f59e0b;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.2;
    }

    .content-wrap {
      position: relative;
      z-index: 1;
      max-width: 1120px;
      margin: 0 auto;
      padding: 56px 24px 80px;
    }

    .header-row {
      text-align: center;
      margin-bottom: 48px;
      animation: fadeInUp 0.6s ease-out forwards;
    }
    .pill-free {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      margin-bottom: 20px;
    }
    .pill-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #34d399;
      animation: pulse 2s ease-in-out infinite;
    }
    .pill-text {
      font-size: 12px;
      font-weight: 700;
      color: #4338ca;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .header-title {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin: 0 0 16px;
      line-height: 1.1;
    }
    .header-sub {
      font-size: 17px;
      color: #64748b;
      max-width: 560px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* Toggle */
    .toggle-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 48px;
      animation: fadeInUp 0.6s ease-out 0.1s both;
    }
    .toggle-label {
      font-size: 14px;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    .toggle-label.active { color: #0f172a; font-weight: 700; }
    .toggle-label.inactive { color: #94a3b8; font-weight: 500; }
    .toggle-btn {
      position: relative;
      width: 56px; height: 28px;
      border-radius: 999px;
      background: #6366f1;
      border: none;
      padding: 2px;
      cursor: pointer;
      transition: background 0.25s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .toggle-btn:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    }
    .toggle-knob {
      width: 24px; height: 24px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      display: grid;
      place-items: center;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .toggle-btn.annual .toggle-knob { transform: translateX(28px); }
    .toggle-knob svg { color: #6366f1; }

    .save-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      font-size: 11px;
      font-weight: 800;
      color: #047857;
      margin-left: 4px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .save-badge.hidden { opacity: 0; transform: scale(0.9); pointer-events: none; }
    .save-badge.show { opacity: 1; transform: scale(1); }

    /* Cards grid */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      animation: fadeInUp 0.6s ease-out 0.2s both;
    }
    @media (max-width: 900px) {
      .cards-grid { grid-template-columns: 1fr; max-width: 520px; margin: 0 auto; }
      .header-title { font-size: 36px; }
    }

    .card {
      position: relative;
      background: #fff;
      border-radius: 24px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card:hover {
      transform: translateY(-4px);
    }
    .card.pro {
      border: 1px solid #e2e8f0;
      box-shadow: 0 0 60px rgba(99, 102, 241, 0.12), 0 20px 60px rgba(15, 23, 42, 0.08);
    }
    .card.custom {
      border: 1px solid #e2e8f0;
      box-shadow: 0 0 60px rgba(245, 158, 11, 0.12), 0 20px 60px rgba(15, 23, 42, 0.08);
    }

    .card-topbar {
      height: 6px;
      background-size: 200% 200%;
      animation: shimmer 3s ease infinite;
    }
    .card.pro .card-topbar { background-image: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899); }
    .card.custom .card-topbar { background-image: linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b); }

    .card-body { padding: 32px 32px 8px; }

    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 12px;
    }
    .card-titles h2 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .card-desc {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge.recommended {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      color: #4338ca;
    }
    .badge.enterprise {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
    }
    .badge svg { flex-shrink: 0; }

    .price-block { margin-bottom: 24px; }
    .price-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 4px;
    }
    .price-dollar {
      font-size: 16px;
      font-weight: 500;
      color: #94a3b8;
    }
    .price-value {
      font-size: 60px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .price-period {
      font-size: 14px;
      font-weight: 500;
      color: #94a3b8;
      margin-left: 4px;
    }
    .price-note {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }

    .divider {
      height: 1px;
      background: #f1f5f9;
      margin: 0 32px;
    }

    .features {
      padding: 24px 32px 32px;
      list-style: none;
      margin: 0;
      display: grid;
      gap: 16px;
    }
    .feature-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: default;
    }
    .check-wrap {
      width: 22px; height: 22px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      margin-top: 1px;
      transition: transform 0.2s ease;
    }
    .feature-row:hover .check-wrap { transform: scale(1.2); }
    .card.pro .check-wrap { background: #eef2ff; }
    .card.custom .check-wrap { background: #fef3c7; }
    .card.pro .check-wrap svg { color: #4f46e5; }
    .card.custom .check-wrap svg { color: #d97706; }

    .feature-label {
      font-size: 14px;
      color: #475569;
      line-height: 1.5;
      font-weight: 500;
    }
    .feature-label.highlight {
      font-weight: 700;
      color: #0f172a;
    }

    .card-footer {
      padding: 0 32px 32px;
    }
    .cta-btn {
      width: 100%;
      padding: 15px 24px;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      -webkit-tap-highlight-color: transparent;
    }
    .cta-btn.pro {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
    }
    .cta-btn.pro:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(99, 102, 241, 0.35);
    }
    .cta-btn.pro:active { transform: translateY(0); }

    .cta-btn.custom {
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
      color: #78350f;
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25);
    }
    .cta-btn.custom:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(245, 158, 11, 0.35);
    }
    .cta-btn.custom:active { transform: translateY(0); }

    .cta-btn.current {
      background: #e2e8f0;
      color: #475569;
      box-shadow: inset 0 0 0 1px #cbd5e1;
      cursor: not-allowed;
      pointer-events: none;
    }
    .cta-btn.current:hover {
      transform: none;
      box-shadow: inset 0 0 0 1px #cbd5e1;
    }

    .badge.current-plan {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
    }

    .cta-btn.pulse-ring.pro:hover {
      animation: pulseRingIndigo 1.5s infinite;
    }
    .cta-btn.pulse-ring.custom:hover {
      animation: pulseRingAmber 1.5s infinite;
    }

    .error-box, .loading-box {
      text-align: center;
      padding: 48px;
      color: #64748b;
      font-size: 14px;
    }

    @keyframes shimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes pulseRingIndigo {
      0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4), 0 12px 28px rgba(99, 102, 241, 0.35); }
      70%  { box-shadow: 0 0 0 14px rgba(99, 102, 241, 0), 0 12px 28px rgba(99, 102, 241, 0.35); }
      100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0), 0 12px 28px rgba(99, 102, 241, 0.35); }
    }
    @keyframes pulseRingAmber {
      0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4), 0 12px 28px rgba(245, 158, 11, 0.35); }
      70%  { box-shadow: 0 0 0 14px rgba(245, 158, 11, 0), 0 12px 28px rgba(245, 158, 11, 0.35); }
      100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0), 0 12px 28px rgba(245, 158, 11, 0.35); }
    }

    .card.pro { animation: fadeInUp 0.6s ease-out 0.1s both; }
    .card.custom { animation: fadeInUp 0.6s ease-out 0.2s both; }

    .alert {
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      line-height: 1.45;
    }
    .alert.ok {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .alert.err {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 9999;
      animation: fadeIn 0.15s ease-out both;
    }
    .modal {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      animation: modalIn 0.2s ease-out both;
    }
    .modal-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .modal-title-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px; height: 40px;
      border-radius: 12px;
      background: #fff7ed;
      color: #c2410c;
      font-size: 22px;
      font-weight: 700;
      flex: 0 0 auto;
    }
    .modal-body {
      color: #334155;
      font-size: 14.5px;
      line-height: 1.55;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .modal-body p { margin: 0; }
    .modal-what-next {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 14px;
      padding: 14px 16px 14px 20px;
      color: #7c2d12;
    }
    .modal-what-next > strong {
      display: block;
      font-size: 13.5px;
      color: #9a3412;
      margin-bottom: 6px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .modal-what-next ul {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13.5px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 6px;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: translateY(14px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .pricing-manage {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
    }
    .pricing-manage .cta-btn.current {
      width: 100%;
    }
    .pricing-unsubscribe-link {
      all: unset;
      cursor: pointer;
      color: #be123c;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
      text-decoration-color: rgba(190, 18, 60, 0.55);
      padding: 4px 8px;
      border-radius: 8px;
      transition: color 120ms ease, background-color 120ms ease, text-decoration-color 120ms ease;
    }
    .pricing-unsubscribe-link:hover {
      color: #9f1239;
      background: #fff1f2;
      text-decoration-color: rgba(159, 18, 57, 0.9);
    }
    .pricing-unsubscribe-link:disabled {
      cursor: progress;
      color: #be123c;
      opacity: 0.7;
      text-decoration: none;
    }
    .pricing-unsubscribe-marked {
      font-size: 12.5px;
      line-height: 1.45;
      color: #6b7280;
      text-align: center;
      padding: 4px 8px;
    }
  `],
  template: `
    <div class="pricing-wrap">
      <div class="bg-decor" aria-hidden="true">
        <div class="bg-blob indigo"></div>
        <div class="bg-blob violet"></div>
        <div class="bg-blob amber"></div>
      </div>

      <div class="content-wrap">
        <header class="header-row">
          <div class="pill-free">
            <span class="pill-dot"></span>
            <span class="pill-text">30 Days Free</span>
          </div>
          <h1 class="header-title">Simple, transparent pricing</h1>
          <p class="header-sub">Choose the plan that fits your business. Start with a 30-day free trial &mdash; no credit card required.</p>
        </header>

        <div class="toggle-wrap">
          <span class="toggle-label" [class.active]="interval() === 'monthly'" [class.inactive]="interval() === 'annual'">Monthly</span>
          <button
            type="button"
            class="toggle-btn"
            [class.annual]="interval() === 'annual'"
            (click)="onToggleInterval()"
            aria-label="Toggle billing period"
          >
            <div class="toggle-knob">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </button>
          <div style="display:inline-flex;align-items:center;gap:6px;">
            <span class="toggle-label" [class.active]="interval() === 'annual'" [class.inactive]="interval() === 'monthly'">Annually</span>
            <span class="save-badge" [class.show]="interval() === 'annual'" [class.hidden]="interval() === 'monthly'">Save 20%</span>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-box">Loading pricing plans…</div>
        } @else if (error()) {
          <div class="error-box">
            <p>{{ error() }}</p>
            <p style="margin-top:8px; font-size:12px;">Showing default plans instead.</p>
          </div>
        }

        @if (plans().length > 0) {
          <div class="cards-grid">
            @for (plan of plans(); track plan.tier) {
              <div class="card" [class.pro]="plan.tier === 'PRO'" [class.custom]="plan.tier === 'CUSTOM'">
                <div class="card-topbar"></div>

                <div class="card-body">
                  <div class="card-head">
                    <div class="card-titles">
                      <h2>{{ plan.displayName }}</h2>
                      @if (plan.description) {
                        <p class="card-desc">{{ plan.description }}</p>
                      }
                    </div>
                    @if (plan.badges.length > 0 || isCurrentPlan(plan.tier)) {
                      <div style="display:inline-flex;gap:8px;flex-wrap:wrap;">
                        @if (isCurrentPlan(plan.tier)) {
                          <span class="badge current-plan">Current plan</span>
                        }
                        @for (badge of plan.badges; track badge) {
                          <span class="badge" [class.recommended]="badge === 'Recommended'" [class.enterprise]="badge === 'Enterprise'">
                            @if (badge === 'Recommended') {
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                              </svg>
                            }
                            @if (badge === 'Enterprise') {
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                              </svg>
                            }
                            {{ badge }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  <div class="price-block">
                    <div class="price-row">
                      @if (plan.tier === 'CUSTOM') {
                        <span class="price-value" style="font-size:48px;">Custom</span>
                      } @else {
                        <span class="price-dollar">$</span>
                        <span class="price-value">{{ formatPrice(plan) }}</span>
                        <span class="price-period">/month</span>
                      }
                    </div>
                    @if (plan.tier === 'CUSTOM') {
                      <p class="price-note">{{ plan.billingLabelMonthly }}</p>
                    } @else {
                      <p class="price-note">
                        {{ interval() === 'monthly' ? plan.billingLabelMonthly : plan.billingLabelAnnual }}
                      </p>
                    }
                  </div>
                </div>

                <div class="divider"></div>

                <ul class="features">
                  @for (feat of plan.features; track feat.label) {
                    <li class="feature-row">
                      <span class="check-wrap">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="5 13 9 17 19 7"/>
                        </svg>
                      </span>
                      <span class="feature-label" [class.highlight]="feat.highlight">{{ feat.label }}</span>
                    </li>
                  }
                </ul>

                <div class="card-footer">
                  @if (plan.tier === 'PRO') {
                    @if (isCurrentPlan(plan.tier)) {
                      <div class="pricing-manage">
                        <button type="button" class="cta-btn current" disabled>
                          Current plan
                        </button>
                        @if (!(currentSubscription()?.cancelAtPeriodEnd ?? false)) {
                          <button
                            type="button"
                            class="pricing-unsubscribe-link"
                            [disabled]="pricingUnsubscribing()"
                            (click)="onPricingClickUnsubscribe()">
                            @if (pricingUnsubscribing()) {
                              Canceling…
                            } @else {
                              Unsubscribe
                            }
                          </button>
                        } @else {
                          <span class="pricing-unsubscribe-marked">
                            Subscription will be canceled at the end of your current billing period.
                          </span>
                        }
                        @if (pricingUnsubSuccess()) {
                          <div class="alert ok">
                            <span>{{ pricingUnsubSuccess() }}</span>
                          </div>
                        }
                        @if (pricingUnsubError()) {
                          <div class="alert err">
                            <span>{{ pricingUnsubError() }}</span>
                          </div>
                        }
                      </div>
                    } @else {
                      <a
                        class="cta-btn pro pulse-ring"
                        routerLink="/store/onboarding"
                        [queryParams]="{ plan: 'PRO' }"
                      >
                        Start 30-Day Free Trial
                      </a>
                    }
                  } @else {
                    @if (isCurrentPlan(plan.tier)) {
                      <button type="button" class="cta-btn current" disabled>
                        Current plan
                      </button>
                    } @else {
                      <a
                        class="cta-btn custom pulse-ring"
                        href="mailto:sales@linked-store.example"
                      >
                        Contact Sales
                      </a>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    @if (pricingCancelConfirmVisible()) {
      <div class="modal-overlay" (click)="onPricingCancelUnsubscribe()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-title">
            <div class="modal-title-icon">⚠</div>
            Cancel your Pro Plan subscription?
          </div>
          <div class="modal-body">
            @if (pricingConfirmIsTrial()) {
              <p>You are currently in your <strong>30-day free trial</strong>. Canceling now marks your trial to end on <strong>{{ pricingConfirmPeriodEnd() }}</strong>, with no charge to your payment method.</p>
            } @else {
              <p>This is <strong>not an immediate cancellation</strong>. Your subscription remains fully active and usable until <strong>{{ pricingConfirmPeriodEnd() }}</strong>.</p>
            }
            <div class="modal-what-next">
              <strong>What happens next</strong>
              <ul>
                @if (pricingConfirmIsTrial()) {
                  <li>Free trial continues with full access until <strong>{{ pricingConfirmPeriodEnd() }}</strong></li>
                  <li>No charge will be made to your card on that date</li>
                  <li>Reactivate anytime to start paid access before or after trial ends</li>
                } @else {
                  <li>Access remains fully enabled until <strong>{{ pricingConfirmPeriodEnd() }}</strong> (already paid)</li>
                  <li>You will not be charged again on the next renewal date</li>
                  <li>You can reactivate at any time before that date to continue uninterrupted</li>
                }
              </ul>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="onPricingCancelUnsubscribe()">Keep subscription</button>
            <button type="button" class="btn btn-danger"
                    [disabled]="pricingUnsubscribing()"
                    (click)="onPricingConfirmUnsubscribe()">
              @if (pricingUnsubscribing()) {
                Canceling…
              } @else {
                Yes, cancel at end of period
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PricingPageComponent implements OnInit {
  private readonly subscriptionPlanService = inject(SubscriptionPlanService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly interval = signal<'monthly' | 'annual'>('monthly');
  readonly plans = signal<PricingPlan[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pricingUnsubscribing = signal(false);
  readonly pricingUnsubError = signal<string | null>(null);
  readonly pricingUnsubSuccess = signal<string | null>(null);
  readonly pricingCancelConfirmVisible = signal(false);
  readonly Math = Math;

  readonly currentSubscription = signal<StoreSubscriptionState | null>(null);
  readonly isAnySubscribed = computed<boolean>(() => {
    const s = this.currentSubscription();
    return !!s && !!s.isSubscribed;
  });
  readonly currentPlanTier = computed<string | null>(() => {
    const s = this.currentSubscription();
    if (!s || !s.isSubscribed) return null;
    const pc = (s.planCode ?? '').toString().toUpperCase();
    if (pc === 'PRO' || pc === 'CUSTOM') return pc;
    if (pc.includes('PRO')) return 'PRO';
    if (pc.includes('CUSTOM') || pc.includes('ENTERPRISE')) return 'CUSTOM';
    // Fallback: if subscribed but planCode unknown, default to PRO since that's
    // the only tier with automated Stripe checkout (Custom = contact sales only).
    return 'PRO';
  });
  readonly isCurrentPlan = (tier: PricingPlan['tier'] | string): boolean => {
    const cur = this.currentPlanTier();
    const t = tier?.toString().toUpperCase();
    if (t === 'PRO' && this.isAnySubscribed()) return true;
    if (!cur || !t) return false;
    return cur.toUpperCase() === t;
  };

  readonly pricingConfirmPeriodEnd = computed<string>(() => {
    const s = this.currentSubscription();
    if (!s) return 'your next renewal date';
    if (s.status === 'TRIALING' && s.trialEnd) {
      try { return new Date(s.trialEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { /* fall through */ }
    }
    if (s.currentPeriodEnd) {
      try { return new Date(s.currentPeriodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { /* fall through */ }
    }
    return 'the end of your current period';
  });
  readonly pricingConfirmIsTrial = computed<boolean>(() => !!this.currentSubscription() && this.currentSubscription()!.status === 'TRIALING');

  formatPrice(plan: PricingPlan): number {
    if (this.interval() === 'monthly') {
      return Math.round(plan.monthlyPriceCents / 100);
    }
    return Math.round(plan.annualPriceCents / 12 / 100);
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('interval');
    if (qp === 'monthly' || qp === 'annual') {
      this.interval.set(qp);
    }
    void this.loadPlans();
    void this.loadCurrentSubscription();
  }

  onToggleInterval(): void {
    this.interval.set(this.interval() === 'monthly' ? 'annual' : 'monthly');
  }

  private resolveRequestedStoreId(): string | null {
    const qp = this.route.snapshot.queryParamMap.get('store');
    if (qp) return qp;
    const user = this.authService.currentUser$.getValue();
    return user?.storeId ?? null;
  }

  private async loadCurrentSubscription(): Promise<void> {
    try {
      let sid: string | null = this.resolveRequestedStoreId();
      if (!sid) {
        try {
          const emitted = await firstValueFrom(
            this.authService.currentUser$.pipe(
              filter((u): u is NonNullable<typeof u> => !!u && !!u.storeId),
              timeout(350),
              catchError(() => { throw new Error('no storeId'); })
            )
          );
          sid = emitted.storeId;
        } catch {
          return;
        }
      }
      if (!sid) return;
      const state = await this.subscriptionPlanService.getStoreSubscription(sid);
      if (state && state.isSubscribed) {
        this.currentSubscription.set(state);
      }
    } catch (ignore) {
      // public pricing page, failure is non-fatal — no store info means no disable
    }
  }

  onPricingClickUnsubscribe(): void {
    this.pricingUnsubError.set(null);
    this.pricingUnsubSuccess.set(null);
    this.pricingCancelConfirmVisible.set(true);
  }
  onPricingCancelUnsubscribe(): void {
    this.pricingCancelConfirmVisible.set(false);
  }
  async onPricingConfirmUnsubscribe(): Promise<void> {
    this.pricingUnsubscribing.set(true);
    this.pricingUnsubError.set(null);
    try {
      const sid = this.resolveRequestedStoreId();
      if (!sid) throw new Error('No store context available. Go to your store dashboard to manage subscription.');
      const res = await this.subscriptionPlanService.cancelStoreSubscription(sid);
      if (!res?.canceled) throw new Error(res?.error ?? 'Could not cancel subscription at this time.');
      const nextState = await this.subscriptionPlanService.getStoreSubscription(sid);
      if (nextState) this.currentSubscription.set(nextState);
      this.pricingUnsubSuccess.set('Subscription marked to cancel at the end of your current period. No further charges will be made.');
    } catch (e: any) {
      this.pricingUnsubError.set(String(e?.message ?? 'Unexpected error canceling subscription.'));
    } finally {
      this.pricingUnsubscribing.set(false);
      this.pricingCancelConfirmVisible.set(false);
    }
  }

  private async loadPlans(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.get<PricingPlan[]>('/api/subscription/v1/plans')
      );
      if (Array.isArray(result) && result.length > 0) {
        this.plans.set(result);
      } else {
        this.plans.set(FALLBACK_PLANS);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Unable to load pricing from server.');
      this.plans.set(FALLBACK_PLANS);
    } finally {
      this.loading.set(false);
    }
  }
}
