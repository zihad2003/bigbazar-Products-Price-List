import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { FAQ_KB, DELIVERY_AREAS, normalizeQuery, matchFAQ, detectLanguage } from './assistant-kb.js';

// Simple in-memory store for rate limiting (at Edge level per isolate)
const rateLimitStore = new Map();
let lastCleanup = Date.now();

const checkRateLimit = (ip, endpoint, limit, windowMs) => {
  const now = Date.now();
  if (now - lastCleanup > 300000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) rateLimitStore.delete(k);
    }
    lastCleanup = now;
  }

  const key = `${ip}:${endpoint}`;
  const record = rateLimitStore.get(key);

  if (!record) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
};

// ── Part 4: Cloudflare KV Cache & Rate-Limit Helpers ──
async function kvGet(c, key) {
  try {
    const kv = c.env?.BIGBAZAR_CACHE;
    if (!kv) return null;
    const val = await kv.get(key, { type: 'json' });
    return val;
  } catch (_) {
    return null;
  }
}

async function kvSet(c, key, value, ttlSeconds = 60) {
  try {
    const kv = c.env?.BIGBAZAR_CACHE;
    if (!kv) return;
    await kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttlSeconds) });
  } catch (_) {}
}

async function kvDelete(c, keyPrefix) {
  try {
    const kv = c.env?.BIGBAZAR_CACHE;
    if (!kv) return;
    if (kv.delete) {
      await kv.delete(keyPrefix);
    }
    // Also try prefix list if available
    if (kv.list) {
      const list = await kv.list({ prefix: keyPrefix });
      for (const k of list.keys || []) {
        await kv.delete(k.name);
      }
    }
  } catch (_) {}
}

async function checkRateLimitKV(c, endpoint, limit = 10, windowMs = 60000) {
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  const kv = c.env?.BIGBAZAR_CACHE;
  if (!kv) {
    return checkRateLimit(ip, endpoint, limit, windowMs);
  }
  try {
    const key = `rl:${ip}:${endpoint}`;
    const current = await kv.get(key);
    const count = current ? parseInt(current) : 0;
    if (count >= limit) return false;
    await kv.put(key, String(count + 1), { expirationTtl: Math.ceil(windowMs / 1000) });
    return true;
  } catch (_) {
    return checkRateLimit(ip, endpoint, limit, windowMs);
  }
}

// Cloudflare Serverless API
const app = new Hono().basePath('/api');

// Global Error Handler for Debugging
app.onError((err, c) => {
  // Log details server-side only
  console.error(err);
  console.error('Environment check:', {
    has_db_host: !!c.env.DB_HOST,
    has_db_user: !!c.env.DB_USER,
    has_db_pass: !!c.env.DB_PASSWORD,
    has_db_name: !!c.env.DB_NAME,
    has_db_port: !!c.env.DB_PORT,
    has_jwt: !!c.env.JWT_SECRET
  });

  return c.json({ 
    error: 'Internal Server Error'
  }, 500);
});

/**
 * Logic previously using local getConn now uses import { getDb } from './db.js'
 */

// ============================================
// ============================================
// Auth Logic
// ============================================

// ============================================
// Middleware
// ============================================
app.use('*', async (c, next) => {
  const origin = c.req.header('origin');
  const isAllowed = !origin || 
                   origin.includes('localhost') || 
                   origin === 'https://bigbazarbariarhat.pages.dev' || 
                   origin.endsWith('.bigbazarbariarhat.pages.dev') ||
                   origin === 'https://bigbazarbaraiyarhat.pages.dev' || 
                   origin.endsWith('.bigbazarbaraiyarhat.pages.dev');
  
  if (isAllowed) {
    return cors({
      origin: origin || '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })(c, next);
  }
  await next();
});

// Auth Middleware
const getJwtSecret = (c) => {
  const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' && process.env?.JWT_SECRET);
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return secret;
};

const requireAuth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'No token provided' }, 401);
  try {
    const secret = getJwtSecret(c);
    c.set('user', jwt.verify(token, secret));
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

const requireAdmin = async (c, next) => {
  const user = c.get('user');
  if (!user || user.type !== 'admin') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }
  await next();
};

/**
 * Customer auth middleware — verifies JWT with type='customer'.
 * Attaches user info to context but does NOT require admin role.
 */
const requireCustomerAuth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Authentication required' }, 401);
  try {
    const secret = getJwtSecret(c);
    const decoded = jwt.verify(token, secret);
    if (decoded.type !== 'customer') return c.json({ error: 'Customer auth required' }, 403);
    c.set('customer', decoded);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

/**
 * Optional customer auth — attaches user info if present, but doesn't block.
 * Used on routes like POST /orders where login is optional.
 */
const optionalCustomerAuth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const secret = getJwtSecret(c);
      const decoded = jwt.verify(token, secret);
      if (decoded.type === 'customer') {
        c.set('customer', decoded);
      }
    } catch (_) { /* Ignore invalid tokens for optional auth */ }
  }
  await next();
};

// Health check endpoint
app.get('/health', async (c) => {
  try {
    const conn = getDb(c.env);
    const r = await conn.execute('SELECT 1 as ok');
    return c.json({ status: 'ok', db: !!r[0] });
  } catch (err) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

// ============================================
// IMAGE CDN ENDPOINT — serves product images from KV cache
// ============================================
app.get('/img/:id', async (c) => {
  const id = c.req.param('id');
  const kv = c.env?.BIGBAZAR_CACHE;

  // 1. Try KV binary cache first (sub-50ms instant response)
  if (kv) {
    try {
      const cached = await kv.get(`img:${id}`, { type: 'arrayBuffer' });
      if (cached) {
        return new Response(cached, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'max-age=86400',
            'Cloudflare-CDN-Cache-Control': 'max-age=86400',
          }
        });
      }
    } catch (_) {}
  }

  // 2. Read from DB, convert base64 to binary, and cache in KV
  try {
    const conn = getDb(c.env);
    const rows = await conn.execute('SELECT image_url FROM products WHERE id = ?', [id]);
    if (!rows[0]?.image_url) return c.json({ error: 'Image not found' }, 404);

    const base64Str = rows[0].image_url;

    // If it's a URL (not base64), redirect
    if (!base64Str.startsWith('data:')) {
      return c.redirect(base64Str, 302);
    }

    // Extract base64 data
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return c.json({ error: 'Invalid image format' }, 400);

    const contentType = match[1];
    const raw = match[2];
    const binaryStr = atob(raw);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Cache binary in KV for 30 days
    if (kv) {
      try {
        await kv.put(`img:${id}`, bytes.buffer, { expirationTtl: 2592000 });
      } catch (_) {}
    }

    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'max-age=86400',
        'Cloudflare-CDN-Cache-Control': 'max-age=86400',
      }
    });
  } catch (err) {
    return c.json({ error: 'Failed to load image' }, 500);
  }
});

// ============================================
// AUTH ROUTES
// ============================================

app.post('/auth/register', async (c) => {
  if (!(await checkRateLimitKV(c, 'register', 3, 60000))) {
    return c.json({ error: 'Too many registration attempts. Please try again after a minute.' }, 429);
  }

  const { name, email, mobile, password } = await c.req.json();
  if (!mobile || !password) return c.json({ error: 'Mobile and Password are required' }, 400);

  const conn = getDb(c.env);
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);

  try {
    await conn.execute(
      'INSERT INTO customers (id, name, email, mobile, password_hash) VALUES (?, ?, ?, ?, ?)',
      [id, name || null, email || null, mobile, hash]
    );

    const regSecret = getJwtSecret(c);
    const token = jwt.sign({ id, mobile, type: 'customer' }, regSecret, { expiresIn: '30d' });
    return c.json({
      session: { access_token: token, user: { id, name, email, mobile } },
      user: { id, name, email, mobile }
    });
  } catch (err) {
    if (err.message.includes('Duplicate entry')) return c.json({ error: 'Email or Mobile already exists' }, 400);
    return c.json({ error: err.message }, 500);
  }
});

