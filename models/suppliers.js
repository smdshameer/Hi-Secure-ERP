const { pool } = require('../config/database');
const { validateGSTIN } = require('../config/settings');

async function getSuppliers() {
  const result = await pool.query('SELECT s.* FROM suppliers s ORDER BY s.name');
  return result.rows;
}

async function getSupplierById(supplierId) {
  const result = await pool.query('SELECT * FROM suppliers WHERE supplier_id = $1', [supplierId]);
  return result.rows[0] || null;
}

async function getSupplierDeliveryChallans(supplierId) {
  const result = await pool.query(`SELECT dc.*, COUNT(dci.challan_item_id) as item_count FROM delivery_challans dc LEFT JOIN delivery_challan_items dci ON dc.delivery_challan_id = dci.delivery_challan_id WHERE dc.supplier_id = $1 GROUP BY dc.delivery_challan_id ORDER BY dc.challan_date DESC`, [supplierId]);
  return result.rows;
}

async function createSupplier(data) {
  const { supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active } = data;
  if (gstin) {
    const err = validateGSTIN(gstin);
    if (err) throw new Error(err);
  }
  const result = await pool.query(`INSERT INTO suppliers (supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING supplier_id, supplier_code`, [supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active !== false]);
  return result.rows[0];
}

async function updateSupplier(supplierId, data) {
  const { supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active } = data;
  if (gstin) {
    const err = validateGSTIN(gstin);
    if (err) throw new Error(err);
  }
  await pool.query(`UPDATE suppliers SET supplier_code = $1, name = $2, contact_person = $3, phone = $4, email = $5, gstin = $6, pan = $7, address = $8, city = $9, state = $10, pincode = $11, is_active = $12, updated_at = CURRENT_TIMESTAMP WHERE supplier_id = $13`, [supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active, supplierId]);
}

async function deactivateSupplier(supplierId) {
  await pool.query('UPDATE suppliers SET is_active = false WHERE supplier_id = $1', [supplierId]);
}

module.exports = {
  getSuppliers,
  getSupplierById,
  getSupplierDeliveryChallans,
  createSupplier,
  updateSupplier,
  deactivateSupplier
};
