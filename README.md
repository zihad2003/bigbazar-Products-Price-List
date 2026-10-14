# 🛍️ Big Bazar — E-Commerce Storefront & Admin Suite

[![Live Site](https://img.shields.io/badge/Live-onlinebigbazar.com-ce112d?style=for-the-badge&logo=googlechrome&logoColor=white)](https://onlinebigbazar.com)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Hono.js](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Hostinger](https://img.shields.io/badge/Hostinger-673DE6?style=for-the-badge&logo=hostinger&logoColor=white)](https://www.hostinger.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, high-performance, full-stack e-commerce web application engineered for **Big Bazar Baraiyarhat**. Built with **React 18**, **Vite**, and a **Hono REST API** running on **Node.js**, fully hosted on **Hostinger** with a **Hostinger MySQL** database — delivering fast page loads, automated inventory synchronization, real-time order management, and a seamless bilingual shopping experience.

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

### 🛡️ Admin Dashboard & Operations Suite
* **🏷️ Product & Inventory Management:** Multi-image upload (Cloudinary), video embeds, serial auto-indexing, pricing, flash sales, and categorized variant stock controls.
* **📋 Order Management Lifecycle:** Full order management workflow (`Pending` ➔ `Confirmed` ➔ `Shipped` ➔ `Delivered` ➔ `Cancelled`).
* **🛒 Carts & Checkouts Tracking:** Live view of shopper carts and unfinished checkouts, with one-click **Convert to order** and a converted-orders history.
* **🔄 Transactional Stock Restoration:** Automated stock recovery on order cancellation or deletion with `SELECT ... FOR UPDATE` row locks to prevent race conditions.
* **📊 Reports & Analytics:** Order and sales reporting inside the admin dashboard.
* **🎨 Dynamic Site Customizer:** Real-time controls for Hero banners, Wedding collections, Notice tickers, Announcements, and Category taxonomy without code deployments.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Client Browser                       │
│        (React 18 + Vite + Tailwind + In-Memory Cache)  │
└───────────────────────────┬────────────────────────────┘
                            │ https://onlinebigbazar.com
┌───────────────────────────▼────────────────────────────┐
│              Hostinger — Node.js (server.js)           │
│  ├── Hono REST API (functions/api/[[path]].js)         │
│  ├── JWT Authentication & Rate Limiting                │
│  ├── Transaction Handler (row locks)                   │
│  └── Static frontend from dist/ (Vite build)           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Hostinger MySQL Database                  │
│        (via mysql2 connection pool — db.js)            │
└────────────────────────────────────────────────────────┘
```

* **Media:** Product and banner images are stored on **Cloudinary**.
* **Security:** Server-side input sanitization, JWT customer & admin authentication, rate limiting, and sanitized error responses that never leak internal details.
* **Database module:** All database access goes through `functions/api/db.js` (`getDb(env)`), which maintains a singleton `mysql2` connection pool.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router, Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | Node.js (`server.js`), Hono.js, `@hono/node-server`, JWT, Nodemailer |
| **Database** | Hostinger MySQL (via `mysql2` pool in `functions/api/db.js`) |
| **Media & Storage** | Cloudinary API, Secure URL Validation |
| **Hosting & Deployment** | Hostinger (Node.js app), GitHub `main` as source of truth |

---

## 📁 Repository Structure

```
big-bazar-sheet/
├── server.js                    # Node entry point — serves API + built frontend
├── functions/
│   └── api/
│       ├── [[path]].js          # Hono REST API backend routes & endpoints
│       ├── db.js                # MySQL connection pool (getDb)
│       └── ...                  # jwt, email, assistant, product-assist modules
├── src/
│   ├── api/
│   │   └── client.js            # API client with in-memory deduplication & auth
│   ├── components/
│   │   ├── layout/              # Navbar, Footer, StickyBanner, CustomerMenu
│   │   ├── modals/              # ProductModal, DeliveryModal, AlertModal, etc.
│   │   ├── sliders/             # HeroSlider, CategorySlider, BannerSlider
│   │   └── admin/               # Admin reports, shoppers, conversations
│   ├── contexts/                # CartContext, AuthContext, LanguageContext
│   ├── data/                    # bdLocations, categories taxonomy
│   ├── hooks/                   # useDebounce, useLanguage, custom hooks
│   ├── pages/
│   │   ├── Home.jsx             # High-conversion storefront homepage
│   │   ├── Products.jsx         # Search, filter, and collection catalog
│   │   ├── ProductDetails.jsx   # Variant selector & product showcase
│   │   ├── Checkout.jsx         # Multi-step checkout & payment
│   │   ├── AccountPage.jsx      # Customer profile & order history
│   │   ├── Admin.jsx            # Admin management dashboard
│   │   └── OrderConfirmation.jsx
│   ├── utils/                   # pricing, analytics, media, security
│   ├── App.jsx                  # Main routing
│   └── index.css                # Custom styling & animations
├── scripts/                     # Management, migration & diagnostic scripts
└── vite.config.ts               # Dev server + /api proxy configuration
```

---

## ⚙️ Local Development Setup

### Prerequisites
* **Node.js**: `v18.0.0` or later
* **Package Manager**: `npm`
* **Database**: Hostinger MySQL credentials (remote access must be allowed for your IP)

### 1. Clone Repository
```bash
git clone https://github.com/zihad2003/bigbazar-Products-Price-List.git
cd big-bazar-sheet
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (see `.env.example` for the full list — never commit real values):
```env
# Hostinger MySQL — either one URL:
DATABASE_URL=mysql://user:password@host:3306/dbname
# …or individual variables:
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=

# Security & JWT
JWT_SECRET=your-secure-jwt-secret-key

# Email notifications (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 4. Run Development Servers
```bash
# Terminal 1 — local API server (port 3000, same code that runs on Hostinger)
node server.js

# Terminal 2 — Vite dev server (port 5173)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** In local dev, most `/api` requests are proxied to the live site
> (`https://onlinebigbazar.com`). Routes that are not yet deployed are proxied
> to the local `node server.js` instance — see the `server.proxy` block in
> `vite.config.ts`.

---

## 🚢 Deployment (Hostinger)

Everything runs on **Hostinger**: the Node.js app (`node server.js`) serves both the Hono API and the built frontend, and the MySQL database lives on Hostinger as well.

1. Push changes to GitHub `main`:
   ```bash
   git add <files>
   git commit -m "describe the change"
   git push origin main
   ```
2. **Auto-deploy is OFF** — deploy manually from the Hostinger panel (pull the latest `main`).
3. Restart the Node.js application from the Hostinger panel so the new code loads.
4. Environment variables/secrets live in the `.env` file on the Hostinger server — never in git.

---

## 📄 License

This project is proprietary and maintained for **Big Bazar Baraiyarhat**. All rights reserved.