app.post('/auth/login', async (c) => {
  if (!(await checkRateLimitKV(c, 'login', 5, 60000))) {
    return c.json({ error: 'Too many login attempts. Please try again after a minute.' }, 429);
  }

  const { email, mobile, password } = await c.req.json();
  const identifier = email || mobile;
  if (!identifier || !password) return c.json({ error: 'Identifier and Password are required' }, 400);

  const conn = getDb(c.env);
  
  // Resolve JWT secret once — same source used for both sign and verify
  const jwtSecret = getJwtSecret(c);

  // Check Admin
  const adminEmail = (identifier === 'admin' || identifier === 'admin@bigbazar.com') ? 'admin@bigbazar.com' : identifier;
  const admins = await conn.execute('SELECT * FROM admin_users WHERE email = ? OR email = ?', [adminEmail, identifier]);
  if (admins.length > 0) {
    const user = admins[0];
    const cleanInput = password.trim();
    const cleanHash = (user.password_hash || '').trim();

    const valid = await bcrypt.compare(cleanInput, cleanHash);
    if (!valid) return c.json({ error: 'Incorrect password. Please try again.' }, 401);

    const token = jwt.sign(
      { id: user.id, email: user.email, type: 'admin' },
      jwtSecret,
      { expiresIn: '30d' }
    );
    
    return c.json({
      session: { 
        access_token: token, 
        user: { id: user.id, name: 'Admin', email: user.email, type: 'admin' } 
      },
      user: { id: user.id, name: 'Admin', email: user.email, type: 'admin' }
    });
  }

  // Check Customer — guard against missing table (customers table may not be created yet)
  let customers = [];
  try {
    customers = await conn.execute('SELECT * FROM customers WHERE email = ? OR mobile = ?', [identifier, identifier]);
  } catch (dbErr) {
    if (dbErr.message.includes("doesn't exist") || dbErr.message.includes('Table')) {
      return c.json({ error: 'No account found with this email or mobile.' }, 401);
    }
    throw dbErr; // re-throw unexpected DB errors
  }
  if (customers.length === 0) return c.json({ error: 'No account found with this email or mobile.' }, 401);

  const user = customers[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return c.json({ error: 'Incorrect password. Please try again.' }, 401);

  const token = jwt.sign({ id: user.id, mobile: user.mobile, type: 'customer' }, jwtSecret, { expiresIn: '30d' });
  return c.json({
    session: { access_token: token, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile } },
    user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile }
  });
});

app.get('/auth/session', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ session: { user, access_token: c.req.header('Authorization')?.replace('Bearer ', '') } });
});

// Stub — 2FA pending codes (feature removed; kept so Admin.jsx doesn't 404)
app.get('/auth/pending-codes', requireAuth, async (c) => {
  return c.json({ codes: [] });
});

// ============================================
// PRODUCT ROUTES
// ============================================

const parseProductRow = (row) => {
  if (!row) return null;
  const tryParse = (val) => {
    try { return typeof val === 'string' ? JSON.parse(val) : val; } catch (e) { return []; }
  };
  return {
    ...row,
    images: tryParse(row.images),
    available_sizes: tryParse(row.available_sizes),
    available_colors: tryParse(row.available_colors),
    is_sale: !!row.is_sale,
    is_hot: !!row.is_hot,
    is_new: !!row.is_new,
    is_sold_out: !!row.is_sold_out,
    is_deleted: !!row.is_deleted,
    is_exclusive: !!row.is_exclusive
  };
};

/**
 * Lightweight product row parser for listings — replaces heavy base64
 * image data with CDN URLs. This reduces JSON payload from ~1.5MB to ~3KB.
 */
const parseProductRowLite = (row) => {
  if (!row) return null;
  const tryParse = (val) => {
    try { return typeof val === 'string' ? JSON.parse(val) : val; } catch (e) { return []; }
  };
  const parsedImages = tryParse(row.images);
  const rawImageUrl = row.image_url;
  const cdnUrl = `/api/img/${row.id}`;

  let finalImageUrl = null;
  if (rawImageUrl && !rawImageUrl.startsWith('data:')) {
    finalImageUrl = rawImageUrl;
  } else if (rawImageUrl) {
    finalImageUrl = cdnUrl;
  } else if (Array.isArray(parsedImages) && parsedImages.length > 0) {
    finalImageUrl = (typeof parsedImages[0] === 'string' && parsedImages[0].startsWith('data:')) ? cdnUrl : parsedImages[0];
  }

  const finalImages = Array.isArray(parsedImages) && parsedImages.length > 0
    ? parsedImages.map(img => (typeof img === 'string' && img.startsWith('data:')) ? cdnUrl : img)
    : (finalImageUrl ? [finalImageUrl] : []);

  return {
    ...row,
    image_url: finalImageUrl || cdnUrl,
    images: finalImages.length > 0 ? finalImages : [cdnUrl],
    available_sizes: tryParse(row.available_sizes),
    available_colors: tryParse(row.available_colors),
    is_sale: !!row.is_sale,
    is_hot: !!row.is_hot,
    is_new: !!row.is_new,
    is_sold_out: !!row.is_sold_out,
    is_deleted: !!row.is_deleted,
    is_exclusive: !!row.is_exclusive
  };
};

// Map of subcategories & exact keywords for resilient searching & counting
const SUB_KEYWORDS_MAP = {
  'panjabi': ['panjabi', 'punjabi', 'পাঞ্জাবি', 'পাঞ্জাবী', 'kabli', 'কাবলি'],
  'panjabi/pajama': ['panjabi', 'punjabi', 'পাঞ্জাবি', 'পাঞ্জাবী', 'kabli', 'কাবলি', 'pajama'],
  'formal shirt': ['formal shirt', 'ফরমাল শার্ট', 'dress shirt'],
  'formal wear': ['formal shirt', 'ফরমাল শার্ট', 'dress shirt'],
  'casual wear': ['polo', 't-shirt', 'tshirt', 't shirt', 'টি-শার্ট', 'পোলো'],
  'jeans/trousers': ['jeans', 'trouser', 'trousers', 'pant', 'pants', 'জিন্স', 'প্যান্ট', 'ট্রাউজার'],
  'sari': ['sari', 'saree', 'শাড়ি', 'শাড়ি', 'jamdani', 'কাটান', 'কাতান'],
  'three-piece': ['three-piece', 'three piece', '3 piece', '3-piece', 'থ্রি-পিস', 'থ্রি পিস', 'salwar'],
  'three-piece/salwar': ['three-piece', 'three piece', '3 piece', '3-piece', 'থ্রি-পিস', 'থ্রি পিস', 'salwar'],
  'borka/abaya/hijab': ['borka', 'abaya', 'hijab', 'বোরকা', 'আবায়া', 'হিজাব', 'khimar'],
  'western': ['western', 'tunic', 'ওয়েস্টার্ন'],
  'frock/dress': ['frock', 'dress', 'ফ্রক', 'ড্রেস'],
  'polo/t-shirt': ['polo', 't-shirt', 'tshirt', 't shirt', 'টি-শার্ট', 'পোলো'],
  'shirt/trouser': ['shirt', 'trouser', 'pant', 'শার্ট', 'ট্রাউজার', 'প্যান্ট'],
  'lehenga/gown': ['lehenga', 'gown', 'লেহেঙ্গা', 'গাউন'],
};

