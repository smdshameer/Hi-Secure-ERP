const { pool } = require('../config/database');

async function getSalesInvoices(statusFilter = 'all') {
  let query = `SELECT si.invoice_id, si.invoice_number, si.customer_id, si.invoice_date, si.due_date, si.place_of_supply, si.total_amount, si.tax_amount, si.grand_total, si.status, si.notes, si.created_by, si.created_at, si.updated_at, c.name as customer_name, 0 as total_paid FROM sales_invoices si LEFT JOIN customers c ON si.customer_id = c.customer_id `;
  const params = [];
  if (statusFilter !== 'all') {
    query += ` WHERE si.status = $1`;
    params.push(statusFilter);
  }
  query += ` ORDER BY si.invoice_date DESC`;
  const result = await pool.query(query, params);
  return result.rows;
}

async function getInvoiceById(invoiceId) {
  const invResult = await pool.query(`SELECT si.*, c.name as customer_name, c.phone as customer_phone, c.gstin as customer_gstin, c.address as customer_address, c.city, c.state, c.pincode, si.place_of_supply FROM sales_invoices si LEFT JOIN customers c ON si.customer_id = c.customer_id WHERE si.invoice_id = $1`, [invoiceId]);
  if (invResult.rows.length === 0) return null;
  const itemsResult = await pool.query(`SELECT sii.*, p.part_number, p.name as part_name, p.hsn_code FROM sales_invoice_items sii JOIN parts p ON sii.part_id = p.part_id WHERE sii.invoice_id = $1`, [invoiceId]);
  const items = itemsResult.rows.map(item => ({ ...item, unit_price: parseFloat(item.unit_price), tax_rate: parseFloat(item.tax_rate), tax_amount: parseFloat(item.tax_amount), total_amount: parseFloat(item.total_amount), quantity: parseInt(item.quantity) }));
  return { ...invResult.rows[0], items };
}

async function getActiveCustomers() {
  const result = await pool.query('SELECT customer_id, name, phone, gstin, credit_limit FROM customers WHERE is_active = true ORDER BY name');
  return result.rows;
}

async function getActiveParts() {
  const result = await pool.query('SELECT part_id, part_number, name, selling_price, tax_rate, stock_quantity FROM parts WHERE is_active = true ORDER BY name');
  return result.rows;
}

async function getSettings() {
  const settings = require('../config/settings');
  return settings.getSettings ? settings.getSettings() : {};
}

async function createInvoice(data) {
  const { customer_id, invoice_date, due_date, place_of_supply, notes, items, action, taxType, cgstAmt, sgstAmt, igstAmt, totalAmount, totalTax } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const finalInvoiceDate = invoice_date || new Date().toISOString().split('T')[0];
    const invResult = await client.query(`INSERT INTO sales_invoices (customer_id, invoice_date, due_date, place_of_supply, tax_type, cgst_amount, sgst_amount, igst_amount, total_amount, tax_amount, grand_total, notes, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING invoice_id, invoice_number`, [customer_id, finalInvoiceDate, due_date || null, place_of_supply || null, taxType, cgstAmt, sgstAmt, igstAmt, totalAmount, totalTax, totalAmount + totalTax, notes || null, action === 'issue' ? 'issued' : 'draft', null]);
    const invoice = invResult.rows[0];
    for (const item of items) {
      await client.query(`INSERT INTO sales_invoice_items (invoice_id, part_id, quantity, unit_price, tax_rate, tax_amount, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [invoice.invoice_id, item.part_id, item.qty, item.price, item.taxRate, item.taxAmt, item.lineTotal + item.taxAmt]);
    }
    await client.query('COMMIT');
    client.release();
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function issueInvoice(invoiceId) {
  await pool.query("UPDATE sales_invoices SET status = 'issued', updated_at = CURRENT_TIMESTAMP WHERE invoice_id = $1", [invoiceId]);
}

async function getDeliveryChallans() {
  const result = await pool.query(`SELECT delivery_challan_id, challan_number, to_location_id, challan_date, status FROM delivery_challans WHERE status = 'delivered' ORDER BY challan_date DESC`);
  return result.rows;
}

module.exports = {
  getSalesInvoices,
  getInvoiceById,
  getActiveCustomers,
  getActiveParts,
  getSettings,
  createInvoice,
  issueInvoice,
  getDeliveryChallans
};
