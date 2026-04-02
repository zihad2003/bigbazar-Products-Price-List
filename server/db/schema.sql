-- BigBazar MySQL Schema
-- Converted from PostgreSQL (Supabase)

CREATE DATABASE IF NOT EXISTS bigbazar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bigbazar;

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    serial_no INT,
    id CHAR(36) NOT NULL PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(500),
    price VARCHAR(50),
    original_price VARCHAR(50) DEFAULT NULL,
    description TEXT,
    category VARCHAR(100),
    images JSON,
    image_url TEXT,
    video_url TEXT,
    status VARCHAR(50) DEFAULT 'published',
    platform_id VARCHAR(100),
    is_sale TINYINT(1) DEFAULT 0,
    is_hot TINYINT(1) DEFAULT 0,
    is_new TINYINT(1) DEFAULT 0,
    is_sold_out TINYINT(1) DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0,
    available_sizes JSON,
    available_colors JSON,
    stock_count INT DEFAULT 3,
    is_exclusive TINYINT(1) DEFAULT 0,
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    INDEX idx_serial_no (serial_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    product_id CHAR(36),
    product_name VARCHAR(1000),
    product_price DECIMAL(10,2),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_note TEXT,
    delivery_area VARCHAR(100),
    delivery_charge DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    last_four_digits VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    size VARCHAR(255),
    color VARCHAR(255),
    is_advance_paid TINYINT(1) DEFAULT 0,
    is_exclusive_order TINYINT(1) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'Unpaid',
    moderator_reference VARCHAR(100),
    INDEX idx_status (status),
    INDEX idx_customer_phone (customer_phone),
    INDEX idx_created_at (created_at),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    rating INT DEFAULT 5,
    comment TEXT,
    customer_name VARCHAR(255),
    product_id CHAR(36),
    product_name VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SITE SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADMIN USERS TABLE (replaces Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
