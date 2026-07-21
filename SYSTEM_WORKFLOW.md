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

### 2026-07-22 — Admin Authentication Reset & Local Login Fix
- **Root Cause**: The legacy hash in `admin_users` table did not match standard local login credentials, and a missing `selectedOrder` state hook in `Admin.jsx` threw client-side runtime errors.
- **Fixes Applied**:
  1. Reset `admin@bigbazar.com` password in TiDB Cloud database to `admin`.
  2. Upgraded backend login handler (`functions/api/[[path]].js`) to support both `admin@bigbazar.com` and `admin` identifiers with seamless fallback handling.
  3. Added missing `selectedOrder` state hook declaration in `src/pages/Admin.jsx`.

---

### 2026-07-22 — Hero Banner Cutoff Fix & Selective Edits Benchmarked Showcase Bar
- **Changes Made**:
  1. **Hero Banner Top-Alignment & Aspect Optimization (`src/components/sliders/HeroSlider.jsx` & `src/pages/Home.jsx`)**:
     - Changed image positioning from `object-center` to `object-top md:object-[center_top]`, completely eliminating top banner image cutoff (e.g. heads of people or top text in banners).
     - Adjusted hero container height (`max-h-[62vh] h-[320px] sm:h-[400px] md:h-[460px] lg:h-[500px]`) and centered overlay text vertically (`py-6 md:py-10`) so text and CTA buttons fit cleanly within standard desktop viewports.
  2. **Selective Edits & Premium Collection Showcase Bar (`src/pages/Home.jsx`)**:
     - Reconstructed the plain "আরো পণ্য দেখুন" load-more button into a luxury benchmarked **"প্রিমিয়াম কালেকশন / Selective Edits"** showcase bar.
     - Includes a glowing badge (`Sparkles`), rich Bengali & English subtitles, and an interactive red gradient CTA button (`Explore Full Edits →`).
  3. **Professional Connection Error Messaging (`src/components/ErrorBoundary.jsx`)**:
     - Fixed text copy to clean professional language: *"A temporary connection error occurred. Please try again or refresh the page."*

---

### 2026-07-22 — Admin UI Redesign, Slider Engine Customization, Mobile Color Palette & Contextual Notifications
- **Features & Fixes Added**:
  1. **Hero Slider Customization (`src/components/sliders/HeroSlider.jsx` & `src/pages/Admin.jsx`)**:
     - Added configurable text alignment (`left`, `center`, `right`).
     - Added customizable text color picker & hex code per slide.
     - Added customizable action CTA buttons (`button_text` + `button_link` / `product_id`).
     - Added picture alignment fit options (`cover` vs `contain`).
  2. **Contextual In-Page Notifications & Dark Theme Alert Modal (`src/components/modals/AlertModal.jsx` & `src/pages/Admin.jsx`)**:
     - Upgraded global `AlertModal` to dark glassmorphism styling (`bg-[#121215]/95 border-white/10 text-white`).
     - Added in-page contextual alert banners (`formAlert`) directly inside the Add/Edit form drawer showing exact error details on save failure.
  3. **Manual Sizes Tag System (`src/pages/Admin.jsx`)**:
     - Removed 50 rigid preset buttons.
     - Implemented manual size entry tag input (press Enter/Comma or tap quick presets `S`, `M`, `L`, `XL`, `XXL`, `38`, `40`, `42`, `Free Size`).
  4. **Mobile Color Palette Swatches (`src/utils/colorNames.js` & `src/pages/Admin.jsx`)**:
     - Added `PRESET_SWATCHES` array with 27 retail colors for 1-tap color selection on mobile devices.
     - Enhanced custom color picker with hex inputs and photo attachment for color variants.
  5. **Stock Management System (`src/pages/Admin.jsx`)**:
     - Added total product stock count & in-stock/sold-out status controls.
     - Added stock input per color variant & per size.

---

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
