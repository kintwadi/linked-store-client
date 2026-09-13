import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

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

declare global {
  interface Window {
    __API_BASE_ORIGIN__?: string;
  }
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

  private resolveApiBase(): string {
    if (typeof window === 'undefined' || !window.location?.hostname) return '/api';
    const host = window.location.hostname;
    if (['localhost', '127.0.0.1', '::1', ''].includes(host)) return '/api';
    const override = window.__API_BASE_ORIGIN__;
    if (override) {
      try {
        const u = new URL(override);
        return `${u.origin.replace(/\/+$/, '')}/api`;
      } catch {
        return `${override.replace(/\/+$/, '')}/api`;
      }
    }
    return `${window.location.protocol}//${host}:8080/api`;
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
    if (user?.isGlobalAdmin || user?.role === 'GLOBAL_ADMIN' || user?.role === 'STORE_ADMIN' || user?.role === 'OWNER') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/']);
    }
  }

  resolveApiBasePublic(): string {
    return this.resolveApiBase();
  }
}
