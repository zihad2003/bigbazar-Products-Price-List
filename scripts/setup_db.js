import dotenv from 'dotenv';
import { connect } from '@tidbcloud/serverless';
import bcrypt from 'bcryptjs';

dotenv.config();

const getDb = () => {
    const user = encodeURIComponent(process.env.DB_USER || '');
    const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || '4000';
    const name = process.env.DB_NAME || 'test';

    const url = `mysql://${user}:${pass}@${host}:${port}/${name}?ssl={"rejectUnauthorized":true}`;
    return connect({ url });
};

async function setup() {
    const db = getDb();
    console.log('Connected to TiDB. Initializing schema...');

    try {
        // Create Admin Users Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created admin_users table');

        // Create site_settings table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS site_settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                value JSON
            )
        `);
        console.log('Created site_settings table');

        // Create reviews table
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
        console.log('Created reviews table');

        // Create Default Admin
        const hash = await bcrypt.hash('BigBazar@2026', 10);
        try {
            await db.execute('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)', ['admin@bigbazar.com', hash]);
            console.log('Inserted default admin user (admin@bigbazar.com / BigBazar@2026)');
        } catch (e) {
            if (e.message.includes('Duplicate entry')) {
                console.log('Default admin user already exists');
            } else {
                throw e;
            }
        }

        // Create Customers Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS customers (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                mobile VARCHAR(20) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created customers table');

        // Create Products Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(36) PRIMARY KEY,
                serial_no INT AUTO_INCREMENT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                original_price DECIMAL(10,2),
                description TEXT,
                category VARCHAR(100),
                subcategory VARCHAR(100),
                images JSON,
                image_url LONGTEXT,
                video_url LONGTEXT,
                status VARCHAR(50) DEFAULT 'published',
                platform_id VARCHAR(100),
                is_sale TINYINT(1) DEFAULT 0,
                is_hot TINYINT(1) DEFAULT 0,
                is_new TINYINT(1) DEFAULT 0,
                is_sold_out TINYINT(1) DEFAULT 0,
                is_deleted TINYINT(1) DEFAULT 0,
                available_sizes JSON,
                available_colors JSON,
                stock_count INT DEFAULT 0,
                is_exclusive TINYINT(1) DEFAULT 0
            )
        `);
        console.log('Created products table');

        // Create Orders Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                product_id VARCHAR(36) NOT NULL,
                product_name VARCHAR(255),
                product_price DECIMAL(10,2),
                customer_name VARCHAR(255),
                customer_phone VARCHAR(20),
                customer_address TEXT,
                customer_note TEXT,
                delivery_area VARCHAR(50),
                delivery_charge DECIMAL(10,2),
                total_amount DECIMAL(10,2),
                last_four_digits VARCHAR(20),
                status VARCHAR(50) DEFAULT 'Pending',
                size VARCHAR(50),
                color VARCHAR(50),
                is_advance_paid TINYINT(1) DEFAULT 0,
                is_exclusive_order TINYINT(1) DEFAULT 0,
                payment_status VARCHAR(50) DEFAULT 'Unpaid',
                moderator_reference VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created orders table');

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
        console.log('Created users table');

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
        console.log('Created conversations table');

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
        console.log('Created messages table');

        console.log('Database initialization complete!');
    } catch (err) {
        console.error('Error during setup:', err);
    }
}

setup();
