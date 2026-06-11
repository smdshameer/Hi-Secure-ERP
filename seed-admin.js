#!/usr/bin/env node
// Seed script: creates/replaces the default admin user.
// Usage: ADMIN_PASSWORD=your-secure-password node seed-admin.js
// No password is embedded in source code.
require('dotenv').config();
const { pool } = require('./config/database');
const bcrypt = require('bcrypt');

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.error('ERROR: Set ADMIN_PASSWORD env var (min 8 characters).');
    console.error('Example: ADMIN_PASSWORD=MyStr0ng!Pass node seed-admin.js');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, full_name, role, phone, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       is_active = TRUE
     RETURNING user_id, username, role`,
    ['admin', 'admin@hisecure.com', hash, 'System Admin', 'admin', '9999999999', true]
  );

  console.log(`Admin user ready: id=${result.rows[0].user_id} username=${result.rows[0].username}`);
  console.log('SECURITY: Change the password immediately after first login.');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
