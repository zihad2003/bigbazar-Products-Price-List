import dotenv from 'dotenv';
import { connect } from '@tidbcloud/serverless';

dotenv.config();

const getDb = () => {
    const user = encodeURIComponent(process.env.DB_USER || '');
    const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || '4000';
    const name = process.env.DB_NAME || 'test';

    const url = process.env.DATABASE_URL || `mysql://${user}:${pass}@${host}:${port}/${name}?ssl={"rejectUnauthorized":true}`;
    return connect({ url });
};

async function fix() {
    const db = getDb();
    console.log('Connecting to TiDB...');
    try {
        await db.execute('ALTER TABLE products MODIFY COLUMN image_url LONGTEXT');
        await db.execute('ALTER TABLE products MODIFY COLUMN video_url LONGTEXT');
        console.log('Successfully updated image_url and video_url to LONGTEXT!');
    } catch (err) {
        console.error('Error:', err);
    }
}

fix();
