import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://bigbazarbariarhat.pages.dev/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBiaWdiYXphci5jb20iLCJ0eXBlIjoiYWRtaW4iLCJpYXQiOjE3ODk3NjE0NDYsImV4cCI6MTc5MjM1MzQ0Nn0.gicef8z-3HUahJokGF1D8LY-y3wOTa5X2U3UBl870Cw';

const endpoints = [
    { name: 'products', url: '/products?limit=100000&_admin=true' },
    { name: 'orders', url: '/orders?limit=100000&_admin=true' },
    { name: 'reviews', url: '/reviews?limit=100000&_admin=true' },
    { name: 'users', url: '/admin/users?limit=100000&_admin=true' },
    { name: 'conversations', url: '/admin/conversations?limit=100000&_admin=true' }
];

const schema = `
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin_users
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`admin_users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`email\` VARCHAR(255) UNIQUE NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` VARCHAR(20) DEFAULT 'admin',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for site_settings
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`site_settings\` (
  \`key\` VARCHAR(100) PRIMARY KEY,
  \`value\` JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for reviews
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`reviews\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`rating\` INT DEFAULT 5,
  \`comment\` TEXT,
  \`customer_name\` VARCHAR(255),
  \`product_id\` VARCHAR(36),
  \`product_name\` VARCHAR(255),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for customers
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`customers\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`name\` VARCHAR(255),
  \`email\` VARCHAR(255) UNIQUE,
  \`mobile\` VARCHAR(20) UNIQUE NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for products
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`serial_no\` INT AUTO_INCREMENT UNIQUE,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`name\` VARCHAR(255) NOT NULL,
  \`price\` DECIMAL(10,2) NOT NULL,
  \`original_price\` DECIMAL(10,2),
  \`description\` TEXT,
  \`category\` VARCHAR(100),
  \`subcategory\` VARCHAR(100),
  \`images\` JSON,
  \`image_url\` LONGTEXT,
  \`video_url\` LONGTEXT,
  \`status\` VARCHAR(50) DEFAULT 'published',
  \`platform_id\` VARCHAR(100),
  \`is_sale\` TINYINT(1) DEFAULT 0,
  \`is_hot\` TINYINT(1) DEFAULT 0,
  \`is_new\` TINYINT(1) DEFAULT 0,
  \`is_sold_out\` TINYINT(1) DEFAULT 0,
  \`is_deleted\` TINYINT(1) DEFAULT 0,
  \`available_sizes\` JSON,
  \`available_colors\` JSON,
  \`stock_count\` INT DEFAULT 0,
  \`is_exclusive\` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for orders
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`orders\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`user_id\` VARCHAR(36),
  \`product_id\` VARCHAR(36) NOT NULL,
  \`product_name\` VARCHAR(255),
  \`product_price\` DECIMAL(10,2),
  \`customer_name\` VARCHAR(255),
  \`customer_phone\` VARCHAR(20),
  \`customer_address\` TEXT,
  \`customer_note\` TEXT,
  \`delivery_area\` VARCHAR(50),
  \`delivery_charge\` DECIMAL(10,2),
  \`total_amount\` DECIMAL(10,2),
  \`last_four_digits\` VARCHAR(20),
  \`status\` VARCHAR(50) DEFAULT 'Pending',
  \`size\` VARCHAR(50),
  \`color\` VARCHAR(50),
  \`is_advance_paid\` TINYINT(1) DEFAULT 0,
  \`is_exclusive_order\` TINYINT(1) DEFAULT 0,
  \`payment_status\` VARCHAR(50) DEFAULT 'Unpaid',
  \`moderator_reference\` VARCHAR(255),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for users
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`google_id\` VARCHAR(128) UNIQUE NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`name\` VARCHAR(255),
  \`avatar_url\` TEXT,
  \`phone\` VARCHAR(20) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_google (google_id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for conversations
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`conversations\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`session_id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(36) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`has_order\` BOOLEAN DEFAULT FALSE,
  \`order_id\` VARCHAR(36) DEFAULT NULL,
  INDEX idx_session (session_id),
  INDEX idx_updated (updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for messages
-- ----------------------------
CREATE TABLE IF NOT EXISTS \`messages\` (
  \`id\` VARCHAR(36) PRIMARY KEY,
  \`conversation_id\` VARCHAR(36) NOT NULL,
  \`role\` ENUM('user', 'assistant', 'system') NOT NULL,
  \`content\` TEXT NOT NULL,
  \`metadata\` JSON DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

`;

function escapeSQL(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'number') return String(val);
    
    let str = val;
    if (typeof val === 'object') {
        try {
            str = JSON.stringify(val);
        } catch (e) {
            str = String(val);
        }
    } else {
        str = String(val);
    }
    
    // Escape single quotes for SQL
    str = str.replace(/'/g, "''");
    // Also escape backslashes
    str = str.replace(/\\/g, "\\\\");
    
    return "'" + str + "'";
}

async function exportData() {
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
    }

    const sqlFilePath = path.join(exportDir, 'database.sql');
    fs.writeFileSync(sqlFilePath, schema, 'utf8');

    for (const ep of endpoints) {
        console.log(`Fetching ${ep.name}...`);
        try {
            const res = await fetch(`${API_BASE}${ep.url}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const json = await res.json();
            const data = json.data || [];
            
            if (data.length === 0) {
                console.log(`No data found for ${ep.name}`);
                continue;
            }

            console.log(`Generating SQL for ${data.length} records in ${ep.name}...`);
            let sqlContent = `\n-- Data for table ${ep.name}\n`;

            // Insert in chunks of 50 to avoid massive SQL lines
            const chunkSize = 50;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                const columns = Object.keys(chunk[0]).map(c => `\`${c}\``).join(', ');
                
                let insertStmt = `INSERT IGNORE INTO \`${ep.name}\` (${columns}) VALUES \n`;
                
                const valueRows = chunk.map(row => {
                    const values = Object.keys(chunk[0]).map(key => escapeSQL(row[key])).join(', ');
                    return `  (${values})`;
                });
                
                insertStmt += valueRows.join(',\n') + ';\n';
                sqlContent += insertStmt;
            }

            fs.appendFileSync(sqlFilePath, sqlContent, 'utf8');
            console.log(`Appended ${ep.name} to database.sql`);
        } catch (err) {
            console.error(`Failed to export ${ep.name}:`, err.message);
        }
    }
    
    fs.appendFileSync(sqlFilePath, "\nSET FOREIGN_KEY_CHECKS = 1;\n", 'utf8');
    console.log(`SQL export finished. File saved at: ${sqlFilePath}`);
}

exportData();
