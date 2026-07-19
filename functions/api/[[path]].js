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
  // Periodically clean up expired keys (every 5 minutes)
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
    return true; // allowed
  }

  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true; // allowed
  }

  if (record.count >= limit) {
    return false; // blocked
  }

  record.count += 1;
  return true; // allowed
};

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
                   origin.endsWith('.bigbazarbariarhat.pages.dev');
  
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
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  if (!checkRateLimit(ip, 'register', 3, 60000)) {
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
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  if (!checkRateLimit(ip, 'login', 5, 60000)) {
    return c.json({ error: 'Too many login attempts. Please try again after a minute.' }, 429);
  }

  const { email, mobile, password } = await c.req.json();
  const identifier = email || mobile;
  if (!identifier || !password) return c.json({ error: 'Identifier and Password are required' }, 400);

  const conn = getDb(c.env);
  
  // Resolve JWT secret once — same source used for both sign and verify
  const jwtSecret = getJwtSecret(c);

  // Check Admin
  const admins = await conn.execute('SELECT * FROM admin_users WHERE email = ?', [identifier]);
  if (admins.length > 0) {
    const user = admins[0];
    const cleanInput = password.trim();
    const cleanHash = (user.password_hash || '').trim();

    // Use async compare — bcrypt.compareSync blocks the event loop and can
    // exceed Cloudflare Workers' 50 ms CPU budget on cold starts.
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

app.get('/products', async (c) => {
  const { status, category, search, page = 0, limit = 12, id, ids, order_by = 'created_at', ascending = 'false' } = c.req.query();
  const conn = getDb(c.env);

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (id) {
    const res = await conn.execute('SELECT * FROM products WHERE id = ?', [id]);
    return c.json({ data: parseProductRow(res[0]) || null, count: res.length });
  }

  if (ids) {
    const list = ids.split(',').filter(Boolean);
    if (!list.length) return c.json({ data: [], count: 0 });
    const res = await conn.execute(`SELECT * FROM products WHERE id IN (${list.map(() => '?').join(',')})`, list);
    return c.json({ data: res.map(parseProductRow), count: res.length });
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
  return c.json({ data: res.map(parseProductRow), count: total });
});

app.get('/products/:id', async (c) => {
  const conn = getDb(c.env);
  const res = await conn.execute('SELECT * FROM products WHERE id = ?', [c.req.param('id')]);
  if (!res.length) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: parseProductRow(res[0]) });
});

app.post('/products', requireAuth, requireAdmin, async (c) => {
  const p = await c.req.json();
  const conn = getDb(c.env);
  const id = p.id || crypto.randomUUID();
  try {
    await conn.execute(
      `INSERT INTO products (serial_no, id, created_at, name, price, original_price, description, category, images, image_url, video_url, status, platform_id, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive)
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.serial_no || null, id, p.name, p.price, p.original_price || null, p.description || '', p.category || 'Women',
        JSON.stringify(p.images || []), p.image_url || null, p.video_url || '', p.status || 'published', p.platform_id || null,
        p.is_sale ? 1 : 0, p.is_hot ? 1 : 0, p.is_new ? 1 : 0, p.is_sold_out ? 1 : 0, p.is_deleted ? 1 : 0,
        JSON.stringify(p.available_sizes || []), JSON.stringify(p.available_colors || []), p.stock_count ?? 3, p.is_exclusive ? 1 : 0
      ]
    );
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
    name: p.name, price: p.price, original_price: p.original_price, description: p.description, category: p.category,
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
  return c.json({ success: true });
});

app.delete('/products/:id', requireAuth, requireAdmin, async (c) => {
  const conn = getDb(c.env);
  await conn.execute('DELETE FROM products WHERE id = ?', [c.req.param('id')]);
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

app.post('/orders', async (c) => {
  const o = await c.req.json();
  const conn = getDb(c.env);
  const id = crypto.randomUUID();

  if (!o.product_id) {
    return c.json({ error: 'Product ID is required' }, 400);
  }

  const tx = await conn.begin();
  try {
    // 1. Fetch product and lock the row for update inside transaction
    const products = await tx.execute(
      'SELECT name, stock_count, is_sold_out, is_deleted, status FROM products WHERE id = ? FOR UPDATE',
      [o.product_id]
    );

    if (products.length === 0) {
      await tx.rollback();
      return c.json({ error: 'Product not found' }, 404);
    }

    const product = products[0];
    if (product.is_deleted || product.status !== 'published') {
      await tx.rollback();
      return c.json({ error: 'This product is no longer available' }, 400);
    }

    if (product.stock_count <= 0 || product.is_sold_out) {
      await tx.rollback();
      return c.json({ error: `Product "${product.name}" is out of stock` }, 400);
    }

    // 2. Decrement stock
    await tx.execute(
      'UPDATE products SET stock_count = stock_count - 1, is_sold_out = CASE WHEN stock_count <= 1 THEN 1 ELSE is_sold_out END WHERE id = ?',
      [o.product_id]
    );

    // 3. Create the order
    await tx.execute(
      `INSERT INTO orders (id, product_id, product_name, product_price, customer_name, customer_phone, customer_address, customer_note, delivery_area, delivery_charge, total_amount, last_four_digits, status, size, color, is_advance_paid, is_exclusive_order, payment_status, moderator_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, o.product_id, o.product_name, o.product_price, o.customer_name, o.customer_phone, o.customer_address, o.customer_note || null,
        o.delivery_area || 'Inside Dhaka', o.delivery_charge || 0, o.total_amount, o.last_four_digits || 'COD', 'Pending',
        o.size || null, o.color || null, o.is_advance_paid ? 1 : 0, o.is_exclusive_order ? 1 : 0, o.payment_status || 'Unpaid', o.moderator_reference || null
      ]
    );

    await tx.commit();
    return c.json({ success: true, order_id: id });
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
  const pid = c.req.query('product_id');
  const conn = getDb(c.env);
  const res = await conn.execute('SELECT * FROM reviews' + (pid ? ' WHERE product_id = ?' : '') + ' ORDER BY created_at DESC', pid ? [pid] : []);
  return c.json({ data: res });
});

app.post('/reviews', async (c) => {
  const r = await c.req.json();
  const conn = getDb(c.env);
  const id = crypto.randomUUID();
  await conn.execute(
    'INSERT INTO reviews (id, rating, comment, customer_name, product_id, product_name) VALUES (?, ?, ?, ?, ?, ?)',
    [id, r.rating || 5, r.comment, r.customer_name, r.product_id, r.product_name]
  );
  return c.json({ success: true, id });
});

// ============================================
// SETTINGS
// ============================================
app.get('/settings', async (c) => {
  const conn = getDb(c.env);
  const res = await conn.execute('SELECT * FROM site_settings');
  const settings = {};
  res.forEach(r => {
    try { settings[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value; } catch(e) { settings[r.key] = r.value; }
  });
  return c.json({ data: settings });
});

app.post('/settings', requireAuth, requireAdmin, async (c) => {
  const s = await c.req.json();
  const conn = getDb(c.env);
  await conn.execute(
    'INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [s.key, JSON.stringify(s.value)]
  );
  return c.json({ success: true });
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
// EXPORT FOR CLOUDFLARE PAGES AND LOCAL SERVER
// ============================================
export const onRequest = (context) => {
  return app.fetch(context.request, context.env, context);
};

export default app;