// ── Subcategory Counts Endpoint ──
app.get('/products/subcategory-counts', async (c) => {
  if (!(await checkRateLimitKV(c, 'subcounts', 60, 60000))) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  const { category = '' } = c.req.query();
  const cacheKey = `cache:subcounts:${category}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json(cached);
  }

  const conn = getDb(c.env);
  let sql = `SELECT id, name, category, subcategory FROM products
             WHERE status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL)`;
  const params = [];
  if (category && category !== 'All') {
    const maps = {
      'Men': ['Men', 'ছেলেদের'],
      'Women': ['Women', 'মেয়েদের'],
      'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
      'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
    };
    const catList = category.split(',').map(c => c.trim()).filter(Boolean);
    const allCats = new Set();
    catList.forEach(c => {
      const mapped = maps[c];
      if (mapped) mapped.forEach(m => allCats.add(m));
      else allCats.add(c);
    });
    const cats = [...allCats];
    sql += ` AND category IN (${cats.map(() => '?').join(',')})`;
    params.push(...cats);
  }
  const products = await conn.execute(sql, params);
  
  // Calculate counts per subcategory (matching DB subcategory OR name keywords)
  const countsMap = {};
  products.forEach(p => {
    const subCol = p.subcategory ? p.subcategory.trim() : '';
    const nameLower = (p.name || '').toLowerCase();

    if (subCol) {
      countsMap[subCol] = (countsMap[subCol] || 0) + 1;
    }

    // Check keyword map matches
    for (const [subKey, keywords] of Object.entries(SUB_KEYWORDS_MAP)) {
      if (keywords.some(kw => nameLower.includes(kw))) {
        // Map back to standard capitalized subcategory name
        const normKey = subKey.charAt(0).toUpperCase() + subKey.slice(1);
        if (!subCol || subCol.toLowerCase() !== subKey) {
          countsMap[normKey] = (countsMap[normKey] || 0) + 1;
        }
      }
    }
  });

  const res = Object.entries(countsMap).map(([subcategory, count]) => ({ subcategory, count }));
  const responseData = { data: res };
  await kvSet(c, cacheKey, responseData, 300);
  c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return c.json(responseData);
});

app.get('/products', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  if (!checkRateLimit(ip, 'products', 150, 60000)) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  const { status, category, subcategory, search, page = 0, limit = 12, id, ids, order_by = 'created_at', ascending = 'false' } = c.req.query();
  
  const pageNum = Math.max(0, parseInt(page) || 0);
  const limitNum = Math.max(1, Math.min(parseInt(limit) || 12, 100));

  // Sanitize cache key to prevent bot cache-busting
  const safeParams = new URLSearchParams();
  if (status) safeParams.set('status', status);
  if (category) safeParams.set('category', category);
  if (subcategory) safeParams.set('subcategory', subcategory);
  if (search) safeParams.set('search', search);
  safeParams.set('page', String(pageNum));
  safeParams.set('limit', String(limitNum));
  if (id) safeParams.set('id', id);
  if (ids) safeParams.set('ids', ids);
  safeParams.set('order_by', order_by);
  safeParams.set('ascending', ascending);

  const cacheKey = `cache:products:${safeParams.toString()}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json(cached);
  }

  const conn = getDb(c.env);

  try {
    if (id) {
      const res = await conn.execute('SELECT * FROM products WHERE id = ?', [id]);
      const singleData = { data: parseProductRowLite(res[0]) || null, count: res.length };
      await kvSet(c, cacheKey, singleData, 300);
      c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      return c.json(singleData);
    }

    if (ids) {
      const list = ids.split(',').filter(Boolean);
      if (!list.length) return c.json({ data: [], count: 0 });
      const res = await conn.execute(`SELECT * FROM products WHERE id IN (${list.map(() => '?').join(',')})`, list);
      const listData = { data: res.map(parseProductRowLite), count: res.length };
      await kvSet(c, cacheKey, listData, 300);
      c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      return c.json(listData);
    }

    // Lightweight column selection for listings (omits heavy base64 image columns for ultra-fast query)
    let selectFields = 'id, serial_no, created_at, name, price, original_price, description, category, subcategory, video_url, status, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive';
    let whereSql = ' WHERE 1=1';
    const params = [];

    if (status) { whereSql += ' AND status = ?'; params.push(status); }
    if (category && category !== 'All') {
      if (category === 'New') {
        whereSql += ' AND is_new = 1';
      } else if (category === 'Sale') {
        whereSql += ' AND is_sale = 1';
      } else if (category === 'Premium') {
        whereSql += ' AND is_exclusive = 1';
      } else {
        const catList = category.split(',').map(c => c.trim()).filter(Boolean);
        const maps = { 
          'Men': ['Men', 'ছেলেদের'], 
          'Women': ['Women', 'মেয়েদের'], 
          'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'], 
          'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)'] 
        };
        const allCats = new Set();
        catList.forEach(c => {
          const mapped = maps[c];
          if (mapped) mapped.forEach(m => allCats.add(m));
          else allCats.add(c);
        });
        const cats = [...allCats];
        whereSql += ` AND category IN (${cats.map(() => '?').join(',')})`;
        params.push(...cats);
      }
    }
    if (subcategory) {
      const rawSub = String(subcategory).trim();
      const normalizedSub = rawSub.replace(/-/g, ' ').toLowerCase();
      const keywords = SUB_KEYWORDS_MAP[normalizedSub] || SUB_KEYWORDS_MAP[rawSub.toLowerCase()] || [normalizedSub];

      const conditions = ['subcategory = ?', 'LOWER(subcategory) = ?'];
      params.push(rawSub, normalizedSub);

      keywords.forEach(kw => {
        if (kw.length >= 2) {
          conditions.push('LOWER(name) LIKE ?');
          params.push(`%${kw.toLowerCase()}%`);
        }
      });

      whereSql += ` AND (${conditions.join(' OR ')})`;
    }
    if (search) {
      whereSql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const dir = ascending === 'true' ? 'ASC' : 'DESC';
    const orderCol = order_by === 'created_at' ? 'created_at' : 'serial_no';

    const querySql = `SELECT ${selectFields} FROM products${whereSql} ORDER BY ${orderCol} ${dir} LIMIT ? OFFSET ?`;
    const queryParams = [...params, limitNum, pageNum * limitNum];

    const rows = await conn.execute(querySql, queryParams);

    // Fast count: if on page 0 and rows < limit, count equals rows.length without extra DB roundtrip
    let total = rows.length;
    if (pageNum > 0 || rows.length >= limitNum) {
      try {
        const countRes = await conn.execute(`SELECT COUNT(*) as total FROM products${whereSql}`, params);
        total = countRes[0]?.total || rows.length;
      } catch (_) {
        total = rows.length;
      }
    }

    const resultData = { data: rows.map(parseProductRowLite), count: total };
    await kvSet(c, cacheKey, resultData, 300);
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json(resultData);
  } catch (err) {
    console.error('Products API Error:', err);
    return c.json({ data: [], count: 0, error: err.message }, 500);
  }
});

app.get('/products/:id', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  if (!checkRateLimit(ip, 'product_details', 100, 60000)) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  const pid = c.req.param('id');
  const cacheKey = `cache:product:${pid}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json(cached);
  }

  try {
    const conn = getDb(c.env);
    // Exclude heavy base64 columns — images served via /api/img/:id
    const res = await conn.execute(
      'SELECT id, serial_no, created_at, name, price, original_price, description, category, subcategory, video_url, status, platform_id, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive FROM products WHERE id = ?',
      [pid]
    );
    if (!res.length) return c.json({ error: 'Not found' }, 404);
    const parsed = parseProductRowLite(res[0]);
    const resultData = { data: parsed };
    await kvSet(c, cacheKey, resultData, 300);
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json(resultData);
  } catch (err) {
    console.error('Product detail error:', err);
    return c.json({ error: 'Internal error' }, 500);
  }
});

const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/[a-zA-Z]+/g, (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());
};

app.post('/products', requireAuth, requireAdmin, async (c) => {
  const p = await c.req.json();
  const conn = getDb(c.env);
  const id = p.id || crypto.randomUUID();
  const name = toTitleCase(p.name);
  try {
    await conn.execute(
      `INSERT INTO products (serial_no, id, created_at, name, price, original_price, description, category, subcategory, images, image_url, video_url, status, platform_id, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive)
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.serial_no || null, id, name, p.price, p.original_price || null, p.description || '', p.category || 'Women', p.subcategory || null,
        JSON.stringify(p.images || []), p.image_url || null, p.video_url || '', p.status || 'published', p.platform_id || null,
        p.is_sale ? 1 : 0, p.is_hot ? 1 : 0, p.is_new ? 1 : 0, p.is_sold_out ? 1 : 0, p.is_deleted ? 1 : 0,
        JSON.stringify(p.available_sizes || []), JSON.stringify(p.available_colors || []), p.stock_count ?? 3, p.is_exclusive ? 1 : 0
      ]
    );
    await kvDelete(c, 'cache:products');
    await kvDelete(c, 'cache:subcounts');
    return c.json({ success: true, data: { id }, id });
  } catch (err) {
    console.error('Product insert error:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.put('/products/:id', requireAuth, requireAdmin, async (c) => {
  const p = await c.req.json();
  const id = c.req.param('id');
  const conn = getDb(c.env);
  const setClauses = [];
  const params = [];
  
  const fields = {
    name: p.name ? toTitleCase(p.name) : p.name, price: p.price, original_price: p.original_price, description: p.description, category: p.category, subcategory: p.subcategory,
    images: p.images !== undefined ? JSON.stringify(p.images) : undefined, image_url: p.image_url, video_url: p.video_url,
    status: p.status, is_sale: p.is_sale !== undefined ? (p.is_sale ? 1 : 0) : undefined,
    is_hot: p.is_hot !== undefined ? (p.is_hot ? 1 : 0) : undefined, is_new: p.is_new !== undefined ? (p.is_new ? 1 : 0) : undefined,
    is_sold_out: p.is_sold_out !== undefined ? (p.is_sold_out ? 1 : 0) : undefined,
    is_deleted: p.is_deleted !== undefined ? (p.is_deleted ? 1 : 0) : undefined,
    available_sizes: p.available_sizes !== undefined ? JSON.stringify(p.available_sizes) : undefined,
    available_colors: p.available_colors !== undefined ? JSON.stringify(p.available_colors) : undefined,
    stock_count: p.stock_count,
    is_exclusive: p.is_exclusive !== undefined ? (p.is_exclusive ? 1 : 0) : undefined,
    serial_no: p.serial_no
  };

  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) { setClauses.push(`${key} = ?`); params.push(val); }
  }
  if (!setClauses.length) return c.json({ success: true });
  params.push(id);
  await conn.execute(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`, params);
  await kvDelete(c, 'cache:products');
  await kvDelete(c, `cache:product:${id}`);
  await kvDelete(c, 'cache:subcounts');
  // Evict the binary KV image cache so the new photo is served immediately
  if (p.image_url !== undefined || p.images !== undefined) {
    const kv = c.env?.BIGBAZAR_CACHE;
    if (kv) { try { await kv.delete(`img:${id}`); } catch (_) {} }
  }
  return c.json({ success: true });
});

app.delete('/products/:id', requireAuth, requireAdmin, async (c) => {
  const pid = c.req.param('id');
  const conn = getDb(c.env);
  await conn.execute('DELETE FROM products WHERE id = ?', [pid]);
  await kvDelete(c, 'cache:products');
  await kvDelete(c, `cache:product:${pid}`);
  await kvDelete(c, 'cache:subcounts');
  // Bug 2 fix: also evict binary KV image cache so the CDN stops serving the
  // deleted product's image.
  const kvImg = c.env?.BIGBAZAR_CACHE;
  if (kvImg) { try { await kvImg.delete(`img:${pid}`); } catch (_) {} }
  return c.json({ success: true });
});

// ============================================
// ORDER ROUTES
// ============================================

app.get('/orders', requireAuth, async (c) => {
  const { status, search, page = 0, limit = 20, ascending = 'false' } = c.req.query();
  const conn = getDb(c.env);
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (customer_phone LIKE ? OR customer_name LIKE ? OR customer_address LIKE ? OR id LIKE ?)';
    const p = `%${search}%`; params.push(p, p, p, p);
  }
  const countSQL = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countRes = await conn.execute(countSQL, params);
  const total = countRes[0].total;
  sql += ` ORDER BY created_at ${ascending === 'true' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(page) * parseInt(limit));
  const res = await conn.execute(sql, params);
  return c.json({ data: res, count: total });
});

