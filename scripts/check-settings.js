require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'hisecure_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

(async () => {
  try {
    const res = await pool.query('SELECT * FROM settings');
    console.log('Settings keys in database:');
    res.rows.forEach(r => {
      console.log(`Key: ${r.key}`);
      console.log('Value:', JSON.stringify(r.value, null, 2));
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
  } finally {
    await pool.end();
  }
})();
