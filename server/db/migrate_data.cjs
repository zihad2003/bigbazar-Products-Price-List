/**
 * Data Migration Script: PostgreSQL SQL exports → MySQL
 * Reads from D:\bigbazardata\ and inserts into MySQL bigbazar database.
 * 
 * Usage: node server/db/migrate_data.cjs
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'bigbazar',
    multipleStatements: true,
    charset: 'utf8mb4'
};

const DATA_DIR = 'D:\\bigbazardata';

async function migrate() {
    let conn;
    try {
        conn = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected to MySQL');

        // 1. Run schema first
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await conn.query(schema);
        console.log('✅ Schema created');

        // 2. Migrate products from all_products.json (more reliable than SQL exports)
        await migrateProducts(conn);

        // 3. Migrate reviews
        await migrateReviews(conn);

        // 4. Migrate site_settings
        await migrateSiteSettings(conn);

        // 5. Migrate orders
        await migrateOrders(conn);

        // 6. Create default admin user (password: 1234)
        await createAdminUser(conn);

        console.log('\n🎉 Migration complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Check your MySQL password. Current: "1234"');
        }
    } finally {
        if (conn) await conn.end();
    }
}

async function migrateProducts(conn) {
    console.log('\n📦 Migrating products...');

    // Use all_products.json as primary source (it's the most complete)
    const jsonPath = path.join(__dirname, '..', '..', 'all_products.json');
    
    let products = [];
    if (fs.existsSync(jsonPath)) {
        products = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        console.log(`  Found ${products.length} products in all_products.json`);
    }

    // Also parse the SQL export for any products not in JSON
    const sqlPath = path.join(DATA_DIR, 'products_rows.sql');
    if (fs.existsSync(sqlPath)) {
        const sqlProducts = parsePgProductsSQL(fs.readFileSync(sqlPath, 'utf-8'));
        console.log(`  Found ${sqlProducts.length} products in SQL export`);
        
        // Merge: SQL export products that aren't in JSON
        const jsonIds = new Set(products.map(p => p.id));
        for (const sp of sqlProducts) {
            if (!jsonIds.has(sp.id)) {
                products.push(sp);
            }
        }
    }

    console.log(`  Total products to insert: ${products.length}`);

    // Clear existing data
    await conn.query('DELETE FROM products');

    let inserted = 0;
    for (const p of products) {
        try {
            await conn.query(
                `INSERT INTO products (serial_no, id, created_at, name, price, original_price, description, category, images, image_url, video_url, status, platform_id, is_sale, is_hot, is_new, is_sold_out, is_deleted, available_sizes, available_colors, stock_count, is_exclusive)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    p.serial_no || null,
                    p.id,
                    p.created_at ? new Date(p.created_at) : new Date(),
                    p.name || '',
                    p.price || '0',
                    p.original_price || null,
                    p.description || '',
                    p.category || 'Women',
                    JSON.stringify(Array.isArray(p.images) ? p.images : []),
                    p.image_url || null,
                    p.video_url || null,
                    p.status || 'published',
                    p.platform_id || null,
                    p.is_sale ? 1 : 0,
                    p.is_hot ? 1 : 0,
                    p.is_new ? 1 : 0,
                    p.is_sold_out ? 1 : 0,
                    p.is_deleted ? 1 : 0,
                    JSON.stringify(Array.isArray(p.available_sizes) ? p.available_sizes : (typeof p.available_sizes === 'string' ? tryParseJSON(p.available_sizes) : [])),
                    JSON.stringify(Array.isArray(p.available_colors) ? p.available_colors : (typeof p.available_colors === 'string' ? tryParseJSON(p.available_colors) : [])),
                    p.stock_count !== undefined && p.stock_count !== null ? p.stock_count : 3,
                    p.is_exclusive ? 1 : 0
                ]
            );
            inserted++;
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                // Skip duplicates silently
            } else {
                console.error(`  ⚠️ Failed product ${p.serial_no || p.id}: ${err.message}`);
            }
        }
    }
    console.log(`  ✅ Inserted ${inserted} products`);
}

async function migrateReviews(conn) {
    console.log('\n⭐ Migrating reviews...');
    const sqlPath = path.join(DATA_DIR, 'reviews_rows.sql');
    if (!fs.existsSync(sqlPath)) {
        console.log('  ⚠️ No reviews SQL file found, skipping');
        return;
    }

    await conn.query('DELETE FROM reviews');

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    // Parse the PostgreSQL INSERT and convert to individual inserts
    const reviews = parsePgReviewsSQL(sql);
    console.log(`  Found ${reviews.length} reviews`);

    let inserted = 0;
    for (const r of reviews) {
        try {
            await conn.query(
                `INSERT INTO reviews (id, rating, comment, customer_name, product_id, product_name, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [r.id, r.rating, r.comment, r.customer_name, r.product_id, r.product_name, new Date(r.created_at)]
            );
            inserted++;
        } catch (err) {
            console.error(`  ⚠️ Failed review: ${err.message}`);
        }
    }
    console.log(`  ✅ Inserted ${inserted} reviews`);
}

async function migrateSiteSettings(conn) {
    console.log('\n⚙️ Migrating site settings...');
    const sqlPath = path.join(DATA_DIR, 'site_settings_rows.sql');
    if (!fs.existsSync(sqlPath)) {
        console.log('  ⚠️ No site_settings SQL file found, skipping');
        return;
    }

    await conn.query('DELETE FROM site_settings');

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    const settings = parsePgSettingsSQL(sql);
    console.log(`  Found ${settings.length} settings`);

    let inserted = 0;
    for (const s of settings) {
        try {
            let value = s.value;
            // Ensure it's valid JSON
            if (typeof value === 'string') {
                try { value = JSON.parse(value); } catch (e) { /* keep as-is */ }
            }
            
            await conn.query(
                `INSERT INTO site_settings (id, \`key\`, value, created_at) VALUES (?, ?, ?, ?)`,
                [s.id, s.key, JSON.stringify(value), new Date(s.created_at)]
            );
            inserted++;
        } catch (err) {
            console.error(`  ⚠️ Failed setting ${s.key}: ${err.message}`);
        }
    }
    console.log(`  ✅ Inserted ${inserted} settings`);
}