app.post('/orders', optionalCustomerAuth, async (c) => {
  if (!(await checkRateLimitKV(c, 'orders', 5, 60000))) {
    return c.json({ error: 'Too many order requests. Please try again after a minute.' }, 429);
  }

  const o = await c.req.json();
  const conn = getDb(c.env);
  const id = crypto.randomUUID();
  const customerId = c.get('customer')?.id || null;

  if (!o.product_id) {
    return c.json({ error: 'Product ID is required' }, 400);
  }

  const tx = await conn.begin();
  try {
    const itemsToProcess = Array.isArray(o.items) && o.items.length > 0
      ? o.items
      : [{
          id: o.product_id,
          quantity: 1,
          selectedColor: o.color || null,
          selectedSize: o.size || null
        }];

    let calculatedSubtotal = 0;

    for (const item of itemsToProcess) {
      // 1. Fetch product and lock row inside transaction
      const products = await tx.execute(
        'SELECT name, price, stock_count, is_sold_out, is_deleted, status, available_colors FROM products WHERE id = ? FOR UPDATE',
        [item.id]
      );

      if (products.length === 0) {
        await tx.rollback();
        return c.json({ error: `Product not found: ${item.id}` }, 404);
      }

      const product = products[0];
      if (product.is_deleted || product.status !== 'published') {
        await tx.rollback();
        return c.json({ error: `Product "${product.name}" is no longer available` }, 400);
      }

      const hadRealStock = product.stock_count !== null && product.stock_count !== undefined;
      const requestedQty = parseInt(item.quantity) || 1;

      if (hadRealStock && product.stock_count < requestedQty) {
        await tx.rollback();
        return c.json({ error: `Product "${product.name}" is out of stock (Requested: ${requestedQty}, Available: ${product.stock_count})` }, 400);
      }

      // Calculate true price of the product item
      const itemUnitPrice = parseFloat(product.price || 0);
      calculatedSubtotal += itemUnitPrice * requestedQty;

      // Decrement stock
      let updatedGlobalStock = product.stock_count;
      if (hadRealStock) {
        updatedGlobalStock = Math.max(0, product.stock_count - requestedQty);
      }

      // Decrement color/size variant stock
      let availableColorsParsed = [];
      try {
        availableColorsParsed = typeof product.available_colors === 'string'
          ? JSON.parse(product.available_colors)
          : (product.available_colors || []);
      } catch (e) {
        availableColorsParsed = [];
      }

      if (item.selectedColor && availableColorsParsed.length > 0) {
        availableColorsParsed = availableColorsParsed.map(color => {
          const colorName = typeof color === 'object' ? color.name : color;
          if (colorName === item.selectedColor && color.sizes?.length > 0) {
            const updatedSizes = color.sizes.map(sz => {
              const szName = typeof sz === 'object' ? sz.name : sz;
              if (szName === item.selectedSize) {
                return { ...sz, stock: Math.max(0, (sz.stock || 0) - requestedQty) };
              }
              return sz;
            });
            return { ...color, sizes: updatedSizes };
          }
          return color;
        });
      }

      await tx.execute(
        'UPDATE products SET stock_count = ?, is_sold_out = ?, available_colors = ? WHERE id = ?',
        [
          updatedGlobalStock,
          hadRealStock && updatedGlobalStock <= 0 ? 1 : (product.is_sold_out ? 1 : 0),
          JSON.stringify(availableColorsParsed),
          item.id
        ]
      );
    }

    // Determine correct delivery charge based on area
    let calculatedDeliveryCharge = 150;
    if (o.delivery_area === 'mirsarai') {
      calculatedDeliveryCharge = 0;
    } else if (o.delivery_area === 'chattogram') {
      calculatedDeliveryCharge = 100;
    }

    const calculatedTotalAmount = calculatedSubtotal + calculatedDeliveryCharge;

    // 3. Create the order using server-side calculated totals
    // Build INSERT with optional user_id column
    const orderCols = 'id, product_id, product_name, product_price, customer_name, customer_phone, customer_address, customer_note, delivery_area, delivery_charge, total_amount, last_four_digits, status, size, color, is_advance_paid, is_exclusive_order, payment_status, moderator_reference';
    const orderVals = [
      id, o.product_id, o.product_name, calculatedSubtotal, o.customer_name, o.customer_phone, o.customer_address, o.customer_note || null,
      o.delivery_area || 'outside', calculatedDeliveryCharge, calculatedTotalAmount, o.last_four_digits || 'COD', 'Pending',
      o.size || null, o.color || null, o.is_advance_paid ? 1 : 0, o.is_exclusive_order ? 1 : 0, o.payment_status || 'Unpaid', o.moderator_reference || null
    ];
    const colsSql = customerId ? orderCols + ', user_id' : orderCols;
    const placeholders = customerId ? orderVals.map(() => '?').join(', ') + ', ?' : orderVals.map(() => '?').join(', ');
    if (customerId) orderVals.push(customerId);
    
    try {
      await tx.execute(`INSERT INTO orders (${colsSql}) VALUES (${placeholders})`, orderVals);
    } catch (insertErr) {
      // If user_id column doesn't exist yet, retry without it
      if (insertErr.message?.includes('user_id') || insertErr.message?.includes('Unknown column')) {
        const fallbackVals = orderVals.slice(0, -1); // Remove customerId
        await tx.execute(
          `INSERT INTO orders (${orderCols}) VALUES (${fallbackVals.map(() => '?').join(', ')})`,
          fallbackVals
        );
      } else {
        throw insertErr;
      }
    }

    await tx.commit();
    return c.json({ success: true, order_id: id, data: { id, order_id: id } });
  } catch (err) {
    await tx.rollback();
    console.error('Order placement transaction error:', err);
    return c.json({ error: err.message }, 500);
  }
});

