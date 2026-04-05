import dotenv from 'dotenv';
import { getDb } from '../functions/api/db.js';

dotenv.config();

async function check() {
    try {
        const db = getDb(process.env);
        const rows = await db.execute('SHOW TABLES');
        console.log('Tables:', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();
