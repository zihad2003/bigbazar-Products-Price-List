-- Gift orders: buyer stays in customer_* (confirm/SMS/call);
-- recipient_* is who receives the parcel (Steadfast).
-- Safe to run on Hostinger phpMyAdmin.

ALTER TABLE `orders`
  ADD COLUMN `is_gift` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `recipient_name` VARCHAR(255) NULL,
  ADD COLUMN `recipient_phone` VARCHAR(20) NULL;
