const { pool } = require('../config/database');

async function listStores(filters = {}) {
  const params = [];
  const where = [];
  if (typeof filters.active !== 'undefined') {
    where.push(`is_active = $${params.length + 1}`);
    params.push(filters.active);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(`SELECT * FROM stores ${whereClause} ORDER BY store_name ASC`, params);
  return result.rows;
}

async function getStoreById(storeId) {
  const result = await pool.query('SELECT * FROM stores WHERE store_id = $1', [storeId]);
  return result.rows[0] || null;
}

async function getActiveStores() {
  const result = await pool.query('SELECT * FROM stores WHERE is_active = true ORDER BY store_name');
  return result.rows;
}

async function createStore(data) {
  const { store_code, store_name, address, city, state, pincode, phone, email, gstin, manager_name, is_active } = data;
  const result = await pool.query(
    `INSERT INTO stores (store_code, store_name, address, city, state, pincode, phone, email, gstin, manager_name, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, true)) RETURNING *`,
    [store_code, store_name, address || null, city || null, state || null, pincode || null, phone || null, email || null, gstin || null, manager_name || null, is_active]
  );
  return result.rows[0];
}

async function updateStore(storeId, data) {
  const allowed = ['store_code', 'store_name', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'gstin', 'manager_name', 'is_active'];
  const sets = [];
  const vals = [];
  allowed.forEach(field => {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${vals.length + 1}`);
      vals.push(data[field]);
    }
  });
  if (!sets.length) return getStoreById(storeId);
  vals.push(storeId);
  const result = await pool.query(`UPDATE stores SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE store_id = $${vals.length} RETURNING *`, vals);
  return result.rows[0];
}

async function deleteStore(storeId) {
  await pool.query('DELETE FROM stores WHERE store_id = $1', [storeId]);
}

module.exports = {
  listStores, getStoreById, getActiveStores, createStore, updateStore, deleteStore
};
