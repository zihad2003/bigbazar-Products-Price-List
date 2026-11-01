-- Admin "spoken with customer" / Contacted markers for carts + orders.
-- Safe to run on Hostinger phpMyAdmin (ignore "Duplicate column" if already applied).
-- Runtime ALTER also runs via ensure* helpers in functions/api/[[path]].js.

ALTER TABLE `orders`
  ADD COLUMN `contacted_at` DATETIME NULL,
  ADD COLUMN `contacted_by` VARCHAR(255) NULL;

ALTER TABLE `shopper_sessions`
  ADD COLUMN `contacted_at` DATETIME NULL,
  ADD COLUMN `contacted_by` VARCHAR(255) NULL;
