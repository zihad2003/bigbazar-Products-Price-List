-- Advance refund tracking when an admin cancels an order that had advance paid.
-- Safe to run on Hostinger phpMyAdmin (ignore "Duplicate column" if already applied).

ALTER TABLE `orders`
  ADD COLUMN `advance_refunded` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `advance_refunded_at` DATETIME NULL,
  ADD COLUMN `advance_refund_note` VARCHAR(500) NULL;
