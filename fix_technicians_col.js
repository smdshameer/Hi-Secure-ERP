const { pool } = require('./config/database');
(async () => {
  await pool.query("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  console.log('Added updated_at to technicians');
  await pool.end();
})();
