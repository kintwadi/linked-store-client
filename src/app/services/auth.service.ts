import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import {
  resolveApiBase,
  resolveApiBasePublic,
  resolvePublicOrigin,
} from '../shared/utils/origins.helper';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  storeId: string | null;
  isGlobalAdmin: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  tokenType: string;
  user: AuthUser;
}

const ACCESS_TOKEN_KEY = 'ls.access_token';
const REFRESH_TOKEN_KEY = 'ls.refresh_token';
const CURRENT_USER_KEY = 'ls.current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser$ = new BehaviorSubject<AuthUser | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
      try {
        this.currentUser$.next(JSON.parse(stored));
      } catch {
        this.clearStorage();
      }
    }
  }

  /** Public helper — delegates to the shared origins helper. */
  resolveApiBasePublic(): string {
    return resolveApiBasePublic();
  }

  /** Public helper — delegates to the shared origins helper. */
  resolvePublicOrigin(): string {
    return resolvePublicOrigin();
  }

  /** Keep as private alias to avoid changing every call site inside this service. */
  private resolveApiBase(): string {
    return resolveApiBase();
  }

  private clearStorage(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  private persistTokens(tokens: TokenPair): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(tokens.user));
    this.currentUser$.next(tokens.user);
  }

  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    businessName: string;
    latitude: number;
    longitude: number;
    logoUrl?: string;
    isStoreAdmin: boolean;
    countryCode?: string;
    currencyCode?: string;
    inviteToken?: string;
  }): Promise<TokenPair> {
    const api = this.resolveApiBase();
    const res = await firstValueFrom(
      this.http.post<TokenPair>(`${api}/auth/register`, payload)
    );
    this.persistTokens(res);
    return res;
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const api = this.resolveApiBase();
    const res = await firstValueFrom(
      this.http.post<TokenPair>(`${api}/auth/login`, { email, password })
    );
    this.persistTokens(res);
    return res;
  }

  async me(): Promise<AuthUser> {
    const api = this.resolveApiBase();
    const res = await firstValueFrom(
      this.http.get<AuthUser>(`${api}/auth/me`)
    );
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(res));
    this.currentUser$.next(res);
    return res;
  }

  async refresh(): Promise<TokenPair> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.clearStorage();
      this.currentUser$.next(null);
      throw new Error('No refresh token available');
    }
    const api = this.resolveApiBase();
    try {
      const res = await firstValueFrom(
        this.http.post<TokenPair>(`${api}/auth/refresh`, { refreshToken })
      );
      this.persistTokens(res);
      return res;
    } catch {
      this.clearStorage();
      this.currentUser$.next(null);
      throw new Error('Refresh token expired or invalid');
    }
  }

  async logout(): Promise<void> {
    const api = this.resolveApiBase();
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await firstValueFrom(
          this.http.post<void>(`${api}/auth/logout`, { refreshToken })
        ).catch(() => void 0);
      }
    } finally {
      this.clearStorage();
      this.currentUser$.next(null);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  redirectAfterLogin(): void {
    const user = this.currentUser$.getValue();
    const role = user?.role;
    if (role === 'RUNNER') {
      void this.router.navigate(['/runner', 'pickup']);
      return;
    }
    if (
      user?.isGlobalAdmin ||
      role === 'GLOBAL_ADMIN' ||
      role === 'STORE_ADMIN' ||
      role === 'OWNER' ||
      role === 'STORE_REPRESENTATIVE' ||
      role === 'CLERK'
    ) {
      void this.router.navigate(['/admin']);
      return;
    }
    void this.router.navigate(['/']);
  }
}
