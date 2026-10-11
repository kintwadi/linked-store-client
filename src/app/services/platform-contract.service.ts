import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiBase } from '../shared/utils/origins.helper';

export type PlatformContractMode = 'FEE_BASED' | 'SUBSCRIPTION' | 'NONE';

export interface PlatformContractPublic {
  mode: PlatformContractMode;
  feePercentage: number;
  isConfigured: boolean;
}

export interface PlatformContractAdmin extends PlatformContractPublic {
  platformPayoutConnectId: string | null;
  updatedAt: string | null;
}

export interface PlatformContractUpdateRequest {
  mode: PlatformContractMode;
  feePercentage: number;
  platformPayoutConnectId: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlatformContractService {
  private readonly http = inject(HttpClient);

  readonly contract = signal<PlatformContractPublic | null>(null);

  get mode(): PlatformContractMode {
    return this.contract()?.mode ?? 'NONE';
  }

  get isFeeBased(): boolean {
    return this.mode === 'FEE_BASED';
  }

  get isSubscriptionBased(): boolean {
    return this.mode === 'SUBSCRIPTION';
  }

  get isConfigured(): boolean {
    return this.contract()?.isConfigured ?? false;
  }

  get feePercentage(): number {
    return this.contract()?.feePercentage ?? 0;
  }

  async fetchPublic(): Promise<PlatformContractPublic> {
    const url = `${resolveApiBase()}/platform-contract/public`;
    const data = await firstValueFrom(
      this.http.get<PlatformContractPublic>(url)
    );
    this.contract.set(data);
    return data;
  }

  async getAdmin(): Promise<PlatformContractAdmin> {
    const url = `${resolveApiBase()}/platform-contract/admin`;
    const data = await firstValueFrom(this.http.get<PlatformContractAdmin>(url));
    this.contract.set({
      mode: data.mode,
      feePercentage: data.feePercentage,
      isConfigured: data.isConfigured,
    });
    return data;
  }

  async updateAdmin(
    payload: PlatformContractUpdateRequest
  ): Promise<PlatformContractAdmin> {
    const url = `${resolveApiBase()}/platform-contract/admin`;
    const saved = await firstValueFrom(
      this.http.put<PlatformContractAdmin>(url, payload)
    );
    this.contract.set({
      mode: saved.mode,
      feePercentage: saved.feePercentage,
      isConfigured: saved.isConfigured,
    });
    return saved;
  }
}
