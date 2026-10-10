# Linked-Store Frontend — Render Setup Guide (Step by Step)

This guide walks you through deploying the **Angular 18 + official nginx Docker** frontend on Render.com.

## Design Principles (what makes this deploy portable)

- **Zero custom shell scripts** in the repo. No `docker/entrypoint.sh`, no
  custom hacks on top of nginx.
- **100% portable**: the same Docker image works on Render, ECS, K8s,
  fly.io, docker-compose, a random VPS, localhost, `*.onrender.com`
  staging, and the production custom domain `https://dinretail.com` —
  **without recompiling**.
- Relies only on the built-in feature shipped by every
  `nginx:1.27-alpine` image: `/docker-entrypoint.d/20-envsubst-on-templates.sh`.
  Any `*.template` file under `/etc/nginx/templates/` is auto-run
  through `envsubst` and written to `/etc/nginx/conf.d/` **before nginx
  starts**.
- All production hostnames are resolved dynamically in the browser:
  `resolvePublicOrigin()` returns `window.location.origin`, and API
  requests use **relative `/api/*` URLs** that go through the same host
  that served the SPA, then are reverse-proxied by nginx to your backend.
  This means **zero code changes** are ever required to switch domain.

---

## 0. Prerequisites

Before you start, confirm all of the following are ready:

1. **Backend deployed & healthy.**
   - Repo: `kintwadi/linked-store-api` on branch `_home_dev`.
   - Backend Render Web Service must be fully booted with **no errors**
     and **Health Check → HTTP 200** before you deploy the frontend.
   - Backend public origin for production: `https://vicinity24api.com`
     (also reachable at `https://www.vicinity24api.com` once DNS is ready).
