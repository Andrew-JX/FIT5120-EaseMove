require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Runs all SQL migration files in the migrations directory in alphabetical order.
 * Uses IF NOT EXISTS — safe to run multiple times without duplicating tables.
 */
async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`  ✓ ${file} complete`);
  }

  await pool.end();
  console.log('All migrations complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
