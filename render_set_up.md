# Linked-Store Frontend — Render Setup Guide (Step by Step)

This guide walks you through deploying the **Angular 18 frontend as a Render Static Site**.

## Design Principles

- **Static Site deployment** (free tier supported). The Angular app is built
  with `npm run build` and the generated `dist/linked-store-frontend/browser/`
  directory is published as static files. **No Docker, no nginx, no reverse
  proxy.**
- **Build-time backend injection.** Because a static site has no reverse
  proxy, the browser cannot use relative `/api` URLs — it must call the
  backend directly. The backend origin is baked into the bundle at build
  time via the `API_BASE_URL` environment variable (set in the Render Static
  Site Environment tab). See [scripts/write-env.js](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/scripts/write-env.js).
- **Portable across hosts.** Public-facing URLs (QR codes, Stripe Connect
  return URLs, email links) use `window.location.origin`, so the same
  bundle works on `dinretail.com`, `*.onrender.com` staging, or any future
  domain.
- **Local dev unchanged.** On localhost the app still uses relative `/api`
  via the Angular dev proxy (`proxy.conf.json` → `127.0.0.1:8080`). Only
  production builds get the absolute backend URL injected.

---

## 0. Prerequisites

1. **Backend deployed & healthy.**
   - Repo: `kintwadi/linked-store-api` on branch `_home_dev`.
   - Backend Render Web Service fully booted, **Health Check → HTTP 200**.
   - Backend public origin for production: `https://vicinity24api.com`.
2. **Backend CORS whitelist includes the frontend origin.**
   - `https://dinretail.com` and `https://www.dinretail.com` must be in the
     backend `SecurityConfig.setAllowedOriginPatterns(...)`. (Already
     configured.)
3. **Frontend repo pushed** with the static-site refactor.
   - Repo: `kintwadi/linked-store-client` on branch `main`.
4. **Render account** and **GitHub connected**.
5. **Custom domains** (production only, optional while validating):
   - Frontend: `dinretail.com`, `www.dinretail.com`

---

## 1. Create the Render Static Site for the frontend

1. Log in to Render dashboard → **New → Static Site**.
2. In **"Connect a repository"**:
   - Pick `kintwadi/linked-store-client` (the frontend repo).
   - Click **Connect**.
3. Fill in the service metadata:

   | Field | Value |
   | --- | --- |
   | **Name** | `dinretail-client` (or any name you like) |
   | **Branch** | `main` |
   | **Root Directory** | *(leave empty)* — repo root contains `package.json`. |
   | **Build Command** | `npm install; npm run build` |
   | **Publish Directory** | `dist/linked-store-frontend/browser` ⚠️ **must include `/browser`** — the Angular `application` builder outputs the SPA here, not at `dist/linked-store-frontend`. |

4. **Do NOT click "Create Static Site" yet** — first set the environment
   variable in §2, then create.

---

## 2. Environment Variables

On the **same page**, scroll down to **Environment Variables** and add the
key below **exactly as written** (no extra quotes in the Render value field).

### 2a. REQUIRED (1 key) — copy/paste exactly one row

| Key | Value for Production | Value for Staging (*.onrender.com) |
| --- | --- | --- |
| **`API_BASE_URL`** | `https://vicinity24api.com` | `https://<your-backend-onrender-host>.onrender.com` |

- `API_BASE_URL` is the **backend REST origin** (no trailing `/api`). The
  Angular app appends `/api` to it at runtime, so the browser calls
  `https://vicinity24api.com/api/...` directly.
- This is a **build-time** variable: it is read by
  [scripts/write-env.js](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/scripts/write-env.js)
  during `npm run build` and written into
  `src/environments/environment.prod.ts`, which is then bundled into the
  JavaScript. **Changing it requires a re-deploy** (a new build).
- If `API_BASE_URL` is empty/unset, the app falls back to relative `/api`
  URLs, which will **fail** on a plain Static Site (there is no reverse
  proxy). Always set it.

> A complete example copy/paste reference is kept locally in
> [render.env](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/render.env)
> (gitignored; never pushed).

---

## 3. Create, deploy, and validate the site

