require('dotenv').config();
const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');

types.setTypeParser(1700, (val) => val === null ? null : Number(val));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'hisecure_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('query', (q) => {
  const logLine = `[DB QUERY] ${q.text.replace(/\n/g, ' ').trim()}\n`;
  fs.appendFileSync(path.join(__dirname, '..', 'server.log'), logLine);
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database test query successful:', result.rows[0]);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
