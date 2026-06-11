const { pool } = require('../config/database');

async function getAllCustomers() {
  const result = await pool.query(`SELECT c.*, COUNT(r.repair_id) as total_repairs, SUM(r.actual_cost) as lifetime_value, MAX(r.received_date) as last_repair FROM customers c LEFT JOIN repairs r ON c.customer_id = r.customer_id GROUP BY c.customer_id ORDER BY c.name`);
  return result.rows;
}

async function getCustomerById(customerId) {
  const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [customerId]);
  return result.rows[0] || null;
}

async function getCustomerByPhone(phone) {
  const result = await pool.query('SELECT * FROM customers WHERE phone = $1', [phone]);
  return result.rows[0] || null;
}

async function createCustomer(data) {
  const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active } = data;
  const result = await pool.query(`INSERT INTO customers (customer_code, name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING customer_id, customer_code`, [`CUS-${Date.now()}`, name.trim(), phone.trim(), email || null, address || null, city || null, state || null, pincode || null, gstin || null, customer_type || 'retail', parseFloat(credit_limit) || 0, is_active !== false]);
  return result.rows[0];
}

async function updateCustomer(customerId, data) {
  const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active } = data;
  await pool.query(`UPDATE customers SET name = $1, phone = $2, email = $3, address = $4, city = $5, state = $6, pincode = $7, gstin = $8, customer_type = $9, credit_limit = $10, is_active = $11, updated_at = CURRENT_TIMESTAMP WHERE customer_id = $12`, [name.trim(), phone.trim(), email || null, address || null, city || null, state || null, pincode || null, gstin || null, customer_type || 'retail', parseFloat(credit_limit) || 0, is_active, customerId]);
}

async function deleteCustomer(customerId) {
  await pool.query('DELETE FROM customers WHERE customer_id = $1', [customerId]);
}

async function bulkDeleteCustomers(ids) {
  await pool.query('DELETE FROM customers WHERE customer_id = ANY($1::int[])', [ids]);
}

async function getCustomerRepairs(customerId) {
  const result = await pool.query(`SELECT r.repair_id, r.ticket_number, r.product_type, r.repair_status, r.received_date, r.actual_cost, b.name as brand_name FROM repairs r LEFT JOIN brands b ON r.brand_id = b.brand_id WHERE r.customer_id = $1 ORDER BY r.received_date DESC`, [customerId]);
  return result.rows;
}

async function getCustomerInvoices(customerId, limit = 10) {
  const result = await pool.query(`SELECT si.*, COUNT(sii.item_id) as item_count FROM sales_invoices si LEFT JOIN sales_invoice_items sii ON si.invoice_id = sii.invoice_id WHERE si.customer_id = $1 GROUP BY si.invoice_id ORDER BY si.invoice_date DESC LIMIT $2`, [customerId, limit]);
  return result.rows;
}

async function getCustomerQuotations(customerId, limit = 10) {
  const result = await pool.query('SELECT q.* FROM quotations q WHERE q.customer_id = $1 ORDER BY q.created_at DESC LIMIT $2', [customerId, limit]);
  return result.rows;
}

async function quickCreateCustomer(data) {
  const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit } = data;
  const result = await pool.query(`INSERT INTO customers (customer_code, name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING customer_id, customer_code, name, phone, email, address, city, state, pincode, gstin`, [`CUS-${Date.now()}`, name.trim(), phone.trim(), email || null, address || null, city || null, state || null, pincode || null, gstin || null, customer_type || 'retail', parseFloat(credit_limit) || 0, true]);
  return result.rows[0];
}

async function exportCustomersCSV() {
  const result = await pool.query(`SELECT c.customer_id, c.customer_code, c.name, c.phone, c.email, c.gstin, c.city, c.state, c.customer_type, c.credit_limit, COUNT(r.repair_id) as total_repairs, COALESCE(SUM(r.actual_cost), 0) as lifetime_value FROM customers c LEFT JOIN repairs r ON c.customer_id = r.customer_id GROUP BY c.customer_id ORDER BY c.name`);
  return result.rows;
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  getCustomerRepairs,
  getCustomerInvoices,
  getCustomerQuotations,
  quickCreateCustomer,
  exportCustomersCSV
};
