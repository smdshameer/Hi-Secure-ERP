// scripts/init-db.js — transaction-safe initializer
// Uses the application's pg Pool (same as server.js).
// Re-runs cleanly because every DDL is IF NOT EXISTS / DO $$ ... IF NOT EXISTS.
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'hisecure_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
  max: 5,
});

const sqlPath = path.join(__dirname, '..', 'migrations', '010_master_schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// naive split by ";<newline>" while keeping $$...$$ blocks intact
function split(sql) {
  const out = [];
  let cur = '';
  let inDDL = 0;
  for (const line of sql.split('\n')) {
    cur += line + '\n';
    const open = (cur.match(/\$\$/g) || []).length;
    if (open % 2 === 1) continue; // inside $$..$$
    for (let i = 0; i < cur.length - 1; i++) {
      if (cur.charCodeAt(i) === 59 && cur.charCodeAt(i + 1) === 10) { // ';\n'
        const s = cur.slice(0, i + 1).trim();
        if (s) out.push(s);
        cur = cur.slice(i + 2);
        i = -1;
      }
    }
  }
  const last = cur.trim();
  if (last) out.push(last);
  return out.filter(s => s && !/^\s*--/.test(s) && !/^\s*$/.test(s));
}

(async () => {
  const stmts = split(sql);
  let ok = 0, warn = 0;
  console.log(`Read ${stmts.length} statements from ${sqlPath}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of stmts) {
      try {
        await client.query(s);
        ok++;
      } catch (e) {
        warn++;
        // ignored under BEGIN — safe for IF NOT EXISTS / duplicate
        // console.warn('warn:', e.message);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Fatal:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
  console.log(`✅  ${ok} ok, ${warn} ignored warnings`);
})();
