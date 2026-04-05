import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getDb } from '../functions/api/db.js';

dotenv.config();

const DATA_DIR = 'D:\\bigbazardata';

function parseCSV(content) {
    const rows = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;

    content = content.replace(/\r\n/g, '\n');

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '"') {
            if (inQuotes && content[i + 1] === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentLine.push(currentField.trim());
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            currentLine.push(currentField.trim());
            rows.push(currentLine);
            currentLine = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    if (currentLine.length > 0 || currentField !== '') {
        currentLine.push(currentField.trim());
        rows.push(currentLine);
    }

    if (rows.length === 0) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(values => {
        const row = {};
        headers.forEach((h, idx) => {
            let val = values[idx];
            if (val === 'NULL' || val === '' || val === undefined) val = null;
            row[h] = val;
        });
        return row;
    }).filter(r => Object.values(r).some(v => v !== null));
}

function safeNum(val, fallback = 0) {
    const p = parseFloat(val);
    return isNaN(p) ? fallback : p;
}

async function migrate() {
    console.log('🚀 Starting Final Migration from ' + DATA_DIR);
    const db = getDb(process.env);

    try {
        // --- 1. Products ---
        const productsRaw = fs.readFileSync(path.join(DATA_DIR, 'products_rows.csv'), 'utf8');
        const products = parseCSV(productsRaw).filter(p => p.id);
        await db.execute('DELETE FROM products');
        for (const p of products) {
            await db.execute(
                `INSERT INTO products (
                    serial_no, id, created_at, name, price, original_price, image_url, 
                    category, status, description, is_sold_out, available_colors, 
                    stock_count, is_exclusive
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    p.serial_no ? parseInt(p.serial_no) : null,
                    p.id, p.created_at, p.name, String(p.price || ''), String(p.original_price || ''), 
                    p.image || p.image_url || '', p.category, p.status || 'published', p.description,
                    p.is_sold_out === 'true' || p.is_sold_out === '1' ? 1 : 0, 
                    p.available_colors || '[]', safeNum(p.stock_count, 3), 
                    p.is_exclusive === 'true' || p.is_exclusive === '1' ? 1 : 0
                ]
            );
        }
        console.log(`✅ ${products.length} products processed.`);

        // --- 2. Orders ---
        if (fs.existsSync(path.join(DATA_DIR, 'orders_rows.csv'))) {
            const ordersRaw = fs.readFileSync(path.join(DATA_DIR, 'orders_rows.csv'), 'utf8');
            const orders = parseCSV(ordersRaw).filter(o => o.id);
            await db.execute('DELETE FROM orders');
            for (const o of orders) {
                try {
                    await db.execute(
                        `INSERT INTO orders (
                            id, created_at, product_id, product_name, product_price, 
                            customer_name, customer_phone, customer_address, customer_note, 
                            delivery_area, delivery_charge, total_amount, last_four_digits, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            o.id, o.created_at, o.product_id, o.product_name, safeNum(o.product_price),
                            o.customer_name, o.customer_phone, o.customer_address, o.customer_note,
                            o.delivery_area, safeNum(o.delivery_charge), safeNum(o.total_amount), 
                            o.last_four_digits, o.status || 'Pending'
                        ]
                    );
                } catch(e) { console.warn(`Order ${o.id} failed: ${e.message}`); }
            }
            console.log(`✅ ${orders.length} orders processed.`);
        }

        // --- 3. Site Settings ---
        if (fs.existsSync(path.join(DATA_DIR, 'site_settings_rows.csv'))) {
            const settingsRaw = fs.readFileSync(path.join(DATA_DIR, 'site_settings_rows.csv'), 'utf8');
            const settings = parseCSV(settingsRaw).filter(s => s.key);
            await db.execute('DELETE FROM site_settings');
            for (const s of settings) {
                await db.execute(
                    `INSERT INTO site_settings (\`key\`, \`value\`, created_at) VALUES (?, ?, ?)`,
                    [s.key, s.value, s.created_at]
                );
            }
            console.log(`✅ ${settings.length} settings processed.`);
        }

        // --- 4. Reviews ---
        if (fs.existsSync(path.join(DATA_DIR, 'reviews_rows.csv'))) {
            const reviewsRaw = fs.readFileSync(path.join(DATA_DIR, 'reviews_rows.csv'), 'utf8');
            const reviews = parseCSV(reviewsRaw).filter(r => r.id);
            await db.execute('DELETE FROM reviews');
            for (const r of reviews) {
                await db.execute(
                    `INSERT INTO reviews (id, product_id, customer_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                    [r.id, r.product_id, r.customer_name, safeNum(r.rating), r.comment, r.created_at]
                );
            }
            console.log(`✅ ${reviews.length} reviews processed.`);
        }

        console.log('🎉 ALL DATA MIGRATED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ FATAL MIGRATION ERROR:', err.message);
    }
}

migrate();
