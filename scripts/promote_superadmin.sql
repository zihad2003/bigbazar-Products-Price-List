-- Promote owner to superadmin (Hostinger phpMyAdmin)
-- If role column missing, run this first (ignore "Duplicate column" error):
-- ALTER TABLE `admin_users` ADD COLUMN `role` VARCHAR(20) DEFAULT 'admin';

UPDATE `admin_users`
SET `role` = 'superadmin'
WHERE LOWER(`email`) = 'zihadlaptopasus@gmail.com';

SELECT `id`, `email`, `role` FROM `admin_users`;
