const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdmins() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM admin_users');
    console.log('Admin Users:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error fetching admin users:', err);
  } finally {
    await connection.end();
  }
}

checkAdmins();
