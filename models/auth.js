const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function authenticateUser(username, password) {
  const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  return user;
}

async function updateLastLogin(userId) {
  await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [userId]);
}

module.exports = {
  authenticateUser,
  updateLastLogin
};
