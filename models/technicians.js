const { pool } = require('../config/database');

async function getTechnicians() {
  const result = await pool.query(`SELECT t.*, COUNT(CASE WHEN r.repair_status NOT IN ('completed', 'cancelled') THEN 1 END) as active_repairs, COUNT(CASE WHEN r.repair_status = 'completed' THEN 1 END) as completed_repairs FROM technicians t LEFT JOIN repairs r ON t.technician_id = r.assigned_technician_id GROUP BY t.technician_id ORDER BY t.name`);
  return result.rows;
}

async function getTechnicianById(technicianId) {
  const result = await pool.query('SELECT * FROM technicians WHERE technician_id = $1', [technicianId]);
  return result.rows[0] || null;
}

async function getTechnicianRepairs(technicianId) {
  const result = await pool.query(`SELECT r.repair_id, r.ticket_number, c.name as customer_name, r.product_type, r.repair_status, r.received_date FROM repairs r JOIN customers c ON r.customer_id = c.customer_id WHERE r.assigned_technician_id = $1 ORDER BY r.received_date DESC`, [technicianId]);
  return result.rows;
}

async function createTechnician(data) {
  const { name, phone, specialization, is_active } = data;
  const result = await pool.query('INSERT INTO technicians (name, phone, specialization, is_active) VALUES ($1, $2, $3, $4) RETURNING technician_id', [name, phone, specialization, is_active !== false]);
  return result.rows[0];
}

async function updateTechnician(technicianId, data) {
  const { name, phone, specialization, is_active } = data;
  await pool.query('UPDATE technicians SET name = $1, phone = $2, specialization = $3, is_active = $4 WHERE technician_id = $5', [name, phone, specialization, is_active, technicianId]);
}

async function deactivateTechnician(technicianId) {
  await pool.query('UPDATE technicians SET is_active = false WHERE technician_id = $1', [technicianId]);
}

module.exports = {
  getTechnicians,
  getTechnicianById,
  getTechnicianRepairs,
  createTechnician,
  updateTechnician,
  deactivateTechnician
};
