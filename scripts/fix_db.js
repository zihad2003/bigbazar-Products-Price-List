import dotenv from 'dotenv';
import { getDb } from '../functions/api/db.js';

dotenv.config();

async function fix() {
    const db = getDb(process.env);
    console.log('Connecting to the database...');
    try {
        await db.execute('ALTER TABLE products MODIFY COLUMN image_url LONGTEXT');
        await db.execute('ALTER TABLE products MODIFY COLUMN video_url LONGTEXT');
        console.log('Successfully updated image_url and video_url to LONGTEXT!');
    } catch (err) {
        console.error('Error:', err);
    }
}

fix();
