require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ host: process.env.DB_HOST||'localhost', port: parseInt(process.env.DB_PORT||'5432',10), database: process.env.DB_NAME||'hisecure_erp', user: process.env.DB_USER||'postgres', password: process.env.DB_PASSWORD||'' });
(async () => {
  const tables = ['users','customers','parts','repairs','payments','repair_parts','locations','technicians','suppliers','brands','purchase_orders','purchase_order_items','sales_invoices','sales_invoice_items','quotations','quotation_items','delivery_challans','delivery_challan_items','delivery_challan_returns','settings','audit_logs','accounts','vouchers','voucher_entries','e_invoice_logs','eway_bill_logs','tds_records'];
  const res = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=ANY($1::text[])`, [tables]);
  console.log('Existing tables:', res.rows.map(r=>r.tablename).join(', '));
  console.log('Missing tables:    ', tables.filter(t => !res.rows.find(r=>r.tablename===t)).join(', '));
  const users = await pool.query(`SELECT username, role, is_active FROM users ORDER BY user_id`);
  console.log('Users:');
  users.rows.forEach(u => console.log(' •', u.username, '|', u.role, '|', u.is_active));
  await pool.end();
})();