async function migrateOrders(conn) {
    console.log('\n📦 Migrating orders...');
    const csvPath = path.join(DATA_DIR, 'orders_rows.csv');
    if (!fs.existsSync(csvPath)) {
        console.log('  ⚠️ No orders CSV file found, skipping');
        return;
    }

    await conn.query('DELETE FROM orders');

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    const header = lines[0].split(',');
    
    // Create a mapping of header names to their indices
    const h = {};
    header.forEach((name, i) => h[name.trim()] = i);

    let inserted = 0;
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Use a CSV line parser that handles quoted strings correctly
        const fields = parseCsvLine(lines[i]);
        if (fields.length < 10) continue;

        try {
            await conn.query(
                `INSERT INTO orders (
                    id, created_at, product_id, product_name, product_price, 
                    customer_name, customer_phone, customer_address, customer_note, 
                    delivery_area, delivery_charge, total_amount, last_four_digits, 
                    status, size, color, is_advance_paid, is_exclusive_order, 
                    payment_status, moderator_reference
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    fields[h.id],
                    new Date(fields[h.created_at]),
                    fields[h.product_id],
                    fields[h.product_name],
                    fields[h.product_price],
                    fields[h.customer_name],
                    fields[h.customer_phone],
                    fields[h.customer_address],
                    fields[h.customer_note] || null,
                    fields[h.delivery_area],
                    fields[h.delivery_charge],
                    fields[h.total_amount],
                    fields[h.last_four_digits],
                    fields[h.status],
                    fields[h.size] || null,
                    fields[h.color] || null,
                    fields[h.is_advance_paid] === 'true' ? 1 : 0,
                    fields[h.is_exclusive_order] === 'true' ? 1 : 0,
                    fields[h.payment_status],
                    fields[h.moderator_reference] || null
                ]
            );
            inserted++;
        } catch (err) {
            console.error(`  ⚠️ Failed order row ${i}: ${err.message}`);
        }
    }
    console.log(`  ✅ Inserted ${inserted} orders`);
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

async function createAdminUser(conn) {
    console.log('\n👤 Creating admin user...');
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('1234', 10);
    
    try {
        await conn.query(
            `INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
            ['admin-001', 'admin@bigbazar.com', hash]
        );
        console.log('  ✅ Admin user created: admin@bigbazar.com / 1234');
    } catch (err) {
        console.error(`  ⚠️ Failed: ${err.message}`);
    }
}

// ============================================
// PostgreSQL SQL Parsers
// ============================================

