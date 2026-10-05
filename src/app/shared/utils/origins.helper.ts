// =========================================================================
//  origins.helper.ts
//  Shared helpers for resolving:
//    1. API_BASE_ORIGIN — where the backend REST API lives
//       (backend = vicinity24api.com in production, localhost:8080 in dev)
//    2. FRONTEND_PUBLIC_ORIGIN — the customer-facing URL (for QR codes,
//       email links, return URLs).
//       (frontend = dinretail.com in production, localhost:4200 in dev)
//
//  This file is the single source of truth — do NOT copy resolveApiBase
//  or resolvePublicOrigin into individual components/pages any more.
// =========================================================================

export const PROD_FRONTEND_HOSTNAME = 'dinretail.com';
export const PROD_FRONTEND_WWW_HOSTNAME = `www.${PROD_FRONTEND_HOSTNAME}`;
export const PROD_BACKEND_ORIGIN = 'https://vicinity24api.com';
export const PROD_FRONTEND_ORIGIN = `https://${PROD_FRONTEND_HOSTNAME}`;

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
 * True if the page is being served from a developer machine or a LAN IP
 * (i.e. NOT the production dinretail.com site).
 */
export function isLocalHostname(host: string | undefined | null): boolean {
  if (!host) return true;
  if (LOCAL_HOSTNAMES.has(host)) return true;
  // RFC1918 private IPv4 ranges / Docker bridge / Tailscale ULA etc.
  if (
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    // Render / fly.io / onrender.com staging subdomains are "not prod dinretail"
    host.endsWith('.onrender.com') ||
    host.endsWith('.trycloudflare.com') ||
    host.endsWith('.ngrok-free.app') ||
    host.endsWith('.ngrok.io')
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
 * Priority order:
 *   1. window.__API_BASE_ORIGIN__ (index.html override, e.g. smartphone LAN)
 *   2. production hostnames → hard-coded PROD_BACKEND_ORIGIN = vicinity24api.com
 *   3. local hostnames → "" (empty) so that relative URLs "/api" work via
 *      the Angular dev proxy OR the nginx Docker proxy in Render.
 *   4. anything else (LAN adapter IPs, VM guest browsers, VPN clients) →
 *      same scheme/host but with port 8080 appended, because the Angular
 *      dev proxy is unreachable from those clients.
 */
export function resolveApiBaseOrigin(): string {
  if (typeof window === 'undefined' || !window.location?.hostname) return '';
  const host = window.location.hostname;

  const override = normalizeOrigin(window.__API_BASE_ORIGIN__);
  if (override) return override;

  if (host === PROD_FRONTEND_HOSTNAME || host === PROD_FRONTEND_WWW_HOSTNAME) {
    return PROD_BACKEND_ORIGIN;
  }

  if (isLocalHostname(host)) {
    return '';
  }

  // Smartphone / remote browser on a LAN adapter IP or any other origin
  // where the Angular dev-server proxy cannot reach. Fall back to same host
  // + port 8080 (the Spring Boot app listens on all interfaces by default).
  return `${window.location.protocol}//${host}:8080`;
}

/**
 * Full base URL path for backend REST calls — always ends in "/api".
 *
 * Examples:
 *   - ng serve on localhost:4200 → "/api" (dev proxy resolves to :8080)
 *   - Render PROD on dinretail.com → "https://vicinity24api.com/api"
 *   - smartphone on 192.168.178.114:4200 → "http://192.168.178.114:8080/api"
 *       (provided window.__API_BASE_ORIGIN__ was not already set in index.html)
 */
export function resolveApiBase(): string {
  const origin = resolveApiBaseOrigin();
  return origin ? `${origin}/api` : '/api';
}

/**
 * Public reachable origin of the Angular frontend — for QR codes,
 * email magic links, post-Connect-onboarding returns, etc.
 *
 * Priority order:
 *   1. window.__FRONTEND_PUBLIC_ORIGIN__ override
 *   2. production hostname → PROD_FRONTEND_ORIGIN
 *   3. any non-local browser → window.location.origin
 *   4. local dev → hard-coded placeholder so QR emails still build.
 */
export function resolvePublicOrigin(): string {
  if (typeof window === 'undefined') return PROD_FRONTEND_ORIGIN;

  const override = normalizeOrigin(window.__FRONTEND_PUBLIC_ORIGIN__);
  if (override) return override;

  const host = window.location.hostname;
  if (host === PROD_FRONTEND_HOSTNAME || host === PROD_FRONTEND_WWW_HOSTNAME) {
    return PROD_FRONTEND_ORIGIN;
  }

  if (window.location?.hostname && !isLocalHostname(host)) {
    return window.location.origin.replace(/\/+$/, '');
  }

  // Last fallback for pure localhost.
  return PROD_FRONTEND_ORIGIN;
}

/** Same as resolveApiBase() — used by legacy pages that alias the name. */
export function resolveApiBasePublic(): string {
  return resolveApiBase();
}
