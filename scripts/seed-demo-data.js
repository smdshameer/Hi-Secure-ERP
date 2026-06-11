// scripts/seed-demo-data.js
// Populates the production PostgreSQL database with sample data for testing
// (replaces the data that previously lived in the removed server-demo.js)
// Usage: node scripts/seed-demo-data.js
// Safe to re-run (skips existing records by unique fields).

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'hisecure_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
  max: 5,
});

async function q(sql, params) {
  return pool.query(sql, params);
}

async function exists(table, where, params) {
  const r = await q(`SELECT 1 FROM ${table} WHERE ${where} LIMIT 1`, params);
  return r.rows.length > 0;
}

(async () => {
  console.log('Seeding demo data...\n');

  // ---- Brands ----
  const brands = [
    { id: 1, name: 'Samsung' },
    { id: 2, name: 'Sony' },
    { id: 3, name: 'CP Plus' },
    { id: 4, name: 'LG' },
    { id: 5, name: 'Panasonic' },
  ];
  for (const b of brands) {
    await q(
      `INSERT INTO brands (brand_id, name) VALUES ($1,$2) ON CONFLICT (brand_id) DO NOTHING`,
      [b.id, b.name]
    );
  }
  console.log('âœ“ Brands seeded');

  // ---- Locations ----
  const locations = [
    { code: 'HQ-001', name: 'Main Branch - Delhi', gstin: '07AABCH1234R1ZX', main: true },
    { code: 'ST-001', name: 'Store - Noida', gstin: '07AABCH1234R2ZY', main: false },
    { code: 'WH-001', name: 'Warehouse - Ghaziabad', gstin: '07AABCH1234R3ZX', main: false },
  ];
  for (const loc of locations) {
    await q(
      `INSERT INTO locations (location_code, name, gstin, is_main, is_active)
       VALUES ($1,$2,$3,$4,true) ON CONFLICT (location_code) DO NOTHING`,
      [loc.code, loc.name, loc.gstin, loc.main]
    );
  }
  console.log('âœ“ Locations seeded');

  // ---- Technicians ----
  const techs = [
    { name: 'Rahul', phone: '9876543210', spec: 'LED TV' },
    { name: 'Amit', phone: '9876543211', spec: 'General' },
    { name: 'Vijay', phone: '9876543212', spec: 'CCTV' },
  ];
  for (const t of techs) {
    await q(
      `INSERT INTO technicians (name, phone, specialization, is_active)
       VALUES ($1,$2,$3,true) ON CONFLICT DO NOTHING`,
      [t.name, t.phone, t.spec]
    );
  }
  console.log('âœ“ Technicians seeded');

  // ---- Customers ----
  const customers = [
    { code: 'CUS-0001', name: 'Rahul Kumar', phone: '9876543210', email: 'rahul@email.com', gstin: '07AABCD1234R1Z1', type: 'business', limit: 50000 },
    { code: 'CUS-0002', name: 'Vijay Sharma', phone: '9876543211', email: 'vijay@email.com', gstin: '07AABCE5678S2Z2', type: 'retail', limit: 10000 },
    { code: 'CUS-0003', name: 'Suresh Gupta', phone: '9876543212', email: 'suresh@email.com', gstin: null, type: 'retail', limit: 0 },
    { code: 'CUS-0004', name: 'Amit Kumar', phone: '9876543213', email: 'amit@email.com', gstin: null, type: 'government', limit: 0 },
    { code: 'CUS-0005', name: 'Rajesh Singh', phone: '9876543214', email: 'rajesh@email.com', gstin: '07AABCF9012T3Z3', type: 'business', limit: 75000 },
  ];
  for (const c of customers) {
    await q(
      `INSERT INTO customers (customer_code, name, phone, email, gstin, customer_type, credit_limit, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT (customer_code) DO NOTHING`,
      [c.code, c.name, c.phone, c.email, c.gstin, c.type, c.limit]
    );
  }
  console.log('âœ“ Customers seeded');

  // ---- Suppliers ----
  const suppliers = [
    { code: 'SUP-001', name: 'Samsung India Pvt Ltd', contact: 'Ramesh', phone: '011-1234567', gstin: '07AABCS1234R1ZY', pan: 'AABCS1234R', city: 'Delhi', state: 'Delhi' },
    { code: 'SUP-002', name: 'Sony India Pvt Ltd', contact: 'Suresh', phone: '022-1234567', gstin: '07AABCS5678R2ZX', pan: 'AABCS5678R', city: 'Mumbai', state: 'Maharashtra' },
  ];
  for (const s of suppliers) {
    await q(
      `INSERT INTO suppliers (supplier_code, name, contact_person, phone, gstin, pan, address, city, state, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,'', $7,$8,true) ON CONFLICT (supplier_code) DO NOTHING`,
      [s.code, s.name, s.contact, s.phone, s.gstin, s.pan, s.city, s.state]
    );
  }
  console.log('âœ“ Suppliers seeded');

  // ---- Parts ----
  const parts = [
    { num: 'SAM-PWR-001', name: 'Power Supply SMPS', brand: 'Samsung', hsn: '8528', cost: 800, sell: 1200, stock: 10, reorder: 3 },
    { num: 'SAM-MAIN-001', name: 'Main Board T-Con', brand: 'Samsung', hsn: '8528', cost: 2500, sell: 3500, stock: 5, reorder: 2 },
    { num: 'CP-PWR-001', name: '12V Power Adapter', brand: 'CP Plus', hsn: '8517', cost: 300, sell: 500, stock: 2, reorder: 10 },
    { num: 'HIK-CAM-001', name: 'Bullet Camera 4MP', brand: 'Hikvision', hsn: '8517', cost: 2200, sell: 3400, stock: 0, reorder: 4 },
    { num: 'SAM-REMOTE-001', name: 'IR Remote', brand: 'Samsung', hsn: '8543', cost: 150, sell: 250, stock: 15, reorder: 5 },
  ];
  for (const p of parts) {
    const brandRow = await q(`SELECT brand_id FROM brands WHERE name = $1`, [p.brand]);
    const brandId = brandRow.rows[0]?.brand_id || null;
    await q(
      `INSERT INTO parts (part_number, name, brand_id, hsn_code, cost_price, selling_price, stock_quantity, reorder_level, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT (part_number) DO NOTHING`,
      [p.num, p.name, brandId, p.hsn, p.cost, p.sell, p.stock, p.reorder]
    );
  }
  console.log('âœ“ Parts seeded');

  // ---- Repairs ----
  const repairs = [
  { ticket: 'RCP-2026001-000001', custCode: 'CUS-0001', product: 'LED TV', brand: 'Samsung', model: 'UA43T5450AKLXL', serial: 'SN12345678', problem: 'Display issues - horizontal lines', status: 'in_repair', est: 3500, actual: 3200, warranty: false, tech: 'Rahul' },
  { ticket: 'RCP-2026001-000002', custCode: 'CUS-0002', product: 'CCTV Camera', brand: 'CP Plus', model: 'CP-EBC-202', serial: 'SN87654321', problem: 'Camera not powering on', status: 'received', est: 1500, actual: 0, warranty: false, tech: null },
  { ticket: 'RCP-2026001-000003', custCode: 'CUS-0003', product: 'LED TV', brand: 'Sony', model: 'KD-43X7400D', serial: 'SN11223344', problem: 'No sound from speakers', status: 'completed', est: 5000, actual: 4200, warranty: true, tech: 'Amit' },
];
  for (const r of repairs) {
    const cust = await q(`SELECT customer_id FROM customers WHERE customer_code=$1`, [r.custCode]);
    const brand = await q(`SELECT brand_id FROM brands WHERE name=$1`, [r.brand]);
    const tech = r.tech ? await q(`SELECT technician_id FROM technicians WHERE name=$1`, [r.tech]) : { rows: [] };
    const customerId = cust.rows[0]?.customer_id;
    const brandId = brand.rows[0]?.brand_id;
    const techId = tech.rows[0]?.technician_id || null;
    await q(
      `INSERT INTO repairs (ticket_number, customer_id, product_type, brand_id, serial_number, model_number, problem_description, repair_status, estimated_cost, actual_cost, assigned_technician_id, received_date, warranty_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE,$12) ON CONFLICT (ticket_number) DO NOTHING`,
      [r.ticket, customerId, r.product, brandId, r.serial, r.model, r.problem, r.status, r.est, r.actual, techId, r.warranty]
    );
  }
  console.log('âœ“ Repairs seeded');

  // ---- Settings row (for feature flags / company info) ----
  await q(
    `INSERT INTO settings (key, value) VALUES ('company', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`,
    [{
      name: 'Hi Secure Solutions',
      address: '123 Industrial Area, Delhi - 110001',
      phone: '011-12345678',
      email: 'info@hisecure.com',
      gstin: '07AABCH1234R1ZX',
      state: 'Delhi',
      website: 'www.hisecure.com',
      bank: { name: 'HDFC Bank', branch: 'Delhi', account_number: '1234567890123456', ifsc_code: 'HDFC0001234', swift_code: 'HDFCINBB' },
      logo_path: '',
      pan: 'AABCH1234R',
    }]
  );
  await q(
    `INSERT INTO settings (key, value) VALUES ('print', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`,
    [{ default_size: 'a4', default_theme: 'mobile-shop', available_sizes: ['a4','a5','letter','legal','thermal-80mm','thermal-58mm','half-a4','barcode-80x150'], available_themes: ['mobile-shop'] }]
  );
  await q(
    `INSERT INTO settings (key, value) VALUES ('tax', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`,
    [{ gst_enabled: true, gst_rates: [0,5,12,18,28], default_gst_rate: 18, igst_enabled: true, show_hsn_in_print: true, show_gstin_in_print: true }]
  );
  await q(
    `INSERT INTO settings (key, value) VALUES ('invoice', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`,
    [{ prefix: 'INV', next_number: 1, due_days: 15, terms_conditions: 'Thank you for your business. Payment due within 15 days.', show_terms_on_print: true }]
  );
  console.log('âœ“ Settings seeded');

  console.log('\nâœ…  Demo seed complete. Login with admin / admin123');
  await pool.end();
})();
