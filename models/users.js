const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function getUsers() {
  const result = await pool.query('SELECT user_id, username, email, full_name, phone, role, is_active, last_login, created_at FROM users ORDER BY username');
  return result.rows;
}

async function getUserById(userId) {
  const result = await pool.query('SELECT user_id, username, email, full_name, phone, role, is_active, last_login, created_at FROM users WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

async function getUserByUsername(username) {
  const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
  return result.rows[0] || null;
}

async function createUser(data) {
  const { username, full_name, email, phone, role, password, is_active } = data;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(`INSERT INTO users (username, email, password_hash, full_name, role, phone, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, username`, [username, email, hashedPassword, full_name, role, phone, is_active !== false]);
  return result.rows[0];
}

async function updateUser(userId, data) {
  const { username, full_name, email, phone, role, password, is_active } = data;
  if (password && password.trim() !== '') {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(`UPDATE users SET username = $1, email = $2, full_name = $3, phone = $4, role = $5, password_hash = $6, is_active = $7 WHERE user_id = $8`, [username, email, full_name, phone, role, hashedPassword, is_active, userId]);
  } else {
    await pool.query(`UPDATE users SET username = $1, email = $2, full_name = $3, phone = $4, role = $5, is_active = $6 WHERE user_id = $7`, [username, email, full_name, phone, role, is_active, userId]);
  }
}

async function deactivateUser(userId) {
  await pool.query('UPDATE users SET is_active = false WHERE user_id = $1', [userId]);
}

async function updateLastLogin(userId) {
  await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [userId]);
}

module.exports = {
  getUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deactivateUser,
  updateLastLogin
};
