import mysql from 'mysql2/promise';

let mysqlPool = null;

function isTransientDbError(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return (
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    /closed state|connection lost|read ECONNRESET|write EPIPE|Can't add new command|Server has gone away/i.test(msg)
  );
}

/**
 * Returns a database connection for the given environment.
 * Hostinger MySQL over a standard TCP connection via mysql2,
 * either from DATABASE_URL (mysql://…) or the DB_* variables.
 *
 * @param {object} env - Server env bindings or node process.env
 * @returns {object} Database Connection instance with .execute(sql, params)
 *                   and .begin() for transactions
 */
export const getDb = (env = {}) => {
  const getVar = (key) => {
    if (env && env[key]) return env[key];
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    return undefined;
  };

  const databaseUrl = getVar('DATABASE_URL');
  const host = getVar('DB_HOST') || '127.0.0.1';
  const port = parseInt(getVar('DB_PORT') || '3306', 10);
  const user = getVar('DB_USER') || '';
  const password = getVar('DB_PASSWORD') || '';
  const database = getVar('DB_NAME') || '';

  // Hostinger MySQL (singleton pool for the whole worker)
  if (!mysqlPool) {
    const targetHost = host === 'localhost' ? '127.0.0.1' : host;

    if (databaseUrl) {
      mysqlPool = mysql.createPool({
        uri: databaseUrl,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 5,
        idleTimeout: 30000,
        connectTimeout: 10000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });
    } else {
      mysqlPool = mysql.createPool({
        host: targetHost,
        port: port || 3306,
        user: user,
        password: password,
        database: database,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 5,
        idleTimeout: 30000,
        connectTimeout: 10000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });
    }
  }

  return {
    async execute(sql, params = []) {
      // Normalize undefined params to null for mysql2
      const safeParams = (params || []).map(p => p === undefined ? null : p);
      try {
        const [results] = await mysqlPool.execute(sql, safeParams);
        return results;
      } catch (err) {
        if (!isTransientDbError(err)) throw err;
        const [results] = await mysqlPool.execute(sql, safeParams);
        return results;
      }
    },

    /**
     * Transaction API used by order create/update/delete.
     * Holds one pooled connection for the full begin → execute* → commit/rollback cycle.
     */
    async begin() {
      let connection = await mysqlPool.getConnection();
      try {
        await connection.beginTransaction();
      } catch (err) {
        try { connection.destroy(); } catch (_) {}
        if (!isTransientDbError(err)) throw err;
        connection = await mysqlPool.getConnection();
        await connection.beginTransaction();
      }
      let finished = false;

      const releaseOnce = () => {
        if (finished) return;
        finished = true;
        try {
          connection.release();
        } catch (_) {}
      };

      return {
        async execute(sql, params = []) {
          const safeParams = (params || []).map(p => p === undefined ? null : p);
          const [results] = await connection.execute(sql, safeParams);
          return results;
        },
        async commit() {
          try {
            await connection.commit();
          } finally {
            releaseOnce();
          }
        },
        async rollback() {
          try {
            await connection.rollback();
          } finally {
            releaseOnce();
          }
        },
      };
    },
  };
};
