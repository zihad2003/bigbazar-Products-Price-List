-- Prevent double stock restore on cancel → Pending → cancel.
-- Safe to run on Hostinger phpMyAdmin (ignore "Duplicate column" if already applied).

ALTER TABLE `orders`
  ADD COLUMN `stock_restored` TINYINT(1) NOT NULL DEFAULT 0;

-- Optional backfill: orders already in Cancelled/Canceled/Deleted have returned stock
-- under the old status-based guard, so mark them restored.
UPDATE `orders`
SET `stock_restored` = 1
WHERE `status` IN ('Cancelled', 'Canceled', 'Deleted')
  AND (`stock_restored` = 0 OR `stock_restored` IS NULL);
