import { connect } from '@tidbcloud/serverless';

/**
 * Returns a TiDB serverless connection for the given environment.
 *
 * We intentionally do NOT cache the connection object at module scope.
 * TiDB serverless uses HTTP under the hood — each call to connect() is cheap
 * and lightweight.  Caching was causing a silent failure mode: if the first
 * request arrived before env vars were injected (e.g. on Cloudflare cold-start
 * with missing secrets) the broken connection object got cached and ALL
 * subsequent requests failed with "DB_HOST missing" even after the env was
 * correctly configured.
 *
 * @param {object} env - Cloudflare env bindings or node process.env
 * @returns {object} TiDB Connection instance
 */
export const getDb = (env = {}) => {
  // Prefer process.env (local Node dev with dotenv) over Cloudflare bindings
  const getVar = (key) => {
    // Priority 1: Cloudflare Environment Bindings
    if (env && env[key]) return env[key];
    // Priority 2: Node.js process.env (for local development)
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    return undefined;
  };

  const user = encodeURIComponent(getVar('DB_USER') || '');
  const pass = encodeURIComponent(getVar('DB_PASSWORD') || '');
  const host = getVar('DB_HOST');
  const port = getVar('DB_PORT') || '4000';
  const name = getVar('DB_NAME') || 'test';

  if (!host || !user) {
    const missing = [];
    if (!host) missing.push('DB_HOST');
    if (!user) missing.push('DB_USER');
    if (!pass) missing.push('DB_PASSWORD');
    throw new Error(`Cloudflare Environment Variables Missing: ${missing.join(', ')}. Please add them to your Pages Dashboard.`);
  }

  const url = `mysql://${user}:${pass}@${host}:${port}/${name}?ssl={"rejectUnauthorized":true}`;

  try {
    return connect({ url });
  } catch (err) {
    console.error('❌ Failed to initialize TiDB connection:', err.message);
    throw err;
  }
};
