# BigBazar — System Workflow & Architecture Reference

> Last updated: 2026-04-05

---

## Stack Overview

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| API (prod) | Cloudflare Pages Functions — `functions/api/[[path]].js` (Hono) |
| API (local) | Node.js / `@hono/node-server` — `server/index.js` |
| Database | TiDB Serverless (MySQL-compatible) via `@tidbcloud/serverless` |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Hosting | Cloudflare Pages (`npm run deploy`) |

---

## Critical Environment Variables

These must be set in **Cloudflare Pages Dashboard → Settings → Environment Variables** for production.
For local dev they live in `.env` (loaded by dotenv in `server/index.js`).

| Variable | Used for |
|---|---|
| `DB_HOST` | TiDB cluster host |
| `DB_PORT` | TiDB port (default 4000) |
| `DB_USER` | TiDB username |
| `DB_PASSWORD` | TiDB password |
| `DB_NAME` | Database name (default `test`) |
| `JWT_SECRET` | JWT signing/verification |

> **Note:** wrangler.toml cannot hold secrets for Cloudflare Pages.
> All secrets must be set in the dashboard or via `wrangler secret put KEY`.

---

## Local Development

```bash
# Terminal 1 — API server (port 3001)
npm run api

# Terminal 2 — Vite dev server (port 5173)
npm run dev

# Or both at once:
npm run dev:all
```

`.env.local` must contain `VITE_API_URL=http://localhost:3001` so the
Vite frontend knows to call the local API server instead of the production URL.

---

## API Route Map (`/api/...`)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | — | Customer sign-up |
| POST | `/auth/login` | — | Admin + customer login |
| GET | `/auth/session` | ✓ | Validate token |
| GET | `/products` | — | List products (paginated, filterable) |
| GET | `/products/:id` | — | Single product |
| POST | `/products` | ✓ | Add product |
| PUT | `/products/:id` | ✓ | Update product |
| DELETE | `/products/:id` | ✓ | Delete product |
| GET | `/orders` | ✓ | List orders |
| POST | `/orders` | — | Place order |
| PUT | `/orders/:id` | ✓ | Update order (status, payment, etc.) |
| DELETE | `/orders` | ✓ | Bulk delete by `?status=` (Empty Bin) |
| DELETE | `/orders/:id` | ✓ | Delete single order |
| GET | `/orders/track` | — | Customer order tracking by phone/ID |
| GET | `/reviews` | — | List reviews |
| POST | `/reviews` | — | Submit review |
| GET | `/settings` | — | Read site settings |
| POST | `/settings` | ✓ | Upsert site settings |

---

## Frontend API Client (`src/api/client.js`)

A Supabase-compatible shim that translates `.from().select()/.update()/.insert()` etc.
into REST calls to the Hono API.

- `supabaseClient.js` is a thin re-export: `export { supabase } from './api/client'`
- Both `Admin.jsx` and `Home.jsx` import `supabase` from `supabaseClient.js`
- Auth tokens are stored in `localStorage` as `bb_auth_token`

---

## Bugs Fixed (2026-04-05)

### 1. Admin Login + All CRUD — JWT Secret Mismatch
**Symptom:** Admin login appeared to succeed but all subsequent authenticated
requests (add product, update order, etc.) returned 401.

**Root cause:** The login route signed tokens with `c.env.JWT_SECRET || 'fallback'`
but `requireAuth` verified with `c.env.JWT_SECRET` (no fallback → `undefined` →
`jwt.verify` threw → 401 on every request).

**Fix:** `requireAuth` now uses the same three-way lookup:
```js
const secret = c.env.JWT_SECRET
  || (typeof process !== 'undefined' && process.env.JWT_SECRET)
  || 'fallback';
```
All sign calls use the same pattern.

### 2. bcrypt.compareSync Blocking Event Loop
**Symptom:** Admin login intermittently timed out on Cloudflare (free plan
has a 50 ms CPU budget).

**Fix:** Changed to `await bcrypt.compare()` (async).

### 3. DB Connection Caching — Silent Failure on Cold Start
**Symptom:** After a cold start where env vars weren't injected yet, the broken
connection object got cached; all subsequent requests failed even after env was
correctly configured.

**Fix:** Removed module-level `connection` cache from `db.js`. TiDB serverless
uses HTTP under the hood — `connect()` is cheap and safe to call per request.

### 4. Localhost Can't Reach API
**Symptom:** `npm run dev` frontend couldn't fetch/patch data from the local server.

**Fix:** Added `VITE_API_URL=http://localhost:3001` to `.env.local`.
The Vite dev server now correctly points to the local Hono API server.

### 5. Empty Bin (bulk delete) Had No Endpoint
**Symptom:** Admin "Empty Bin" sent `DELETE /api/orders?status=Deleted` which
returned 404 — no matching route existed.

**Fix:** Added `app.delete('/orders', requireAuth, ...)` that accepts
`?status=...` and deletes orders matching that status.

---

## Product Card — Video/Reel Preview (2026-04-05)

**Before:** Each product card with `video_url` embedded a live Instagram iframe
(`<VideoPlayer>`), loading up to 12 simultaneous iframes — terrible performance
and often blocked by Instagram's embed policy.

**After:** Product cards now show a **static thumbnail + play-badge overlay** when
`video_url` is set. The live iframe (`VideoPlayer`) is only loaded inside the
`ProductModal` when the user clicks "Play Video". The modal already had the
"See Photo / Play Video" toggle — no changes needed there.

---

## Cloudflare Pages Deployment

```bash
npm run build       # Vite build → dist/
npm run deploy      # build + wrangler pages deploy dist
```

The catch-all Pages Function at `functions/api/[[path]].js` handles all `/api/*`
requests. It is exported as `onRequest` (Cloudflare Pages Function convention).
