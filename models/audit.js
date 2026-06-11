const { pool } = require('../config/database');

async function logActivity({ user_id, action, module, record_id, old_values, new_values, ip_address, user_agent }) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, module, record_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [user_id || null, action, module, record_id || null, old_values || null, new_values || null, ip_address || null, user_agent || null]
  );
}

async function getLogs(filters = {}) {
  const params = [];
  const where = [];
  if (filters.module) { where.push(`module = $${params.length + 1}`); params.push(filters.module); }
  if (filters.user_id) { where.push(`user_id = $${params.length + 1}`); params.push(filters.user_id); }
  if (filters.from_date && filters.to_date) { where.push(`created_at BETWEEN $${params.length + 1} AND $${params.length + 2}`); params.push(filters.from_date, filters.to_date + ' 23:59:59'); }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT a.*, u.username, u.full_name FROM audit_logs a LEFT JOIN users u ON u.user_id = a.user_id ${whereClause} ORDER BY a.created_at DESC LIMIT 500`,
    params
  );
  return result.rows;
}

async function getStats() {
  const result = await pool.query(`SELECT module, COUNT(*) as count FROM audit_logs GROUP BY module ORDER BY count DESC`);
  return result.rows;
}

module.exports = { logActivity, getLogs, getStats };
