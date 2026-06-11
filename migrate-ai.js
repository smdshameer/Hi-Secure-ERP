const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sqlPath = path.join(__dirname, 'migrations', '012_ai_assistant.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 2,
  });

  try {
    // Verify connectivity first
    const ping = await pool.query('SELECT current_database(), version()');
    console.log('Connected to', ping.rows[0].current_database);
    console.log('PostgreSQL', ping.rows[0].version.slice(0, 50));

    // Run the migration
    await pool.query(sql);
    console.log('Migration 012 applied.');

    // Verify tables exist
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'ai_%' ORDER BY table_name"
    );
    console.log('AI tables found:', tables.rows.map(r => r.table_name).join(', ') || '(none)');

    await pool.end();
    console.log('Done.');
  } catch (err) {
    console.error('MIGRATION FAILED:', err.message);
    process.exit(1);
  }
}
main();
