require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Running: ${file}`);
    await pool.query(sql);
    console.log(`  ✓ ${file}`);
  }
  await pool.end();
  console.log('All migrations complete.');
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
