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

  triggerOrderLimitBanner(): void {
    this.orderLimitTriggered$.next(true);
  }

  dismissOrderLimitBanner(): void {
    this.orderLimitTriggered$.next(false);
  }
}
