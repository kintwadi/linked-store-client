# syntax=docker/dockerfile:1.6

# ============================================================
#  FRONTEND (Angular 18) — Multi-Stage Dockerfile
#  Build : Node 20 Alpine + @angular/cli (production build)
#  Run   : nginx:stable-alpine with /api + /products reverse proxy
# ============================================================

# ---------- Stage 1: Angular Prod Build ----------
FROM node:20-alpine AS builder

WORKDIR /src

# --- Node deps layer cache (avoid re-install on src-only changes) ---
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
        npm ci --no-audit --no-fund --loglevel=error; \
    else \
        npm install --no-audit --no-fund --loglevel=error; \
    fi

# --- Source + Angular CLI lives in node_modules (installed above) ---
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY proxy.conf.json ./proxy.conf.json

# --- Production build (hashes + optimisations on; SSR disabled) ---
RUN npx ng build --configuration=production

# ---------- Stage 2: nginx runtime ----------
FROM nginx:1.27-alpine AS runtime

# Render convention + security: run as non-root
RUN addgroup -S -g 1001 appgroup \
 && adduser  -S -u 1001 -G appgroup -h /var/cache/nginx appuser \
 && chown -R appuser:appgroup \
      /usr/share/nginx/html \
      /var/cache/nginx \
      /var/log/nginx \
      /etc/nginx/conf.d \
      /docker-entrypoint.d \
      /tmp

# Gettext provides envsubst — used by entrypoint to inject API proxy URL
RUN apk add --no-cache gettext

# --- Copy the custom Render-aware nginx config + entrypoint + compiled SPA ---
COPY docker/nginx.conf      /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh   /docker-entrypoint.d/99-linked-store.sh
RUN chmod 0755 /docker-entrypoint.d/99-linked-store.sh
COPY --from=builder /src/dist/linked-store-frontend/browser /usr/share/nginx/html

# Document env vars the entrypoint / config consume
ENV API_PROXY_URL="http://127.0.0.1:8080"

EXPOSE 80

USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

# NOTE: the stock nginx image already sources /docker-entrypoint.d/*.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
