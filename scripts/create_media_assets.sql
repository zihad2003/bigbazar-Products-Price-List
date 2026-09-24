-- Run once on Hostinger MySQL (phpMyAdmin → SQL) if table was not auto-created.
CREATE TABLE IF NOT EXISTS `media_assets` (
  `id` VARCHAR(64) PRIMARY KEY,
  `mime_type` VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  `data` LONGBLOB NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
