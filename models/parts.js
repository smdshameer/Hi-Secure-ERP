const { pool } = require('../config/database');

async function getAllParts() {
  const result = await pool.query(`SELECT p.part_id, p.part_number, p.name, p.description, p.brand_id, b.name as brand_name, p.hsn_code, COALESCE(p.cost_price, 0) as cost_price, COALESCE(p.selling_price, 0) as selling_price, COALESCE(p.stock_quantity, 0) as stock_quantity, COALESCE(p.reorder_level, 5) as reorder_level, p.is_active, p.created_at, p.updated_at FROM parts p LEFT JOIN brands b ON p.brand_id = b.brand_id ORDER BY p.name`);
  return result.rows.map(p => ({ ...p, cost_price: Number(p.cost_price), selling_price: Number(p.selling_price), stock_quantity: Number(p.stock_quantity), reorder_level: Number(p.reorder_level) }));
}

async function getPartsStats() {
  const result = await pool.query(`SELECT COUNT(*) as low_stock FROM parts WHERE (stock_quantity <= reorder_level OR stock_quantity = 0) AND is_active = true`);
  return result.rows[0];
}

async function getPartById(partId) {
  const result = await pool.query('SELECT p.*, b.name as brand_name FROM parts p LEFT JOIN brands b ON p.brand_id = b.brand_id WHERE p.part_id = $1', [partId]);
  return result.rows[0] || null;
}

async function getBrands() {
  const result = await pool.query('SELECT brand_id, name FROM brands ORDER BY name');
  return result.rows;
}

async function createPart(data) {
  const { part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, stock_quantity, reorder_level, is_active } = data;
  const result = await pool.query(`INSERT INTO parts (part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, stock_quantity, reorder_level, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING part_id, part_number, name`, [part_number.trim(), name.trim(), description || null, brand_id ? parseInt(brand_id) : null, hsn_code || null, parseFloat(cost_price) || 0, parseFloat(selling_price) || 0, tax_rate ? parseFloat(tax_rate) || 0 : 0, parseInt(stock_quantity) || 0, parseInt(reorder_level) || 5, is_active !== false]);
  return result.rows[0];
}

async function updatePart(partId, data) {
  const { part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, reorder_level, is_active } = data;
  await pool.query(`UPDATE parts SET part_number = $1, name = $2, description = $3, brand_id = $4, hsn_code = $5, cost_price = $6, selling_price = $7, tax_rate = $8, reorder_level = $9, is_active = $10, updated_at = CURRENT_TIMESTAMP WHERE part_id = $11`, [part_number.trim(), name.trim(), description || null, brand_id ? parseInt(brand_id) : null, hsn_code || null, parseFloat(cost_price) || 0, parseFloat(selling_price) || 0, tax_rate ? parseFloat(tax_rate) || 0 : 0, parseInt(reorder_level) || 5, is_active, partId]);
}

async function deletePart(partId) {
  await pool.query('DELETE FROM parts WHERE part_id = $1', [partId]);
}

async function bulkDeleteParts(ids) {
  await pool.query('DELETE FROM parts WHERE part_id = ANY($1::int[])', [ids]);
}

async function getPartRepairs(partId) {
  const result = await pool.query(`SELECT rp.repair_id, rp.quantity as quantity_used, r.received_date as repair_date, c.name as customer_name FROM repair_parts rp JOIN repairs r ON rp.repair_id = r.repair_id JOIN customers c ON r.customer_id = c.customer_id WHERE rp.part_id = $1 ORDER BY r.received_date DESC`, [partId]);
  return result.rows;
}

async function getPartDeliveryChallans(partId) {
  const result = await pool.query(`SELECT dci.quantity, dc.challan_date, dc.challan_number, dc.status, c.name as customer_name, dc.delivery_challan_id FROM delivery_challan_items dci JOIN delivery_challans dc ON dci.delivery_challan_id = dc.delivery_challan_id LEFT JOIN customers c ON dc.customer_id = c.customer_id WHERE dci.part_id = $1 ORDER BY dc.challan_date DESC`, [partId]);
  return result.rows;
}

async function updateStock(partId, quantityChange) {
  await pool.query('UPDATE parts SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2', [quantityChange, partId]);
}

async function quickCreatePart(data) {
  const { part_number, name, brand_name, selling_price, cost_price, hsn_code, stock_quantity } = data;
  let brandId = null;
  if (brand_name && brand_name.trim() !== '') {
    const brandResult = await pool.query('SELECT brand_id FROM brands WHERE name = $1', [brand_name.trim()]);
    if (brandResult.rows.length > 0) brandId = brandResult.rows[0].brand_id;
  }
  const defaultTaxRate = 18;
  const result = await pool.query(`INSERT INTO parts (part_number, name, brand_id, hsn_code, cost_price, selling_price, tax_rate, stock_quantity, reorder_level, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 5, true) RETURNING part_id, part_number, name, selling_price, stock_quantity, tax_rate`, [part_number.trim(), name.trim(), brandId, hsn_code || null, cost_price ? parseFloat(cost_price) : 0, parseFloat(selling_price), defaultTaxRate, parseInt(stock_quantity) || 0]);
  return result.rows[0];
}

async function exportPartsCSV() {
  const result = await pool.query(`SELECT p.part_number, p.name, p.description, b.name as brand, p.hsn_code, p.cost_price, p.selling_price, p.tax_rate, p.stock_quantity, p.reorder_level, p.is_active, CASE WHEN p.stock_quantity <= p.reorder_level THEN 'LOW STOCK' ELSE 'OK' END as status FROM parts p LEFT JOIN brands b ON p.brand_id = b.brand_id ORDER BY p.part_number`);
  return result.rows;
}

module.exports = {
  getAllParts,
  getPartsStats,
  getPartById,
  getBrands,
  createPart,
  updatePart,
  deletePart,
  bulkDeleteParts,
  getPartRepairs,
  getPartDeliveryChallans,
  updateStock,
  quickCreatePart,
  exportPartsCSV
};