1. Click **Create Static Site**.
2. Render will:
   1. Clone `kintwadi/linked-store-client:main`.
   2. Run `npm install; npm run build`.
   3. The build script runs `node scripts/write-env.js` (reads
      `API_BASE_URL`, writes `environment.prod.ts`), then `ng build
      --configuration=production`.
   4. Publish `dist/linked-store-frontend/browser/` as static files.
3. Watch the **Events → Live Tail**. A healthy build ends with:

   ```
   ✔  Browser application bundle generation complete.
   ✔  Copying assets complete.
   ✔  Index html generation complete.
   ```

   and the status dot turns **green → Live**.

4. Once live:

   - Open `https://dinretail-client.onrender.com/` (or your custom domain).
   - Expect: **HTTP 200** returning the Angular `index.html`, then CSS/JS
     bundles load.
   - Open DevTools → **Network** → filter `Fetch/XHR`. Navigate to the
     login page (`/login`) → submit any credentials.
   - Expect: one request `POST https://vicinity24api.com/api/auth/login`
     (absolute URL, baked in at build time) → HTTP 200 or 401 **with no
     CORS error** (backend `SecurityConfig` whitelists `dinretail.com`,
     `*.onrender.com`, `localhost:*`, RFC1918 ranges).
   - If you see a **CORS error**:
     1. Confirm the backend CORS whitelist contains the exact origin you
        are visiting (e.g. `https://www.dinretail.com`).
     2. Push a backend update if needed, rebuild the backend service.

---

## 4. (Production) Attach custom domains & enable HTTPS

> **Find your site's real onrender.com hostname first.**
> In Render → your frontend static site → top of the page, next to the
> status dot, you'll see a URL like `https://<service-slug>.onrender.com`.
> For the service named `dinretail-client` it is
> **`https://dinretail-client.onrender.com`**. Verify it loads the Vicinity
> SPA before doing DNS.

1. In Render → your frontend static site (`dinretail-client`) → **Settings → Custom Domains**.
2. Add **both** domains (www + apex):
   - `dinretail.com`
   - `www.dinretail.com`
3. Render shows two DNS records to add at your DNS provider. Use the
   **exact values Render gives you**. For the `dinretail-client` site they
   are:

   | Host record | Type | Value |
   | --- | --- | --- |
   | `dinretail.com` (apex) | **ALIAS / ANAME** (preferred) **or A** | `dinretail-client.onrender.com` (or the A-record IP Render shows, currently `216.24.57.1`) |
   | `www.dinretail.com` | **CNAME** | `dinretail-client.onrender.com` |

   ⚠️ The `www` CNAME **must** target `dinretail-client.onrender.com`.
   Pointing it at a different Render service makes Render's edge return a
   plain-text **`Not Found`**.

4. Add both records at your DNS provider. With Cloudflare, keep the proxy
   **orange-cloud ON** (Render supports Cloudflare in front).
5. Back in Render → Custom Domains, wait for both rows to turn
   **`Verified | HTTPS Active`**. If a row stays "Awaiting DNS", wait for
   TTL to expire and click **Verify** again.
6. Test once both are verified:
   - `https://dinretail.com/login` → POST `https://vicinity24api.com/api/auth/login` → no CORS.
   - `https://www.dinretail.com/login` → identical result.

### 4a. How to recognise a "wrong service / custom domain not attached" error

If you visit `https://dinretail.com` or `https://www.dinretail.com` and see
exactly this as **plain text** (HTTP 404, headers contain `cf-ray` and
`rndr-id`):

```
Not Found
```

that is **Render's edge proxy**, not your Angular app, not CORS. It means
the DNS reaches Render but Render cannot find a site that has this host
registered as a custom domain.

Fix checklist:
1. Open the correct frontend static site in Render → **Settings → Custom Domains**.
2. Confirm **both** `dinretail.com` and `www.dinretail.com` are listed and
   show **Verified**. If either is missing, add it.
3. At your DNS provider, confirm the records point at `dinretail-client.onrender.com`.
4. Click **Verify** again and wait for `HTTPS Active`.

---

## 5. (Production) Stripe Connect return & refresh URLs

