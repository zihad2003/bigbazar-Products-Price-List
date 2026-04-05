const { connect } = require('@tidbcloud/serverless');
require('dotenv').config();

const env = process.env;
const url = `mysql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}?ssl={"rejectUnauthorized":true}`;
const conn = connect({ url });

async function setup() {
  try {
    // Check if table exists, if not create it
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pending_2fa (
        login_id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        email VARCHAR(255) NOT NULL,
        admin_id VARCHAR(255) NOT NULL,
        expires_at BIGINT NOT NULL
      )
    `);
    console.log('Table pending_2fa is ready.');
  } catch (err) {
    console.error('Setup error:', err.message);
  }
}

setup();
