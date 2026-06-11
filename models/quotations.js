const { pool } = require('../config/database');

async function getQuotations(statusFilter = 'all', customerId = null) {
  let query = `SELECT q.quote_id, q.quote_number, q.customer_id, q.quote_date, q.valid_until, q.status, q.subtotal, q.total_discount, q.total_tax, q.total_amount, q.terms, q.notes, q.created_by, q.created_at, q.updated_at, q.converted_to_invoice_id, c.name as customer_name FROM quotations q JOIN customers c ON q.customer_id = c.customer_id `;
  const params = [];
  const conditions = [];
  if (statusFilter !== 'all') {
    conditions.push(`q.status = $${params.length + 1}`);
    params.push(statusFilter);
  }
  if (customerId) {
    conditions.push(`q.customer_id = $${params.length + 1}`);
    params.push(customerId);
  }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY q.created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

async function getQuotationById(quoteId) {
  const quoteResult = await pool.query(`SELECT q.*, c.name as customer_name, c.gstin as customer_gstin, c.address as customer_address FROM quotations q JOIN customers c ON q.customer_id = c.customer_id WHERE q.quote_id = $1`, [quoteId]);
  if (quoteResult.rows.length === 0) return null;
  const quotation = quoteResult.rows[0];
  const itemsResult = await pool.query(`SELECT qi.*, p.part_number, p.name as part_name FROM quotation_items qi JOIN parts p ON qi.part_id = p.part_id WHERE qi.quote_id = $1 ORDER BY qi.quote_item_id`, [quoteId]);
  quotation.items = itemsResult.rows;
  return quotation;
}

async function createQuotation(data) {
  const { customer_id, valid_until, items, terms, notes } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quoteResult = await client.query(`INSERT INTO quotations (customer_id, valid_until, terms, notes, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING quote_id, quote_number, created_at`, [customer_id, valid_until, terms || null, notes || null, null]);
    const quote = quoteResult.rows[0];
    for (const item of items) {
      const quantity = item.quantity;
      const unitPrice = item.unit_price;
      const discountPercent = item.discount_percent || 0;
      const taxRate = item.tax_rate || 0;
      const lineTotal = quantity * unitPrice;
      const discountAmount = lineTotal * (discountPercent / 100);
      const afterDiscount = lineTotal - discountAmount;
      const taxAmount = afterDiscount * (taxRate / 100);
      const total = afterDiscount + taxAmount;
      await client.query(`INSERT INTO quotation_items (quote_id, part_id, quantity, unit_price, discount_percent, tax_rate, total) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [quote.quote_id, item.part_id, quantity, unitPrice, discountPercent, taxRate, total]);
    }
    await client.query('COMMIT');
    client.release();
    return quote;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function updateQuotation(quoteId, data) {
  const { customer_id, valid_until, items, terms, notes } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE quotations SET customer_id = $1, valid_until = $2, terms = $3, notes = $4, updated_at = CURRENT_TIMESTAMP WHERE quote_id = $5', [customer_id, valid_until, terms || null, notes || null, quoteId]);
    await client.query('DELETE FROM quotation_items WHERE quote_id = $1', [quoteId]);
    for (const item of items) {
      const quantity = item.quantity;
      const unitPrice = item.unit_price;
      const discountPercent = item.discount_percent || 0;
      const taxRate = item.tax_rate || 0;
      const lineTotal = quantity * unitPrice;
      const discountAmount = lineTotal * (discountPercent / 100);
      const afterDiscount = lineTotal - discountAmount;
      const taxAmount = afterDiscount * (taxRate / 100);
      const total = afterDiscount + taxAmount;
      await client.query(`INSERT INTO quotation_items (quote_id, part_id, quantity, unit_price, discount_percent, tax_rate, total) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [quoteId, item.part_id, quantity, unitPrice, discountPercent, taxRate, total]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function updateQuotationStatus(quoteId, status) {
  await pool.query('UPDATE quotations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE quote_id = $2', [status, quoteId]);
}

async function convertQuotationToInvoice(quoteId, userId) {
  const quoteResult = await pool.query(`SELECT q.*, c.gstin as customer_gstin FROM quotations q JOIN customers c ON q.customer_id = c.customer_id WHERE q.quote_id = $1 AND q.status = 'accepted'`, [quoteId]);
  if (quoteResult.rows.length === 0) throw new Error('Quotation not found or not in accepted status');
  const quotation = quoteResult.rows[0];
  const itemsResult = await pool.query(`SELECT qi.*, p.hsn_code FROM quotation_items qi JOIN parts p ON qi.part_id = p.part_id WHERE qi.quote_id = $1`, [quoteId]);
  const companyGstin = '';
  const customerGstin = quotation.customer_gstin || '';
  let taxType = 'CGST_SGST';
  if (companyGstin && customerGstin && companyGstin.substring(0, 2) !== customerGstin.substring(0, 2)) taxType = 'IGST';
  let placeOfSupply = null;
  if (customerGstin && customerGstin.length >= 2) placeOfSupply = customerGstin.substring(0, 2);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invResult = await client.query(`INSERT INTO sales_invoices (customer_id, invoice_date, due_date, place_of_supply, created_by, tax_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING invoice_id, invoice_number`, [quotation.customer_id, quotation.quote_date, null, placeOfSupply, userId, taxType]);
    const invoice = invResult.rows[0];
    for (const item of itemsResult.rows) {
      const quantity = item.quantity;
      const originalUnitPrice = item.unit_price;
      const discountPercent = item.discount_percent || 0;
      const taxRate = item.tax_rate || 0;
      const unitPrice = originalUnitPrice * (1 - discountPercent / 100);
      const lineTotalBeforeTax = quantity * unitPrice;
      const taxAmount = lineTotalBeforeTax * (taxRate / 100);
      const totalAmount = lineTotalBeforeTax + taxAmount;
      await client.query(`INSERT INTO sales_invoice_items (invoice_id, part_id, quantity, unit_price, tax_rate, tax_amount, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [invoice.invoice_id, item.part_id, quantity, unitPrice, taxRate, taxAmount, totalAmount]);
    }
    await client.query("UPDATE quotations SET status = 'converted', converted_to_invoice_id = $1, updated_at = CURRENT_TIMESTAMP WHERE quote_id = $2", [invoice.invoice_id, quoteId]);
    await client.query('COMMIT');
    client.release();
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function getActiveCustomersForQuotation() {
  const result = await pool.query('SELECT customer_id, name, phone, gstin FROM customers WHERE is_active = true ORDER BY name');
  return result.rows;
}

async function getPartsForQuotation() {
  const result = await pool.query(`SELECT p.part_id, p.part_number, p.name, b.name as brand_name, p.selling_price, p.stock_quantity, p.tax_rate, p.hsn_code FROM parts p LEFT JOIN brands b ON p.brand_id = b.brand_id WHERE p.is_active = true ORDER BY p.part_number`);
  return result.rows;
}

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  convertQuotationToInvoice,
  getActiveCustomersForQuotation,
  getPartsForQuotation
};