async function restoreOrderStock(tx, order) {
  if (!order) return;

  const parseLine = (str) => {
    const res = { name: str, size: null, color: null, sku: null, qty: 1 };
    const colorMatch = str.match(/\((?:Color|রঙ):\s*([^)]*)\)/i);
    const sizeMatch = str.match(/\((?:Size|সাইজ):\s*([^)]*)\)/i);
    const skuMatch = str.match(/\((?:SKU):\s*([^)]*)\)/i);
    const qtyMatch = str.match(/\((?:Qty|পরিমাণ):\s*(\d+)\)/i);
    if (colorMatch) res.color = colorMatch[1].trim();
    if (sizeMatch) res.size = sizeMatch[1].trim();
    if (skuMatch) res.sku = skuMatch[1].trim();
    if (qtyMatch) res.qty = parseInt(qtyMatch[1], 10) || 1;
    res.name = str.split('(')[0].trim();
    return res;
  };

  const parsedLines = (order.product_name || '').split(' + ').map(parseLine);

  for (let i = 0; i < parsedLines.length; i++) {
    const item = parsedLines[i];
    const qty = item.qty || 1;
    const selectedColor = item.color || order.color || null;
    const selectedSize = item.size || order.size || null;

    let productId = (i === 0 && order.product_id) ? order.product_id : null;

    if (!productId && item.sku) {
      const pBySku = await tx.execute('SELECT id FROM products WHERE platform_id = ? OR serial_no = ? LIMIT 1', [item.sku, item.sku]);
      if (pBySku.length > 0) productId = pBySku[0].id;
    }

    if (!productId && item.name) {
      const pByName = await tx.execute('SELECT id FROM products WHERE name = ? LIMIT 1', [item.name]);
      if (pByName.length > 0) productId = pByName[0].id;
    }

    if (!productId && order.product_id) {
      productId = order.product_id;
    }

    if (!productId) continue;

    // Lock product row inside transaction
    const products = await tx.execute(
      'SELECT stock_count, is_sold_out, available_colors FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (products.length === 0) continue;

    const product = products[0];
    const hadRealStock = product.stock_count !== null && product.stock_count !== undefined;

    // 1. Increment global stock count
    let updatedGlobalStock = product.stock_count;
    if (hadRealStock) {
      updatedGlobalStock = product.stock_count + qty;
    }

    // 2. Increment color/size variant stock
    let availableColorsParsed = [];
    try {
      availableColorsParsed = typeof product.available_colors === 'string'
        ? JSON.parse(product.available_colors)
        : (product.available_colors || []);
    } catch (e) {
      availableColorsParsed = [];
    }

    if (selectedColor && availableColorsParsed.length > 0) {
      availableColorsParsed = availableColorsParsed.map(color => {
        const colorName = typeof color === 'object' ? color.name : color;
        if (colorName === selectedColor && color.sizes?.length > 0) {
          const updatedSizes = color.sizes.map(sz => {
            const szName = typeof sz === 'object' ? sz.name : sz;
            if (szName === selectedSize) {
              return { ...sz, stock: (sz.stock || 0) + qty };
            }
            return sz;
          });
          return { ...color, sizes: updatedSizes };
        }
        return color;
      });
    }

    // 3. Update product in DB and reset is_sold_out to 0 if stock is restored
    await tx.execute(
      'UPDATE products SET stock_count = ?, is_sold_out = ?, available_colors = ? WHERE id = ?',
      [
        updatedGlobalStock,
        hadRealStock && updatedGlobalStock > 0 ? 0 : product.is_sold_out,
        JSON.stringify(availableColorsParsed),
        productId
      ]
    );
  }
}

