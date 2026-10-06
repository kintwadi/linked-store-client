#!/bin/sh
set -eu

# ---- Backend API target for BOTH:
#        (a) the nginx reverse proxy (/api, /products, /stream, /stripe)
#        (b) Angular's resolveApiBase() via window.__API_BASE_ORIGIN__ injection
#
# Render PRODUCTION (custom domains live):
#   export API_PROXY_URL="https://vicinity24api.com"
# Render staging (before custom DNS/SSL is ready):
#   export API_PROXY_URL="https://linked-store-api.onrender.com"
# Local Docker against Spring Boot on the host:
#   export API_PROXY_URL="http://host.docker.internal:8080"
# Fallback = production URL so a forgotten env var still points to the
# live branded backend instead of a dead 127.0.0.1:8080 inside the container.
: "${API_PROXY_URL:=https://vicinity24api.com}"
export API_PROXY_URL

# ---- Public frontend origin (for QR codes / email links).
# Mirrors the PROD_FRONTEND_ORIGIN default in origins.helper.ts.
: "${FRONTEND_PUBLIC_ORIGIN:=https://dinretail.com}"
export FRONTEND_PUBLIC_ORIGIN

# ---- Substitute API_PROXY_URL into nginx config (proxy target).
NGINX_TEMPLATE=/etc/nginx/conf.d/default.conf
NGINX_WORKDIR=/etc/nginx/conf.d
envsubst '${API_PROXY_URL}' < "${NGINX_TEMPLATE}" > "${NGINX_WORKDIR}/default.tmp.conf"
mv "${NGINX_WORKDIR}/default.tmp.conf" "${NGINX_TEMPLATE}"

# ---- Inject the same values INTO /usr/share/nginx/html/index.html so the
#      Angular client and the nginx proxy target always agree 1:1.
#      (Origins helper priority #1 picks window.__API_BASE_ORIGIN__ first.)
INDEX=/usr/share/nginx/html/index.html
if [ -f "${INDEX}" ]; then
  # Replace the two __NGINX_* tokens exactly (sed -i requires no in-place
  # backup suffix on busybox sed shipped with nginx:alpine).
  sed -e "s|__NGINX_API_BASE_ORIGIN__|${API_PROXY_URL}|g" \
      -e "s|__NGINX_FRONTEND_PUBLIC_ORIGIN__|${FRONTEND_PUBLIC_ORIGIN}|g" \
      -i "${INDEX}" 2>/dev/null || cp "${INDEX}" "${INDEX}.bak"
fi

echo "[entrypoint] nginx proxy target set: API_PROXY_URL=${API_PROXY_URL}"
echo "[entrypoint] frontend public origin set: FRONTEND_PUBLIC_ORIGIN=${FRONTEND_PUBLIC_ORIGIN}"

exec nginx -g 'daemon off;'
