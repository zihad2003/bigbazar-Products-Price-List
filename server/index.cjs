/**
 * BigBazar Express API Server
 * Replaces Supabase with MySQL backend
 */
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bigbazar_secret_key_2026';

// ============================================
// Admin 2FA — In-Memory Pending Code Store
// ============================================
const pendingAdminCodes = new Map(); // login_id → { code, email, adminId, expiresAt, attempts }

function generateCode() {
    return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit, never starts with 0
}

function cleanExpiredCodes() {
    const now = Date.now();
    for (const [id, entry] of pendingAdminCodes) {
        if (entry.expiresAt < now) pendingAdminCodes.delete(id);
    }
}

// ============================================
// MySQL Connection Pool
// ============================================
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'bigbazar',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    ssl: process.env.DB_SSL === 'true' ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    } : null
});

// ============================================
// Middleware
// ============================================
app.use(cors({
    origin: (origin, callback) => {
        // Allow any localhost port in dev, plus production domain
        if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || origin === 'https://bigbazarbariarhat.pages.dev' || /\.bigbazarbariarhat\.pages\.dev$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// File upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Auth middleware
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// ============================================
// AUTH ROUTES (Admin & Customer)
// ============================================

// Initialize Tables
async function initTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id VARCHAR(255) PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                mobile VARCHAR(20) UNIQUE,
                password_hash VARCHAR(255),
                address TEXT,
                avatar_url TEXT,
                status VARCHAR(50) DEFAULT 'active'
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id CHAR(36) NOT NULL PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                serial_no INT,
                id CHAR(36) NOT NULL PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                name VARCHAR(500),
                price VARCHAR(50),
                original_price VARCHAR(50) DEFAULT NULL,
                description TEXT,
                category VARCHAR(100),
                images JSON,
                image_url TEXT,
                video_url TEXT,
                status VARCHAR(50) DEFAULT 'published',
                platform_id VARCHAR(100),
                is_sale TINYINT(1) DEFAULT 0,
                is_hot TINYINT(1) DEFAULT 0,
                is_new TINYINT(1) DEFAULT 0,
                is_sold_out TINYINT(1) DEFAULT 0,
                is_deleted TINYINT(1) DEFAULT 0,
                available_sizes JSON,
                available_colors JSON,
                stock_count INT DEFAULT 3,
                is_exclusive TINYINT(1) DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id CHAR(36) NOT NULL PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                product_id CHAR(36),
                product_name VARCHAR(1000),
                product_price DECIMAL(10,2),
                customer_name VARCHAR(255),
                customer_phone VARCHAR(50),
                customer_address TEXT,
                customer_note TEXT,
                delivery_area VARCHAR(100),
                delivery_charge DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2),
                last_four_digits VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Pending',
                size VARCHAR(255),
                color VARCHAR(255),
                is_advance_paid TINYINT(1) DEFAULT 0,
                is_exclusive_order TINYINT(1) DEFAULT 0,
                payment_status VARCHAR(50) DEFAULT 'Unpaid',
                moderator_reference VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id CHAR(36) NOT NULL PRIMARY KEY,
                rating INT DEFAULT 5,
                comment TEXT,
                customer_name VARCHAR(255),
                product_id CHAR(36),
                product_name VARCHAR(500),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                \`key\` VARCHAR(100) NOT NULL UNIQUE,
                value JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ All tables verified");
    } catch (err) {
        console.error("❌ Table init error:", err);
    }
}
initTables();

// Customer Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;
        if (!mobile || !password) return res.status(400).json({ error: 'Mobile and Password are required' });

        const id = randomUUID();
        const hash = await bcrypt.hash(password, 10);
        
        await pool.query(
            'INSERT INTO customers (id, name, email, mobile, password_hash) VALUES (?, ?, ?, ?, ?)',
            [id, name || null, email || null, mobile, hash]
        );

        const token = jwt.sign({ id, mobile, type: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            session: { access_token: token, user: { id, name, email, mobile } },
            user: { id, name, email, mobile }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email or Mobile already exists' });
        res.status(500).json({ error: err.message });
    }
});

// Admin/Customer Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, mobile, password } = req.body;
        const identifier = email || mobile;
        if (!identifier || !password) return res.status(400).json({ error: 'Identifier and Password are required' });

        // Check Admin first — requires 2FA code step
        const [admins] = await pool.query('SELECT * FROM admin_users WHERE email = ?', [identifier]);
        if (admins.length > 0) {
            const user = admins[0];
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

            cleanExpiredCodes();
            const loginId = randomUUID();
            const code = generateCode();
            pendingAdminCodes.set(loginId, {
                code,
                email: user.email,
                adminId: user.id,
                expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
            });
            console.log(`\n🔐 ADMIN LOGIN CODE for ${user.email}: ${code}\n`);
            return res.json({ step: 2, login_id: loginId });
        }

        // Check Customer
        const [customers] = await pool.query('SELECT * FROM customers WHERE email = ? OR mobile = ?', [identifier, identifier]);
        if (customers.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = customers[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, mobile: user.mobile, type: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            session: { access_token: token, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: 'customer' } },
            user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: 'customer' }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/session', requireAuth, (req, res) => {
    res.json({ session: { user: req.user }, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
});

// Step 2: Verify 4-digit admin code
app.post('/api/auth/verify-code', (req, res) => {
    cleanExpiredCodes();
    const { login_id, code } = req.body;
    if (!login_id || !code) return res.status(400).json({ error: 'login_id and code are required' });

    const entry = pendingAdminCodes.get(login_id);
    if (!entry) return res.status(401).json({ error: 'Code expired or invalid. Please login again.' });

    // Brute-force protection: max 5 wrong attempts
    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.attempts > 5) {
        pendingAdminCodes.delete(login_id);
        return res.status(429).json({ error: 'Too many wrong attempts. Please login again.' });
    }

    if (entry.code !== String(code)) {
        return res.status(401).json({ error: `Wrong code. ${5 - entry.attempts} attempt(s) remaining.` });
    }

    pendingAdminCodes.delete(login_id);
    const token = jwt.sign({ id: entry.adminId, email: entry.email, type: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
        session: { access_token: token, user: { id: entry.adminId, email: entry.email, role: 'admin' } },
        user: { id: entry.adminId, email: entry.email, role: 'admin' }
    });
});

// View pending admin login codes (requires existing admin session)
app.get('/api/auth/pending-codes', requireAuth, (req, res) => {
    if (req.user.type !== 'admin') return res.status(403).json({ error: 'Admin only' });
    cleanExpiredCodes();
    const codes = [];
    for (const [login_id, entry] of pendingAdminCodes) {
        codes.push({
            login_id,
            email: entry.email,
            code: entry.code,
            expires_in: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000))
        });
    }
    res.json({ codes });
});

// ============================================
// PRODUCTS ROUTES
// ============================================
app.get('/api/products', async (req, res) => {
    try {
        const { status, category, search, page = 0, limit = 12, id, ids, order_by = 'created_at', ascending = 'false' } = req.query;

        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        if (id) {
            sql += ' AND id = ?';
            params.push(id);
            const [rows] = await pool.query(sql, params);
            return res.json({ data: rows[0] || null, count: rows.length });
        }

        if (ids) {
            const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
            if (idList.length === 0) return res.json({ data: [], count: 0 });
            sql += ` AND id IN (${idList.map(() => '?').join(',')})`;
            params.push(...idList);
            const [rows] = await pool.query(sql, params);
            return res.json({ data: rows.map(parseProductRow), count: rows.length });
        }
        
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        
        if (category && category !== 'All') {
            const categoryMaps = {
                'Men': ['Men', 'ছেলেদের'],
                'Women': ['Women', 'মেয়েদের'],
                'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
                'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
            };
            const cats = categoryMaps[category] || [category];
            sql += ` AND category IN (${cats.map(() => '?').join(',')})`;
            params.push(...cats);
        }
        
        if (search) {
            sql += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        // Count total
        const countSQL = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await pool.query(countSQL, params);
        const total = countResult[0].total;
        
        // Order and paginate
        const dir = ascending === 'true' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${order_by === 'created_at' ? 'created_at' : 'serial_no'} ${dir}`;
        
        const offset = parseInt(page) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.query(sql, params);
        
        // Parse JSON fields
        const data = rows.map(parseProductRow);
        
        res.json({ data, count: total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ data: parseProductRow(rows[0]) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', requireAuth, async (req, res) => {
    try {
        const p = req.body;
        const id = p.id || generateUUID();
        await pool.query(
            `INSERT INTO products (serial_no, id, created_at, name, price, original_price, description, category, images, image_url, video_url, status, platform_id, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive)
             VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                p.serial_no || null, id, p.name, p.price, p.original_price || null,
                p.description || '', p.category || 'Women',
                JSON.stringify(p.images || []), p.image_url || null, p.video_url || null,
                p.status || 'published', p.platform_id || null,
                p.is_sale ? 1 : 0, p.is_hot ? 1 : 0, p.is_new ? 1 : 0,
                p.is_sold_out ? 1 : 0, p.is_deleted ? 1 : 0,
                JSON.stringify(p.available_sizes || []),
                JSON.stringify(p.available_colors || []),
                p.stock_count ?? 3, p.is_exclusive ? 1 : 0
            ]
        );
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        res.json({ data: parseProductRow(rows[0]) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', requireAuth, async (req, res) => {
    try {
        const p = req.body;
        const setClauses = [];
        const params = [];
        
        const fields = {
            name: p.name, price: p.price, original_price: p.original_price,
            description: p.description, category: p.category,
            images: p.images !== undefined ? JSON.stringify(p.images) : undefined,
            image_url: p.image_url, video_url: p.video_url,
            status: p.status, platform_id: p.platform_id,
            is_sale: p.is_sale !== undefined ? (p.is_sale ? 1 : 0) : undefined,
            is_hot: p.is_hot !== undefined ? (p.is_hot ? 1 : 0) : undefined,
            is_new: p.is_new !== undefined ? (p.is_new ? 1 : 0) : undefined,
            is_sold_out: p.is_sold_out !== undefined ? (p.is_sold_out ? 1 : 0) : undefined,
            is_deleted: p.is_deleted !== undefined ? (p.is_deleted ? 1 : 0) : undefined,
            available_sizes: p.available_sizes !== undefined ? JSON.stringify(p.available_sizes) : undefined,
            available_colors: p.available_colors !== undefined ? JSON.stringify(p.available_colors) : undefined,
            stock_count: p.stock_count, is_exclusive: p.is_exclusive !== undefined ? (p.is_exclusive ? 1 : 0) : undefined,
            serial_no: p.serial_no
        };
        
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                setClauses.push(`${key} = ?`);
                params.push(val);
            }
        }
        
        if (setClauses.length === 0) return res.json({ data: null });
        
        params.push(req.params.id);
        await pool.query(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`, params);
        
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json({ data: parseProductRow(rows[0]) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ORDERS ROUTES
// ============================================
app.get('/api/orders', async (req, res) => {
    try {
        const { status, search, page = 0, limit = 50, order_by = 'created_at', ascending = 'false' } = req.query;
        
        let sql = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        
        if (status && status !== 'All') {
            if (status === 'Active') {
                sql += " AND status NOT IN ('Delivered', 'Canceled', 'Deleted')";
            } else {
                sql += ' AND status = ?';
                params.push(status);
            }
        }
        
        if (search) {
            sql += ' AND (customer_phone LIKE ? OR customer_name LIKE ? OR customer_address LIKE ? OR customer_note LIKE ? OR id LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const countSQL = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await pool.query(countSQL, params);
        const total = countResult[0].total;
        
        const dir = ascending === 'true' ? 'ASC' : 'DESC';
        sql += ` ORDER BY created_at ${dir}`;
        
        const offset = parseInt(page) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [rows] = await pool.query(sql, params);
        res.json({ data: rows, count: total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 4) return res.json({ data: [] });
        
        const searchPattern = `%${q}%`;
        const [rows] = await pool.query(
            `SELECT * FROM orders WHERE customer_phone LIKE ? OR customer_name LIKE ? OR customer_address LIKE ? OR customer_note LIKE ? OR id LIKE ? ORDER BY created_at DESC`,
            [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]
        );
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const o = req.body;
        const id = generateUUID();
        await pool.query(
            `INSERT INTO orders (id, product_id, product_name, product_price, customer_name, customer_phone, customer_address, customer_note, delivery_area, delivery_charge, total_amount, last_four_digits, status, size, color, is_advance_paid, is_exclusive_order, payment_status, moderator_reference)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, o.product_id, o.product_name, o.product_price,
                o.customer_name, o.customer_phone, o.customer_address,
                o.customer_note || null, o.delivery_area || null,
                o.delivery_charge || 0, o.total_amount,
                o.last_four_digits || 'COD', o.status || 'Pending',
                o.size || null, o.color || null,
                o.is_advance_paid ? 1 : 0, o.is_exclusive_order ? 1 : 0,
                o.payment_status || 'Unpaid', o.moderator_reference || null
            ]
        );
        const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
        res.json({ data: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/orders/:id', requireAuth, async (req, res) => {
    try {
        const o = req.body;
        const setClauses = [];
        const params = [];
        
        const fields = {
            status: o.status, is_advance_paid: o.is_advance_paid !== undefined ? (o.is_advance_paid ? 1 : 0) : undefined,
            payment_status: o.payment_status, customer_note: o.customer_note,
            delivery_charge: o.delivery_charge, total_amount: o.total_amount
        };
        
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                setClauses.push(`${key} = ?`);
                params.push(val);
            }
        }
        
        if (setClauses.length === 0) return res.json({ data: null });
        
        params.push(req.params.id);
        await pool.query(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, params);
        
        const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        res.json({ data: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/orders/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// REVIEWS ROUTES
// ============================================
app.get('/api/reviews', async (req, res) => {
    try {
        const { product_id, limit = 50 } = req.query;
        let sql = 'SELECT * FROM reviews';
        const params = [];
        
        if (product_id) {
            sql += ' WHERE product_id = ?';
            params.push(product_id);
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const [rows] = await pool.query(sql, params);
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM reviews');
        
        res.json({ data: rows, count: countResult[0].total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const r = req.body;
        const id = generateUUID();
        await pool.query(
            'INSERT INTO reviews (id, rating, comment, customer_name, product_id, product_name) VALUES (?, ?, ?, ?, ?, ?)',
            [id, r.rating || 5, r.comment || null, r.customer_name, r.product_id, r.product_name || null]
        );
        const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [id]);
        res.json({ data: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reviews/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SITE SETTINGS ROUTES
// ============================================
app.get('/api/settings', async (req, res) => {
    try {
        const { key } = req.query;
        let sql = 'SELECT * FROM site_settings';
        const params = [];
        
        if (key) {
            sql += ' WHERE `key` = ?';
            params.push(key);
        }
        
        const [rows] = await pool.query(sql, params);
        
        // Parse JSON values
        const data = rows.map(r => ({
            ...r,
            value: typeof r.value === 'string' ? JSON.parse(r.value) : r.value
        }));
        
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// site settings upsert (POST to base handles bulk or single upsert)
app.post('/api/settings', requireAuth, async (req, res) => {
    try {
        const items = Array.isArray(req.body) ? req.body : [req.body];
        const results = [];
        for (const item of items) {
            const { key, value } = item;
            if (!key) continue;
            await pool.query(
                'INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
                [key, JSON.stringify(value), JSON.stringify(value)]
            );
            results.push({ key, value });
        }
        res.json({ data: results.length === 1 ? results[0] : results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings/:key', requireAuth, async (req, res) => {
    try {
        const { value } = req.body;
        await pool.query(
            'INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
            [req.params.key, JSON.stringify(value), JSON.stringify(value)]
        );
        res.json({ data: { key: req.params.key, value } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/settings/:key', requireAuth, async (req, res) => {
    try {
        await pool.query("DELETE FROM site_settings WHERE `key` = ?", [req.params.key]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Visitor counter - special endpoint (no auth required for increment)
app.post('/api/settings/visitor_count/increment', async (req, res) => {
    try {
        // Get current count
        const [rows] = await pool.query("SELECT value FROM site_settings WHERE `key` = 'visitor_count'");
        let count = 0;
        if (rows.length > 0) {
            try { count = parseInt(JSON.parse(rows[0].value)) || 0; } catch (e) { count = parseInt(rows[0].value) || 0; }
        }
        count++;
        await pool.query(
            "INSERT INTO site_settings (`key`, value) VALUES ('visitor_count', ?) ON DUPLICATE KEY UPDATE value = ?",
            [JSON.stringify(count), JSON.stringify(count)]
        );
        res.json({ data: { count } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// FILE UPLOAD ROUTE
// ============================================
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ data: { path: req.file.filename, publicUrl } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// HELPERS
// ============================================
function parseProductRow(row) {
    if (!row) return null;
    return {
        ...row,
        images: parseJSON(row.images, []),
        available_sizes: parseJSON(row.available_sizes, []),
        available_colors: parseJSON(row.available_colors, []),
        is_sale: !!row.is_sale,
        is_hot: !!row.is_hot,
        is_new: !!row.is_new,
        is_sold_out: !!row.is_sold_out,
        is_deleted: !!row.is_deleted,
        is_exclusive: !!row.is_exclusive
    };
}

function parseJSON(val, fallback = null) {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') return val; // Already parsed by mysql2
    try { return JSON.parse(val); } catch (e) { return fallback; }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 BigBazar API running on http://localhost:${PORT}`);
    console.log(`📦 MySQL: localhost:3306/bigbazar`);
});

module.exports = app;
