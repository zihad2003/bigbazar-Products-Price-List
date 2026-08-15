import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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
    error: 'Internal Server Error', 
    message: err.message
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
  if (!(await checkRateLimitKV(c, 'products', 100, 60000))) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  const { status, category, subcategory, search, page = 0, limit = 12, id, ids, order_by = 'created_at', ascending = 'false' } = c.req.query();
  
  // Sanitize cache key to prevent bot cache-busting
  const safeParams = new URLSearchParams();
  if (status) safeParams.set('status', status);
  if (category) safeParams.set('category', category);
  if (subcategory) safeParams.set('subcategory', subcategory);
  if (search) safeParams.set('search', search);
  safeParams.set('page', String(page));
  safeParams.set('limit', String(limit));
  if (id) safeParams.set('id', id);
  if (ids) safeParams.set('ids', ids);
  safeParams.set('order_by', order_by);
  safeParams.set('ascending', ascending);

  const cacheKey = `cache:products:${safeParams.toString()}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    return c.json(cached);
  }

  const conn = getDb(c.env);

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (id) {
    const res = await conn.execute('SELECT * FROM products WHERE id = ?', [id]);
    const singleData = { data: parseProductRow(res[0]) || null, count: res.length };
    await kvSet(c, cacheKey, singleData, 60);
    c.header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    return c.json(singleData);
  }

  if (ids) {
    const list = ids.split(',').filter(Boolean);
    if (!list.length) return c.json({ data: [], count: 0 });
    const res = await conn.execute(`SELECT * FROM products WHERE id IN (${list.map(() => '?').join(',')})`, list);
    const listData = { data: res.map(parseProductRow), count: res.length };
    await kvSet(c, cacheKey, listData, 60);
    c.header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    return c.json(listData);
  }

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (category && category !== 'All') {
    if (category === 'New') {
      sql += ' AND is_new = 1';
    } else if (category === 'Sale') {
      sql += ' AND is_sale = 1';
    } else if (category === 'Premium') {
      sql += ' AND is_exclusive = 1';
    } else {
      // Support comma-separated categories (e.g., "Men,ছেলেদের")
      const catList = category.split(',').map(c => c.trim()).filter(Boolean);
      const maps = { 
        'Men': ['Men', 'ছেলেদের'], 
        'Women': ['Women', 'মেয়েদের'], 
        'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'], 
        'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)'] 
      };
      // Expand all categories through the map, dedup
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

    sql += ` AND (${conditions.join(' OR ')})`;
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Count
  const countSQL = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countRes = await conn.execute(countSQL, params);
  const total = countRes[0].total;

  // Paginate
  const dir = ascending === 'true' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${order_by === 'created_at' ? 'created_at' : 'serial_no'} ${dir}`;
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(page) * parseInt(limit));

  const res = await conn.execute(sql, params);
  const resultData = { data: res.map(parseProductRow), count: total };
  await kvSet(c, cacheKey, resultData, 60);
  c.header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
  return c.json(resultData);
});