app.put('/orders/:id', requireAuth, requireAdmin, async (c) => {
  const o = await c.req.json();
  const id = c.req.param('id');
  const conn = getDb(c.env);

  const tx = await conn.begin();
  try {
    // 1. Fetch current order with row lock
    const currentOrders = await tx.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (currentOrders.length === 0) {
      await tx.rollback();
      return c.json({ error: 'Order not found' }, 404);
    }
    const currentOrder = currentOrders[0];

    // 2. If transitioning INTO Cancelled from a non-cancelled status, restore stock
    const isTransitioningToCancelled = o.status === 'Cancelled' && currentOrder.status !== 'Cancelled';
    if (isTransitioningToCancelled) {
      await restoreOrderStock(tx, currentOrder);
    }

    // 3. Update fields
    const setClauses = [];
    const params = [];
    const fields = {
      status: o.status,
      is_advance_paid: o.is_advance_paid !== undefined ? (o.is_advance_paid ? 1 : 0) : undefined,
      payment_status: o.payment_status,
      delivery_charge: o.delivery_charge,
      total_amount: o.total_amount
    };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) { setClauses.push(`${key} = ?`); params.push(val); }
    }
    if (setClauses.length > 0) {
      params.push(id);
      await tx.execute(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, params);
    }

    await tx.commit();
    return c.json({ success: true });
  } catch (err) {
    await tx.rollback();
    console.error('Order update transaction error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Bulk delete by status — used by Admin "Empty Bin" feature
app.delete('/orders', requireAuth, requireAdmin, async (c) => {
  const status = c.req.query('status');
  if (!status) return c.json({ error: 'status query param required' }, 400);
  const conn = getDb(c.env);
  await conn.execute('DELETE FROM orders WHERE status = ?', [status]);
  return c.json({ success: true });
});

app.delete('/orders/:id', requireAuth, requireAdmin, async (c) => {
  const conn = getDb(c.env);
  const id = c.req.param('id');
  const tx = await conn.begin();
  try {
    // 1. Fetch order with row lock
    const orders = await tx.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (orders.length > 0) {
      const order = orders[0];

      // 2. Only restore stock if order was NOT already Cancelled
      // (If already Cancelled, stock was already restored when cancelled)
      if (order.status !== 'Cancelled') {
        await restoreOrderStock(tx, order);
      }

      // 3. Delete order
      await tx.execute('DELETE FROM orders WHERE id = ?', [id]);
    }
    await tx.commit();
    return c.json({ success: true });
  } catch (err) {
    await tx.rollback();
    console.error('Order deletion transaction error:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.get('/orders/track', async (c) => {
  const query = (c.req.query('query') || '').trim();
  if (!query) return c.json({ data: [] });

  const cacheKey = `cache:orders:track:${query}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const conn = getDb(c.env);
  const res = await conn.execute(
    'SELECT * FROM orders WHERE customer_phone = ? OR id = ? ORDER BY created_at DESC',
    [query, query]
  );
  const responseData = { data: res };
  await kvSet(c, cacheKey, responseData, 60);
  return c.json(responseData);
});

// ============================================
// REVIEWS
// ============================================
app.get('/reviews', async (c) => {
  const pid = c.req.query('product_id') || '';
  const cacheKey = `cache:reviews:${pid}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300');
    return c.json(cached);
  }

  const conn = getDb(c.env);
  const res = await conn.execute('SELECT * FROM reviews' + (pid ? ' WHERE product_id = ?' : '') + ' ORDER BY created_at DESC', pid ? [pid] : []);
  const responseData = { data: res };
  await kvSet(c, cacheKey, responseData, 120);
  c.header('Cache-Control', 'public, max-age=60, s-maxage=300');
  return c.json(responseData);
});

app.post('/reviews', async (c) => {
  const r = await c.req.json();
  const conn = getDb(c.env);
  const id = crypto.randomUUID();
  await conn.execute(
    'INSERT INTO reviews (id, rating, comment, customer_name, product_id, product_name) VALUES (?, ?, ?, ?, ?, ?)',
    [id, r.rating || 5, r.comment, r.customer_name, r.product_id, r.product_name]
  );
  await kvDelete(c, 'cache:reviews');
  return c.json({ success: true, id });
});

// ============================================
// SETTINGS
// ============================================
app.get('/settings', async (c) => {
  const cacheKey = 'cache:settings';
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=1200');
    return c.json(cached);
  }

  const conn = getDb(c.env);
  const res = await conn.execute("SELECT `key`, value FROM site_settings WHERE `key` NOT LIKE 'ping:%' AND `key` NOT LIKE 'rl:%' AND `key` NOT LIKE 'site_visitors%'");
  const settings = {};
  res.forEach(r => {
    try { settings[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value; } catch(e) { settings[r.key] = r.value; }
  });
  const responseData = { data: settings };
  await kvSet(c, cacheKey, responseData, 600);
  c.header('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=1200');
  return c.json(responseData);
});

app.post('/settings', requireAuth, requireAdmin, async (c) => {
  const s = await c.req.json();
  const conn = getDb(c.env);
  await conn.execute(
    'INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [s.key, JSON.stringify(s.value)]
  );
  await kvDelete(c, 'cache:settings');
  return c.json({ success: true });
});

// ============================================
// VISITOR ANALYTICS (3-TIER: LIVE ONLINE, TODAY, LIFETIME TOTAL)
// ============================================
const activeSessions = new Map();
let lastSessionCleanup = Date.now();

function cleanupStaleSessions() {
  const now = Date.now();
  if (now - lastSessionCleanup > 60000) {
    const cutoff = now - 180000; // 3 minutes TTL
    for (const [id, ts] of activeSessions.entries()) {
      if (ts < cutoff) activeSessions.delete(id);
    }
    lastSessionCleanup = now;
  }
}

function getTodayKey() {
  const d = new Date(Date.now() + 6 * 3600 * 1000); // UTC+6 (Bangladesh Time)
  return `site_visitors_${d.toISOString().split('T')[0]}`;
}

app.post('/analytics/ping', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const sessionId = body.session_id || c.req.header('x-session-id') || ('anon-' + Math.random().toString(36).substring(2, 9));
  const isNewSession = !!body.is_new;
  const now = Date.now();
  const kv = c.env?.BIGBAZAR_CACHE;

  try {
    // 1. Live Session Tracking: In-memory Map + KV (0 SQL writes, 0 TiDB RUs)
    cleanupStaleSessions();
    activeSessions.set(sessionId, now);

    if (kv) {
      await kv.put(`ping:${sessionId}`, String(now), { expirationTtl: 180 }).catch(() => {});
    }

    // 2. Increment Today & Lifetime Visitor Counters:
    // Runs ONLY ONCE per brand new session (when is_new is true)
    if (isNewSession) {
      const conn = getDb(c.env);
      const todayKey = getTodayKey();
      await conn.execute(
        "INSERT INTO site_settings (`key`, value) VALUES (?, '1'), ('site_visitors', '1') ON DUPLICATE KEY UPDATE value = CAST(COALESCE(value, '0') AS UNSIGNED) + 1",
        [todayKey]
      ).catch(() => {});
    }
  } catch (err) {
    console.error('Analytics ping error:', err);
  }

  return c.json({ success: true });
});

app.get('/analytics/stats', async (c) => {
  const kv = c.env?.BIGBAZAR_CACHE;

  // ── KV Response Cache: return cached stats instantly (avoids ALL DB queries) ──
  if (kv) {
    const cachedStats = await kvGet(c, 'cache:analytics:stats');
    if (cachedStats) {
      return c.json(cachedStats, 200, {
        'Cache-Control': 'public, max-age=15, s-maxage=30'
      });
    }
  }

  cleanupStaleSessions();
  const now = Date.now();
  const todayKey = getTodayKey();
  let todayCount = 0;
  let totalCount = 0;
  let onlineNow = Math.max(1, activeSessions.size);

  try {
    // 1. Online count: use KV list if available
    if (kv && kv.list) {
      try {
        const list = await kv.list({ prefix: 'ping:' });
        if (list?.keys?.length) {
          onlineNow = Math.max(1, list.keys.length);
        }
      } catch (_) {}
    }

    // 2. Fetch ONLY today + lifetime counters from DB (indexed key lookup, ~1 RU)
    const conn = getDb(c.env);
    const res = await conn.execute(
      "SELECT `key`, value FROM site_settings WHERE `key` IN (?, 'site_visitors')",
      [todayKey]
    );
    res.forEach(r => {
      const val = parseInt(typeof r.value === 'string' ? JSON.parse(r.value) : r.value) || 0;
      if (r.key === todayKey) todayCount = val;
      if (r.key === 'site_visitors') totalCount = val;
    });
  } catch (err) {
    console.error('Analytics stats fetch error:', err);
  }

  const responseData = {
    success: true,
    online_now: onlineNow,
    today_count: todayCount,
    total_count: totalCount
  };

  // Cache the response in KV for 30 seconds
  if (kv) {
    await kvSet(c, 'cache:analytics:stats', responseData, 30);
  }

  return c.json(responseData, 200, {
    'Cache-Control': 'public, max-age=15, s-maxage=30'
  });
});

app.post('/analytics/track-visitor', async (c) => {
  return c.redirect('/api/analytics/stats');
});

app.get('/analytics/visitor-count', async (c) => {
  return c.redirect('/api/analytics/stats');
});

// ============================================
// UPLOAD (Cloudinary primary / Base64 fallback)
// ============================================

/**
 * Fast base64 encoding for ArrayBuffers — kept as fallback when
 * Cloudinary env vars are not configured.
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * SHA-1 hex digest using the Web Crypto API (available in Workers).
 * Cloudinary requires HMAC-style signatures: sha1(paramsString + apiSecret).
 */
async function sha1Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

app.post('/upload', requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!file || !(file instanceof File)) return c.json({ error: 'No file uploaded' }, 400);

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return c.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` }, 413);
    }

    // ── Cloudinary upload (primary path) ──────────────────────────────────
    const cloudName  = c.env.CLOUDINARY_CLOUD_NAME;
    const apiKey     = c.env.CLOUDINARY_API_KEY;
    const apiSecret  = c.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const folder = 'bigbazar';
      // Cloudinary transformation: auto quality, auto format, max 1600px wide
      const eager = 'q_auto,f_auto,w_1600,c_limit';

      // Params must be sorted alphabetically for signature
      const paramsToSign = `eager=${eager}&folder=${folder}&timestamp=${timestamp}`;
      const signature = await sha1Hex(paramsToSign + apiSecret);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('eager', eager);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!cloudRes.ok) {
        const errBody = await cloudRes.text();
        console.error('Cloudinary upload failed:', cloudRes.status, errBody);
        return c.json({ error: 'Image host upload failed', details: errBody }, 502);
      }

      const result = await cloudRes.json();
      // Use the eager transformation URL if available, otherwise secure_url
      const publicUrl = result.eager?.[0]?.secure_url || result.secure_url;

      return c.json({
        success: true,
        data: {
          path: result.public_id,
          publicUrl
        }
      });
    }

    // ── Base64 fallback (Cloudinary env vars not set) ─────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const dataUrl = `data:${file.type};base64,${base64}`;

    return c.json({
      success: true,
      data: {
        path: `base64-${Date.now()}`,
        publicUrl: dataUrl
      }
    });
  } catch (err) {
    return c.json({ error: 'Upload failed', details: err.message }, 500);
  }
});


// ============================================
// GOOGLE CUSTOMER AUTH (Continue with Google)
// ============================================

/**
 * Decode a Base64url string to ArrayBuffer (used for JWT parsing).
 */
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Decode a Base64url JSON payload from a JWT segment.
 */
function decodeJwtSegment(segment) {
  const buffer = base64urlToBuffer(segment);
  const text = new TextDecoder().decode(buffer);
  return JSON.parse(text);
}

/**
 * Verify a Google ID token's signature and claims using Web Crypto API.
 * No external dependency required — fetches Google's JWKS directly.
 */
async function verifyGoogleIdToken(idToken, googleClientId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const header = decodeJwtSegment(parts[0]);
  const payload = decodeJwtSegment(parts[1]);

  // 1. Check claims first (fast fail before crypto)
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token expired');
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('Invalid issuer');
  }
  if (payload.aud !== googleClientId) throw new Error('Invalid audience');

  // 2. Fetch Google's public keys (JWKS)
  const jwksRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!jwksRes.ok) throw new Error('Failed to fetch Google JWKS');
  const jwks = await jwksRes.json();
  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Key not found in Google JWKS');

  // 3. Import the RSA public key
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['verify']
  );

  // 4. Verify the signature
  const signedContent = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const signatureBuffer = base64urlToBuffer(parts[2]);
  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBuffer,
    signedContent
  );
  if (!isValid) throw new Error('Signature verification failed');

  return payload;
}


// POST /auth/google — "Continue with Google" login
app.post('/auth/google', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  if (!checkRateLimit(ip, 'google-auth', 10, 60000)) {
    return c.json({ error: 'Too many login attempts. Please try again later.' }, 429);
  }

  const { credential } = await c.req.json();
  if (!credential) return c.json({ error: 'Google credential is required' }, 400);

  const googleClientId = c.env?.GOOGLE_CLIENT_ID || (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID);
  if (!googleClientId) return c.json({ error: 'Google login is not configured' }, 500);

  try {
    // Verify the Google ID token
    const payload = await verifyGoogleIdToken(credential, googleClientId);

    const googleId = payload.sub;
    const email = payload.email || '';
    const name = payload.name || '';
    const avatarUrl = payload.picture || '';

    // Check if user exists
    const existing = await conn.execute('SELECT * FROM users WHERE google_id = ?', [googleId]);
    let userId;

    if (existing.length > 0) {
      userId = existing[0].id;
      // Update name/avatar on every login (they may change on Google's side)
      await conn.execute(
        'UPDATE users SET name = ?, avatar_url = ?, email = ? WHERE id = ?',
        [name, avatarUrl, email, userId]
      );
    } else {
      userId = crypto.randomUUID();
      await conn.execute(
        'INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)',
        [userId, googleId, email, name, avatarUrl]
      );
    }
    await kvDelete(c, `cache:user:${userId}`);

    // Issue JWT
    const jwtSecret = getJwtSecret(c);
    const token = jwt.sign(
      { id: userId, email, type: 'customer' },
      jwtSecret,
      { expiresIn: '30d' }
    );

    return c.json({
      user: { id: userId, name, email, avatar_url: avatarUrl, phone: existing?.[0]?.phone || null },
      token
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return c.json({ error: 'Google login failed: ' + err.message }, 401);
  }
});

// GET /account/me — Current logged-in customer profile
app.get('/account/me', requireCustomerAuth, async (c) => {
  const customer = c.get('customer');
  const cacheKey = `cache:user:${customer.id}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const conn = getDb(c.env);
  try {
    const rows = await conn.execute('SELECT id, name, email, avatar_url, phone, created_at FROM users WHERE id = ?', [customer.id]);
    if (rows.length === 0) return c.json({ error: 'User not found' }, 404);
    const responseData = { user: rows[0] };
    await kvSet(c, cacheKey, responseData, 120);
    return c.json(responseData);
  } catch (err) {
    return c.json({ error: 'Failed to load profile' }, 500);
  }
});

