-- Optional customer email for order confirmation messages.
-- Safe to run on Hostinger phpMyAdmin (ignore "Duplicate column" if already applied).

ALTER TABLE `orders`
  ADD COLUMN `customer_email` VARCHAR(255) NULL;