function parsePgProductsSQL(sql) {
    // The SQL has one giant INSERT with all rows as value tuples
    // We need to extract each tuple. This is complex due to nested strings.
    // Instead, we rely on all_products.json as primary. This is a fallback.
    const products = [];
    
    // Extract values between parentheses after VALUES
    const valuesMatch = sql.match(/VALUES\s+([\s\S]+);?$/i);
    if (!valuesMatch) return products;

    // Split by "), (" pattern - handling nested parens carefully
    const tuples = splitTuples(valuesMatch[1]);
    
    for (const tuple of tuples) {
        try {
            const fields = parseTupleFields(tuple);
            if (fields.length >= 22) {
                products.push({
                    serial_no: fields[0] === 'null' ? null : parseInt(fields[0]),
                    id: fields[1],
                    created_at: fields[2],
                    name: fields[3],
                    price: fields[4],
                    original_price: fields[5] === 'null' ? null : fields[5],
                    description: fields[6],
                    category: fields[7],
                    images: [], // ARRAY[] can't be easily parsed, use JSON fallback
                    image_url: fields[9] === 'null' ? null : fields[9],
                    video_url: fields[10] === 'null' ? null : fields[10],
                    status: fields[11],
                    platform_id: fields[12] === 'null' ? null : fields[12],
                    is_sale: fields[13] === 'true' || fields[13] === '1',
                    is_hot: fields[14] === 'true' || fields[14] === '1',
                    is_new: fields[15] === 'true' || fields[15] === '1',
                    is_sold_out: fields[16] === 'true' || fields[16] === '1',
                    is_deleted: fields[17] === 'true' || fields[17] === '1',
                    available_sizes: tryParseJSON(fields[18]),
                    available_colors: tryParseJSON(fields[19]),
                    stock_count: fields[20] === 'null' ? 3 : parseInt(fields[20]),
                    is_exclusive: fields[21] === 'true' || fields[21] === '1'
                });
            }
        } catch (e) {
            // Skip unparseable tuples
        }
    }
    
    return products;
}

function parsePgReviewsSQL(sql) {
    const reviews = [];
    // Match individual value tuples
    const regex = /\('([^']*)',\s*(\d+),\s*(null|'[^']*'),\s*'([^']*)',\s*'([^']*)',\s*(?:null|'([^']*)'),\s*'([^']*)'\)/g;
    let match;
    
    while ((match = regex.exec(sql)) !== null) {
        reviews.push({
            id: match[1],
            rating: parseInt(match[2]),
            comment: match[3] === 'null' ? null : match[3].replace(/^'|'$/g, ''),
            customer_name: match[4],
            product_id: match[5],
            product_name: match[6] || null,
            created_at: match[7]
        });
    }
    return reviews;
}

function parsePgSettingsSQL(sql) {
    const settings = [];
    // Match individual value tuples - site_settings has (id, key, value, created_at)
    const regex = /\((\d+),\s*'([^']*)',\s*'((?:[^']|'')*)',\s*'([^']*)'\)/g;
    let match;
    
    while ((match = regex.exec(sql)) !== null) {
        settings.push({
            id: parseInt(match[1]),
            key: match[2],
            value: match[3].replace(/''/g, "'"),
            created_at: match[4]
        });
    }
    return settings;
}

function splitTuples(str) {
    // Simple splitting: split on "), (" between tuples
    const tuples = [];
    let depth = 0;
    let current = '';
    let inString = false;
    let prevChar = '';
    
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'" && prevChar !== '\\') {
            inString = !inString;
        }
        if (!inString) {
            if (c === '(') depth++;
            if (c === ')') depth--;
        }
        current += c;
        
        if (depth === 0 && current.trim().length > 0) {
            tuples.push(current.trim().replace(/^\(/, '').replace(/\)$/, '').replace(/,\s*$/, ''));
            current = '';
        }
        prevChar = c;
    }
    
    if (current.trim()) {
        tuples.push(current.trim().replace(/^\(/, '').replace(/\)$/, ''));
    }
    
    return tuples;
}

function parseTupleFields(tuple) {
    const fields = [];
    let current = '';
    let inString = false;
    let depth = 0;
    
    for (let i = 0; i < tuple.length; i++) {
        const c = tuple[i];
        if (c === "'" && (i === 0 || tuple[i-1] !== '\\')) {
            inString = !inString;
            current += c;
        } else if (c === '(' || c === '[' || c === '{') {
            depth++;
            current += c;
        } else if (c === ')' || c === ']' || c === '}') {
            depth--;
            current += c;
        } else if (c === ',' && !inString && depth === 0) {
            fields.push(current.trim().replace(/^'|'$/g, ''));
            current = '';
        } else {
            current += c;
        }
    }
    if (current.trim()) {
        fields.push(current.trim().replace(/^'|'$/g, ''));
    }
    
    return fields;
}

function tryParseJSON(str) {
    if (!str || str === 'null' || str === '') return [];
    try {
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

migrate();
