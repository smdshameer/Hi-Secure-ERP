const { pool } = require('../config/database');

async function getActiveParts() {
  const result = await pool.query(`SELECT p.part_id, p.part_number, p.name, b.name as brand_name, p.selling_price, p.stock_quantity, p.tax_rate, p.hsn_code FROM parts p LEFT JOIN brands b ON p.brand_id = b.brand_id WHERE p.is_active = true AND p.stock_quantity > 0 ORDER BY p.part_number`);
  return result.rows;
}

async function getActiveCustomers() {
  const result = await pool.query('SELECT customer_id, name, phone FROM customers WHERE is_active = true ORDER BY name');
  return result.rows;
}

async function getPartStock(partId) {
  const result = await pool.query('SELECT part_id, stock_quantity, part_number, name, selling_price, tax_rate, hsn_code FROM parts WHERE part_id = $1 AND is_active = true', [partId]);
  return result.rows[0] || null;
}

async function deductStock(partId, quantity) {
  await pool.query('UPDATE parts SET stock_quantity = stock_quantity - $1 WHERE part_id = $2', [quantity, partId]);
}

async function getInvoiceById(invoiceId) {
  const invResult = await pool.query(`SELECT si.*, c.name as customer_name, c.gstin as customer_gstin, c.address as customer_address FROM sales_invoices si LEFT JOIN customers c ON si.customer_id = c.customer_id WHERE si.invoice_id = $1`, [invoiceId]);
  if (invResult.rows.length === 0) return null;
  const itemsResult = await pool.query(`SELECT sii.*, p.part_number, p.name as part_name FROM sales_invoice_items sii JOIN parts p ON sii.part_id = p.part_id WHERE sii.invoice_id = $1`, [invoiceId]);
  invResult.rows[0].items = itemsResult.rows;
  return invResult.rows[0];
}

module.exports = {
  getActiveParts,
  getActiveCustomers,
  getPartStock,
  deductStock,
  getInvoiceById
};