2. **Frontend repo pushed** with the portable refactor.
   - Repo: `kintwadi/linked-store-client` on branch `main`.
   - Minimum commit: `cd80b55` or later ("feat(frontend): 100% portable
     deploy - zero custom shell scripts").
3. **Render account** and **GitHub connected**.
4. **Custom domains** (production only, optional while validating):
   - Frontend: `dinretail.com`, `www.dinretail.com`
   - Backend: `vicinity24api.com`, `www.vicinity24api.com`
   - (You can deploy first on the free `*.onrender.com` hostnames and
     add DNS/custom domains later — the portable app pattern will work
     without changes.)

---

## 1. Create the Render Web Service for the frontend

1. Log in to Render dashboard → **New → Web Service**.
2. In **"Connect a repository"**:
   - Pick `kintwadi/linked-store-client` (the frontend repo).
   - Click **Connect**.
3. Fill in the service metadata:

   | Field | Value |
   | --- | --- |
   | **Name** | `linked-store-frontend` |
   | **Region** | Oregon (US West) — must match your Postgres region to keep `linked-store-db` backend ↔ DB RTT low. The frontend itself is static-like, but the proxy latency to the backend still benefits from same-region deploy. |
   | **Branch** | `main` |
   | **Root Directory** | *(leave empty)* — repo root contains the `Dockerfile`. Do **not** set it to `frontend/`; Render auto-detects the Dockerfile at repo root. |
   | **Runtime** | **Docker** (NOT Node, NOT Static Site). The `Dockerfile` at the repo root handles the Angular build + nginx runtime in two stages. |
   | **Build Command** | *(leave empty — Dockerfile performs the build inside its Stage 1 `node` container, before Render runs the runtime image)* |
   | **Start Command** | *(leave empty — stock nginx image uses its own ENTRYPOINT/CMD)* |
   | **Instance Type** | Starter → 0.5 GB RAM is plenty (the runtime is only nginx serving ~1.2 MB of static files + a tiny reverse proxy). Upgrade only if you see OOM. |
   | **Auto-Deploy** | Yes (`git push origin main` → auto rebuild). Turn off if you want manual-only deploys. |

4. **Do NOT click "Create Web Service" yet** — first set the environment variables in §2, then create.

---

## 2. Environment Variables

On the **same page**, scroll down to **Environment Variables** and add the keys below **exactly as written** (do not add extra quotes in Render value fields; Render handles quoting for you, the `"..."` in this file is only shell syntax).

### 2a. REQUIRED (1 key) — copy/paste exactly one row into Render

| Key | Value for Production | Value for Staging (*.onrender.com) |
| --- | --- | --- |
| **`API_PROXY_URL`** | `https://vicinity24api.com` | `https://<your-backend-onrender-host>.onrender.com` |

- `API_PROXY_URL` is the **backend REST origin** (no trailing `/api`). nginx
  in the frontend container reverse-proxies these 4 routes to it:
  - `/api/*`        → `${API_PROXY_URL}/api/*`
  - `/products/*`   → `${API_PROXY_URL}/products/*`
  - `/stream/*`     → `${API_PROXY_URL}/stream/*` (SSE, no buffering, 1 h timeout)
  - `/stripe/*`     → `${API_PROXY_URL}/stripe/*` (webhooks)
- If you forget this key, envsubst substitutes an empty string and every
  `/api` request returns **502 Bad Gateway** — that is the intentional
  fail-fast signal for a misconfigured deploy.

### 2b. INFRASTRUCTURE DEFAULT (do NOT paste into Render UI)

| Key | Default value (set automatically) |
| --- | --- |
| `NGINX_RESOLVER` | `127.0.0.11` |

- This is the **Docker embedded DNS resolver**. It is hard-coded as
  `ENV NGINX_RESOLVER=127.0.0.11` inside the [Dockerfile](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/Dockerfile)
  and is the correct value **inside every Docker environment** (Render,
  docker-compose, K8s, ECS, EKS, Nomad).
- Only override it if you ever run the frontend nginx **outside Docker**
  directly on a bare-metal VPS (a rare scenario); leave it out of Render
  Environment under normal conditions.

### 2c. INFORMATIONAL MIRRORS (optional, never executed by the container)

These two keys are convenient to add **only if you use Render
Environment Groups** and want a single place showing both services'
origins. The frontend container ignores them completely.

| Key | Value (production) | Purpose |
| --- | --- | --- |
| `BACKEND_PUBLIC_ORIGIN` | `https://vicinity24api.com` | Mirror of `API_PROXY_URL` (same value, different name for Env Group readability). |
| `API_BASE_URL` | `https://vicinity24api.com/api` | Backend-side equivalent (if you share an Env Group with the backend service). |

A complete **example `.env` copy/paste reference** is kept locally in
[render.env](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/render.env)
(gitignored; never pushed).

---

## 3. Create, deploy, and validate the service

1. Click **Create Web Service**.
2. Render will:
   1. Clone `kintwadi/linked-store-client:main`.
   2. Run the two-stage `Dockerfile`: Stage 1 `npm ci && npx ng build
      --configuration=production` (this produces `dist/linked-store-frontend/browser`),
      Stage 2 `nginx:1.27-alpine` copies the built bundle and the
      envsubst template [docker/nginx.conf](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/docker/nginx.conf)
      into `/etc/nginx/templates/default.conf.template`.
3. Watch the **Events → Live Tail**. A healthy deploy ends with:

   ```
   ==> Starting service with '/docker-entrypoint.sh nginx -g daemon off;'
   ```

   There is **no custom script output**; all you see is standard nginx.
   The built-in `20-envsubst-on-templates.sh` ran silently in the
   background and produced the final `/etc/nginx/conf.d/default.conf`
   with your `API_PROXY_URL` baked in.

4. Once the status dot turns **green → Live**:

   - Open `https://linked-store-frontend.onrender.com/` (or your custom
     domain if already set).
   - Expect: **HTTP 200** returning the Angular `index.html`, then
     CSS/JS bundles load from the same host with immutable long-cache
     for hashed filenames.
   - Open DevTools → **Network** → filter `Fetch/XHR`. Navigate to the
     login page (`/login`) → submit any credentials.
   - Expect: one request `POST /api/auth/login` sent to **the same
     host** (relative URL) → nginx proxies it to `vicinity24api.com` →
     you receive HTTP 200 or HTTP 401 from the backend **with no CORS
     error** (backend `SecurityConfig` whitelists `dinretail.com`,
     `*.onrender.com`, `localhost:*`, and RFC1918 ranges).
   - If you see **502 Bad Gateway** on the `POST /api/…` call:
     1. Double-check `API_PROXY_URL` spelling in the Render
        Environment tab (no trailing slash, `https://`, exact host).
     2. Confirm the backend origin itself returns HTTP 200 in a direct
        browser tab (i.e. backend service is healthy).
     3. After changing any env var, use **Manual Deploy → Clear build
        cache & deploy** (nginx config changes take effect only after a
        fresh container starts — the template is processed at boot).

---

## 4. (Production) Attach custom domains & enable HTTPS

> **First find your service's real onrender.com hostname.**
> In Render → your frontend service → top of the page, next to the
> status dot, you'll see a URL like `https://<service-slug>.onrender.com`.
> This is the hostname you must point your DNS to. The frontend service
> used in this guide is named so its URL is
> **`https://vicinity-frontend.onrender.com`** (verify it loads the SPA
> with title "Vicinity - AI-Powered Local Marketplace" before doing DNS).
> If you have multiple Render services, make sure you attach the custom
> domains to THIS one — pointing DNS at the wrong service is the #1 cause
> of a plain-text "Not Found" page.

1. In Render → your frontend service (`vicinity-frontend`) → **Settings → Custom Domains**.
2. Add **both** domains (www + apex):
   - `dinretail.com`
   - `www.dinretail.com`
3. Render shows two DNS records to add at your DNS provider
   (Cloudflare / Hostinger / etc.). Use the **exact values Render gives
   you** for this service. For the `vicinity-frontend` service they are:

   | Host record | Type | Value |
   | --- | --- | --- |
   | `dinretail.com` (apex) | **ALIAS / ANAME** (preferred) **or A** | `vicinity-frontend.onrender.com` (or the A-record IP Render shows, currently `216.24.57.1`) |
   | `www.dinretail.com` | **CNAME** | `vicinity-frontend.onrender.com` |

   ⚠️ The `www` CNAME **must** target `vicinity-frontend.onrender.com`.
   Pointing it at a different Render service (e.g. `vicinity-client.onrender.com`)
   makes Render's edge return a plain-text **`Not Found`** for
   `www.dinretail.com` because that host is not registered on the
   service the CNAME resolves to.

4. Add both records at your DNS provider. If using Cloudflare, keep the
   proxy **orange-cloud ON** (Render supports Cloudflare in front; the
   response in this guide was served through Cloudflare as confirmed by
   the `cf-ray` / `server: cloudflare` headers).
5. Back in Render → Custom Domains, wait for both rows to turn
   **`Verified | HTTPS Active`**. If a row stays "Awaiting DNS", wait
   for TTL to expire (5–10 minutes with Cloudflare proxy; up to 1 h on
   other providers) and click **Verify** again.
6. Test once both are verified:
   - `https://dinretail.com/login` → POST `/api/auth/login` → no CORS.
   - `https://www.dinretail.com/login` → identical result.

> **No code change required.** The portable frontend pattern uses
> `window.location.origin` for absolute public URLs (QR codes, Stripe
> Connect return URLs) and relative `/api` for API calls — the same
> container image works on the `onrender.com` staging host AND on the
> production custom domains at the same time.

### 4a. How to recognise a "wrong service / custom domain not attached" error

If you visit `https://dinretail.com` or `https://www.dinretail.com` and
see exactly this:

```
Not Found
```

as **plain text** (no CSS, no browser 404 styling, HTTP status **404**,
response headers contain `server: cloudflare` and a `cf-ray:…` and
`rndr-id` header), that is **Render's edge proxy**, not your nginx, not
your Angular app, not CORS. It means:

- The DNS record reaches Render's network, **but**
- Render cannot find a service that has this host registered as a
  custom domain → Render returns its generic 404.

Fix checklist:
1. Open the correct frontend service in Render (the one whose
   `*.onrender.com` URL loads the Vicinity SPA) →
   **Settings → Custom Domains**.
2. Confirm **both** `dinretail.com` and `www.dinretail.com` are listed
   and show **Verified**. If either is missing, add it.
3. At your DNS provider, confirm the records point at the **correct**
   service hostname:
   - `www.dinretail.com` CNAME → `vicinity-frontend.onrender.com`
     (NOT `vicinity-client.onrender.com` or any other service).
   - `dinretail.com` apex → ALIAS/ANAME to `vicinity-frontend.onrender.com`
     (or A → `216.24.57.1`).
4. After correcting DNS, click **Verify** again in Render and wait for
   `HTTPS Active`.

---

## 5. (Production) Stripe Connect return & refresh URLs

Once the frontend is live on `https://dinretail.com`, open the Stripe
Dashboard → Connect → Settings and set these two values:

| Stripe field | Value |
| --- | --- |
| **Return URL** | `https://dinretail.com/admin` |
| **Refresh URL** | `https://dinretail.com/admin` |

(If you are testing on `*.onrender.com` staging, temporarily use the
Render-generated origin instead; the portable app will detect the
actual host automatically.)

---

## 6. How to re-deploy after a push to `main`

1. Push code changes to `kintwadi/linked-store-client:main`.
2. Render triggers auto-deploy if enabled. Otherwise:
   - Render dashboard → `linked-store-frontend` → **Manual Deploy** →
     pick:
     - **Latest commit** (fast, if only code / envvar-substitution
       template changed).
     - **Clear build cache & deploy** (always safe; use this if Docker
       layers are stale, you upgraded Node/npm, you changed an env var
       that must take effect inside the built bundle, or you see
       mysterious build failures).
3. Watch Live Tail until you see the green status and the familiar
   `Starting service with '/docker-entrypoint.sh nginx -g daemon off;'`
   line.

---

## 7. Local sanity test (before you push to Render)

To simulate the exact same deploy on your own machine, right from the
repo root:

```bash
docker build -t linked-store-frontend frontend
docker run --rm -p 8081:80 \
  -e API_PROXY_URL="https://vicinity24api.com" \
  linked-store-frontend
```

Open `http://localhost:8081` — you see the SPA exactly as Render serves
it, proxying `/api` to the live backend.

---

## 8. Troubleshooting quick reference

| Symptom | Cause | Fix |
| --- | --- | --- |
| All `/api/*` requests → `502 Bad Gateway` | `API_PROXY_URL` not set in Render Environment **or** value has a typo / trailing slash / is unreachable. | Open the Render Environment tab, correct the value, run **Clear build cache & deploy**. |
| `502` only for `/stream/*` (SSE) | Same root cause as above, OR backend is restarting during the 1 h SSE read timeout. | Fix `API_PROXY_URL` first; check backend Live Tail. |
| Login page loads, but `POST /api/auth/login` → CORS error in DevTools. | Backend SecurityConfig whitelist does not contain the actual host you're visiting. Add the exact origin to backend `SecurityConfig.setAllowedOriginPatterns`, push backend `_home_dev`, rebuild backend. The frontend itself never controls CORS policy (it's a backend setting for allowed origins with `credentials: true`). | Update backend CORS list, rebuild backend. |
| Build fails in Render Stage 1 `npm ci` / `ng build`. | Node engine mismatch OR broken import in TypeScript. Run locally `cd frontend && npm ci && npx ng build --configuration=production` — if it fails locally it will also fail on Render. | Fix the TypeScript issue locally, commit, push, re-deploy. |
| Build succeeds but Live Tail shows "nginx: [emerg] invalid number of arguments in "set" directive" | A broken template — `$$` escape mismatch in `docker/nginx.conf`. Run the local docker test in §7. It will fail with the same exact error before you push. | Fix `$$` vs `$` escaping in the template. Only `${API_PROXY_URL}` and `${NGINX_RESOLVER}` use a single `$` in the template. |

---

## 9. Files involved in this deploy

- [Dockerfile](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/Dockerfile) — two-stage build: Node build → nginx runtime + ENV `NGINX_RESOLVER=127.0.0.11`.
- [docker/nginx.conf](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/docker/nginx.conf) — envsubst template. Only `${API_PROXY_URL}` / `${NGINX_RESOLVER}` substituted; everything else is `$$`-escaped for nginx-native variables. Contains proxy rules `/api`, `/products`, `/stream` (SSE, 1 h timeout, no buffering), `/stripe`, SPA fallback `try_files`, gzip, immutable cache for hashed bundles, no-cache `index.html`.
- [origins.helper.ts](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/src/app/shared/utils/origins.helper.ts) — 100% hostname-agnostic helper; no `dinretail.com` / `vicinity24api.com` constants anywhere. Resolves public origin = `window.location.origin`, API base = relative `/api` (LAN IPs are the only absolute path, because the Angular dev proxy only binds `127.0.0.1`).
- [render.env](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/render.env) — LOCAL ONLY `.env` copy of the Render key/value list. Gitignored; never pushed. Serves as the operator's paste/checklist when editing the Render Environment UI.
