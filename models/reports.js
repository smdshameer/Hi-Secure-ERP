const { pool } = require('../config/database');

async function getMonthlyRevenue() {
  const result = await pool.query(`SELECT DATE_TRUNC('month', completion_date) as month, COUNT(*) as repairs_completed, SUM(actual_cost) as revenue FROM repairs WHERE completion_date IS NOT NULL GROUP BY DATE_TRUNC('month', completion_date) ORDER BY month DESC LIMIT 12`);
  return result.rows;
}

async function getTopTechnicians() {
  const result = await pool.query(`SELECT t.name, t.specialization, COUNT(r.repair_id) as total_repairs, SUM(r.actual_cost) as revenue FROM technicians t LEFT JOIN repairs r ON t.technician_id = r.assigned_technician_id GROUP BY t.technician_id ORDER BY revenue DESC NULLS LAST LIMIT 10`);
  return result.rows;
}

async function getTopParts() {
  const result = await pool.query(`SELECT p.part_number, p.name, COUNT(rp.repair_id) as times_used, SUM(rp.quantity) as total_quantity FROM parts p LEFT JOIN repair_parts rp ON p.part_id = rp.part_id GROUP BY p.part_id ORDER BY times_used DESC LIMIT 15`);
  return result.rows;
}

async function getGSTR1Months() {
  const result = await pool.query(`SELECT DISTINCT TO_CHAR(invoice_date, 'YYYY-MM') as month FROM sales_invoices WHERE status IN ('issued', 'paid') ORDER BY month DESC`);
  return result.rows.map(r => r.month);
}

async function getGSTR1Data(startDate, endDate) {
  const result = await pool.query(`SELECT si.invoice_number, si.invoice_date, si.tax_type, si.cgst_amount, si.sgst_amount, si.igst_amount, c.name as customer_name, c.gstin as customer_gstin, p.part_number, p.hsn_code, sii.quantity, sii.unit_price, sii.tax_rate, sii.total_amount, sii.tax_amount FROM sales_invoices si JOIN sales_invoice_items sii ON si.invoice_id = sii.invoice_id LEFT JOIN customers c ON si.customer_id = c.customer_id JOIN parts p ON sii.part_id = p.part_id WHERE si.invoice_date >= $1 AND si.invoice_date <= $2 AND si.status IN ('issued', 'paid') ORDER BY si.invoice_date, si.invoice_number, sii.item_id`, [startDate, endDate]);
  return result.rows;
}

async function getGSTR3BData(startDate, endDate) {
  const result = await pool.query(`SELECT sii.tax_rate, SUM(sii.total_amount - sii.tax_amount) as taxable_value, SUM(CASE WHEN si.tax_type = 'CGST_SGST' THEN sii.tax_amount / 2 ELSE 0 END) as cgst_amount, SUM(CASE WHEN si.tax_type = 'CGST_SGST' THEN sii.tax_amount / 2 ELSE 0 END) as sgst_amount, SUM(CASE WHEN si.tax_type = 'IGST' THEN sii.tax_amount ELSE 0 END) as igst_amount FROM sales_invoice_items sii JOIN sales_invoices si ON sii.invoice_id = si.invoice_id WHERE si.invoice_date >= $1 AND si.invoice_date <= $2 AND si.status IN ('issued', 'paid') GROUP BY sii.tax_rate ORDER BY sii.tax_rate`, [startDate, endDate]);
  return result.rows;
}

async function getGSTR3BMonths() {
  const result = await pool.query(`SELECT DISTINCT TO_CHAR(invoice_date, 'YYYY-MM') as month FROM sales_invoices WHERE status IN ('issued', 'paid') ORDER BY month DESC`);
  return result.rows.map(r => r.month);
}

async function getStats() {
  const result = await pool.query(`SELECT (SELECT COUNT(*) FROM repairs WHERE repair_status NOT IN ('completed', 'cancelled')) as active_repairs, (SELECT COUNT(*) FROM repairs WHERE repair_status = 'received') as new_repairs, (SELECT COUNT(*) FROM customers) as total_customers, (SELECT COUNT(*) FROM parts WHERE stock_quantity <= reorder_level AND stock_quantity > 0) as low_stock, (SELECT SUM(actual_cost) FROM repairs WHERE repair_status = 'completed' AND completion_date >= CURRENT_DATE - INTERVAL '30 days') as revenue_30d`);
  return result.rows[0];
}

async function getPendingInvoices() {
  const result = await pool.query(`SELECT COUNT(*) as pending_count, COALESCE(SUM(grand_total), 0) as pending_amount FROM sales_invoices WHERE status = 'issued'`);
  return result.rows[0];
}

async function getSalesRevenue() {
  const result = await pool.query(`SELECT DATE_TRUNC('month', invoice_date) as month, COUNT(*) as invoices, SUM(grand_total) as revenue FROM sales_invoices WHERE status IN ('issued', 'paid') GROUP BY DATE_TRUNC('month', invoice_date) ORDER BY month DESC LIMIT 12`);
  return result.rows;
}

async function getTopCustomers() {
  const result = await pool.query(`SELECT c.name, c.phone, c.customer_type, COUNT(si.invoice_id) as total_invoices, SUM(si.grand_total) as total_spend FROM customers c JOIN sales_invoices si ON c.customer_id = si.customer_id WHERE si.status IN ('issued', 'paid') GROUP BY c.customer_id ORDER BY total_spend DESC NULLS LAST LIMIT 10`);
  return result.rows;
}

async function getLowStockParts() {
  const result = await pool.query(`SELECT part_id, part_number, name, stock_quantity, reorder_level FROM parts WHERE stock_quantity <= reorder_level AND is_active = true ORDER BY stock_quantity ASC LIMIT 10`);
  return result.rows;
}

async function getCompletedRepairsThisMonth() {
  const result = await pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(actual_cost), 0) as revenue FROM repairs WHERE repair_status = 'completed' AND EXTRACT(YEAR FROM completion_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM completion_date) = EXTRACT(MONTH FROM CURRENT_DATE)`);
  return result.rows[0];
}

async function getRecentInvoices(limit = 5) {
  const result = await pool.query(`SELECT si.invoice_number, si.invoice_date, si.grand_total, si.status, c.name as customer_name FROM sales_invoices si LEFT JOIN customers c ON si.customer_id = c.customer_id ORDER BY si.invoice_date DESC LIMIT $1`, [limit]);
  return result.rows;
}

module.exports = {
  getMonthlyRevenue,
  getTopTechnicians,
  getTopParts,
  getGSTR1Months,
  getGSTR1Data,
  getGSTR3BData,
  getGSTR3BMonths,
  getStats,
  getPendingInvoices,
  getSalesRevenue,
  getTopCustomers,
  getLowStockParts,
  getCompletedRepairsThisMonth,
  getRecentInvoices
};
