const { pool } = require('../config/database');

async function globalSearch(query) {
  if (query.length < 2) return [];
  const [customers, parts, repairs] = await Promise.all([
    pool.query(`SELECT 'customer' as type, customer_id as id, name, phone, email, gstin FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 OR gstin ILIKE $1 ORDER BY name LIMIT 10`, [`%${query}%`]),
    pool.query(`SELECT 'part' as type, part_id as id, part_number, name, stock_quantity FROM parts WHERE part_number ILIKE $1 OR name ILIKE $1 ORDER BY part_number LIMIT 10`, [`%${query}%`]),
    pool.query(`SELECT 'repair' as type, r.repair_id as id, r.ticket_number, c.name as customer_name, r.product_type, r.repair_status, r.received_date FROM repairs r JOIN customers c ON r.customer_id = c.customer_id WHERE r.ticket_number ILIKE $1 OR c.name ILIKE $1 OR r.product_type ILIKE $1 ORDER BY r.received_date DESC LIMIT 10`, [`%${query}%`])
  ]);
  return [
    ...customers.rows.map(r => ({ ...r, url: `/customers/${r.id}` })),
    ...parts.rows.map(r => ({ ...r, url: `/parts/${r.id}` })),
    ...repairs.rows.map(r => ({ ...r, url: `/repairs/${r.id}` }))
  ];
}

module.exports = { globalSearch };
