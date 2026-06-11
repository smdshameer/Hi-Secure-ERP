-- =============================================================================
-- Master Init Schema — Hi Secure Solutions ERP
-- tables, sequences, index, and default data referenced by every model/route
-- safe to re-run (uses IF NOT EXISTS)
-- =============================================================================

-- ======================== USERS & AUTH ========================
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'sales',
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== SETTINGS (key-value) ========================
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== CUSTOMERS ========================
CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  customer_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  gstin VARCHAR(15),
  customer_type VARCHAR(50) DEFAULT 'retail',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  credit_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  total_repairs INT DEFAULT 0,
  lifetime_value DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== BRANDS (lookup for repairs/parts) ========================
CREATE TABLE IF NOT EXISTS brands (
  brand_id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO brands (brand_id, name) VALUES (1, 'Samsung'), (2, 'Sony'), (3, 'CP Plus'), (4, 'LG'), (5, 'Panasonic') ON CONFLICT DO NOTHING;

-- ======================== TECHNICIANS ========================
CREATE TABLE IF NOT EXISTS technicians (
  technician_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  specialization VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== LOCATIONS ========================
CREATE TABLE IF NOT EXISTS locations (
  location_id SERIAL PRIMARY KEY,
  location_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  gstin VARCHAR(15),
  is_main BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== SUPPLIERS ========================
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id SERIAL PRIMARY KEY,
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  gstin VARCHAR(15),
  pan VARCHAR(10),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== PARTS (inventory) ========================
CREATE TABLE IF NOT EXISTS parts (
  part_id SERIAL PRIMARY KEY,
  part_number VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand_id INT REFERENCES brands(brand_id),
  hsn_code VARCHAR(20),
  cost_price DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 18,
  stock_quantity INT DEFAULT 0,
  reorder_level INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== REPAIRS ========================
CREATE TABLE IF NOT EXISTS repairs (
  repair_id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(customer_id),
  product_type VARCHAR(255) NOT NULL,
  brand_id INT REFERENCES brands(brand_id),
  serial_number VARCHAR(255),
  model_number VARCHAR(255),
  problem_description TEXT NOT NULL,
  repair_status VARCHAR(50) NOT NULL DEFAULT 'received',
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2) DEFAULT 0,
  assigned_technician_id INT REFERENCES technicians(technician_id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  warranty_status BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repair parts junction
CREATE TABLE IF NOT EXISTS repair_parts (
  repair_part_id SERIAL PRIMARY KEY,
  repair_id INT NOT NULL REFERENCES repairs(repair_id) ON DELETE CASCADE,
  part_id INT NOT NULL REFERENCES parts(part_id),
  quantity INT NOT NULL DEFAULT 1,
  price_charged DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_repair_parts_repair ON repair_parts(repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_parts_part ON repair_parts(part_id);

-- Payments against repairs
CREATE TABLE IF NOT EXISTS payments (
  payment_id SERIAL PRIMARY KEY,
  repair_id INT NOT NULL REFERENCES repairs(repair_id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket-number auto-generation
CREATE OR REPLACE FUNCTION generate_repair_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'RCP-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,4,'0') || '-' || LPAD(NEXTVAL('repair_ticket_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_repair_ticket ON repairs;
CREATE TRIGGER set_repair_ticket BEFORE INSERT ON repairs FOR EACH ROW EXECUTE FUNCTION generate_repair_ticket();

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'repair_ticket_seq') THEN CREATE SEQUENCE repair_ticket_seq START 1; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'repair_invoice_seq') THEN CREATE SEQUENCE repair_invoice_seq START 1; END IF; END $$;

-- Completion-date self-update
CREATE OR REPLACE FUNCTION set_repair_completion_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.repair_status = 'completed' AND NEW.completion_date IS NULL THEN
    NEW.completion_date := CURRENT_DATE;
  ELSIF NEW.repair_status NOT IN ('completed') THEN
    NEW.completion_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS repair_completion_date_trigger ON repairs;
CREATE TRIGGER repair_completion_date_trigger BEFORE UPDATE OF repair_status ON repairs FOR EACH ROW EXECUTE FUNCTION set_repair_completion_date();

-- ======================== PURCHASE ORDERS ========================
CREATE TABLE IF NOT EXISTS purchase_orders (
  po_id SERIAL PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
  po_item_id SERIAL PRIMARY KEY,
  po_id INT NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  part_id INT NOT NULL REFERENCES parts(part_id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL
);

-- ======================== SALES INVOICES ========================
CREATE TABLE IF NOT EXISTS sales_invoices (
  invoice_id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT REFERENCES customers(customer_id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  place_of_supply VARCHAR(10),
  tax_type VARCHAR(20) DEFAULT 'CGST_SGST',
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'overdue')),
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  item_id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES sales_invoices(invoice_id) ON DELETE CASCADE,
  part_id INT NOT NULL REFERENCES parts(part_id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_si_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_si_date ON sales_invoices(invoice_date);

-- ======================== QUOTATIONS ========================
CREATE TABLE IF NOT EXISTS quotations (
  quote_id SERIAL PRIMARY KEY,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(customer_id),
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  subtotal DECIMAL(14,2) DEFAULT 0,
  total_discount DECIMAL(14,2) DEFAULT 0,
  total_tax DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  terms TEXT,
  notes TEXT,
  created_by INT REFERENCES users(user_id),
  converted_to_invoice_id INT REFERENCES sales_invoices(invoice_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS quotation_items (
  quote_item_id SERIAL PRIMARY KEY,
  quote_id INT NOT NULL REFERENCES quotations(quote_id) ON DELETE CASCADE,
  part_id INT NOT NULL REFERENCES parts(part_id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(14,2) DEFAULT 0,
  CONSTRAINT unique_quote_part UNIQUE (quote_id, part_id)
);

-- Invoice-number trigge (sales_invoices and quotations share sequence encouragement is alias)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'invoice_num_seq') THEN CREATE SEQUENCE invoice_num_seq START 1; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'quote_num_seq') THEN CREATE SEQUENCE quote_num_seq START 1; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'po_num_seq') THEN CREATE SEQUENCE po_num_seq START 1; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'dc_num_seq') THEN CREATE SEQUENCE dc_num_seq START 1; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'voucher_num_seq') THEN CREATE SEQUENCE voucher_num_seq START 1; END IF; END $$;

-- ======================== DELIVERY CHALLANS ========================
CREATE TABLE IF NOT EXISTS delivery_challans (
  delivery_challan_id SERIAL PRIMARY KEY,
  challan_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT REFERENCES customers(customer_id),
  supplier_id INT REFERENCES suppliers(supplier_id),
  from_location_id INT NOT NULL REFERENCES locations(location_id),
  to_location_id INT NOT NULL REFERENCES locations(location_id),
  challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  vehicle_number VARCHAR(20),
  driver_name VARCHAR(255),
  transporter_name VARCHAR(255),
  eway_bill_number VARCHAR(50),
  purposes VARCHAR(30) NOT NULL DEFAULT 'sales',
  status VARCHAR(20) DEFAULT 'draft',
  total_quantity INT DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  created_by INT REFERENCES users(user_id),
  approved_by INT REFERENCES users(user_id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS delivery_challan_items (
  challan_item_id SERIAL PRIMARY KEY,
  delivery_challan_id INT NOT NULL REFERENCES delivery_challans(delivery_challan_id) ON DELETE CASCADE,
  part_id INT NOT NULL REFERENCES parts(part_id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  serial_numbers JSONB
);
CREATE INDEX IF NOT EXISTS idx_dci_challan ON delivery_challan_items(delivery_challan_id);
CREATE TABLE IF NOT EXISTS delivery_challan_returns (
  return_id SERIAL PRIMARY KEY,
  delivery_challan_id INT NOT NULL REFERENCES delivery_challans(delivery_challan_id),
  challan_item_id INT NOT NULL REFERENCES delivery_challan_items(challan_item_id),
  part_id INT NOT NULL REFERENCES parts(part_id),
  quantity INT NOT NULL,
  reason VARCHAR(100),
  condition_notes TEXT,
  status VARCHAR(20) DEFAULT 'received',
  return_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ======================== AUDIT LOGS ========================
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  record_id INT,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== ACCOUNTING (Phase 5) ========================
CREATE TABLE IF NOT EXISTS accounts (
  account_id SERIAL PRIMARY KEY,
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset','liability','income','expense','equity')),
  parent_account_id INT REFERENCES accounts(account_id),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance_type VARCHAR(2) DEFAULT 'Dr' CHECK (opening_balance_type IN ('Dr','Cr')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO accounts (account_code, account_name, account_type, parent_account_id, opening_balance) VALUES
  ('1000','Assets','asset',NULL,0),
  ('1100','Current Assets','asset',1,0),
  ('1110','Bank Accounts','asset',2,0),
  ('1120','Cash-in-Hand','asset',2,0),
  ('1130','Sundry Debtors','asset',2,0),
  ('1140','Inventory/Stock','asset',2,0),
  ('1200','Fixed Assets','asset',1,0),
  ('2000','Liabilities','liability',NULL,0),
  ('2100','Current Liabilities','liability',8,0),
  ('2110','Sundry Creditors','liability',9,0),
  ('2120','GST Payable','liability',9,0),
  ('2130','TDS Payable','liability',9,0),
  ('4000','Income','income',NULL,0),
  ('4100','Sales','income',13,0),
  ('4200','Service Income','income',13,0),
  ('5000','Expenses','expense',NULL,0),
  ('5100','Purchases','expense',15,0),
  ('5200','Cost of Goods Sold','expense',15,0),
  ('5300','Salary Expenses','expense',15,0),
  ('5400','Office Expenses','expense',15,0)
ON CONFLICT (account_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS vouchers (
  voucher_id SERIAL PRIMARY KEY,
  voucher_number VARCHAR(50) UNIQUE NOT NULL,
  voucher_type VARCHAR(20) NOT NULL CHECK (voucher_type IN ('payment','receipt','contra','journal','debit_note','credit_note')),
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type VARCHAR(50),
  reference_id INT,
  narration TEXT,
  total_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','approved','cancelled')),
  created_by INT REFERENCES users(user_id),
  approved_by INT REFERENCES users(user_id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS voucher_entries (
  entry_id SERIAL PRIMARY KEY,
  voucher_id INT NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
  account_id INT NOT NULL REFERENCES accounts(account_id),
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_voucher_entries_voucher ON voucher_entries(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_entries_account ON voucher_entries(account_id);

-- ======================== E-INVOICE / E-WAY / TDS (Phase 4 stubs) ========================
CREATE TABLE IF NOT EXISTS e_invoice_logs (
  log_id SERIAL PRIMARY KEY,
  invoice_id INT REFERENCES sales_invoices(invoice_id),
  irn VARCHAR(100) UNIQUE,
  ack_no VARCHAR(100),
  ack_date TIMESTAMP,
  qr_code_url TEXT,
  signed_invoice JSONB,
  status VARCHAR(30) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS eway_bill_logs (
  log_id SERIAL PRIMARY KEY,
  delivery_challan_id INT REFERENCES delivery_challans(delivery_challan_id),
  ewb_no VARCHAR(50),
  ewb_date TIMESTAMP,
  ewb_valid_upto TIMESTAMP,
  vehicle_number VARCHAR(20),
  status VARCHAR(30) DEFAULT 'pending',
  raw_response JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tds_records (
  tds_id SERIAL PRIMARY KEY,
  customer_or_supplier_id INT,
  type VARCHAR(20) CHECK (type IN ('received_from_customer','paid_to_supplier')),
  amount DECIMAL(15,2) NOT NULL,
  tds_rate DECIMAL(5,2) NOT NULL,
  tds_amount DECIMAL(15,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================== SEED DEFAULT ADMIN ========================
-- password: admin123 — change on first login
INSERT INTO users (username, email, password_hash, full_name, role, phone, is_active)
SELECT 'admin', 'admin@hisecure.com', crypt('admin123', gen_salt('bf')), 'System Admin', 'admin', '9999999999', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- ======================== USEFUL INDEX BOOSTS ========================
CREATE INDEX IF NOT EXISTS idx_repairs_customer ON repairs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(repair_status);
CREATE INDEX IF NOT EXISTS idx_repairs_received ON repairs(received_date);
CREATE INDEX IF NOT EXISTS idx_repair_parts_repair ON repair_parts(repair_id);
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(stock_quantity, is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_status ON delivery_challans(status);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_date ON delivery_challans(challan_date);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module, created_at);
CREATE INDEX IF NOT EXISTS idx_sii_invoice ON sales_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_qi_quote ON quotation_items(quote_id);

-- ======================== HELPER: ROW-LEVEL updated_at ========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- attach to tables that need auto-updated_at
DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_parts_updated ON parts;
CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_locations_updated ON locations;
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_suppliers_updated ON suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_technicians_updated ON technicians;
CREATE TRIGGER trg_technicians_updated BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_quotations_updated ON quotations;
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_dc_updated ON delivery_challans;
CREATE TRIGGER trg_dc_updated BEFORE UPDATE ON delivery_challans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_vouchers_updated ON vouchers;
CREATE TRIGGER trg_vouchers_updated BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_accounts_updated ON accounts;
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- END
-- =============================================================================

-- ======================== CRM: LEADS ========================
CREATE TABLE IF NOT EXISTS crm_leads (
  lead_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  source VARCHAR(100) DEFAULT 'website',
  interest_level VARCHAR(20) DEFAULT 'medium' CHECK (interest_level IN ('low', 'medium', 'high', 'hot')),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'converted')),
  estimated_value DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  assigned_to INT REFERENCES users(user_id),
  converted_to_customer_id INT REFERENCES customers(customer_id),
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads(source);

DROP TRIGGER IF EXISTS trg_crm_leads_updated ON crm_leads;
CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ======================== CRM: INTERACTIONS ========================
CREATE TABLE IF NOT EXISTS crm_interactions (
  interaction_id SERIAL PRIMARY KEY,
  lead_id INT REFERENCES crm_leads(lead_id) ON DELETE CASCADE,
  customer_id INT REFERENCES customers(customer_id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'quotation', 'follow_up')),
  subject VARCHAR(255),
  notes TEXT,
  interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead ON crm_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer ON crm_interactions(customer_id);

-- ======================== CRM: FOLLOW-UPS ========================
CREATE TABLE IF NOT EXISTS crm_follow_ups (
  follow_up_id SERIAL PRIMARY KEY,
  lead_id INT REFERENCES crm_leads(lead_id) ON DELETE CASCADE,
  customer_id INT REFERENCES customers(customer_id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  notes TEXT,
  assigned_to INT REFERENCES users(user_id),
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crm_followups_due ON crm_follow_ups(due_date, is_completed);
CREATE INDEX IF NOT EXISTS idx_crm_followups_lead ON crm_follow_ups(lead_id);