app.get('/products/:id', async (c) => {
  if (!(await checkRateLimitKV(c, 'product_details', 100, 60000))) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  const pid = c.req.param('id');
  const cacheKey = `cache:product:${pid}`;
  const cached = await kvGet(c, cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json(cached);
  }

  const conn = getDb(c.env);
  const res = await conn.execute('SELECT * FROM products WHERE id = ?', [pid]);
  if (!res.length) return c.json({ error: 'Not found' }, 404);
  const resultData = { data: parseProductRow(res[0]) };
  await kvSet(c, cacheKey, resultData, 120);
  c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return c.json(resultData);
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
      `INSERT INTO products (serial_no, id, created_at, name, price, original_price, description, category, images, image_url, video_url, status, platform_id, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive)
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.serial_no || null, id, name, p.price, p.original_price || null, p.description || '', p.category || 'Women',
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
    name: p.name ? toTitleCase(p.name) : p.name, price: p.price, original_price: p.original_price, description: p.description, category: p.category,
    images: p.images !== undefined ? JSON.stringify(p.images) : undefined, image_url: p.image_url, video_url: p.video_url,
    status: p.status, is_sale: p.is_sale !== undefined ? (p.is_sale ? 1 : 0) : undefined,
    is_hot: p.is_hot !== undefined ? (p.is_hot ? 1 : 0) : undefined, is_new: p.is_new !== undefined ? (p.is_new ? 1 : 0) : undefined,
    is_sold_out: p.is_sold_out !== undefined ? (p.is_sold_out ? 1 : 0) : undefined,
    is_deleted: p.is_deleted !== undefined ? (p.is_deleted ? 1 : 0) : undefined,
    available_sizes: p.available_sizes !== undefined ? JSON.stringify(p.available_sizes) : undefined,
    available_colors: p.available_colors !== undefined ? JSON.stringify(p.available_colors) : undefined,
    stock_count: p.stock_count, is_exclusive: p.is_exclusive !== undefined ? (p.is_exclusive ? 1 : 0) : undefined,
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
  return c.json({ success: true });
});

app.delete('/products/:id', requireAuth, requireAdmin, async (c) => {
  const pid = c.req.param('id');
  const conn = getDb(c.env);
  await conn.execute('DELETE FROM products WHERE id = ?', [pid]);
  await kvDelete(c, 'cache:products');
  await kvDelete(c, `cache:product:${pid}`);
  await kvDelete(c, 'cache:subcounts');
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

app.put('/orders/:id', requireAuth, requireAdmin, async (c) => {
  const o = await c.req.json();
  const id = c.req.param('id');
  const conn = getDb(c.env);
  const setClauses = [];
  const params = [];
  const fields = { status: o.status, is_advance_paid: o.is_advance_paid !== undefined ? (o.is_advance_paid ? 1 : 0) : undefined, payment_status: o.payment_status, delivery_charge: o.delivery_charge, total_amount: o.total_amount };
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) { setClauses.push(`${key} = ?`); params.push(val); }
  }
  if (!setClauses.length) return c.json({ success: true });
  params.push(id);
  await conn.execute(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return c.json({ success: true });
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
  try {
    // 1. Get product_id from order
    const orders = await conn.execute('SELECT product_id FROM orders WHERE id = ?', [id]);
    if (orders.length > 0) {
      const productId = orders[0].product_id;
      
      // 2. Delete order
      await conn.execute('DELETE FROM orders WHERE id = ?', [id]);
      
      // 3. Re-increment stock and reset is_sold_out status if it was set
      if (productId) {
        await conn.execute(
          'UPDATE products SET stock_count = stock_count + 1, is_sold_out = 0 WHERE id = ?',
          [productId]
        );
      }
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/orders/track', async (c) => {
  const query = c.req.query('query');
  if (!query) return c.json({ data: [] });
  const conn = getDb(c.env);
  const res = await conn.execute(
    'SELECT * FROM orders WHERE customer_phone = ? OR id = ? ORDER BY created_at DESC',
    [query, query]
  );
  return c.json({ data: res });
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
    c.header('Cache-Control', 'public, max-age=60, s-maxage=600');
    return c.json(cached);
  }

  const conn = getDb(c.env);
  const res = await conn.execute('SELECT * FROM site_settings');
  const settings = {};
  res.forEach(r => {
    try { settings[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value; } catch(e) { settings[r.key] = r.value; }
  });
  const responseData = { data: settings };
  await kvSet(c, cacheKey, responseData, 600);
  c.header('Cache-Control', 'public, max-age=60, s-maxage=600');
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

function getTodayKey() {
  const d = new Date(Date.now() + 6 * 3600 * 1000); // UTC+6 (Bangladesh Time)
  return `site_visitors_${d.toISOString().split('T')[0]}`;
}

app.post('/analytics/ping', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const sessionId = body.session_id || c.req.header('x-session-id') || ('anon-' + Math.random().toString(36).substring(2, 9));
  const isNewSession = !!body.is_new;

  const now = Date.now();
  const conn = getDb(c.env);

  try {
    // 1. Update live session ping in DB
    const res = await conn.execute("SELECT value FROM site_settings WHERE `key` = 'live_pings'");
    let pings = {};
    if (res.length > 0) {
      try { pings = typeof res[0].value === 'string' ? JSON.parse(res[0].value) : (res[0].value || {}); } catch (e) {}
    }
    pings[sessionId] = now;
    // Clean stale sessions older than 90 seconds
    const cutoff = now - 90000;
    Object.keys(pings).forEach(s => {
      if (pings[s] < cutoff) delete pings[s];
    });
    await conn.execute(
      "INSERT INTO site_settings (`key`, value) VALUES ('live_pings', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [JSON.stringify(pings)]
    );

    // 2. Increment Today & Lifetime Total Counters
    if (isNewSession) {
      const todayKey = getTodayKey();
      const tRes = await conn.execute("SELECT value FROM site_settings WHERE `key` = ?", [todayKey]);
      let todayCount = 0;
      if (tRes.length > 0) {
        try { todayCount = parseInt(typeof tRes[0].value === 'string' ? JSON.parse(tRes[0].value) : tRes[0].value) || 0; } catch (e) { todayCount = parseInt(tRes[0].value) || 0; }
      }
      await conn.execute(
        "INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
        [todayKey, JSON.stringify(todayCount + 1)]
      );

      const totRes = await conn.execute("SELECT value FROM site_settings WHERE `key` = 'site_visitors'");
      let totalCount = 0;
      if (totRes.length > 0) {
        try { totalCount = parseInt(typeof totRes[0].value === 'string' ? JSON.parse(totRes[0].value) : totRes[0].value) || 0; } catch (e) { totalCount = parseInt(totRes[0].value) || 0; }
      }
      await conn.execute(
        "INSERT INTO site_settings (`key`, value) VALUES ('site_visitors', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
        [JSON.stringify(totalCount + 1)]
      );
    }
  } catch (err) {
    console.error('Analytics ping DB update error:', err);
  }

  return c.json({ success: true });
});

app.get('/analytics/stats', async (c) => {
  const now = Date.now();
  const conn = getDb(c.env);
  const todayKey = getTodayKey();
  let todayCount = 0;
  let totalCount = 0;
  let onlineNow = 1;

  try {
    const res = await conn.execute(
      "SELECT `key`, value FROM site_settings WHERE `key` IN (?, 'site_visitors', 'live_pings')",
      [todayKey]
    );
    res.forEach(r => {
      let val = 0;
      if (r.key === 'live_pings') {
        try {
          const pings = typeof r.value === 'string' ? JSON.parse(r.value) : (r.value || {});
          const cutoff = now - 90000;
          const activeCount = Object.keys(pings).filter(s => pings[s] >= cutoff).length;
          if (activeCount > 0) onlineNow = activeCount;
        } catch (e) {}
      } else {
        try { val = parseInt(typeof r.value === 'string' ? JSON.parse(r.value) : r.value) || 0; } catch (e) { val = parseInt(r.value) || 0; }
        if (r.key === todayKey) todayCount = val;
        if (r.key === 'site_visitors') totalCount = val;
      }
    });
  } catch (err) {
    console.error('Analytics stats fetch error:', err);
  }

  return c.json({
    success: true,
    online_now: onlineNow,
    today_count: todayCount,
    total_count: totalCount
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

    // Upsert into users table
    const conn = getDb(c.env);

    // Try to create the users table if it doesn't exist
    try {
      await conn.execute(`CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        google_id VARCHAR(128) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        phone VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_google (google_id),
        INDEX idx_email (email)
      )`);
    } catch (_) { /* Table may already exist */ }

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
  const conn = getDb(c.env);
  try {
    const rows = await conn.execute('SELECT id, name, email, avatar_url, phone, created_at FROM users WHERE id = ?', [customer.id]);
    if (rows.length === 0) return c.json({ error: 'User not found' }, 404);
    return c.json({ user: rows[0] });
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
// AI SHOPPING ASSISTANT & CONVERSATIONS (Part 3 & 3b)
// ============================================

/**
 * Keyword & Regex Intent Classification Gate.
 * Runs BEFORE any expensive product or order DB reads.
 */
function classifyIntent(message) {
  const text = (message || '').toLowerCase().trim();

  // Order status pattern
  if (
    text.includes('where is my order') ||
    text.includes('order status') ||
    text.includes('অর্ডার স্ট্যাটাস') ||
    text.includes('অর্ডার কোথায়') ||
    text.includes('আমার অর্ডার') ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}\b/i.test(text)
  ) {
    return 'order_status';
  }

  // Order intent pattern
  if (
    text.includes('buy') ||
    text.includes('order') ||
    text.includes('অর্ডার করব') ||
    text.includes('কিনতে চাই') ||
    text.includes('অর্ডার দিতে চাই') ||
    text.includes('bkash') ||
    text.includes(' বিকাশ') ||
    text.includes('cod') ||
    text.includes('ক্যাশ অন ডেলিভারি') ||
    text.includes('checkout')
  ) {
    return 'order_intent';
  }

  // Product search pattern
  if (
    text.includes('saree') || text.includes('শাড়ি') || text.includes('শাড়ি') ||
    text.includes('borka') || text.includes('বোরকা') || text.includes('abaya') || text.includes('আবায়া') ||
    text.includes('panjabi') || text.includes('পাঞ্জাবি') || text.includes('kabli') ||
    text.includes('three-piece') || text.includes('থ্রি-পিস') || text.includes('dress') || text.includes('ফ্রক') ||
    text.includes('kids') || text.includes('বাচ্চা') || text.includes('shirt') || text.includes('pant') ||
    text.includes('price') || text.includes('দাম') || text.includes('কত') || text.includes('কলেকশন') ||
    text.includes('collection') || text.includes('show') || text.includes('দেখান') || text.includes('আছে')
  ) {
    return 'product_search';
  }

  // Chit-chat pattern (greetings, thanks, basic queries)
  if (
    text.length < 15 ||
    /^(hi|hello|hey|assalamu|হাই|হ্যালো|সালাম|কেমন আছেন|ধন্যবাদ|thanks|thank you|bye|আল্লাহ হাফেজ|ok|ঠিক আছে)$/i.test(text) ||
    !/[a-z0-9\u0980-\u09FF]/.test(text)
  ) {
    return 'chit_chat';
  }

  return 'product_search'; // default fallback for detailed messages
}

/**
 * Execute DB helper tools for AI Assistant
 */
async function executeAssistantTool(conn, toolName, args, c) {
  if (toolName === 'search_products') {
    const { query = '', category = '', max_price = null } = args;
    let sql = "SELECT * FROM products WHERE status = 'published' AND (is_deleted = 0 OR is_deleted IS NULL)";
    const params = [];
    if (category && category !== 'All') {
      sql += ' AND category LIKE ?';
      params.push(`%${category}%`);
    }
    if (max_price) {
      sql += ' AND price <= ?';
      params.push(parseFloat(max_price));
    }
    if (query) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR subcategory LIKE ?)';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    sql += ' ORDER BY is_hot DESC, created_at DESC LIMIT 6';
    const rows = await conn.execute(sql, params);
    return rows.map(parseProductRow);
  }

  if (toolName === 'check_order_status') {
    const { order_number } = args;
    if (!order_number) return [];
    const rows = await conn.execute(
      'SELECT id, status, total_amount, created_at, delivery_area FROM orders WHERE id LIKE ? OR customer_phone LIKE ? ORDER BY created_at DESC LIMIT 3',
      [`%${order_number}%`, `%${order_number}%`]
    );
    return rows;
  }

  if (toolName === 'place_order') {
    const aiOrdersEnabled = (c.env?.ENABLE_AI_ORDERS === 'true') || (typeof process !== 'undefined' && process.env?.ENABLE_AI_ORDERS === 'true');
    if (!aiOrdersEnabled) {
      return {
        status: 'disabled',
        message: 'Order creation via AI is currently soft-launched in inquiry mode. Customer details noted!'
      };
    }
    // Call order placement logic if enabled
    const { product_id, quantity = 1, size = null, color = null, customer_name, phone, address, payment_method = 'cod' } = args;
    if (!product_id || !customer_name || !phone || !address) {
      return { error: 'Missing required order fields (product_id, name, phone, address)' };
    }
    const orderId = crypto.randomUUID();
    const prods = await conn.execute('SELECT name, price FROM products WHERE id = ?', [product_id]);
    if (prods.length === 0) return { error: 'Product not found' };

    const prod = prods[0];
    const subtotal = parseFloat(prod.price || 0) * (parseInt(quantity) || 1);
    const delCharge = address.toLowerCase().includes('mirsharai') || address.toLowerCase().includes('মিরসরাই') ? 0 : 150;
    const total = subtotal + delCharge;

    await conn.execute(
      `INSERT INTO orders (id, product_id, product_name, product_price, customer_name, customer_phone, customer_address, delivery_area, delivery_charge, total_amount, last_four_digits, status, size, color, is_advance_paid, payment_status, customer_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Unpaid', ?)`,
      [
        orderId, product_id, `${prod.name} (Qty: ${quantity})`, subtotal, customer_name, phone, address,
        delCharge === 0 ? 'mirsarai' : 'outside', delCharge, total, payment_method.toUpperCase(), 'Pending',
        size, color, `Placed via AI Assistant (${payment_method})`
      ]
    );
    return { success: true, order_id: orderId, total_amount: total };
  }

  return null;
}

