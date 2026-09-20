-- 1. Add role column if missing (ignore error if it already exists)
ALTER TABLE `admin_users` ADD COLUMN `role` VARCHAR(20) DEFAULT 'admin';

-- 2. Upsert Superadmin (Password: BigBazar@2026) — updates role if email already exists
INSERT INTO `admin_users` (`email`, `password_hash`, `role`)
VALUES ('zihadlaptopasus@gmail.com', '$2a$10$mKLl1Yfbp7Zc9tNHng18G.95j19vc.qKySBnRFRJT2nykcnIMBCsy', 'superadmin')
ON DUPLICATE KEY UPDATE `role` = 'superadmin';