const { pool } = require('../config/database');

async function fix() {
  try {
    const r = await pool.query("SELECT key, value FROM settings WHERE key = 'print'");
    const row = r.rows[0];
    if (!row) { console.log('No print settings found'); process.exit(0); }

    const val = row.value;
    console.log('Before:', JSON.stringify(val, null, 2));

    val.default_theme = 'hisecure';
    val.available_themes = ['hisecure', 'tally', 'classic', 'modern-blue', 'minimal', 'saffron'];

    await pool.query('UPDATE settings SET value = $1 WHERE key = $2', [val, 'print']);

    const r2 = await pool.query("SELECT key, value FROM settings WHERE key = 'print'");
    console.log('After:', JSON.stringify(r2.rows[0].value, null, 2));
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

fix();
