# 🛍️ Big Bazar — Next-Gen E-Commerce Storefront & Admin Suite

[![Live Demo](https://img.shields.io/badge/Live_Demo-bigbazarbariarhat.pages.dev-ce112d?style=for-the-badge&logo=cloudflare&logoColor=white)](https://bigbazarbariarhat.pages.dev)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Hono.js](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![TiDB Serverless](https://img.shields.io/badge/TiDB_Serverless-3875FF?style=for-the-badge&logo=mysql&logoColor=white)](https://www.pingcap.com/tidb-serverless/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, high-performance, full-stack e-commerce web application engineered for **Big Bazar Bariarhat**. Built from the ground up with **React 18**, **Vite**, **Hono REST API (Cloudflare Pages Functions)**, and **TiDB Serverless**, delivering sub-second page loads, automated inventory synchronization, real-time analytics, and a seamless bilingual shopping experience.

---

## 🌟 Key Features

### 🛒 Customer Storefront
* **⚡ Ultra-Fast Shopping Experience:** Route-level code splitting via `React.lazy()` & `Suspense`, hardware-accelerated transitions, and debounced search for instant filtering.
* **🌐 Bilingual Support:** Instant toggle between **বাংলা (Bengali)** and **English** with localized labels, currencies, and delivery terms.
* **🎨 Product Variant Engine:** Full support for multi-color and multi-size variants with real-time stock availability, photo galleries, and video previews.
* **📦 Smart Bag & Checkout:**
  - Slide-out Cart Drawer with instantaneous quantity and variant adjustments.
  - Bangladesh-specific automated delivery charge calculation (64 Districts & Mirsarai/Chattogram Upazila logic).
  - Integrated payment options including **Bangla QR**, **bKash Advance**, and **Cash on Delivery (COD)**.
  - Direct Messenger & WhatsApp order generator with pre-formatted product metadata.
* **🔍 Order Tracking:** Public order tracking portal by Phone Number or Order ID with real-time delivery status timeline.
* **🤖 AI Shopping Assistant:** Embedded conversational shopping widget to assist customers with product recommendations and queries.

---

### 🛡️ Admin Dashboard & Operations Suite
* **📊 Live Visitor Analytics:** Low-overhead live visitor telemetry with heartbeat tracking powered by Cloudflare Workers KV and Edge CDN caching.
* **🏷️ Product & Inventory Management:** Multi-image upload, video embeds, serial auto-indexing, pricing, flash sales, and categorized variant stock controls.
* **📋 Order Management Lifecycle:** Full order management workflow (`Pending` ➔ `Confirmed` ➔ `Shipped` ➔ `Delivered` ➔ `Cancelled`).
* **🔄 ACID Transactional Stock Restoration:** Automated stock recovery on order cancellation or deletion with `SELECT ... FOR UPDATE` row locks to prevent race conditions.
* **🎨 Dynamic Site Customizer:** Real-time controls for Hero banners, Wedding collections, Notice tickers, Announcements, and Category taxonomy without code deployments.

---

## 🏗️ Architecture & Performance Engineering

```
┌────────────────────────────────────────────────────────┐
│                   Client Browser                       │
│        (React 18 + Vite + Tailwind + In-Memory Cache)  │
└───────────────────────────┬────────────────────────────┘
                            │
              Edge Network (Cloudflare CDN)
                            │
┌───────────────────────────▼────────────────────────────┐
│          Cloudflare Pages Functions (Hono API)         │
│  ├── Multi-tier Cache (Cloudflare KV + HTTP Headers)   │
│  ├── JWT Authentication & Rate Limiting Engine         │
│  └── ACID Transaction Handler                          │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                TiDB Serverless Database                │
│    (Distributed SQL, MySQL 8.0 Compatible, Row Locks)  │
└────────────────────────────────────────────────────────┘
```

### 🚀 Optimization Highlights
* **Multi-Tier Caching:** Client-side in-memory request deduplication + Cloudflare Workers KV + Edge CDN (`stale-while-revalidate`), reducing database Request Unit (RU) overhead by **>90%**.
* **Database Concurrency:** Row-level locking (`FOR UPDATE`) within ACID transactions ensures reliable inventory decrementing and restoration during flash sales.
* **Security & Sanitization:** Server-side input sanitization, JWT customer & admin authentication, and sanitized error boundaries preventing internal database structure leaks.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router 6, Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend & Serverless** | Cloudflare Pages Functions, Hono.js, JWT, Node.js Compat |
| **Database** | TiDB Serverless (Distributed SQL / MySQL Compatible) |
| **Edge Cache & KV** | Cloudflare Workers KV (`BIGBAZAR_CACHE`), Cloudflare CDN Edge Cache |
| **Media & Storage** | Cloudinary API, Secure URL Validation |
| **Deployment** | Cloudflare Pages CI/CD from GitHub `main` |

---

## 📁 Repository Structure

```
big-bazar-sheet/
├── functions/
│   └── api/
│       ├── [[path]].js          # Hono REST API backend routes & endpoints
│       └── db.js                # TiDB Serverless connection pool
├── src/
│   ├── api/
│   │   └── client.js            # API client with in-memory deduplication & auth
│   ├── components/
│   │   ├── layout/              # Navbar, Footer, StickyBanner, CustomerMenu
│   │   ├── modals/              # ProductModal, DeliveryModal, CategoryModal, etc.
│   │   ├── sliders/             # HeroSlider, CategorySlider, BannerSlider
│   │   └── admin/               # Admin reports, conversations, product tables
│   ├── contexts/                # CartContext, AuthContext, LanguageContext
│   ├── data/                    # bdLocations, categories taxonomy
│   ├── hooks/                   # useDebounce, useLanguage, custom hooks
│   ├── pages/
│   │   ├── Home.jsx             # High-conversion storefront homepage
│   │   ├── Products.jsx         # Search, filter, and collection catalog
│   │   ├── ProductDetails.jsx   # Variant selector & product showcase
│   │   ├── Checkout.jsx         # Multi-step checkout & payment
│   │   ├── AccountPage.jsx      # Customer profile & order history
│   │   ├── Admin.jsx            # Enterprise Admin management dashboard
│   │   └── OrderConfirmation.jsx
│   ├── utils/                   # pricing, analytics, media, security
│   ├── App.jsx                  # Main routing & heartbeat telemetry
│   └── index.css                # Custom styling, GPU utilities & animations
├── wrangler.toml                # Cloudflare Pages & KV namespace binding
└── vite.config.js
```

---

## ⚙️ Local Development Setup

### Prerequisites
* **Node.js**: `v18.0.0` or later
* **Package Manager**: `pnpm` or `npm`
* **Database**: TiDB Serverless cluster credentials

### 1. Clone Repository
```bash
git clone https://github.com/zihad2003/bigbazar-Products-Price-List.git
cd big-bazar-sheet
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# TiDB Serverless Connection
DB_HOST=your-tidb-host.clusters.tidb-cloud.com
DB_USER=your-user.root
DB_PASSWORD=your-password
DB_NAME=bigbazar
DB_PORT=4000

# Security & JWT
JWT_SECRET=your-secure-jwt-secret-key

# Media (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. Initialize Database Schema (One-Time)
Run the automated schema setup script to initialize tables (`admin_users`, `site_settings`, `reviews`, `customers`, `products`, `orders`, `users`, `conversations`, `messages`):
```bash
node scripts/setup_db.js
```

### 5. Run Development Server
```bash
pnpm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚢 Deployment

The project is continuously deployed to **Cloudflare Pages** upon pushing to the `main` branch.

```bash
git add .
git commit -m "feat: enhance storefront performance and inventory management"
git push origin main
```

---

## 📄 License

This project is proprietary and maintained for **Big Bazar Bariarhat**. All rights reserved.
