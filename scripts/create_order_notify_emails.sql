-- Order place email alert recipients (managed from Superadmin UI).
-- Runtime also CREATE TABLE IF NOT EXISTS; this script is for manual Hostinger setup.

CREATE TABLE IF NOT EXISTS order_notify_emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  label VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_notify_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
