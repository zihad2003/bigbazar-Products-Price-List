# BigBazar — System Workflow & Architecture Reference

> Last updated: 2026-07-22

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

## System & Architecture Summary

BigBazar is an e-commerce platform designed for high conversion sales with real-time site aesthetics and slider management. Key sections include:
- **Admin Dashboard (`src/pages/Admin.jsx`)**: System settings management (Home Slider Engine, Announcement Banners, global configuration), catalog CRUD, order tracking, and media uploads.
- **Home Landing Page (`src/pages/Home.jsx`)**: Hero Slider (`HeroSlider.jsx`), Announcement Banner (`StickyBanner.jsx`), product catalog grid, and checkout modal.
- **Image Processing Engine (`src/utils/imageCompressor.js`)**: Zero-dependency browser-side canvas resizing with multi-stage image decoding (`createImageBitmap` → `FileReader DataURL` → `ObjectURL`) and safety raw file bypass.

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

## Upgrades & Edit History

### 2026-07-22 — Hero Section Banner & Home Slider Engine Upload Fix (Multi-Stage Image Decoder)
- **Problem**: Uploading AI-generated PNGs (e.g. `Gemini_Generated_Image_...png`) or non-standard format files under *System Settings → Global Configuration → Home Slider Engine* triggered an "UPLOAD FAILED: Failed to decode image" error modal.
- **Root Cause**: `compressImage` relied exclusively on `new Image()` with `URL.createObjectURL(file)`. Certain AI PNGs or browser security contexts triggered `img.onerror`, and throwing an unhandled rejection aborted the upload.
- **Changes Made**:
  1. **Multi-Stage Decoder (`src/utils/imageCompressor.js`)**: Implemented a 3-tier fallback decoding mechanism:
     - **Stage 1**: Off-thread native `createImageBitmap(file)` (decodes AI PNGs, WebP, JPEG fast & reliably).
     - **Stage 2**: `FileReader.readAsDataURL(file)` Data URL string loading (bypasses ObjectURL cross-context blocks).
     - **Stage 3**: `URL.createObjectURL(file)` Blob URL loading fallback.
  2. **Resilient Raw File Fallback**: If browser canvas decoders fail, `compressImage` safely returns the raw `File` (if size <= 8MB) so admin uploads never fail.
  3. **Increased Safety Upload Limits (`src/pages/Admin.jsx`)**: Raised upload size safety thresholds from 1.5MB/3MB to 5MB to accommodate high-resolution 4K landing page banners and slider images.

---

### 2026-04-05 — Core Bug Fixes & Optimizations
1. **Admin Login JWT Secret Mismatch**: Standardized `requireAuth` secret lookup to match login signing logic.
2. **bcrypt.compareSync Async Fix**: Changed to `await bcrypt.compare()` to prevent event loop blocking on Cloudflare Pages CPU limits.
3. **TiDB Connection Caching Fix**: Removed module-level DB connection cache from `db.js`.
4. **Local API Proxying**: Configured `VITE_API_URL=http://localhost:3001` in `.env.local`.
5. **Bulk Order Deletion Endpoint**: Added `DELETE /api/orders?status=...` endpoint for Admin Empty Bin.
6. **Product Card Video Preview**: Replaced live Instagram iframes on product list grid with static thumbnails + play button overlays.

---

## Cloudflare Pages Deployment

```bash
npm run build       # Vite build → dist/
npm run deploy      # build + wrangler pages deploy dist
```

The catch-all Pages Function at `functions/api/[[path]].js` handles all `/api/*`
requests. It is exported as `onRequest` (Cloudflare Pages Function convention).
