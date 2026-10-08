#!/bin/sh
set -eu

# =========================================================================
#  linked-store-frontend — nginx entrypoint (EXPLICIT / NO MAGIC mode)
#
#  This file has been refactored to remove ALL baked-in defaults.
#  The container will REFUSE TO START unless every REQUIRED env var below
#  is set explicitly by the operator (Render Dashboard → Environment).
#
#  Why? User wants full control: no auto-pick of "vicinity24api.com" or
#  "dinretail.com" from hardcoded source, no onrender.com wildcard guesses,
#  no localhost fallbacks inside a server container. Every value you see
#  in Render logs must come from what the user pasted into Render UI.
#
#  REQUIRED environment variables (must be set in Render Env Group or
#  per-service Environment panel):
#
#    1. API_PROXY_URL
#          Public origin of the backend REST service. Must include scheme
#          (https://) and NO trailing slash.
#          Example: https://vicinity24api.com
#
#    2. FRONTEND_PUBLIC_ORIGIN
#          Public origin customers type in the browser (for QR codes,
#          email return links, Stripe Connect return URLs, etc.). Must
#          include scheme and NO trailing slash.
#          Example: https://dinretail.com
#
#  OPTIONAL environment variables:
#
#    3. NGINX_RESOLVER
#          DNS resolver used inside the nginx container for proxy_pass
#          upstream lookups with variables. Defaults inside the script to
#          127.0.0.11 (Docker embedded DNS) because that is not a "user
#          configuration" — it's a requirement of running nginx + envsubst
#          variables inside proxy_pass, and it is always correct on Docker
#          / Render's alpine-based container. If you run on bare-metal
#          non-Docker you can set it to 8.8.8.8 or your LAN resolver.
# =========================================================================

MISSING=""
if [ -z "${API_PROXY_URL:-}" ];          then MISSING="${MISSING}  - API_PROXY_URL\n";          fi
if [ -z "${FRONTEND_PUBLIC_ORIGIN:-}" ]; then MISSING="${MISSING}  - FRONTEND_PUBLIC_ORIGIN\n"; fi

if [ -n "${MISSING}" ]; then
  echo "============================================================"
  echo "[entrypoint] FATAL — REQUIRED environment variables are MISSING."
  echo "           (Frontend deploy mode = explicit/no-magic.)"
  echo "           Please set the following in Render Dashboard →"
  echo "           linked-store-frontend service → Environment →"
  echo "           Environment Variables / Env Group and then Redeploy."
  echo "============================================================"
  printf "%b" "${MISSING}"
  echo "============================================================"
  echo "Examples:"
  echo "  API_PROXY_URL             = https://vicinity24api.com"
  echo "  FRONTEND_PUBLIC_ORIGIN    = https://dinretail.com"
  echo "Or for Render staging before custom-domain DNS is ready:"
  echo "  API_PROXY_URL             = https://<backend>.onrender.com"
  echo "  FRONTEND_PUBLIC_ORIGIN    = https://<frontend>.onrender.com"
  echo "============================================================"
  exit 64
fi

# Strip any trailing slashes so callers can paste URLs sloppy.
API_PROXY_URL="${API_PROXY_URL%/}"
FRONTEND_PUBLIC_ORIGIN="${FRONTEND_PUBLIC_ORIGIN%/}"
export API_PROXY_URL FRONTEND_PUBLIC_ORIGIN

# Docker embedded DNS resolver for `proxy_pass` with a variable target
# (nginx needs a resolver at runtime when proxy_pass uses $variables;
# Render/Alpine/Docker always exposes internal DNS at 127.0.0.11.)
NGINX_RESOLVER="${NGINX_RESOLVER:-127.0.0.11}"
export NGINX_RESOLVER

# ---- Substitute env vars into nginx config.

NGINX_TEMPLATE=/etc/nginx/conf.d/default.conf
NGINX_WORKDIR=/etc/nginx/conf.d
envsubst '${API_PROXY_URL}:${NGINX_RESOLVER}' < "${NGINX_TEMPLATE}" \
  > "${NGINX_WORKDIR}/default.tmp.conf"
mv "${NGINX_WORKDIR}/default.tmp.conf" "${NGINX_TEMPLATE}"

# ---- Inject the exact same values INTO the compiled Angular index.html
#      so the browser-side origins helper sees the same values the proxy
#      uses. The origins helper picks window.__API_BASE_ORIGIN__ and
#      window.__FRONTEND_PUBLIC_ORIGIN__ at priority #1 when defined, so
#      this completely bypasses any hardcoded hostname guesses.

INDEX=/usr/share/nginx/html/index.html
if [ -f "${INDEX}" ]; then
  sed -e "s|__NGINX_API_BASE_ORIGIN__|${API_PROXY_URL}|g" \
      -e "s|__NGINX_FRONTEND_PUBLIC_ORIGIN__|${FRONTEND_PUBLIC_ORIGIN}|g" \
      -i "${INDEX}" 2>/dev/null || true
fi

# Echo configured values EXACTLY so Render Live Tail is the source of truth
echo "[entrypoint] API_PROXY_URL          = ${API_PROXY_URL}"
echo "[entrypoint] FRONTEND_PUBLIC_ORIGIN = ${FRONTEND_PUBLIC_ORIGIN}"
echo "[entrypoint] NGINX resolver         = ${NGINX_RESOLVER}"

exec nginx -g 'daemon off;'
