import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { connect } from '@tidbcloud/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = new Hono().basePath('/api');

// Helper to get connection to TiDB
const getConn = (env) => {
  return connect({
    url: `mysql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}?ssl={"rejectUnauthorized":true}`
  });
};

// ============================================
// Admin 2FA — In-Memory Store (Ephemeral on Workers!)
// NOTE: On Cloudflare Workers, this resets every time the worker sleeps.
// For production, use KV or Durable Objects. For now, matching original logic.
// ============================================
const pendingAdminCodes = new Map();

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

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
    c.set('user', jwt.verify(token, c.env.JWT_SECRET));
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

  const conn = getConn(c.env);
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);

  try {
    await conn.execute(
      'INSERT INTO customers (id, name, email, mobile, password_hash) VALUES (?, ?, ?, ?, ?)',
      [id, name || null, email || null, mobile, hash]
    );

    const token = jwt.sign({ id, mobile, type: 'customer' }, c.env.JWT_SECRET, { expiresIn: '30d' });
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

  const conn = getConn(c.env);
  
  // Check Admin
  const admins = await conn.execute('SELECT * FROM admin_users WHERE email = ?', [identifier]);
  if (admins.rows.length > 0) {
    const user = admins.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

    const loginId = crypto.randomUUID();
    const code = generateCode();
    pendingAdminCodes.set(loginId, {
      code,
      email: user.email,
      adminId: user.id,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    
    console.log(`\n🔐 ADMIN LOGIN CODE: ${code}\n`);
    return c.json({ step: 2, login_id: loginId });
  }

  // Check Customer
  const customers = await conn.execute('SELECT * FROM customers WHERE email = ? OR mobile = ?', [identifier, identifier]);
  if (customers.rows.length === 0) return c.json({ error: 'Invalid credentials' }, 401);

  const user = customers.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

  const token = jwt.sign({ id: user.id, mobile: user.mobile, type: 'customer' }, c.env.JWT_SECRET, { expiresIn: '30d' });
  return c.json({
    session: { access_token: token, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile } },
    user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile }
  });
});

app.post('/auth/verify-2fa', async (c) => {
  const { login_id, code } = await c.req.json();
  const entry = pendingAdminCodes.get(login_id);

  if (!entry || entry.expiresAt < Date.now()) return c.json({ error: 'Code expired or invalid' }, 401);
  if (entry.code !== code) return c.json({ error: 'Incorrect code' }, 401);

  const token = jwt.sign({ id: entry.adminId, email: entry.email, type: 'admin' }, c.env.JWT_SECRET, { expiresIn: '24h' });
  pendingAdminCodes.delete(login_id);

  return c.json({
    session: { access_token: token, user: { id: entry.adminId, email: entry.email, type: 'admin' } },
    user: { id: entry.adminId, email: entry.email }
  });
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
  const conn = getConn(c.env);

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (id) {
    const res = await conn.execute('SELECT * FROM products WHERE id = ?', [id]);
    return c.json({ data: parseProductRow(res.rows[0]) || null, count: res.rows.length });
  }

  if (ids) {
    const list = ids.split(',').filter(Boolean);
    if (!list.length) return c.json({ data: [], count: 0 });
    const res = await conn.execute(`SELECT * FROM products WHERE id IN (${list.map(() => '?').join(',')})`, list);
    return c.json({ data: res.rows.map(parseProductRow), count: res.rows.length });
  }

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (category && category !== 'All') {
    const maps = { 'Men': ['Men', 'ছেলেদের'], 'Women': ['Women', 'মেয়েদের'], 'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'], 'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)'] };
    const cats = maps[category] || [category];
    sql += ` AND category IN (${cats.map(() => '?').join(',')})`;
    params.push(...cats);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Count
  const countSQL = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countRes = await conn.execute(countSQL, params);
  const total = countRes.rows[0].total;

  // Paginate
  const dir = ascending === 'true' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${order_by === 'created_at' ? 'created_at' : 'serial_no'} ${dir}`;
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(page) * parseInt(limit));

  const res = await conn.execute(sql, params);
  return c.json({ data: res.rows.map(parseProductRow), count: total });
});

app.get('/products/:id', async (c) => {
  const conn = getConn(c.env);
  const res = await conn.execute('SELECT * FROM products WHERE id = ?', [c.req.param('id')]);
  if (!res.rows.length) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: parseProductRow(res.rows[0]) });
});

// ============================================
// ORDER ROUTES
// ============================================

app.post('/orders', async (c) => {
  const order = await c.req.json();
  const conn = getConn(c.env);
  const id = crypto.randomUUID();

  try {
    await conn.execute(
      `INSERT INTO orders (id, product_id, product_name, product_price, customer_name, customer_phone, customer_address, customer_note, delivery_area, delivery_charge, total_amount, last_four_digits, status, size, color, is_advance_paid, is_exclusive_order, payment_status, moderator_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, order.product_id, order.product_name, order.product_price,
        order.customer_name, order.customer_phone, order.customer_address, order.customer_note || null,
        order.delivery_area, order.delivery_charge || 0, order.total_amount,
        order.last_four_digits || null, 'Pending', order.size || null, order.color || null,
        order.is_advance_paid ? 1 : 0, order.is_exclusive_order ? 1 : 0,
        order.payment_status || 'Unpaid', order.moderator_reference || null
      ]
    );
    return c.json({ success: true, order_id: id });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/orders/track', async (c) => {
  const query = c.req.query('query');
  if (!query) return c.json({ data: [] });
  const conn = getConn(c.env);
  const res = await conn.execute(
    'SELECT * FROM orders WHERE customer_phone = ? OR id = ? ORDER BY created_at DESC',
    [query, query]
  );
  return c.json({ data: res.rows });
});

// ============================================
// SETTINGS
// ============================================
app.get('/settings', async (c) => {
  const conn = getConn(c.env);
  const res = await conn.execute('SELECT * FROM site_settings');
  const settings = {};
  res.rows.forEach(r => {
    try { settings[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value; } catch(e) { settings[r.key] = r.value; }
  });
  return c.json({ data: settings });
});

// ============================================
// EXPORT FOR CLOUDFLARE PAGES
// ============================================
export const onRequest = (context) => {
  return app.fetch(context.request, context.env, context);
};
