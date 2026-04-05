const { connect } = require('@tidbcloud/serverless');
require('dotenv').config();

const env = process.env;
const url = `mysql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}?ssl={"rejectUnauthorized":true}`;
const conn = connect({ url });

async function checkAdmins() {
  try {
    const res = await conn.execute('SELECT id, email, password_hash FROM admin_users');
    console.log('Admins found:', res.length);
    res.forEach(admin => {
      console.log(`- ID: ${admin.id}, Email: ${admin.email}`);
    });
  } catch (err) {
    console.error('Error fetching admins:', err.message);
  }
}

checkAdmins();
