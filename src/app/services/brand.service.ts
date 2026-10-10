import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiBase } from '../shared/utils/origins.helper';

const COOKIE_KEY = 'app_brand_name';
const COOKIE_DAYS = 7;
const FALLBACK_NAME = 'DinRetail';

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  readonly displayName = signal<string>(readCookie(COOKIE_KEY) || FALLBACK_NAME);

  constructor(private readonly http: HttpClient) {
    if (!readCookie(COOKIE_KEY)) {
      void this.refresh();
    }
  }

  async refresh(): Promise<void> {
    try {
      const api = resolveApiBase();
      const res: any = await firstValueFrom(this.http.get(`${api}/public/brand`));
      const name: string | undefined = res?.displayName;
      if (name && name.trim()) {
        const trimmed = name.trim();
        this.displayName.set(trimmed);
        writeCookie(COOKIE_KEY, trimmed, COOKIE_DAYS);
      }
    } catch {
    }
  }
}
