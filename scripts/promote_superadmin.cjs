/**
 * Promote zihadlaptopasus@gmail.com to superadmin in admin_users.
 * Usage: node scripts/promote_superadmin.cjs
 */
require('dotenv').config();

const EMAIL = (process.argv[2] || 'zihadlaptopasus@gmail.com').trim().toLowerCase();

async function ensureRoleColumn(execute) {
  try {
    await execute(
      "ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) DEFAULT 'admin'"
    );
    console.log('Added role column');
  } catch (e) {
    if (!/duplicate|exists/i.test(e.message || '')) {
      // ignore "already exists"
    }
  }
}

async function runMysql() {
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const execute = (sql, params) => conn.execute(sql, params).then(([r]) => r);
  await ensureRoleColumn(execute);
  const before = await execute('SELECT id, email, role FROM admin_users');
  console.log('BEFORE:', before);
  const result = await execute(
    'UPDATE admin_users SET role = ? WHERE LOWER(email) = ?',
    ['superadmin', EMAIL]
  );
  console.log('UPDATE affected:', result.affectedRows);
  if (!result.affectedRows) {
    console.log('No row matched — check email spelling in admin_users');
  }
  const after = await execute('SELECT id, email, role FROM admin_users');
  console.log('AFTER:', after);
  await conn.end();
}

async function runTidb() {
  const { connect } = require('@tidbcloud/serverless');
  const conn = connect({ url: process.env.DATABASE_URL });
  const execute = async (sql, params = []) => {
    const res = await conn.execute(sql, params);
    return Array.isArray(res) ? res : res.rows || [];
  };
  await ensureRoleColumn((sql, params) => conn.execute(sql, params));
  const before = await execute('SELECT id, email, role FROM admin_users');
  console.log('BEFORE:', before);
  await conn.execute('UPDATE admin_users SET role = ? WHERE LOWER(email) = ?', [
    'superadmin',
    EMAIL,
  ]);
  const after = await execute('SELECT id, email, role FROM admin_users');
  console.log('AFTER:', after);
}

(async () => {
  try {
    const url = process.env.DATABASE_URL || '';
    if (url.includes('tidbcloud.com')) {
      console.log('Using TiDB...');
      await runTidb();
    } else if (process.env.DB_HOST) {
      console.log('Using MySQL...');
      await runMysql();
    } else {
      throw new Error('No DB credentials in .env');
    }
    console.log('Done. Log out of /admin and log in again.');
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exit(1);
  }
})();
