import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Cloudflare Serverless API
const app = new Hono().basePath('/api');

// Global Error Handler for Debugging
app.onError((err, c) => {
  console.error(err);
  return c.json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: err.stack,
    env_check: {
      has_db_url: !!c.env.DATABASE_URL,
      has_db_host: !!c.env.DB_HOST,
      jwt_secret_set: !!c.env.JWT_SECRET
    }
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
const requireAuth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'No token provided' }, 401);
  try {
    // Use same fallback as sign — so tokens still verify when JWT_SECRET is not yet configured
    const secret = c.env.JWT_SECRET || (typeof process !== 'undefined' && process.env.JWT_SECRET) || 'fallback';
    c.set('user', jwt.verify(token, secret));
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// ============================================
// AUTH ROUTES
// ============================================

app.post('/auth/register', async (c) => {
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

    const regSecret = c.env.JWT_SECRET || (typeof process !== 'undefined' && process.env.JWT_SECRET) || 'fallback';
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
  const { email, mobile, password } = await c.req.json();
  const identifier = email || mobile;
  if (!identifier || !password) return c.json({ error: 'Identifier and Password are required' }, 400);

  const conn = getDb(c.env);
  
  // Resolve JWT secret once — same source used for both sign and verify
  const jwtSecret = c.env.JWT_SECRET || (typeof process !== 'undefined' && process.env.JWT_SECRET) || 'fallback';

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
      const maps = { 
        'Men': ['Men', 'ছেলেদের'], 
        'Women': ['Women', 'মেয়েদের'], 
        'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'], 
        'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)'] 
      };
      const cats = maps[category] || [category];
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

app.post('/products', requireAuth, async (c) => {
  const p = await c.req.json();
  const conn = getDb(c.env);
  const id = p.id || crypto.randomUUID();
  try {
    await conn.execute(
      `INSERT INTO products (serial_no, id, created_at, name, price, original_price, description, category, images, image_url, video_url, status, platform_id, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive)
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.serial_no || null, id, p.name, p.price, p.original_price || null, p.description || '', p.category || 'Women',
        JSON.stringify(p.images || []), p.image_url || null, p.video_url || null, p.status || 'published', p.platform_id || null,
        p.is_sale ? 1 : 0, p.is_hot ? 1 : 0, p.is_new ? 1 : 0, p.is_sold_out ? 1 : 0, p.is_deleted ? 1 : 0,
        JSON.stringify(p.available_sizes || []), JSON.stringify(p.available_colors || []), p.stock_count ?? 3, p.is_exclusive ? 1 : 0
      ]
    );
    return c.json({ success: true, id });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/products/:id', requireAuth, async (c) => {
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

app.delete('/products/:id', requireAuth, async (c) => {
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

  try {
    await conn.execute(
      `INSERT INTO orders (id, product_id, product_name, product_price, customer_name, customer_phone, customer_address, customer_note, delivery_area, delivery_charge, total_amount, last_four_digits, status, size, color, is_advance_paid, is_exclusive_order, payment_status, moderator_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, o.product_id, o.product_name, o.product_price, o.customer_name, o.customer_phone, o.customer_address, o.customer_note || null,
        o.delivery_area || 'Inside Dhaka', o.delivery_charge || 0, o.total_amount, o.last_four_digits || 'COD', 'Pending',
        o.size || null, o.color || null, o.is_advance_paid ? 1 : 0, o.is_exclusive_order ? 1 : 0, o.payment_status || 'Unpaid', o.moderator_reference || null
      ]
    );
    return c.json({ success: true, order_id: id });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/orders/:id', requireAuth, async (c) => {
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
app.delete('/orders', requireAuth, async (c) => {
  const status = c.req.query('status');
  if (!status) return c.json({ error: 'status query param required' }, 400);
  const conn = getDb(c.env);
  await conn.execute('DELETE FROM orders WHERE status = ?', [status]);
  return c.json({ success: true });
});

app.delete('/orders/:id', requireAuth, async (c) => {
  const conn = getDb(c.env);
  await conn.execute('DELETE FROM orders WHERE id = ?', [c.req.param('id')]);
  return c.json({ success: true });
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

app.post('/settings', requireAuth, async (c) => {
  const s = await c.req.json();
  const conn = getDb(c.env);
  await conn.execute(
    'INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [s.key, JSON.stringify(s.value)]
  );
  return c.json({ success: true });
});

// ============================================
// UPLOAD (Placeholder)
// ============================================
app.post('/upload', requireAuth, async (c) => {
  return c.json({ error: 'Local file uploads are not supported on Cloudflare. Please use external URLs.' }, 400);
});

// ============================================
// EXPORT FOR CLOUDFLARE PAGES AND LOCAL SERVER
// ============================================
export const onRequest = (context) => {
  return app.fetch(context.request, context.env, context);
};

export default app;
