-- Stop product UPDATEs from bumping created_at (which reshuffles catalog order).
-- Safe to run on Hostinger phpMyAdmin / TiDB.

ALTER TABLE `products`
  MODIFY COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
