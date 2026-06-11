const { pool } = require('../config/database');

async function getActiveRepairs() {
  const result = await pool.query(`SELECT r.repair_id, r.ticket_number, c.name as customer_name, c.phone as customer_phone, r.product_type, r.brand_id, b.name as brand_name, r.model_number, r.serial_number, r.repair_status, r.estimated_cost, r.actual_cost, t.name as technician_name, r.received_date, r.completion_date, CURRENT_DATE - r.received_date as days_in_shop FROM repairs r JOIN customers c ON r.customer_id = c.customer_id LEFT JOIN brands b ON r.brand_id = b.brand_id LEFT JOIN technicians t ON r.assigned_technician_id = t.technician_id WHERE r.repair_status NOT IN ('completed', 'cancelled') ORDER BY r.received_date DESC`);
  return result.rows;
}

async function getRecentRepairs(limit = 10) {
  const result = await pool.query(`SELECT r.repair_id, r.ticket_number, c.name as customer_name, c.phone as customer_phone, r.product_type, r.brand_id, b.name as brand_name, r.model_number, r.serial_number, r.repair_status, r.estimated_cost, r.actual_cost, t.name as technician_name, r.received_date, r.completion_date, CURRENT_DATE - r.received_date as days_in_shop FROM repairs r JOIN customers c ON r.customer_id = c.customer_id LEFT JOIN brands b ON r.brand_id = b.brand_id LEFT JOIN technicians t ON r.assigned_technician_id = t.technician_id ORDER BY r.received_date DESC LIMIT $1`, [limit]);
  return result.rows;
}

async function getRepairsByStatus(status) {
  let query = `SELECT r.repair_id, r.ticket_number, c.name as customer_name, c.phone as customer_phone, r.product_type, r.brand_id, b.name as brand_name, r.model_number, r.serial_number, r.repair_status, r.estimated_cost, r.actual_cost, t.name as technician_name, r.received_date, r.completion_date, CURRENT_DATE - r.received_date as days_in_shop FROM repairs r JOIN customers c ON r.customer_id = c.customer_id LEFT JOIN brands b ON r.brand_id = b.brand_id LEFT JOIN technicians t ON r.assigned_technician_id = t.technician_id `;
  const params = [];
  if (status !== 'all') {
    query += ` WHERE r.repair_status = $1`;
    params.push(status);
  }
  query += ` ORDER BY r.received_date DESC`;
  const result = await pool.query(query, params);
  return result.rows;
}

async function getBrands() {
  const result = await pool.query('SELECT brand_id, name FROM brands ORDER BY name');
  return result.rows;
}

async function getActiveTechnicians() {
  const result = await pool.query('SELECT technician_id, name, specialization FROM technicians WHERE is_active = true ORDER BY name');
  return result.rows;
}

async function getRepairById(repairId) {
  const result = await pool.query(`SELECT r.*, c.name as customer_name, c.phone as customer_phone, c.email, c.address, c.gstin, b.name as brand_name, t.name as technician_name FROM repairs r JOIN customers c ON r.customer_id = c.customer_id LEFT JOIN brands b ON r.brand_id = b.brand_id LEFT JOIN technicians t ON r.assigned_technician_id = t.technician_id WHERE r.repair_id = $1`, [repairId]);
  return result.rows[0] || null;
}

async function getRepairParts(repairId) {
  const result = await pool.query(`SELECT rp.*, p.part_number, p.name as part_name FROM repair_parts rp JOIN parts p ON rp.part_id = p.part_id WHERE rp.repair_id = $1`, [repairId]);
  return result.rows;
}

async function getRepairPayments(repairId) {
  const result = await pool.query('SELECT * FROM payments WHERE repair_id = $1 ORDER BY payment_date DESC', [repairId]);
  return result.rows;
}

async function createRepair(data) {
  const { customer_id, product_type, brand_id, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes } = data;
  const result = await pool.query(`INSERT INTO repairs (customer_id, product_type, brand_id, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes, received_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE) RETURNING repair_id, ticket_number`, [parseInt(customer_id), product_type.trim(), brand_id ? parseInt(brand_id) : null, serial_number || null, model_number || null, problem_description.trim(), estimated_cost ? parseFloat(estimated_cost) : null, warranty_status === 'on', notes || null]);
  return result.rows[0];
}

async function updateRepairStatus(repairId, status) {
  await pool.query('UPDATE repairs SET repair_status = $1 WHERE repair_id = $2', [status, repairId]);
}

async function updateRepair(repairId, data) {
  const { customer_id, product_type, brand_id, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes } = data;
  await pool.query(`UPDATE repairs SET customer_id = $1, product_type = $2, brand_id = $3, serial_number = $4, model_number = $5, problem_description = $6, estimated_cost = $7, warranty_status = $8, notes = $9, updated_at = CURRENT_TIMESTAMP WHERE repair_id = $10`, [parseInt(customer_id), product_type.trim(), brand_id ? parseInt(brand_id) : null, serial_number || null, model_number || null, problem_description.trim(), estimated_cost ? parseFloat(estimated_cost) : null, warranty_status === 'on', notes || null, repairId]);
}

async function addPaymentToRepair(repairId, amount, payment_method, notes) {
  await pool.query('INSERT INTO payments (repair_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, CURRENT_DATE, $4)', [repairId, amount, payment_method, notes]);
}

async function addPartToRepair(repairId, partId, quantity) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const partCheck = await client.query('SELECT part_id FROM parts WHERE part_id = $1 FOR UPDATE', [partId]);
    if (partCheck.rows.length === 0) throw new Error('Part not found');
    const partResult = await client.query('SELECT stock_quantity FROM parts WHERE part_id = $1', [partId]);
    if (partResult.rows[0].stock_quantity < quantity) throw new Error(`Insufficient stock. Available: ${partResult.rows[0].stock_quantity}`);
    await client.query('INSERT INTO repair_parts (repair_id, part_id, quantity) VALUES ($1, $2, $3)', [repairId, partId, quantity]);
    await client.query('UPDATE parts SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2', [quantity, partId]);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    throw err;
  } finally {
    client.release();
  }
}

async function deleteRepair(repairId) {
  await pool.query('DELETE FROM repairs WHERE repair_id = $1', [repairId]);
}

module.exports = {
  getActiveRepairs,
  getRecentRepairs,
  getRepairsByStatus,
  getBrands,
  getActiveTechnicians,
  getRepairById,
  getRepairParts,
  getRepairPayments,
  createRepair,
  updateRepairStatus,
  updateRepair,
  addPaymentToRepair,
  addPartToRepair,
  deleteRepair
};
