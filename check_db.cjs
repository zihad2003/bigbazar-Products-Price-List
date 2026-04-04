const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });
        const [products] = await conn.query('SELECT COUNT(*) as count FROM products');
        const [orders] = await conn.query('SELECT COUNT(*) as count FROM orders');
        console.log('--- DATABASE STATUS ---');
        console.log('Products:', products[0].count);
        console.log('Orders:', orders[0].count);
        await conn.end();
    } catch (err) {
        console.error('❌ Check failed:', err.message);
    }
}

check();
