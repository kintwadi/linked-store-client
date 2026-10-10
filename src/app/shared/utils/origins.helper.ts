// =========================================================================
//  origins.helper.ts
//  Shared helpers for resolving:
//    1. API_BASE_ORIGIN — where the backend REST API lives
//       (absolute origin only needed when the Angular dev proxy / nginx
//       reverse proxy cannot reach the backend — see PRIORITY list below)
//    2. FRONTEND_PUBLIC_ORIGIN — the customer-facing URL (for QR codes,
//       email links, return URLs).
//
//  100% PORTABLE DEPLOYMENT (no hardcoded hostnames in code):
//
//  The bundled Angular app is deliberately hostname-agnostic. It can be
//  served from ANY origin — dinretail.com, any custom domain, any
//  *.onrender.com staging hostname, a LAN IP, or localhost — WITHOUT
//  changing a single line of source code or environment in the browser.
//
//  How the backend is reached in each deployment:
//
//    Dev server (ng serve localhost:4200):
//      proxy.conf.json → /api forwarded to http://localhost:8080
//      → helper returns empty-string origin → relative "/api" URL
//
//    Render / Docker / any nginx reverse proxy (PRODUCTION):
//      nginx config proxies /api, /products, /stream, /stripe → backend
//      origin set in API_PROXY_URL container env var (set by operator in
//      Render Environment panel). The browser only ever talks to the
//      SAME ORIGIN it loaded the SPA from. → helper returns "" →
//      relative "/api" URL, perfectly portable across any domain.
//
//    Smartphone / remote browser over a LAN IP (192.168.x, 10.x, 172.16-31.x):
//      The Angular dev server proxy does NOT listen on the public LAN
//      adapter, so a relative /api URL from a phone visiting
//      192.168.1.5:4200 cannot reach localhost dev proxy on the laptop.
//      In this case ONLY we fall back to absolute same-host:8080 origin
//      where the Spring Boot backend listens publicly on 0.0.0.0:8080.
//
//  SOURCE OF TRUTH ORDER (highest priority first):
//    1. Window overrides (window.__API_BASE_ORIGIN__ /
//       __FRONTEND_PUBLIC_ORIGIN__). Kept for future compatibility —
//       any operator that wants to supply absolute origins server-side
//       (via a config endpoint, index.html preprocessing, etc.) can
//       always set these two globals and they win.
//    2. LAN-IP heuristic → absolute host:8080 (dev server proxy unreachable
//       case described above).
//    3. Default (everything else: localhost, www.ANYTHING.com, any
//       *.onrender.com staging, any custom domain, any K8s/Vercel/Cloudflare
//       Pages origin): EMPTY ORIGIN → relative /api path. The reverse
//       proxy / dev proxy is responsible for forwarding to the real
//       backend. This is THE portable behaviour.
// =========================================================================

import { environment } from '../../../environments/environment';

const BUILD_TIME_API_BASE = (environment.apiBaseUrl || '').replace(/\/+$/, '');

declare global {
  interface Window {
    __API_BASE_ORIGIN__?: string;
    __FRONTEND_PUBLIC_ORIGIN__?: string;
  }
}

const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '',
]);

/**
 * True if the page is being served from a developer machine hostname
 * (localhost/loopback) OR from a private LAN adapter IP / VPN host where
 * the Angular dev server proxy cannot be reached by a visiting browser.
 *
 * This function deliberately does NOT reference any production domain
 * names. Any hostname that is not explicitly loopback/LAN-private is
 * treated as "behind a reverse proxy", which is the portable default.
 */
export function isLocalHostname(host: string | undefined | null): boolean {
  if (!host) return true;
  if (LOCAL_HOSTNAMES.has(host)) return true;
  // RFC1918 private IPv4 ranges / Docker bridge / Tailscale ULA etc.
  if (
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    // IPv6 loopback / ULA / Docker IPv6.
    host.startsWith('::') ||
    host.startsWith('fc') ||
    host.startsWith('fd')
  ) {
    return true;
  }
  return false;
}

function normalizeOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.origin.replace(/\/+$/, '');
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

