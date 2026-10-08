# syntax=docker/dockerfile:1.6

# ============================================================
#  FRONTEND (Angular 18) — Multi-Stage Dockerfile
#  Build : Node 20 Alpine + @angular/cli (production build)
#  Run   : nginx:1.27-alpine with /api + /products reverse proxy
#
#  EXPLICIT / PORTABLE DEPLOY (as requested by operator):
#
#    • NO custom entrypoint.sh / shell scripts. ZERO.
#    • Uses ONLY the OFFICIAL nginx docker image built-in
#      "/docker-entrypoint.d/20-envsubst-on-templates.sh" feature
#      (available in every nginx:1.27-alpine image — portable, standard,
#      no code to maintain, no custom shell).
#    • How it works: any file named *.template under
#      /etc/nginx/templates/ is run through `envsubst` and the
#      resulting /etc/nginx/conf.d/*.conf is what nginx actually
#      loads. We ship docker/nginx.conf as the template with
#      $$-escaped nginx-native variables so envsubst only touches
#      the two container env vars below.
#
#  REQUIRED CONTAINER ENV (set in Render Dashboard → Environment):
#
#    1. API_PROXY_URL      — Public origin of the backend REST
#                            service. E.g. https://vicinity24api.com
#                            No trailing slash. nginx proxies /api,
#                            /products, /stream, /stripe → this URL.
#
#  OPTIONAL / INFRASTRUCTURE ENV (always correct on Docker/Render):
#
#    2. NGINX_RESOLVER     — DNS resolver for nginx variable
#                            proxy_pass lookups. Docker/Render/K8s
#                            always = 127.0.0.11 → defaulted here
#                            as ENV NGINX_RESOLVER=127.0.0.11 because
#                            it is an infrastructure constant, NOT
#                            operator configuration. Override only
#                            on bare-metal non-Docker deploys.
#
#  THERE ARE NO BAKED-IN DEFAULTS FOR ANY OPERATOR-LEVEL VALUES.
#  API_PROXY_URL must be set explicitly by the operator or the
#  resulting nginx config will have empty proxy_pass → 502 errors
#  on API calls, which is the intended fail-fast misconfig signal.
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
 && mkdir -p /etc/nginx/templates \
 && chown -R appuser:appgroup \
      /usr/share/nginx/html \
      /var/cache/nginx \
      /var/log/nginx \
      /etc/nginx/conf.d \
      /etc/nginx/templates \
      /docker-entrypoint.d \
      /tmp

# gettext provides envsubst — required by the official nginx image's
# built-in 20-envsubst-on-templates.sh entrypoint step.
RUN apk add --no-cache gettext

# --- Infra constant (never changes on Docker platforms): ---
#     This value is NOT "operator config" and is intentionally NOT
#     set via the Render UI Environment panel by default. Override
#     only when deploying outside Docker.
ENV NGINX_RESOLVER="127.0.0.11"

# --- Standard nginx image template path:
#     /etc/nginx/templates/default.conf.template
#     Official entrypoint → envsubst → /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template

# --- Compiled SPA assets (hashed bundles + index.html).
COPY --from=builder /src/dist/linked-store-frontend/browser /usr/share/nginx/html

EXPOSE 80

USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

# Stock nginx ENTRYPOINT + CMD — 100% official, zero customisation.
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