// PUT /account/me — Update customer phone (the only editable field for now)
app.put('/account/me', requireCustomerAuth, async (c) => {
  const customer = c.get('customer');
  const { phone } = await c.req.json();
  const conn = getDb(c.env);
  try {
    await conn.execute('UPDATE users SET phone = ? WHERE id = ?', [phone || null, customer.id]);
    await kvDelete(c, `cache:user:${customer.id}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// GET /account/orders — Customer's own order history
app.get('/account/orders', requireCustomerAuth, async (c) => {
  const customer = c.get('customer');
  const { page = 0, limit = 20 } = c.req.query();
  const conn = getDb(c.env);
  try {
    const countRes = await conn.execute('SELECT COUNT(*) as total FROM orders WHERE user_id = ?', [customer.id]);
    const total = countRes[0]?.total || 0;
    const orders = await conn.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [customer.id, parseInt(limit), parseInt(page) * parseInt(limit)]
    );
    return c.json({ data: orders, count: total });
  } catch (err) {
    // user_id column may not exist yet — return empty
    return c.json({ data: [], count: 0 });
  }
});

// ============================================
// AI SHOPPING ASSISTANT (v2 — Upgraded)
// Features: FAQ RAG, KV cache, SSE streaming,
//   order status, delivery estimate, fallback chain
// ============================================

const groqTools = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search products by keyword, category, subcategory, or price range',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'optional free-text search' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          min_price: { type: 'number' },
          max_price: { type: 'number' },
          limit: { type: 'number' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_best_sellers',
      description: 'Get trending/best-selling products',
      parameters: { type: 'object', properties: { limit: { type: 'number' } } }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_faq_answer',
      description: 'Get answer for FAQ topics: delivery, return_policy, payment, size_chart, contact_info, how_to_order, mirsarai_offer',
      parameters: {
        type: 'object',
        properties: { topic: { type: 'string', description: 'FAQ topic key' } },
        required: ['topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_order_status',
      description: 'Check order status for a logged-in customer by their order reference ID',
      parameters: {
        type: 'object',
        properties: { order_ref: { type: 'string', description: 'Last 6 chars of order ID or full order ID' } },
        required: ['order_ref']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_delivery_estimate',
      description: 'Get estimated delivery days and charge for a given delivery area/city',
      parameters: {
        type: 'object',
        properties: { area: { type: 'string', description: 'city or area name' } },
        required: ['area']
      }
    }
  }
];

const SYSTEM_PROMPT = `You are BigBazar's friendly AI shopping assistant for a Bangladeshi fashion store.

RULES:
1. Detect the customer's language from their message (Bengali script = bn, Banglish or English = en) and ALWAYS reply in the SAME style and language.
2. Keep replies SHORT: 1-3 sentences maximum. Product cards are shown below your text, so never list prices or product details in your text.
3. Only describe products returned by a tool call. NEVER invent product names, prices, stock, or availability.
4. If asked about delivery, payment, returns, sizing, or contact info - call get_faq_answer with the matching topic.
5. If the customer mentions an order number, call check_order_status (only for logged-in users).
6. Politely decline questions unrelated to BigBazar products/services. Do not discuss competitor brands.
7. If you cannot help, suggest: "আমাদের মেসেঞ্জারে যোগাযোগ করুন" (Contact us on Messenger).
8. Never make up phone numbers, addresses, or policies. Use only tool-provided data.`;

function parseAssistantProductRow(r) {
  let images = [];
  try { images = r.images ? JSON.parse(r.images) : []; } catch (_) {}
  return {
    id: r.id, name: r.name, price: r.price,
    image_url: r.image_url || images[0] || '',
    description: r.description || '',
    category: r.category || '', subcategory: r.subcategory || ''
  };
}

async function executeGroqTool(c, conn, toolName, args, userId) {
  // --- search_products ---
  if (toolName === 'search_products') {
    const { query = '', category = '', subcategory = '', min_price, max_price, limit = 5 } = args;
    const safeLimit = Math.min(parseInt(limit) || 5, 10);
    const cacheKey = `cache:assistant:search:${encodeURIComponent(query)}:${encodeURIComponent(category)}:${safeLimit}`;
    const cached = await kvGet(c, cacheKey);
    if (cached) return cached;
    let sql = "SELECT * FROM products WHERE status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL)";
    const params = [];
    if (category && category !== 'All') { sql += ' AND category LIKE ?'; params.push(`%${category}%`); }
    if (subcategory) { sql += ' AND subcategory LIKE ?'; params.push(`%${subcategory}%`); }
    if (min_price) { sql += ' AND price >= ?'; params.push(parseFloat(min_price)); }
    if (max_price) { sql += ' AND price <= ?'; params.push(parseFloat(max_price)); }
    if (query) { sql += ' AND (name LIKE ? OR description LIKE ? OR subcategory LIKE ?)'; params.push(`%${query}%`, `%${query}%`, `%${query}%`); }
    sql += ' ORDER BY is_hot DESC, created_at DESC LIMIT ?';
    params.push(safeLimit);
    const rows = await conn.execute(sql, params);
    const result = { type: 'products', data: rows.map(parseAssistantProductRow) };
    await kvSet(c, cacheKey, result, 120);
    return result;
  }

  // --- get_best_sellers ---
  if (toolName === 'get_best_sellers') {
    const safeLimit = Math.min(parseInt(args.limit) || 5, 10);
    const cacheKey = `cache:assistant:bestsellers:${safeLimit}`;
    const cached = await kvGet(c, cacheKey);
    if (cached) return cached;
    const sql = "SELECT * FROM products WHERE status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY is_hot DESC, created_at DESC LIMIT ?";
    const rows = await conn.execute(sql, [safeLimit]);
    const result = { type: 'products', data: rows.map(parseAssistantProductRow) };
    await kvSet(c, cacheKey, result, 120);
    return result;
  }

  // --- get_faq_answer ---
  if (toolName === 'get_faq_answer') {
    const topic = (args.topic || '').toLowerCase().replace(/ /g, '_');
    const entry = FAQ_KB[topic];
    if (entry) return { type: 'faq', data: entry };
    // try fuzzy match
    for (const [key, kb] of Object.entries(FAQ_KB)) {
      if (key.includes(topic) || topic.includes(key)) return { type: 'faq', data: kb };
    }
    return { type: 'faq', data: null, error: 'Topic not found' };
  }

  // --- check_order_status (auth required) ---
  if (toolName === 'check_order_status') {
    if (!userId) return { type: 'error', message: 'Login required to check order status. Please log in first.' };
    const ref = (args.order_ref || '').trim().toUpperCase();
    if (!ref) return { type: 'error', message: 'Please provide your order reference number.' };
    try {
      // Try exact match first, then suffix match
      let rows = await conn.execute(
        'SELECT id, status, payment_status, total_amount, delivery_area, created_at FROM orders WHERE user_id = ? AND UPPER(id) LIKE ? ORDER BY created_at DESC LIMIT 1',
        [userId, `%${ref}%`]
      );
      if (rows.length === 0) return { type: 'order_not_found', message: `No order found with reference "${ref}" for your account.` };
      const o = rows[0];
      return {
        type: 'order_status',
        data: {
          ref: o.id.toString().slice(-6).toUpperCase(),
          status: o.status,
          payment_status: o.payment_status,
          total: o.total_amount,
          area: o.delivery_area,
          created_at: o.created_at
        }
      };
    } catch (err) {
      return { type: 'error', message: 'Could not retrieve order. Try again or contact support.' };
    }
  }

  // --- get_delivery_estimate ---
  if (toolName === 'get_delivery_estimate') {
    const areaInput = (args.area || '').toLowerCase().trim();
    let match = DELIVERY_AREAS.default;
    for (const [key, val] of Object.entries(DELIVERY_AREAS)) {
      if (areaInput.includes(key) || key.includes(areaInput)) { match = val; break; }
    }
    return { type: 'delivery_estimate', data: { area: args.area, days: match.days, charge: match.charge } };
  }

  return { error: 'Tool not found' };
}

// POST /api/assistant — AI Shopping Assistant with SSE Streaming
app.post('/assistant', optionalCustomerAuth, async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  if (!checkRateLimit(ip, 'assistant', 30, 60000)) {
    return c.json({
      reply: 'আপনি খুব বেশি মেসেজ পাঠাচ্ছেন। ১ মিনিট পর আবার চেষ্টা করুন।',
      products: [], quick_replies: ['শাড়ি কালেকশন', 'থ্রি-পিস কালেকশন', 'পারশি কালেকশন'], order_confirmation: null
    }, 429);
  }

  const geminiApiKey = c.env?.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);
  const groqApiKey = c.env?.GROQ_API_KEY || (typeof process !== 'undefined' && process.env?.GROQ_API_KEY);

  const body = await c.req.json().catch(() => ({}));
  const userMessage = (body.message || '').trim();
  const lang = body.language || (/[ঀ-৿]/.test(userMessage) ? 'bn' : 'bn');
  const requestedOffset = parseInt(body.offset) || 0;
  const requestedLimit = 5;

  if (!userMessage) {
    return c.json({
      reply: 'আসসালামু আলাইকুম! বিগ বাজারে আপনাকে স্বাগতম। আপনি আজ কী ধরনের পোশাক বা পণ্য দেখতে চান?',
      products: [],
      quick_replies: ['শাড়ি কালেকশন', 'থ্রি-পিস কালেকশন', 'পারশি কালেকশন', 'ওয়েস্টার্ন টু-পিস', 'ডেলিভারি তথ্য']
    });
  }

  const conn = getDb(c.env);
  const lowerMsg = userMessage.toLowerCase();

  // ── Step 1: Subcategory & Product Keyword Mapping with comprehensive spelling variants ──
  let matchedCategory = null;
  let searchTerm = null;

  if (/saree|sari|saari|saaree|sharee|shari|শাড়ি|শাড়ী/i.test(lowerMsg)) {
    matchedCategory = 'SAREE';
    searchTerm = 'saree';
  } else if (/three|piece|stitched|3\s*piece|থ্রি|পিস|৩\s*পিস/i.test(lowerMsg)) {
    matchedCategory = 'STITCHED-COTTON-THREE-PIECE';
    searchTerm = 'three piece';
  } else if (/parshi|porshi|parsi|পারশি|পারশী/i.test(lowerMsg)) {
    matchedCategory = 'PARSHI';
    searchTerm = 'parshi';
  } else if (/western|2\s*piece|টু\s*পিস|টু-পিস|ওয়েস্টার্ন/i.test(lowerMsg)) {
    matchedCategory = 'WESTERN-2-PIECE';
    searchTerm = 'western';
  } else if (/panjabi|punjabi|পাঞ্জাবি|পাঞ্জাবী/i.test(lowerMsg)) {
    matchedCategory = 'PANJABI';
    searchTerm = 'panjabi';
  } else if (/borka|burqa|abaya|বোরকা|বোরখা|আবায়া/i.test(lowerMsg)) {
    matchedCategory = 'BORKA';
    searchTerm = 'borka';
  } else if (/আরও|more|next/i.test(lowerMsg)) {
    if (body.category_query) {
      matchedCategory = body.category_query;
      searchTerm = body.category_query;
    }
  }


  const hasProductIntent = matchedCategory !== null || 
    lowerMsg.includes('collection') || lowerMsg.includes('কালেকশন') ||
    lowerMsg.includes('price') || lowerMsg.includes('দাম') || lowerMsg.includes('কত') ||
    lowerMsg.includes('dekhaw') || lowerMsg.includes('দেখান') || lowerMsg.includes('show') ||
    lowerMsg.includes('product') || lowerMsg.includes('পণ্য') || lowerMsg.includes('dress') || lowerMsg.includes('পোশাক');

  let productsRes = [];
  let totalAvailable = 0;
  let hasMore = false;

  if (hasProductIntent) {
    let sql = "SELECT id, name, price, original_price, images, image_url, description, category, subcategory, stock_count FROM products WHERE status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL) AND (is_sold_out = 0 OR is_sold_out IS NULL)";
    const params = [];

    if (matchedCategory) {
      sql += " AND (UPPER(subcategory) LIKE ? OR UPPER(name) LIKE ? OR UPPER(category) LIKE ?)";
      params.push(`%${matchedCategory.toUpperCase()}%`, `%${matchedCategory.toUpperCase()}%`, `%${matchedCategory.toUpperCase()}%`);
    } else if (userMessage.length > 2) {
      const cleanKeyword = userMessage.replace(/[^\w\s\u0980-\u09FF]/g, '').trim().split(' ')[0];
      sql += " AND (name LIKE ? OR category LIKE ? OR subcategory LIKE ?)";
      params.push(`%${cleanKeyword}%`, `%${cleanKeyword}%`, `%${cleanKeyword}%`);
    }

    const countSql = sql.replace("SELECT id, name, price, original_price, images, image_url, description, category, subcategory, stock_count", "SELECT COUNT(*) as total");
    try {
      const countRows = await conn.execute(countSql, params);
      totalAvailable = countRows[0]?.total || 0;

      sql += " ORDER BY is_hot DESC, created_at DESC LIMIT ? OFFSET ?";
      params.push(requestedLimit, requestedOffset);

      const rows = await conn.execute(sql, params);
      productsRes = rows.map(r => {
        let imgs = [];
        try { imgs = r.images ? JSON.parse(r.images) : []; } catch (_) {}
        return {
          id: r.id,
          name: r.name,
          price: parseFloat(r.price),
          original_price: r.original_price ? parseFloat(r.original_price) : null,
          image_url: r.image_url || imgs[0] || '',
          description: r.description || '',
          category: r.category || '',
          subcategory: r.subcategory || '',
          stock_count: r.stock_count || 0
        };
      });

      hasMore = (requestedOffset + productsRes.length) < totalAvailable;
    } catch (err) {
      console.error('TiDB query error:', err);
    }
  }

  // ── Step 2: FAQ KB Direct Match ──
  let replyText = '';
  if (productsRes.length === 0) {
    const faqMatch = matchFAQ(userMessage);
    if (faqMatch && faqMatch.entry) {
      replyText = lang === 'bn' ? faqMatch.entry.answer_bn : faqMatch.entry.answer_en;
    }
  }

  // ── Step 3: Google Gemini / Gemma Generation ──
  if (!replyText) {
    try {
      const systemPrompt = `You are BigBazar AI Shopping Assistant for a Bangladeshi fashion store (BigBazar, Baraiyarhat, Mirsarai).
RULES:
1. Reply in 1-2 friendly, polite Bengali sentences (or English if customer speaks English).
2. If products are shown below, mention that you have displayed them below for them to browse or add to cart.
3. Mention that free delivery is available in Mirsarai.`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`;
      const prompt = `Customer says: "${userMessage}". Products in catalog: ${productsRes.length > 0 ? productsRes.map(p => `${p.name} (৳${p.price})`).join(', ') : 'None'}. Give a 1-2 sentence friendly response:`;

      const gRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.3 }
        })
      });
      const gData = await gRes.json();
      replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (e) {
      console.error('Gemini error:', e);
    }
  }

  if (!replyText) {
    if (productsRes.length > 0) {
      replyText = `আমাদের কালেকশন থেকে ${productsRes.length}টি জনপ্রিয় প্রোডাক্ট নিচে দেওয়া হলো:`;
    } else {
      replyText = 'আমি কীভাবে আপনাকে সাহায্য করতে পারি? নিচে আমাদের জনপ্রিয় ক্যাটাগরিগুলো দেখতে পারেন।';
    }
  }

  const categoryQuickReplies = ['শাড়ি কালেকশন', 'থ্রি-পিস কালেকশন', 'পারশি কালেকশন', 'ওয়েস্টার্ন ২-পিস'];

  return c.json({
    reply: replyText,
    products: productsRes,
    total_count: totalAvailable,
    has_more: hasMore,
    current_offset: requestedOffset,
    category_query: matchedCategory || searchTerm || '',
    quick_replies: categoryQuickReplies,
    handoff: false
  });
});


