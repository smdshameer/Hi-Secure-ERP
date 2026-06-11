const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
 host: 'localhost',
 port: 5432,
 database: 'hisecure_erp',
 user: 'postgres',
 password: 'changeme',
 max: 1,
});

const sql = fs.readFileSync(path.join(__dirname, 'migrations', '011_amc_module.sql'), 'utf8');
(async () => {
 try {
 await pool.query(sql);
 console.log('Migration 011 complete: AMC tables created');
 } catch (e) {
 console.error('Migration failed:', e.message);
 process.exit(1);
 } finally {
 await pool.end();
 }
})();
