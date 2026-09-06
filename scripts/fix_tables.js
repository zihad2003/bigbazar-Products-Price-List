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
        
        // Create Users Table (Google Auth & Profiles)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                google_id VARCHAR(128) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                avatar_url TEXT,
                phone VARCHAR(20) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_google (google_id),
                INDEX idx_email (email)
            )
        `);
        console.log('Created users table.');

        await db.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(36) PRIMARY KEY,
                type VARCHAR(50) NOT NULL DEFAULT 'new_product',
                title VARCHAR(255) NOT NULL,
                body TEXT,
                product_id VARCHAR(36) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_notifications_created (created_at DESC)
            )
        `);
        console.log('Created notifications table.');

        await db.execute(`
            CREATE TABLE IF NOT EXISTS notification_reads (
                notification_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (notification_id, user_id),
                INDEX idx_reads_user (user_id)
            )
        `);
        console.log('Created notification_reads table.');

        // Create Conversations Table (AI Shopping Assistant)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS conversations (
                id VARCHAR(36) PRIMARY KEY,
                session_id VARCHAR(64) NOT NULL,
                user_id VARCHAR(36) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                has_order BOOLEAN DEFAULT FALSE,
                order_id VARCHAR(36) DEFAULT NULL,
                INDEX idx_session (session_id),
                INDEX idx_updated (updated_at DESC)
            )
        `);
        console.log('Created conversations table.');

        // Create Messages Table (AI Shopping Assistant)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(36) NOT NULL,
                role ENUM('user', 'assistant', 'system') NOT NULL,
                content TEXT NOT NULL,
                metadata JSON DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_conversation (conversation_id, created_at)
            )
        `);
        console.log('Created messages table.');

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