Once the frontend is live on `https://dinretail.com`, open the Stripe
Dashboard → Connect → Settings and set:

| Stripe field | Value |
| --- | --- |
| **Return URL** | `https://dinretail.com/admin` |
| **Refresh URL** | `https://dinretail.com/admin` |

(If testing on `*.onrender.com` staging, temporarily use the
Render-generated origin instead.)

---

## 6. How to re-deploy after a push to `main`

1. Push code changes to `kintwadi/linked-store-client:main`.
2. Render triggers auto-deploy if enabled. Otherwise:
   - Render dashboard → `dinretail-client` → **Manual Deploy** →
     - **Latest commit** (fast, for code-only changes).
     - **Clear build cache & deploy** (use if you changed `API_BASE_URL`,
       upgraded Node/npm, or see stale build output).
3. Watch the build log until green.

> ⚠️ Because `API_BASE_URL` is baked into the bundle at build time,
> **changing it in the Environment tab requires a new deploy** — the
> running site keeps using the old value until rebuilt.

---

## 7. Local sanity test (before you push to Render)

To simulate the production build locally:

```bash
cd frontend
API_BASE_URL=https://vicinity24api.com npm run build
# (Windows PowerShell:  $env:API_BASE_URL="https://vicinity24api.com"; npm run build)
```

Then serve the output:

```bash
npx http-server dist/linked-store-frontend/browser -p 8081
```

Open `http://localhost:8081` and confirm the login page POSTs to
`https://vicinity24api.com/api/auth/login` (absolute URL) with no CORS
error (localhost is in the backend CORS whitelist).

---

## 8. Troubleshooting quick reference

| Symptom | Cause | Fix |
| --- | --- | --- |
| Root `/` returns plain-text `Not Found` (HTTP 404) | **Publish Directory is wrong.** The Angular `application` builder outputs `index.html` to `dist/linked-store-frontend/browser/`, not `dist/linked-store-frontend/`. | Set Publish Directory to `dist/linked-store-frontend/browser`. |
| Root `/` returns plain-text `Not Found` from Render edge (`rndr-id` header) | Custom domain not attached to this site, or DNS points at the wrong service. | See §4a. |
| All `/api/*` requests fail (404 / connection error) | `API_BASE_URL` not set, or wrong value, or backend down. | Check the Environment tab; confirm backend is healthy; re-deploy. |
| `POST /api/...` → CORS error in DevTools. | Backend `SecurityConfig` whitelist does not contain the visiting origin. | Add the exact origin to backend `setAllowedOriginPatterns`, push `_home_dev`, rebuild backend. |
| Build fails in Render. | Node engine mismatch or broken TypeScript import. | Run `npm ci && npx ng build --configuration=production` locally; fix what fails there, then push. |
| Login works on `dinretail-client.onrender.com` but fails on `dinretail.com` with CORS. | Backend whitelist missing the production origin. | Add `https://dinretail.com` and `https://www.dinretail.com` to backend CORS, rebuild backend. |

---

## 9. Files involved in this deploy

- [package.json](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/package.json) — `build` script runs `node scripts/write-env.js && ng build`.
- [scripts/write-env.js](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/scripts/write-env.js) — reads `API_BASE_URL` from the build environment and generates `src/environments/environment.prod.ts`.
- [src/environments/environment.ts](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/src/environments/environment.ts) — dev environment (`apiBaseUrl: ''` → relative `/api`, uses Angular dev proxy).
- `src/environments/environment.prod.ts` — **auto-generated** at build time (gitignored).
- [angular.json](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/angular.json) — production config uses `fileReplacements` to swap `environment.ts` → `environment.prod.ts`.
- [origins.helper.ts](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/src/app/shared/utils/origins.helper.ts) — `resolveApiBase()` returns `${environment.apiBaseUrl}/api` when `apiBaseUrl` is set; otherwise falls back to relative `/api` (localhost) or LAN `host:8080` (phone testing).
- [render.env](file:///c:/Users/core101/Desktop/autocode/linked_store/frontend/render.env) — LOCAL ONLY copy of the Render key/value list. Gitignored; never pushed.
