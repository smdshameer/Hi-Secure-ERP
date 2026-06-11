const { pool } = require('../config/database');

async function getDeliveryChallans(filters = {}) {
  let query = `SELECT dc.*, c.name as customer_name, c.phone as customer_phone, c.gstin as customer_gstin, l1.name as from_location_name, l2.name as to_location_name, u1.full_name as created_by_name, u2.full_name as approved_by_name FROM delivery_challans dc LEFT JOIN customers c ON dc.customer_id = c.customer_id LEFT JOIN locations l1 ON dc.from_location_id = l1.location_id LEFT JOIN locations l2 ON dc.to_location_id = l2.location_id LEFT JOIN users u1 ON dc.created_by = u1.user_id LEFT JOIN users u2 ON dc.approved_by = u2.user_id `;
  const conditions = [];
  const params = [];
  if (filters.status && filters.status !== 'all') { conditions.push(`dc.status = $${params.length + 1}`); params.push(filters.status); }
  if (filters.purpose && filters.purpose !== 'all') { conditions.push(`dc.purposes = $${params.length + 1}`); params.push(filters.purpose); }
  if (filters.start_date && filters.end_date) { conditions.push(`dc.challan_date BETWEEN $${params.length + 1} AND $${params.length + 2}`); params.push(filters.start_date, filters.end_date); }
  if (filters.search) { conditions.push(`(dc.challan_number ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`); params.push(`%${filters.search}%`); }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY dc.challan_date DESC, dc.challan_number DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

async function getDeliveryChallanById(id) {
  const [challan, items, returns, customers, locations] = await Promise.all([
    pool.query(`SELECT dc.*, c.name as customer_name, c.phone as customer_phone, c.gstin as customer_gstin, c.address as customer_address, s.name as supplier_name, s.gstin as supplier_gstin, l1.name as from_location_name, l1.address as from_address, l1.gstin as from_gstin, l2.name as to_location_name, l2.address as to_address, l2.gstin as to_gstin FROM delivery_challans dc LEFT JOIN customers c ON dc.customer_id = c.customer_id LEFT JOIN suppliers s ON dc.supplier_id = s.supplier_id LEFT JOIN locations l1 ON dc.from_location_id = l1.location_id LEFT JOIN locations l2 ON dc.to_location_id = l2.location_id WHERE dc.delivery_challan_id = $1`, [id]),
    pool.query(`SELECT dci.*, p.part_number, p.name as part_name, p.hsn_code, p.selling_price FROM delivery_challan_items dci JOIN parts p ON dci.part_id = p.part_id WHERE dci.delivery_challan_id = $1`, [id]),
    pool.query(`SELECT dcr.*, p.part_number, p.name as part_name FROM delivery_challan_returns dcr JOIN parts p ON dcr.part_id = p.part_id WHERE dcr.delivery_challan_id = $1 ORDER BY dcr.return_date DESC`, [id]),
    pool.query('SELECT customer_id, name, phone, gstin FROM customers ORDER BY name'),
    pool.query('SELECT * FROM locations WHERE is_active = true ORDER BY name')
  ]);
  return { challan: challan.rows[0], items: items.rows, returns: returns.rows, customers: customers.rows, fromLocations: locations.rows, toLocations: locations.rows };
}

async function createDeliveryChallan(data) {
  const { customer_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, notes } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const challanResult = await client.query(`INSERT INTO delivery_challans (customer_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING delivery_challan_id, challan_number`, [customer_id ? parseInt(customer_id) : null, parseInt(from_location_id), parseInt(to_location_id), challan_date || new Date().toISOString().split('T')[0], expected_delivery_date || null, vehicle_number || null, driver_name || null, transporter_name || null, eway_bill_number || null, purposes, notes || null, null]);
    const challan = challanResult.rows[0];
    const items = data.items || [];
    const stockUpdates = [];
    for (const item of items) {
      const partId = parseInt(item.part_id);
      const qty = parseInt(item.quantity);
      if (['sales', 'job_work', 'consignment'].includes(purposes)) {
        const partCheck = await client.query('SELECT part_id, part_number, name, stock_quantity FROM parts WHERE part_id = $1 FOR UPDATE', [partId]);
        if (partCheck.rows[0].stock_quantity < qty) throw new Error(`Insufficient stock for ${partCheck.rows[0].name}. Available: ${partCheck.rows[0].stock_quantity}`);
        stockUpdates.push({ partId, quantity: qty });
      }
      await client.query(`INSERT INTO delivery_challan_items (delivery_challan_id, part_id, quantity, batch_number, expiry_date, serial_numbers) VALUES ($1, $2, $3, $4, $5, $6)`, [challan.delivery_challan_id, partId, qty, item.batch_number || null, item.expiry_date || null, item.serial_numbers || null]);
    }
    for (const update of stockUpdates) {
      await client.query('UPDATE parts SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2', [update.quantity, update.partId]);
    }
    await client.query('COMMIT');
    client.release();
    return challan;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function updateDeliveryChallanStatus(id, status, userId) {
  const result = await pool.query('SELECT status, purposes FROM delivery_challans WHERE delivery_challan_id = $1', [id]);
  if (result.rows.length === 0) throw new Error('Delivery challan not found');
  const challan = result.rows[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (status === 'cancelled' && challan.status !== 'cancelled') {
      const itemsResult = await client.query('SELECT part_id, quantity FROM delivery_challan_items WHERE delivery_challan_id = $1', [id]);
      if (['sales', 'job_work', 'consignment'].includes(challan.purposes)) {
        for (const item of itemsResult.rows) {
          await client.query('UPDATE parts SET stock_quantity = stock_quantity + $1 WHERE part_id = $2', [item.quantity, item.part_id]);
        }
      }
    }
    await client.query(`UPDATE delivery_challans SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE delivery_challan_id = $3`, [status, userId, id]);
    await client.query('COMMIT');
    client.release();
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function addReturn(data) {
  const { id, item_id, part_id, quantity, reason, condition_notes } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO delivery_challan_returns (delivery_challan_id, challan_item_id, part_id, quantity, reason, condition_notes) VALUES ($1, $2, $3, $4, $5, $6)`, [id, item_id, part_id, quantity, reason || null, condition_notes || null]);
    if (reason !== 'damaged' && reason !== 'rejected') {
      await client.query('UPDATE parts SET stock_quantity = stock_quantity + $1 WHERE part_id = $2', [quantity, part_id]);
    }
    await client.query('COMMIT');
    client.release();
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

module.exports = {
  getDeliveryChallans,
  getDeliveryChallanById,
  createDeliveryChallan,
  updateDeliveryChallanStatus,
  addReturn
};
