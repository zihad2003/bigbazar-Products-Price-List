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

async function createMissingTables() {
    const db = getDb();
    console.log('Connecting to TiDB to create missing tables...');
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS site_settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                value JSON
            )
        `);
        console.log('Created site_settings table.');

        await db.execute(`
            CREATE TABLE IF NOT EXISTS reviews (
                id VARCHAR(36) PRIMARY KEY,
                rating INT DEFAULT 5,
                comment TEXT,
                customer_name VARCHAR(255),
                product_id VARCHAR(36),
                product_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created reviews table.');
        
        // Let's insert the default hero banner setting so it doesn't crash if it expects it
        await db.execute(`
            INSERT IGNORE INTO site_settings (\`key\`, value) VALUES 
            ('hero_banner', '{"title":"5% FLAT DISCOUNT","subtitle":"FOR THE 10K FAMILY ON FACEBOOK PAGE","image_url":""}')
        `);
        console.log('Inserted default site_settings.');

    } catch (err) {
        console.error('Error:', err);
    }
}

createMissingTables();
