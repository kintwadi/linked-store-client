# Linked-Store Frontend — User Guide

> Customer, Store Staff, and Owner-facing screenshots & flows for the
> Angular 18 SPA. Place all your PNG/JPG screenshots in `docs/images/` and
> then overwrite each placeholder path below with the final file name.

---

## Table of Contents

1. [Routes At A Glance](#1-routes-at-a-glance)
2. [Public Pages (Marketing)](#2-public-pages-marketing)
3. [Admin / Owner Dashboard](#3-admin--owner-dashboard)
4. [Store Staff Sign In Flow](#4-store-staff-sign-in-flow)
5. [Products & Inventory](#5-products--inventory)
6. [Pricing / Subscription Management](#6-pricing--subscription-management)
7. [Transactions & Runner Pickup](#7-transactions--runner-pickup)
8. [Returns & Refunds Dashboard](#8-returns--refunds-dashboard)
9. [Docker / Render Build Instructions](#9-docker--render-build-instructions)

---

## 1. Routes At A Glance

All routes are defined in `src/app/app.routes.ts`. Role guards (
`requireStoreAdmin`, `requireAuthenticated`, `requireRole`) kick in as soon as
navigation begins.

| Route | Audience | Purpose |
|---|---|---|
| `/` | Everyone | Marketing / landing page |
| `/pricing` | Prospects / store owners | Subscription tier grid (monthly / yearly toggle) |
| `/contact-sales` | Prospects | Enterprise / CUSTOM-plan outreach |
| `/signup` | Store owners | Owner + first-store onboarding |
| `/login` | Admins / Owners / Staff (legacy) | Universal sign in |
| `/staff-login` | Store team | Role-pill branded sign in for CLERK / RUNNER / STORE_ADMIN / REPRESENTATIVE |
| `/admin` | GLOBAL_ADMIN / OWNER / STORE_ADMIN / STORE_REPRESENTATIVE / CLERK | Administrative dashboard with role-gated tabs |
| `/runner/pickup` | RUNNER only | Runner pickup QR + inspection flow |
| `/share-product/:id` | Public | QR-style deep-link product card with image + price |

![Sitemap](images/frontend-sitemap.png)

---

## 2. Public Pages (Marketing)

- **Home (`/`)** — explains the hyperlocal network, hero CTA to
  `/signup` or `/pricing`.
- **Pricing (`/pricing`)** — Monthly / Yearly toggle, tier feature lists
  with green checkmarks, Stripe Checkout redirects. Proxies to
  `/api/subscriptions/plans` so plan edits in the admin DB are reflected
  instantly.
- **Contact Sales (`/contact-sales`)** — gradient-hero two-column layout
  with reactive form validation; submits to `/api/contact-sales` which
  delivers via SMTP to `MAIL_CONTACT_SALES_TO`.

![Pricing Page](images/pricing-page.png)
![Contact Sales](images/contact-sales-page.png)

---

## 3. Admin / Owner Dashboard

Path: `/admin` — tabs: **Stores**, **Users**, **Transactions**, **Returns**,
**Subscription**, **Plans** (GLOBAL_ADMIN only), **Settings**.

- Top stat cards: Total Stores, Stripe Connected %, Team Members,
  Transactions volume.
- All tabs stay on the same page via Angular Signals; no full reloads.
- Inline success banner appears after saving/uploading (redirections to QR
  pages were removed after workflow UX audit — you stay on the list view).

![Admin Dashboard](images/admin-dashboard.png)

---

## 4. Store Staff Sign In Flow

Clerks / runners log in at **`/staff-login`** — emerald-teal gradient
hero, role pill chips, green→blue gradient submit button. Post-login
redirects:

| Role | Redirected to |
|---|---|
| RUNNER | `/runner/pickup` |
| CLERK / REP / STORE_ADMIN / OWNER / GLOBAL_ADMIN | `/admin` |

Permissions are refreshed on every route change via `PermissionService`
and the `requireStoreAdmin` / `requireRole` guards.

![Staff Sign In](images/staff-login-page.png)

---

## 5. Products & Inventory

Top-level action button **+ Add Product** per store. Inventory tab also
contains a **drag-and-drop upload zone** for bulk JSON / CSV / XML imports
(see Backend User Guide §6.2 for file formats).

After a successful upload the cache is invalidated and a green inline
banner summarises the report (counts for created/updated/skipped).

- Primary action column first (QR code), technical identifiers (SKU) last.
- Role-gated: only STORE_ADMIN / OWNER / GLOBAL_ADMIN can delete products;
  CLERK can create and edit.

![Inventory List](images/inventory-list.png)
![Product Form](images/product-form.png)

---

## 6. Pricing / Subscription Management

- Store non-subscribed state uses a **two-column premium upsell grid** with
  benefit chips + a pricing preview card (glassmorphism, radial glow accent).
- Existing subscribers see the "Subscription" tab inline with upgrade /
  cancel-at-period-end actions, never redirected to a filtered list page.
- Stripe Checkout return URLs are **generated dynamically** from the
  browser `Origin` header so redirects back work after Custom Domain
  changes.

![Subscription Upsell](images/subscription-upsell.png)

---

## 7. Transactions & Runner Pickup

1. Clerk creates a transaction in **Admin → Transactions → New**.
2. Customer pays; `PAYMENT_SUCCESS` → transaction.status = `PAID`.
3. Runner opens `/runner/pickup` and scans the transaction QR code
   (generated at `/api/fulfillment/transactions/{id}/qr`).
4. Scanning is a one-time atomic operation (`scanned_at` set once;
   subsequent scans error out — closed-loop guarantee).

![Runner Pickup](images/runner-pickup.png)

---

## 8. Returns & Refunds Dashboard

Under **Admin → Returns**:

1. Pick a transaction → **Refund**. Choose `FULL` or `PARTIAL` and the
   specific items/quantities.
2. Frontend calls `/api/transactions/:id/refund`, backend records the
   Stripe Refund id in `refunds.stripe_refund_id`.
3. Fulfilling store staff sees the QC inspection card in the Returns tab
   and moves the item through UNDER_INSPECTION → PASSED/REJECTED →
   RESTOCKED.

![Returns Dashboard](images/returns-dashboard.png)

---

## 9. Docker / Render Build Instructions

Frontend is shipped as an Angular 18 production bundle (`npx ng build
--configuration=production`) served by `nginx:1.27-alpine`. The entrypoint
uses `envsubst` to inject the backend URL placeholder `${API_PROXY_URL}`
into the nginx config just before nginx starts.

**Key routes in nginx:**
- `/api/*` → proxied to `${API_PROXY_URL}`
- `/products/*` → proxied (serves uploaded static product images from
  backend bucket)
- `/stream/*` → SSE-friendly (proxy buffering off, 1h read timeout)
- `/stripe/*` → Stripe webhook endpoints
- everything else → Angular SPA fallback (`try_files $uri /index.html`)

### Local build & run

```bash
# build
docker build -t linked-store-frontend frontend

# run with proxy to the backend (replace URL with your API; in Render
# production with custom domains set this to https://vicinity24api.com)
docker run --rm -it -p 8081:80 \
  -e API_PROXY_URL=https://vicinity24api.com \
  linked-store-frontend
```

### Render deploy (Dashboard, 2-separate-repo setup)

Backend and frontend are deployed as **two independent Render Web
Services** plus one Postgres database (no shared Blueprint YAML).

1. Deploy the backend first — it exposes the API at
   `https://vicinity24api.com` after Custom Domain provisioning. (Follow
   the steps in `backend/README.md §9.2`.)
2. Deploy the frontend — Dashboard → **Web Services** → **New Web Service**
   → connect `kintwadi/linked-store-client.git`, branch = `main`.
   Runtime = **Docker**, Dockerfile = `./Dockerfile`, plan = Starter,
   Health Check Path = `/`.
3. Frontend env vars (Environment tab on the service):
   - `API_PROXY_URL=https://vicinity24api.com`
   (Temporary fallback while Custom Domain DNS/SSL is still provisioning:
    paste the backend service's `*.onrender.com` URL instead.)
4. Settings → **Custom Domains**: add `dinretail.com` + `www.dinretail.com`.
   Follow Render's DNS instructions for your host; wait for the green
   "Active → Connected" badge and TLS cert issuance before testing.

Build artefact size ≈ 20 MB (compressed) per deploy.

![Render Deploy Success](images/render-frontend-deploy.png)
