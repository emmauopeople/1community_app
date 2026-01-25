// db.js
const { Pool } = require("pg");
require("dotenv").config();

function baseConfig() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Optional: tune pool later
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

/**
 * Node `pg` does NOT support libpq's sslmode=prefer fallback automatically.
 * So for DB_SSLMODE=prefer we try SSL first, then retry without SSL if server doesn't support SSL.
 */
async function createPoolWithSslMode() {
  const sslmode = (process.env.DB_SSLMODE || "disable").toLowerCase();

  const cfg = baseConfig();

  const sslConfig =
    sslmode === "require" || sslmode === "verify-ca" || sslmode === "verify-full" || sslmode === "prefer"
      ? { rejectUnauthorized: false } // good for quick dev; in prod use proper CA/certs
      : undefined;

  if (!sslConfig) {
    return new Pool(cfg);
  }

  // Try SSL first
  try {
    const poolSsl = new Pool({ ...cfg, ssl: sslConfig });
    // quick ping to confirm pool works
    await poolSsl.query("SELECT 1");
    return poolSsl;
  } catch (err) {
    // If sslmode=prefer and server doesn't support SSL, retry without SSL
    const msg = String(err?.message || "");
    if (sslmode === "prefer" && msg.toLowerCase().includes("does not support ssl")) {
      const poolNoSsl = new Pool(cfg);
      await poolNoSsl.query("SELECT 1");
      return poolNoSsl;
    }
    throw err;
  }
}

// Create pool once and export helpers
const poolPromise = createPoolWithSslMode();

async function query(text, params) {
  const pool = await poolPromise;
  return pool.query(text, params);
}

async function close() {
  const pool = await poolPromise;
  return pool.end();
}

module.exports = { query, close };