/**
 * Absolute ORIGIN of the backend API (scheme + host, NO path suffix).
 * Callers append "/api" themselves or use resolveApiBaseWithPath().
 *
 * Priority order — fully portable across ANY host the SPA runs on:
 *
 *   1. BUILD-TIME injection (environment.apiBaseUrl, set via the
 *      API_BASE_URL env var during `npm run build`). Used when the app
 *      is deployed as a STATIC SITE with no reverse proxy (e.g. Render
 *      Static Sites, Vercel, Cloudflare Pages) — the browser must call
 *      the backend directly, so the backend origin is baked into the
 *      bundle at build time. If empty, fall through to the rules below.
 *
 *   2. window.__API_BASE_ORIGIN__ override (if set by the operator).
 *
 *   3. LAN / private hostnames (smartphone visiting 192.168.x.y:4200,
 *      VM guest, Tailscale/VPN clients) → same host but port 8080,
 *      because the Angular dev proxy (proxy.conf.json) only listens on
 *      loopback and is unreachable from remote clients.
 *
 *   4. EVERYTHING ELSE (localhost loopback, *.onrender.com staging,
 *      ANY custom domain dinretail.com / anything.example.com / …) →
 *      empty string ("") so browser uses relative "/api" URL, perfectly
 *      portable, relies on Angular dev proxy (localhost) / nginx proxy
 *      (production Render / any reverse proxy) to reach the backend.
 */
export function resolveApiBaseOrigin(): string {
  if (BUILD_TIME_API_BASE) return BUILD_TIME_API_BASE;

  if (typeof window === 'undefined' || !window.location?.hostname) return '';
  const host = window.location.hostname;

  const override = normalizeOrigin(window.__API_BASE_ORIGIN__);
  if (override) return override;

  if (isLocalHostname(host)) {
    if (LOCAL_HOSTNAMES.has(host)) {
      // Local loopback → dev proxy works, use relative URL.
      return '';
    }
    // LAN adapter IP / VPN host → dev proxy is unreachable.
    // Fall back to same host but port 8080 (Spring default).
    return `${window.location.protocol}//${host}:8080`;
  }

  // Default portable behaviour: same-origin reverse proxy.
  return '';
}

/**
 * Full base URL path for backend REST calls — always ends in "/api".
 *
 * Examples (all resolve correctly without any hostname in source code):
 *
 *   ng serve on localhost:4200         → "/api" (dev proxy)
 *   production on ANY custom domain    → "/api" (nginx proxy forwards)
 *   staging on frontend.onrender.com   → "/api" (nginx proxy forwards)
 *   phone on 192.168.1.5:4200          → "http://192.168.1.5:8080/api"
 */
export function resolveApiBase(): string {
  const origin = resolveApiBaseOrigin();
  return origin ? `${origin}/api` : '/api';
}

/**
 * Public reachable origin of the Angular frontend — for QR codes,
 * email magic links, post-Connect-onboarding returns, etc.
 *
 * Priority order (100% portable / no production hostnames in code):
 *
 *   1. window.__FRONTEND_PUBLIC_ORIGIN__ override (if the operator
 *      injects one — guaranteed correct across load-balanced hosts).
 *
 *   2. Any browser environment: window.location.origin. This is the
 *      actual origin the customer typed into their browser address bar
 *      — so it automatically matches dinretail.com, staging.onrender.com,
 *      a LAN IP, a custom vanity domain, etc. without code changes.
 *
 *   3. Pure SSR / Node build without a browser (rare fallback):
 *      empty string so the caller can handle it or throw.
 */
export function resolvePublicOrigin(): string {
  const override = normalizeOrigin(window?.__FRONTEND_PUBLIC_ORIGIN__);
  if (override) return override;

  if (
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string'
  ) {
    return window.location.origin.replace(/\/+$/, '');
  }

  // No browser context (build-time / SSR) — caller must decide fallback.
  return '';
}

/** Same as resolveApiBase() — used by legacy pages that alias the name. */
export function resolveApiBasePublic(): string {
  return resolveApiBase();
}