// POST /api/assistant — Main AI Shopping Assistant Endpoint
app.post('/assistant', optionalCustomerAuth, async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  if (!checkRateLimit(ip, 'assistant', 20, 60000)) {
    return c.json({
      reply: "আপনি খুব বেশি মেসেজ পাঠাচ্ছেন। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন। (Too many messages. Please try again in 1 minute.)",
      products: [],
      quick_replies: ["শাড়ি কালেকশন", "পাঞ্জাবি কালেকশন", "বাচ্চাদের পোশাক"],
      order_confirmation: null
    }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const sessionId = body.session_id || 'anon-session-' + Date.now();
  const userMessage = (body.message || '').trim();
  const customer = c.get('customer');
  const userId = customer?.id || null;

  if (!userMessage) {
    return c.json({
      reply: "আমি কীভাবে আপনাকে সাহায্য করতে পারি? (How can I assist you today?)",
      products: [],
      quick_replies: ["শাড়ি কালেকশন", "বোরকা ও আবায়া", "পাঞ্জাবি", "বাচ্চাদের পোশাক"],
      order_confirmation: null
    });
  }

  const conn = getDb(c.env);

  // Ensure conversations & messages tables exist
  try {
    await conn.execute(`CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(36) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      has_order BOOLEAN DEFAULT FALSE,
      order_id VARCHAR(36) DEFAULT NULL,
      INDEX idx_session (session_id),
      INDEX idx_updated (updated_at DESC)
    )`);
    await conn.execute(`CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      role ENUM('user', 'assistant', 'system') NOT NULL,
      content TEXT NOT NULL,
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_conversation (conversation_id, created_at)
    )`);
  } catch (_) {}

  // Get or Create Conversation
  let conversationId;
  try {
    const existing = await conn.execute('SELECT id FROM conversations WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1', [sessionId]);
    if (existing.length > 0) {
      conversationId = existing[0].id;
      if (userId) {
        await conn.execute('UPDATE conversations SET user_id = ? WHERE id = ?', [userId, conversationId]);
      }
    } else {
      conversationId = crypto.randomUUID();
      await conn.execute(
        'INSERT INTO conversations (id, session_id, user_id) VALUES (?, ?, ?)',
        [conversationId, sessionId, userId]
      );
    }

    // Log User Message
    await conn.execute(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), conversationId, 'user', userMessage]
    );
  } catch (err) {
    console.error('Conversation logging error:', err);
  }

  // 1. Intent Gate
  const intent = classifyIntent(userMessage);

  let replyText = "";
  let productsRes = [];
  let quickReplies = ["শাড়ি কালেকশন", "বোরকা ও আবায়া", "পাঞ্জাবি", "বাচ্চাদের ড্রেস"];
  let orderConfirm = null;

  try {
    if (intent === 'chit_chat') {
      const lower = userMessage.toLowerCase();
      if (lower.includes('সালাম') || lower.includes('assalamu') || lower.includes('hi') || lower.includes('hello')) {
        replyText = "আসসালামু আলাইকুম! BigBazar AI শপিং অ্যাসিস্ট্যান্টে স্বাগতম। 🛍️ আজ আপনাকে কী কালেকশন দেখাতে পারি?";
      } else if (lower.includes('কেমন') || lower.includes('how are you')) {
        replyText = "আলহামদুলিল্লাহ্‌ ভালো আছি! আপনি কেমন আছেন? আমাদের নতুন শাড়ি, পাঞ্জাবি ও বাচ্চাদের ড্রেস কালেকশন দেখতে পারেন।";
      } else if (lower.includes('ধন্যবাদ') || lower.includes('thanks')) {
        replyText = "আপনাকেও অসংখ্য ধন্যবাদ! BigBazar-এ ভিজিট করার জন্য কৃতজ্ঞ। যেকোনো প্রয়োজনে আমাদের জানান। 😊";
      } else {
        replyText = "BigBazar-এ আপনাকে স্বাগতম! আমাদের সেরা লেটেস্ট শাড়ি, বোরকা, পাঞ্জাবি ও বাচ্চাদের পোশাক দেখতে যেকোনো একটি সিলেক্ট করুন বা লিখে জানান।";
      }
    } else if (intent === 'order_status') {
      const statusResults = await executeAssistantTool(conn, 'check_order_status', { order_number: userMessage }, c);
      if (statusResults && statusResults.length > 0) {
        const ord = statusResults[0];
        replyText = `আপনার অর্ডার ID: **${ord.id.substring(0, 8)}...**\nস্ট্যাটাস: **${ord.status}**\nমোট মূল্য: ৳${ord.total_amount}`;
      } else {
        replyText = "আপনার অর্ডারের সঠিক ট্র্যাকিং নম্বর বা মোবাইল নম্বরটি দিন। আমরা স্ট্যাটাস চেক করে দিচ্ছি।";
      }
      quickReplies = ["অর্ডার ট্র্যাকিং সাহায্য", "নতুন কেনাকাটা করুন", "কাস্টমার কেয়ার"];
    } else {
      // product_search or order_intent -> Fetch top matching products
      const searchResults = await executeAssistantTool(conn, 'search_products', { query: userMessage }, c);
      productsRes = searchResults || [];

      if (productsRes.length > 0) {
        const names = productsRes.slice(0, 3).map(p => `**${p.name}**`).join(', ');
        replyText = `আমাদের **BigBazar Premium Collection** থেকে আপনার পছন্দের কিছু আইটেম:\n${names}\n\nআপনার পছন্দের সাইজ ও কালার সিলেক্ট করে সরাসরি ব্যাগ এ যুক্ত করুন অথবা আমাদের এখানে জানাতে পারেন।`;
      } else {
        replyText = "দুঃখিত, এই মুহূর্তে এই আইটেমটি আমাদের স্টক এ খুঁজে পাওয়া যায়নি। তবে আমাদের জনপ্রিয় শাড়ি, বোরকা বা পাঞ্জাবি কালেকশন দেখতে পারেন!";
      }

      if (intent === 'order_intent') {
        replyText += "\n\nঅর্ডার করতে চাইলে আপনার নাম, ফোন নম্বর, ঠিকানা এবং সাইজটি মেসেজে লিখুন।";
      }
    }
  } catch (err) {
    console.error('AI assistant processing error:', err);
    replyText = "দুঃখিত, তথ্য প্রসেস করতে সাময়িক সমস্যা হয়েছে। আপনি আবার চেষ্টা করতে পারেন বা সরাসরি মেসেঞ্জারে যোগাযোগ করতে পারেন।";
  }

  // Format response JSON
  const finalResponse = {
    reply: replyText,
    products: productsRes.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url || (p.images && p.images[0]) || '',
      description: p.description || ''
    })),
    quick_replies: quickReplies,
    order_confirmation: orderConfirm
  };

  // Log Assistant Response
  if (conversationId) {
    try {
      await conn.execute(
        'INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), conversationId, 'assistant', replyText, JSON.stringify(finalResponse)]
      );
    } catch (_) {}
  }

  return c.json(finalResponse);
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