// Admin Conversation Dashboard APIs (Part 3b)
app.get('/admin/conversations/stats', requireAuth, requireAdmin, async (c) => {
  const conn = getDb(c.env);
  try {
    const cutoffActive = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const activeRes = await conn.execute(
      'SELECT COUNT(DISTINCT conversation_id) as active_now FROM messages WHERE created_at >= ?',
      [cutoffActive]
    );
    const todayStr = new Date(Date.now() + 6 * 3600 * 1000).toISOString().split('T')[0];
    const todayRes = await conn.execute(
      "SELECT COUNT(*) as today_total FROM conversations WHERE DATE(created_at) = ?",
      [todayStr]
    );
    return c.json({
      active_now: activeRes[0]?.active_now || 0,
      today_total: todayRes[0]?.today_total || 0
    });
  } catch (err) {
    return c.json({ active_now: 0, today_total: 0 });
  }
});

app.get('/admin/conversations', requireAuth, requireAdmin, async (c) => {
  const conn = getDb(c.env);
  const { limit = 50 } = c.req.query();
  try {
    const sql = `
      SELECT c.id, c.session_id, c.user_id, c.has_order, c.order_id, c.updated_at,
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
             u.name as user_name, u.email as user_email
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.updated_at DESC
      LIMIT ?
    `;
    const rows = await conn.execute(sql, [parseInt(limit)]);
    return c.json({ data: rows });
  } catch (err) {
    return c.json({ data: [] });
  }
});

app.get('/admin/conversations/:id/messages', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id');
  const conn = getDb(c.env);
  try {
    const rows = await conn.execute(
      'SELECT id, role, content, metadata, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );
    return c.json({ data: rows });
  } catch (err) {
    return c.json({ data: [] });
  }
});

// ============================================
// EXPORT FOR CLOUDFLARE PAGES AND LOCAL SERVER
// ============================================
export const onRequest = (context) => {
  return app.fetch(context.request, context.env, context);
};

export default app;
