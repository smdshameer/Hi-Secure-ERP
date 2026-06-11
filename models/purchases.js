const { pool } = require('../config/database');

async function getPurchaseOrders() {
  const result = await pool.query(`SELECT po.*, s.name as supplier_name, s.supplier_code FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.supplier_id ORDER BY po.order_date DESC`);
  return result.rows;
}

async function getPurchaseOrderById(poId) {
  const poResult = await pool.query(`SELECT po.*, s.name as supplier_name, s.supplier_code, s.address as supplier_address, s.gstin as supplier_gstin FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.supplier_id WHERE po.po_id = $1`, [poId]);
  if (poResult.rows.length === 0) return null;
  const itemsResult = await pool.query(`SELECT poi.*, p.part_number, p.name as part_name, p.hsn_code FROM purchase_order_items poi JOIN parts p ON poi.part_id = p.part_id WHERE poi.po_id = $1`, [poId]);
  return { ...poResult.rows[0], items: itemsResult.rows };
}

async function getActiveSuppliers() {
  const result = await pool.query('SELECT supplier_id, name, supplier_code FROM suppliers WHERE is_active = true ORDER BY name');
  return result.rows;
}

async function getActivePartsForPurchase() {
  const result = await pool.query('SELECT part_id, part_number, name FROM parts WHERE is_active = true ORDER BY name');
  return result.rows;
}

async function createPurchaseOrder(data) {
  const { supplier_id, order_date, expected_delivery, notes, items, action } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const poResult = await client.query(`INSERT INTO purchase_orders (supplier_id, order_date, expected_delivery, notes, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING po_id, po_number`, [supplier_id, order_date, expected_delivery || null, notes || null, action === 'order' ? 'ordered' : 'draft', null]);
    const po = poResult.rows[0];
    for (const item of items) {
      const qty = parseInt(item.quantity);
      const price = parseFloat(item.unit_price);
      await client.query(`INSERT INTO purchase_order_items (po_id, part_id, quantity, unit_price, total_amount) VALUES ($1, $2, $3, $4, $5)`, [po.po_id, parseInt(item.part_id), qty, price, qty * price]);
    }
    await client.query('COMMIT');
    client.release();
    return po;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function markPOAsOrdered(poId) {
  await pool.query("UPDATE purchase_orders SET status = 'ordered', updated_at = CURRENT_TIMESTAMP WHERE po_id = $1", [poId]);
}

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  getActiveSuppliers,
  getActivePartsForPurchase,
  createPurchaseOrder,
  markPOAsOrdered
};
