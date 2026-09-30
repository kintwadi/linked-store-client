import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export interface PricingPlanFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface PricingPlan {
  tier: 'PRO' | 'CUSTOM';
  displayName: string;
  description?: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  annualDiscountPercent: number;
  billingLabelMonthly: string;
  billingLabelAnnual: string;
  currency: string;
  trialDays: number;
  monthlyOrderLimit?: number | null;
  badges: string[];
  features: PricingPlanFeature[];
}

export interface SubscriptionCheckoutResult {
  type: 'CHECKOUT' | 'CONTACT_SALES' | 'ERROR';
  url?: string;
  sessionId?: string;
  storeId?: string;
  planCode?: string;
  interval?: string;
  message?: string;
  contactSalesEmail?: string;
  pricingPageUrl?: string;
}

export interface StoreSubscriptionState {
  storeId: string;
  isSubscribed: boolean;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'FREE' | 'SUSPENDED' | string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  currentPeriodEnd?: string | null;
  currentPeriodStart?: string | null;
  trialEnd?: string | null;
  provider?: string | null;
  providerSubscriptionId?: string | null;
  planCode?: string | null;
  updatedAt?: string;
  error?: string | null;
}

export interface StoreSubscriptionCancelResult {
  storeId: string;
  canceled: boolean;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionPlanService {
  private readonly http = inject(HttpClient);

  readonly orderLimitTriggered$ = new BehaviorSubject<boolean>(false);

  async getPlans(): Promise<PricingPlan[]> {
    try {
      return await firstValueFrom(
        this.http.get<PricingPlan[]>('/api/subscription/v1/plans')
      );
    } catch {
      throw new Error('Failed to load subscription plans');
    }
  }

  /**
   * Start the real Stripe subscription checkout session for a store,
   * using the already-selected plan (PRO / CUSTOM) and billing interval.
   *
   * Returns:
   *   - type = CHECKOUT   → set window.location.href to result.url
   *   - type = CONTACT_SALES → navigate to /pricing or open contact email
   *   - type = ERROR → message field set, show inline error
   */
  async startSubscriptionCheckout(
    storeId: string,
    planCode: 'PRO' | 'CUSTOM' | string,
    interval: 'monthly' | 'yearly' | 'annual' | string = 'monthly',
    opts?: { successUrl?: string; cancelUrl?: string }
  ): Promise<SubscriptionCheckoutResult> {
    const intervalNormalized =
      (interval || 'monthly').toString().toLowerCase() === 'yearly'
      || (interval || 'monthly').toString().toLowerCase() === 'annual'
        ? 'yearly'
        : 'monthly';
    const origin = this.browserOrigin();
    const body: Record<string, unknown> = {
      storeId,
      planCode: (planCode || 'PRO').toUpperCase(),
      interval: intervalNormalized,
    };
    if (opts?.successUrl) {
      body['successUrl'] = opts.successUrl;
    } else if (origin) {
      body['successUrl'] = origin + '/admin/stores/' + encodeURIComponent(storeId)
        + '/products?subscription=success&store=' + encodeURIComponent(storeId);
    }
    if (opts?.cancelUrl) {
      body['cancelUrl'] = opts.cancelUrl;
    } else if (origin) {
      body['cancelUrl'] = origin + '/admin/stores/' + encodeURIComponent(storeId)
        + '/products?subscription=canceled&store=' + encodeURIComponent(storeId);
    }
    try {
      const res = await firstValueFrom(
        this.http.post<SubscriptionCheckoutResult>(
          '/api/subscription/v1/checkout-session',
          body
        )
      );
      return res || { type: 'ERROR', message: 'Empty response from subscription checkout.' };
    } catch (err: any) {
      const message =
        (typeof err?.error?.message === 'string' ? err.error.message : null)
        ?? (typeof err?.error === 'string' ? err.error : null)
        ?? (typeof err?.message === 'string' ? err.message : null)
        ?? 'Subscription checkout could not be started.';
      return { type: 'ERROR', message, storeId, planCode: planCode as string, interval };
    }
  }

  private browserOrigin(): string {
    if (typeof window !== 'undefined' && window && typeof window.location !== 'undefined' && window.location?.origin) {
      return String(window.location.origin).replace(/\/+$/, '');
    }
    return '';
  }

  triggerOrderLimitBanner(): void {
    this.orderLimitTriggered$.next(true);
  }

  dismissOrderLimitBanner(): void {
    this.orderLimitTriggered$.next(false);
  }

  async getStoreSubscription(storeId: string): Promise<StoreSubscriptionState> {
    const empty: StoreSubscriptionState = {
      storeId: storeId ?? '',
      isSubscribed: false,
      status: 'FREE',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodEnd: null,
      currentPeriodStart: null,
      trialEnd: null,
      provider: null,
      providerSubscriptionId: null,
      planCode: null,
      error: undefined as any,
    } as any;
    if (!storeId) return empty;
    try {
      const res = await firstValueFrom(
        this.http.get<StoreSubscriptionState>(`/api/subscription/v1/store/${storeId}`)
      );
      return res ?? empty;
    } catch (err: any) {
      const errorMsg =
        (typeof err?.error?.message === 'string' ? err.error.message : null)
        ?? (typeof err?.error === 'string' ? err.error : null)
        ?? (typeof err?.message === 'string' ? err.message : null)
        ?? 'Could not load subscription state.';
      return {
        ...empty,
        error: errorMsg,
      } as any;
    }
  }

  async cancelStoreSubscription(storeId: string): Promise<StoreSubscriptionCancelResult> {
    if (!storeId) {
      return { storeId: '', canceled: false, error: 'Store not specified.' };
    }
    try {
      const res = await firstValueFrom(
        this.http.post<StoreSubscriptionCancelResult>(
          `/api/subscription/v1/store/${storeId}/cancel`,
          null
        )
      );
      return res ?? { storeId, canceled: false, error: 'Empty response from server.' };
    } catch (err: any) {
      const error =
        (typeof err?.error?.error === 'string' ? err.error.error : null)
        ?? (typeof err?.error?.message === 'string' ? err.error.message : null)
        ?? (typeof err?.message === 'string' ? err.message : null)
        ?? 'Could not cancel subscription. Please try again or contact support.';
      return { storeId, canceled: false, error };
    }
  }
}
