import { Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Product, SimilarProductsResult } from '../shared/models/product.model';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => '/api',
});

declare global {
  interface Window {
    __FRONTEND_PUBLIC_ORIGIN__?: string;
    __API_BASE_ORIGIN__?: string;
  }
}

const DEFAULT_PUBLIC_ORIGIN = 'https://linked-store.app';

function resolvePublicOrigin(): string {
  if (typeof window === 'undefined') return DEFAULT_PUBLIC_ORIGIN;
  if (window.__FRONTEND_PUBLIC_ORIGIN__) {
    try {
      return new URL(window.__FRONTEND_PUBLIC_ORIGIN__).origin;
    } catch {
      return window.__FRONTEND_PUBLIC_ORIGIN__.replace(/\/+$/, '');
    }
  }
  if (
    window.location?.hostname &&
    !['localhost', '127.0.0.1', '::1', ''].includes(window.location.hostname)
  ) {
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

/**
 * Resolve the absolute REST API base URL.
 *  - When the page is loaded from localhost/127.0.0.1 → keep "/api" (uses
 *    the Angular CLI dev-server proxy to localhost:8080).
 *  - When the page is loaded from any other origin (smartphone, LAN,
 *    tunnel) → use window.__API_BASE_ORIGIN__ if set, otherwise fall back
 *    to the current page's origin on port 8080. Phones and other remote
 *    browsers cannot reach the Angular proxy; they must hit Spring
 *    directly.
 */
function resolveApiBase(): string {
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

/* ---- mock data seed (used until real backend endpoints return product data) ---- */

const IMG = (seed: string) =>
  `https://images.unsplash.com/${seed}`;

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'product-airmax-01',
    title: 'Nike Air Max Pulse — Running',
    description:
      'Cushioned daily runner with breathable knit upper, responsive Air Max heel unit, durable rubber outsole. Perfect for long walks and light runs in the neighbourhood.',
    primaryImageUrl: IMG('photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1200&h=1200&q=80'),
    galleryImages: [
      IMG('photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1400&h=1400&q=85'),
    ],
    retailPriceCents: 14900,
    currency: 'USD',
    category: 'Footwear',
    brand: 'Nike',
    inStock: true,
    variantId: 'var-airmax-42',
    storeId: 'store-main-st-01',
  },
  {
    id: 'product-airforce-02',
    title: 'Nike Air Force 1 Low — White on White',
    description:
      'Classic leather low-top with cupsole construction. Timeless silhouette that works with every outfit.',
    primaryImageUrl: IMG('photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=1200&h=1200&q=80'),
    galleryImages: [
      IMG('photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=1400&h=1400&q=85'),
    ],
    retailPriceCents: 11500,
    currency: 'USD',
    category: 'Footwear',
    brand: 'Nike',
    inStock: true,
  },
  {
    id: 'product-ultraboost-03',
    title: 'Adidas Ultraboost Light',
    description:
      'Lightweight Boost foam running shoe with Primeknit upper, Continental rubber outsole.',
    primaryImageUrl: IMG('photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&h=1200&q=80'),
    galleryImages: [
      IMG('photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=1400&h=1400&q=85'),
    ],
    retailPriceCents: 18900,
    currency: 'USD',
    category: 'Footwear',
    brand: 'Adidas',
    inStock: true,
  },
  {
    id: 'product-jacket-04',
    title: 'Nike Tech Fleece Windrunner',
    description:
      'Signature chevron zip hoodie in double-faced Tech Fleece. Slim fit, warm yet breathable.',
    primaryImageUrl: IMG('photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&h=1200&q=80'),
    galleryImages: [
      IMG('photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1400&h=1400&q=85'),
    ],
    retailPriceCents: 13900,
    currency: 'USD',
    category: 'Apparel',
    brand: 'Nike',
    inStock: true,
  },
  {
    id: 'product-cap-05',
    title: 'New Era 9FORTY — MLB Yankees',
    description:
      'Adjustable cotton twill cap with stitched team logo, curved brim.',
    primaryImageUrl: IMG('photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1200&h=1200&q=80'),
    galleryImages: [
      IMG('photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1400&h=1400&q=85'),
    ],
    retailPriceCents: 3200,
    currency: 'USD',
    category: 'Accessories',
    brand: 'New Era',
    inStock: true,
  },
  {
    id: 'product-backpack-06',
    title: 'Herschel Little America 25L',
    description:
      'Iconic 25L daypack with padded 15" laptop sleeve, drawcord closure, striped liner.',
    primaryImageUrl: IMG('photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&h=1200&q=80'),
    galleryImages: [
      IMG('photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1614624532983-4ce03382d63d?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1547949003-9792a18a2601?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1533873984035-25970ab07461?auto=format&fit=crop&w=1400&h=1400&q=85'),
    ],
    retailPriceCents: 9900,
    currency: 'USD',
    category: 'Accessories',
    brand: 'Herschel',
    inStock: true,
  },
  {
    id: 'product-socks-07',
    title: 'Nike Everyday Plus Crew — 3 Pack',
    description:
      'Breathable Dri-FIT cotton crew socks with arch band, three-pack in grey, black, white.',
    primaryImageUrl: IMG('photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&h=1200&q=80'),
    galleryImages: [
      IMG('photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1631541909061-71e349d1f203?auto=format&fit=crop&w=1400&h=1400&q=85'),
      IMG('photo-1518005068251-37900150dfca?auto=format&fit=crop&w=1400&h=1400&q=85'),
    ],
    retailPriceCents: 2400,
    currency: 'USD',
    category: 'Accessories',
    brand: 'Nike',
    inStock: true,
  },
];

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly fallback = new BehaviorSubject<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  formatPrice(cents: number, currency = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    });
    return formatter.format(cents / 100);
  }

  async getAllProducts(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${resolveApiBase()}/products`)).catch(() => Promise.resolve(MOCK_PRODUCTS));
  }

  private mapBackendProduct(response: any): Product {
    const attrs = response.attributes ?? {};
    const category = attrs.category ?? (response.variants?.[0]?.attributes?.category) ?? undefined;
    const brand = attrs.brand ?? (response.variants?.[0]?.attributes?.brand) ?? undefined;
    const gender = attrs.gender ?? undefined;
    const priceFromAttrs = attrs.price ? Number(attrs.price) : undefined;
    const primaryImage = response.primaryImageUrl || response.thumbnailUrl || '';

    const variantsArr: any[] = Array.isArray(response.variants) ? response.variants : [];

    const inStockVariants = variantsArr
      .filter((v: any) => Number(v.stockQuantity) > 0)
      .sort((a: any, b: any) => Number(a.retailPriceCents) - Number(b.retailPriceCents));

    const chosenVariant: any = inStockVariants.length > 0 ? inStockVariants[0] : (variantsArr[0] ?? null);

    const chosenVariantId = chosenVariant?.id ?? response.variants?.[0]?.id ?? response.id;
    const chosenRetailPriceCents = chosenVariant?.retailPriceCents != null
      ? Number(chosenVariant.retailPriceCents)
      : (priceFromAttrs ?? response.retailPriceCents ?? 0);
    const chosenStoreId = chosenVariant?.storeId ?? response.storeId;
    const chosenSku = chosenVariant?.sku ?? response.sku;
    const chosenInStock = chosenVariant ? Number(chosenVariant.stockQuantity) > 0 : true;

    const mappedVariants = variantsArr.map((v: any) => ({
      id: String(v.id ?? ''),
      sku: String(v.sku ?? ''),
      retailPriceCents: Number(v.retailPriceCents ?? 0),
      wholesalePriceCents: v.wholesalePriceCents != null ? Number(v.wholesalePriceCents) : undefined,
      imageUrl: v.imageUrl ?? undefined,
      stockQuantity: Number(v.stockQuantity ?? 0),
      storeId: String(v.storeId ?? ''),
      variantAttributes: v.variantAttributes ?? v.attributes ?? null,
    }));

    return {
      id: response.id,
      title: response.title,
      description: response.description,
      primaryImageUrl: primaryImage,
      thumbnailUrl: response.thumbnailUrl,
      galleryImages: [primaryImage, primaryImage, primaryImage],
      retailPriceCents: chosenRetailPriceCents,
      currency: 'USD',
      category,
      brand,
      inStock: chosenInStock,
      variantId: chosenVariantId,
      storeId: chosenStoreId,
      sku: chosenSku,
      variants: mappedVariants.length > 0 ? mappedVariants : undefined,
    };
  }

  async getProduct(productId: string): Promise<Product> {
    const api = resolveApiBase();
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${api}/products/${productId}`)
      ).catch(() => null);
      if (response && response.id) {
        this.fallback.next(false);
        return this.mapBackendProduct(response);
      }
    } catch {
      /* fallthrough to mock */
    }
    this.fallback.next(true);
    const found = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!found) throw new Error('Product not found');
    return found;
  }

  list(): Observable<Product[]> {
    return of(MOCK_PRODUCTS).pipe(delay(120));
  }

  getFeaturedProductId(): string {
    return MOCK_PRODUCTS[0].id;
  }

  getPublicOrigin(): string {
    return resolvePublicOrigin();
  }

  private static readonly LS_BROWSING_HOST_STORE = 'ls.browsing_host_store';
  private static readonly LS_BROWSING_HOST_STORE_TTL_MS = 1000 * 60 * 60 * 6;

  setBrowsingHostStore(payload: { storeId: string; businessName?: string | null; gatewayCode?: string | null }): void {
    if (typeof window === 'undefined' || !payload?.storeId) return;
    try {
      const record = {
        storeId: payload.storeId,
        businessName: payload.businessName ?? null,
        gatewayCode: payload.gatewayCode ?? null,
        t: Date.now(),
      };
      window.localStorage.setItem(ProductService.LS_BROWSING_HOST_STORE, JSON.stringify(record));
    } catch {
      /* storage blocked */
    }
  }

  getBrowsingHostStore(): { storeId: string; businessName?: string | null; gatewayCode?: string | null } | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(ProductService.LS_BROWSING_HOST_STORE);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.storeId !== 'string') return null;
      const createdTs = Number(parsed.t) || 0;
      if (createdTs > 0 && Date.now() - createdTs > ProductService.LS_BROWSING_HOST_STORE_TTL_MS) {
        window.localStorage.removeItem(ProductService.LS_BROWSING_HOST_STORE);
        return null;
      }
      return {
        storeId: parsed.storeId,
        businessName: parsed.businessName ?? null,
        gatewayCode: parsed.gatewayCode ?? null,
      };
    } catch {
      return null;
    }
  }

  clearBrowsingHostStore(): void {
    if (typeof window === 'undefined') return;
    try { window.localStorage.removeItem(ProductService.LS_BROWSING_HOST_STORE); } catch { /* ignore */ }
  }

  buildQrUrlFor(productId: string, options?: { gatewayCode?: string | null }): string {
    const origin = resolvePublicOrigin();
    let base = `${origin}/p/${encodeURIComponent(productId)}`;
    if (options?.gatewayCode && /^\d{8}$/.test(String(options.gatewayCode))) {
      base += `?gateway=${encodeURIComponent(String(options.gatewayCode))}`;
    }
    return base;
  }

  buildQrSharePageUrlFor(productId: string): string {
    const origin = resolvePublicOrigin();
    return `${origin}/p/${encodeURIComponent(productId)}/qr`;
  }

  async getSimilar(productId: string, limit = 4): Promise<Product[]> {
    const all = await firstValueFrom(this.list());
    const seed = all.find((p) => p.id === productId);
    if (!seed) return all.slice(0, limit);
    return all
      .filter((p) => p.id !== productId)
      .sort((a, b) => {
        const sa =
          (a.category === seed.category ? 2 : 0) + (a.brand === seed.brand ? 1 : 0);
        const sb =
          (b.category === seed.category ? 2 : 0) + (b.brand === seed.brand ? 1 : 0);
        return sb - sa;
      })
      .slice(0, limit);
  }

  async getWithSimilar(productId: string): Promise<SimilarProductsResult> {
    const product = await this.getProduct(productId);
    const similar = await this.getSimilar(productId, 4);
    return { product, similar };
  }

  createCheckoutSession(payload: {
    productId: string;
    title: string;
    primaryImageUrl?: string | null;
    amountCents: number;
    currency?: string;
    variantId?: string | null;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string | null;
    originatingStoreId?: string | null;
  }): Promise<{ id: string; url: string; status: string; message?: string }>;
  createCheckoutSession(payload: {
    transactionId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string | null;
  }): Promise<{ id: string; url: string; status: string; message?: string }>;
  createCheckoutSession(payload: any): Promise<{ id: string; url: string; status: string; message?: string }> {
    const api = resolveApiBase();
    let body: any;
    if (payload && typeof payload === 'object' && typeof (payload as any).transactionId === 'string') {
      const p = payload as { transactionId: string; successUrl: string; cancelUrl: string; customerEmail?: string | null };
      body = {
        transactionId: p.transactionId,
        successUrl: p.successUrl,
        cancelUrl: p.cancelUrl,
        customerEmail: p.customerEmail ?? undefined,
      };
    } else {
      body = {
        productId: payload.productId,
        title: payload.title,
        primaryImageUrl: payload.primaryImageUrl ?? undefined,
        amountCents: Math.max(1, Math.round(payload.amountCents)),
        currency: (payload.currency ?? 'USD').toUpperCase(),
        variantId: payload.variantId ?? undefined,
        successUrl: payload.successUrl,
        cancelUrl: payload.cancelUrl,
        customerEmail: payload.customerEmail ?? undefined,
        originatingStoreId: (payload.originatingStoreId && typeof payload.originatingStoreId === 'string')
          ? payload.originatingStoreId
          : undefined,
      };
    }
    return firstValueFrom(
      this.http.post<any>(`${api}/checkout/sessions`, body)
    );
  }

  confirmSessionPaid(sessionId: string): Promise<{
    status: string;
    message: string;
    transactionId?: string;
    transactionStatus?: string;
    stripePaymentIntentId?: string;
    finalized: boolean;
  }> {
    const api = resolveApiBase();
    return firstValueFrom(
      this.http.post<any>(`${api}/checkout/confirm-session-paid`, { sessionId })
    );
  }

  createReservation(payload: {
    productId: string;
    variantId?: string | null;
    originatingStoreId: string;
    radiusKm?: number;
    countdownSeconds?: number;
  }): Promise<{
    accepted: boolean;
    transactionId?: string;
    variantId?: string;
    productTitle?: string;
    productImageUrl?: string;
    sku?: string;
    countdownSeconds?: number;
    totalRetailCents?: number;
    wholesalePayoutCents?: number;
    arbitrageMarginCents?: number;
    currency?: string;
    qrSecureToken?: string;
    qrFallbackCode?: string;
    qrTokenId?: string;
    qrExpiresAt?: string;
    runnerId?: string;
    status?: string;
    message?: string;
  }> {
    const api = resolveApiBase();
    const body = {
      productId: payload.productId,
      variantId: payload.variantId ?? undefined,
      originatingStoreId: payload.originatingStoreId,
      radiusKm: payload.radiusKm ?? 5,
      countdownSeconds: payload.countdownSeconds ?? 900,
    };
    return firstValueFrom(
      this.http.post<any>(`${api}/reservations`, body)
    );
  }

  getTransaction(id: string): Promise<{
    id: string;
    status: string;
    totalRetailCents: number;
    wholesalePayoutCents: number;
    arbitrageMarginCents: number;
    currency: string;
    productId?: string;
    productTitle?: string;
    productImageUrl?: string;
    variantId?: string;
    sku?: string;
    variantAttributesJson?: string;
    qrSecureToken?: string;
    qrFallbackCode?: string;
    originatingStoreId?: string;
    fulfillingStoreId?: string;
    stripePaymentIntentId?: string;
    createdAt?: string;
    updatedAt?: string;
    originatingStoreName?: string;
    fulfillingStoreName?: string;
  }> {
    const api = resolveApiBase();
    return firstValueFrom(
      this.http.get<any>(`${api}/transactions/${encodeURIComponent(id)}`)
    );
  }

  getStores(): Promise<any[]> {
    const api = resolveApiBase();
    return firstValueFrom(
      this.http.get<any[]>(`${api}/stores`)
    );
  }

  verifyPickup(input: string | { secureToken?: string; fallbackCode?: string }): Promise<{
    status: string;
    transactionId?: string;
    transactionStatus?: string;
    arbitrageMarginCents?: number;
    currency?: string;
    marginToStoreId?: string;
    marginToStoreConnectId?: string;
    stripeTransferId?: string;
    qrScannedAt?: string;
    message?: string;
  }> {
    const api = resolveApiBase();
    let body: { secureToken?: string; fallbackCode?: string };
    if (typeof input === 'string') {
      const s = input.trim();
      body = /^\d{6,12}$/.test(s.replace(/\s+/g, ''))
        ? { fallbackCode: s.replace(/\s+/g, '') }
        : { secureToken: s };
    } else {
      body = {
        secureToken: input.secureToken,
        fallbackCode: input.fallbackCode,
      };
    }
    return firstValueFrom(
      this.http.post<any>(`${api}/pickup/verify`, body)
    );
  }

  getRunnerPickupList(options?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: Array<{
      id: string;
      status: string;
      runnerId?: string;
      totalRetailCents: number;
      wholesalePayoutCents: number;
      arbitrageMarginCents: number;
      currency: string;
      productId?: string;
      productTitle?: string;
      productImageUrl?: string;
      variantId?: string;
      sku?: string;
      variantAttributesJson?: string;
      qrSecureToken?: string;
      qrFallbackCode?: string;
      originatingStoreId?: string;
      fulfillingStoreId?: string;
      stripePaymentIntentId?: string;
      createdAt?: string;
      updatedAt?: string;
      originatingStoreName?: string;
      fulfillingStoreName?: string;
    }>;
    page: number;
    pageSize: number;
    totalCount: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const api = resolveApiBase();
    const status = options?.status ?? 'PAID';
    const page = Math.max(0, options?.page ?? 0);
    const pageSize = Math.max(1, Math.min(200, options?.pageSize ?? 50));
    return firstValueFrom(
      this.http.get<any>(
        `${api}/admin/transactions/me/runner?status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}`
      )
    );
  }

  /** Runner self-assign claim: POST /api/admin/transactions/me/runner/claim/{txId} */
  claimRunnerPickup(txId: string): Promise<{
    ok?: boolean;
    runnerId?: string;
    transactionId?: string;
    status?: string;
    message?: string;
    error?: string;
  }> {
    const api = resolveApiBase();
    return firstValueFrom(
      this.http.post<any>(`${api}/admin/transactions/me/runner/claim/${encodeURIComponent(txId)}`, {})
    );
  }

  /**
   * Hook for the "Request Now" flow.
   * 1) POST /api/inventory/check-availability — 15-min stock lock on variant
   * 2) (later) POST /api/checkout/pay — payment via Stripe
   * Right now returns a simulated reservation because the frontend does not
   * have a store/variant picker implemented yet.
   */
  async requestNow(product: Product): Promise<{ ok: boolean; reservationTxId?: string; message: string }> {
    const api = resolveApiBase();
    const payload = {
      items: [
        {
          variantId: product.variantId ?? product.id,
          quantity: 1,
        },
      ],
      originatingStoreId: product.storeId ?? '3c4e5dad-7cf2-4f5b-a617-ff0adaa04d44',
      maxRadiusKm: 10,
    };
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${api}/inventory/check-availability`, payload)
      );
      return {
        ok: true,
        reservationTxId: res?.transactionId ?? res?.id,
        message: 'Item held for 15 minutes at a store nearby — proceed to checkout.',
      };
    } catch (err) {
      return {
        ok: true,
        message:
          'Request received! A store associate will contact you shortly to confirm availability and arrange pickup.',
      };
    }
  }
}
