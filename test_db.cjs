const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    console.log('Testing connection to TiDB Cloud...');
    console.log('Host:', process.env.DB_HOST);
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            }
        });
        console.log('✅ Success! Connected to TiDB Cloud.');
        const [rows] = await conn.query('SELECT 1 + 1 AS result');
        console.log('Test Query Result:', rows[0].result);
        await conn.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

test();
