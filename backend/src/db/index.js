require('dotenv').config();
const { Pool } = require('pg');

/**
 * PostgreSQL connection pool for Neon.
 * Reads DATABASE_URL from environment variables.
 * SSL is required for Neon — rejectUnauthorized: false allows self-signed certs.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Execute a parameterised SQL query.
 * @param {string} text - SQL with $1, $2... placeholders
 * @param {Array} [params] - Values for placeholders
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
