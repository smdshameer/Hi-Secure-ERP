-- =====================================================
-- Hi Secure Solutions - ERP Database Setup Script
-- =====================================================
-- Run this script to create all tables and indexes
-- Usage: psql -U postgres -d hisecure_erp -f setup-database.sql
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sales', 'technician', 'accountant', 'inventory_manager')),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    brand_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
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

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gstin VARCHAR(15),
    customer_type VARCHAR(50) DEFAULT 'retail', -- retail, business, government
    credit_limit DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table (branches/warehouses)
CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    location_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(15),
    is_main BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
    technician_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    specialization VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parts inventory table
CREATE TABLE IF NOT EXISTS parts (
    part_id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand_id INT REFERENCES brands(brand_id),
    hsn_code VARCHAR(8), -- Indian GST HSN code (4-8 digits)
    cost_price DECIMAL(10, 2),
    selling_price DECIMAL(10, 2),
    tax_rate DECIMAL(5,2) DEFAULT 0, -- GST rate
    stock_quantity INT DEFAULT 0,
    reorder_level INT DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repair status enum
DO $$ BEGIN
    CREATE TYPE repair_status AS ENUM (
        'received',
        'diagnosed',
        'awaiting_parts',
        'in_repair',
        'ready_for_pickup',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Repairs table
CREATE TABLE IF NOT EXISTS repairs (
    repair_id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    brand_id INT REFERENCES brands(brand_id),
    product_type VARCHAR(100) NOT NULL,
    serial_number VARCHAR(255),
    model_number VARCHAR(255),
    problem_description TEXT NOT NULL,
    repair_status repair_status DEFAULT 'received',
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2) DEFAULT 0,
    assigned_technician_id INT REFERENCES technicians(technician_id),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    diagnosed_date DATE,
    repair_start_date DATE,
    completion_date DATE,
    pickup_date DATE,
    warranty_status BOOLEAN DEFAULT FALSE,
    warranty_expiry DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repair parts junction table
CREATE TABLE IF NOT EXISTS repair_parts (
    repair_part_id SERIAL PRIMARY KEY,
    repair_id INT NOT NULL REFERENCES repairs(repair_id) ON DELETE CASCADE,
    part_id INT NOT NULL REFERENCES parts(part_id),
    quantity INT NOT NULL DEFAULT 1,
    price_charged DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    repair_id INT NOT NULL REFERENCES repairs(repair_id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table (key-value store for application configuration)
CREATE TABLE IF NOT EXISTS settings (
    setting_id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. CREATE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := 'RCP-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE):: TEXT, 4, '0')
                           || LPAD(EXTRACT(MONTH FROM CURRENT_DATE):: TEXT, 2, '0')
                           || '-' || LPAD(NEXTVAL('ticket_seq'):: TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for ticket numbers if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'ticket_seq') THEN
        CREATE SEQUENCE ticket_seq START 1;
    END IF;
END
$$;

-- Function to calculate warranty expiry
CREATE OR REPLACE FUNCTION calculate_warranty_expiry(
    p_start_date DATE,
    p_warranty_months INT DEFAULT 3
) RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN p_start_date + (p_warranty_months * INTERVAL '1 month') - INTERVAL '1 day';
END;
$$;

-- =====================================================
-- 3. CREATE TRIGGERS
-- =====================================================

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at
    BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repairs_updated_at
    BEFORE UPDATE ON repairs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for auto-generating ticket numbers
DROP TRIGGER IF EXISTS set_ticket_number ON repairs;
CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON repairs
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Trigger to auto-set warranty expiry
CREATE OR REPLACE FUNCTION set_warranty_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.repair_status = 'completed' AND NEW.warranty_status = TRUE THEN
        IF NEW.warranty_expiry IS NULL THEN
            NEW.warranty_expiry := calculate_warranty_expiry(
                COALESCE(NEW.completion_date, CURRENT_DATE),
                3
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_warranty_expiry ON repairs;
CREATE TRIGGER set_warranty_expiry
    BEFORE UPDATE OF repair_status, completion_date ON repairs
    FOR EACH ROW
    WHEN (NEW.repair_status = 'completed' AND NEW.warranty_status = TRUE)
    EXECUTE FUNCTION set_warranty_on_completion();

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

-- Repairs indexes
CREATE INDEX IF NOT EXISTS idx_repairs_serial ON repairs(serial_number);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(repair_status);
CREATE INDEX IF NOT EXISTS idx_repairs_customer ON repairs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repairs_date ON repairs(received_date);
CREATE INDEX IF NOT EXISTS idx_repairs_ticket ON repairs(ticket_number);
CREATE INDEX IF NOT EXISTS idx_repairs_technician ON repairs(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_repairs_completion ON repairs(completion_date) WHERE completion_date IS NOT NULL;

-- Customers indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin) WHERE gstin IS NOT NULL;

-- Parts indexes
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(stock_quantity, is_active);
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_hsn ON parts(hsn_code);

-- Junction tables
CREATE INDEX IF NOT EXISTS idx_repair_parts_repair ON repair_parts(repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_parts_part ON repair_parts(part_id);
CREATE INDEX IF NOT EXISTS idx_payments_repair ON payments(repair_id);

-- =====================================================
-- 5. DELIVERY CHALLAN MODULE
-- =====================================================

-- Locations/Branches table (for multi-branch/warehouse support)
CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    location_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(15),
    is_main BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Challan header table
CREATE TABLE IF NOT EXISTS delivery_challans (
    delivery_challan_id SERIAL PRIMARY KEY,
    challan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT REFERENCES customers(customer_id),
    supplier_id INT REFERENCES suppliers(supplier_id), -- for purchase returns/job work
    from_location_id INT REFERENCES locations(location_id),
    to_location_id INT REFERENCES locations(location_id), -- for branch transfer
    challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(255),
    transporter_name VARCHAR(255),
    eway_bill_number VARCHAR(50),
    purposes VARCHAR(100), -- 'sales', 'job_work', 'branch_transfer', 'consignment', 'return'
    status VARCHAR(50) DEFAULT 'draft', -- draft, dispatched, delivered, cancelled, returned
    total_quantity INT DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by INT REFERENCES users(user_id),
    approved_by INT REFERENCES users(user_id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Challan items
CREATE TABLE IF NOT EXISTS delivery_challan_items (
    challan_item_id SERIAL PRIMARY KEY,
    delivery_challan_id INT NOT NULL REFERENCES delivery_challans(delivery_challan_id) ON DELETE CASCADE,
    part_id INT NOT NULL REFERENCES parts(part_id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2), -- for valuation/consignment
    batch_number VARCHAR(100), -- for tracking
    expiry_date DATE, -- for components with shelf life
    serial_numbers TEXT[], -- array of serial numbers (for tracked items)
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Challan return tracking
CREATE TABLE IF NOT EXISTS delivery_challan_returns (
    return_id SERIAL PRIMARY KEY,
    delivery_challan_id INT REFERENCES delivery_challans(delivery_challan_id),
    challan_item_id INT REFERENCES delivery_challan_items(challan_item_id),
    part_id INT REFERENCES parts(part_id),
    quantity INT NOT NULL,
    return_date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    condition_notes TEXT,
    status VARCHAR(50) DEFAULT 'received', -- received, inspected, accepted, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. TRIGGERS FOR DELIVERY CHALLAN
-- =====================================================

-- Trigger to auto-generate challan numbers
CREATE OR REPLACE FUNCTION generate_challan_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.challan_number IS NULL THEN
        NEW.challan_number := 'DC-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE):: TEXT, 4, '0')
                           || LPAD(EXTRACT(MONTH FROM CURRENT_DATE):: TEXT, 2, '0')
                           || '-' || LPAD(NEXTVAL('challan_seq'):: TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for challan numbers if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'challan_seq') THEN
        CREATE SEQUENCE challan_seq START 1;
    END IF;
END
$$;

DROP TRIGGER IF EXISTS set_challan_number ON delivery_challans;
CREATE TRIGGER set_challan_number
    BEFORE INSERT ON delivery_challans
    FOR EACH ROW EXECUTE FUNCTION generate_challan_number();

-- Trigger to update total amount on challan
CREATE OR REPLACE FUNCTION update_challan_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE delivery_challans
    SET total_quantity = (
        SELECT COALESCE(SUM(quantity), 0)
        FROM delivery_challan_items
        WHERE delivery_challan_id = NEW.delivery_challan_id
    ),
    total_amount = (
        SELECT COALESCE(SUM(quantity * COALESCE(unit_price,
            (SELECT selling_price FROM parts WHERE part_id = delivery_challan_items.part_id)
        )), 0)
        FROM delivery_challan_items
        WHERE delivery_challan_id = NEW.delivery_challan_id
    )
    WHERE delivery_challan_id = NEW.delivery_challan_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_challan_totals_trigger ON delivery_challan_items;
CREATE TRIGGER update_challan_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON delivery_challan_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_challan_totals();

-- =====================================================
-- 7. CREATE INDEXES FOR DELIVERY CHALLAN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_delivery_challan_number ON delivery_challans(challan_number);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_customer ON delivery_challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_date ON delivery_challans(challan_date);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_status ON delivery_challans(status);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_eway ON delivery_challans(eway_bill_number);
CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON delivery_challan_items(delivery_challan_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_part ON delivery_challan_items(part_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_serials ON delivery_challan_items USING GIN(serial_numbers);

-- =====================================================
-- 6. SALES & PURCHASE TABLES
-- =====================================================

-- Sales Invoices
CREATE TABLE IF NOT EXISTS sales_invoices (
    invoice_id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    place_of_supply VARCHAR(100),
    total_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    notes TEXT,
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Invoice Items
CREATE TABLE IF NOT EXISTS sales_invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES sales_invoices(invoice_id) ON DELETE CASCADE,
    part_id INT NOT NULL REFERENCES parts(part_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    batch_number TEXT,
    serial_numbers TEXT[]
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    notes TEXT,
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    po_item_id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    part_id INT NOT NULL REFERENCES parts(part_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0,
    batch_number TEXT,
    expiration_date DATE
);

-- Functions for auto-generating numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 4, '0')
                           || '-' || LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0')
                           || '-' || LPAD(NEXTVAL('invoice_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.po_number IS NULL THEN
        NEW.po_number := 'PO-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 4, '0')
                          || '-' || LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0')
                          || '-' || LPAD(NEXTVAL('po_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequences if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'invoice_seq') THEN
        CREATE SEQUENCE invoice_seq START 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'po_seq') THEN
        CREATE SEQUENCE po_seq START 1;
    END IF;
END $$;

-- Triggers for auto-numbering
DROP TRIGGER IF EXISTS set_invoice_number ON sales_invoices;
CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON sales_invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

DROP TRIGGER IF EXISTS set_po_number ON purchase_orders;
CREATE TRIGGER set_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION generate_po_number();

-- Triggers to update totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales_invoices
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * unit_price), 0) FROM sales_invoice_items WHERE invoice_id = NEW.invoice_id
    ),
    tax_amount = (
        SELECT COALESCE(SUM( (quantity * unit_price) * (tax_rate/100) ), 0) FROM sales_invoice_items WHERE invoice_id = NEW.invoice_id
    ),
    grand_total = (
        SELECT COALESCE(SUM( (quantity * unit_price) * (1 + tax_rate/100) ), 0) FROM sales_invoice_items WHERE invoice_id = NEW.invoice_id
    )
    WHERE invoice_id = NEW.invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_totals_trigger ON sales_invoice_items;
CREATE TRIGGER update_invoice_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sales_invoice_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_invoice_totals();

CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * unit_price), 0) FROM purchase_order_items WHERE po_id = NEW.po_id
    )
    WHERE po_id = NEW.po_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_po_totals_trigger ON purchase_order_items;
CREATE TRIGGER update_po_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_po_totals();

-- Indexes for Sales & Purchase
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_invoice ON sales_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);

-- Ensure place_of_supply column exists in sales_invoices (for upgrades)
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100);

-- GST tax breakdown columns
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT NULL;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) DEFAULT 0;

-- =====================================================
-- 7. QUOTATIONS MODULE
-- =====================================================

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    quote_id SERIAL PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    subtotal DECIMAL(12,2) DEFAULT 0,
    total_discount DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    terms TEXT DEFAULT 'This quotation is valid for 30 days from the date of issue.',
    notes TEXT,
    created_by INT REFERENCES users(user_id),
    converted_to_invoice_id INT REFERENCES sales_invoices(invoice_id) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Items table
CREATE TABLE IF NOT EXISTS quotation_items (
    quote_item_id SERIAL PRIMARY KEY,
    quote_id INT NOT NULL REFERENCES quotations(quote_id) ON DELETE CASCADE,
    part_id INT NOT NULL REFERENCES parts(part_id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    CONSTRAINT unique_quote_part UNIQUE (quote_id, part_id)
);

-- Function to generate quotation number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL THEN
        NEW.quote_number := 'QT-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 4, '0')
                           || '-' || LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0')
                           || '-' || LPAD(NEXTVAL('quote_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for quote numbers if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'quote_seq') THEN
        CREATE SEQUENCE quote_seq START 1;
    END IF;
END $$;

-- Trigger for auto-numbering quotations
DROP TRIGGER IF EXISTS set_quote_number ON quotations;
CREATE TRIGGER set_quote_number
    BEFORE INSERT ON quotations
    FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- Function to update quotation totals
CREATE OR REPLACE FUNCTION update_quotation_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quotations
    SET subtotal = (
        SELECT COALESCE(SUM(quantity * unit_price), 0) FROM quotation_items WHERE quote_id = NEW.quote_id
    ),
    total_discount = (
        SELECT COALESCE(SUM( (quantity * unit_price) * (discount_percent/100) ), 0) FROM quotation_items WHERE quote_id = NEW.quote_id
    ),
    total_tax = (
        SELECT COALESCE(SUM( (quantity * unit_price * (1 - discount_percent/100)) * (tax_rate/100) ), 0) FROM quotation_items WHERE quote_id = NEW.quote_id
    ),
    total_amount = (
        SELECT COALESCE(SUM( total ), 0) FROM quotation_items WHERE quote_id = NEW.quote_id
    )
    WHERE quote_id = NEW.quote_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update totals when items change
DROP TRIGGER IF EXISTS update_quotation_totals_trigger ON quotation_items;
CREATE TRIGGER update_quotation_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON quotation_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_quotation_totals();

-- Indexes for Quotations
CREATE INDEX IF NOT EXISTS idx_quotation_number ON quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotation_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_date ON quotations(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotation_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_part ON quotation_items(part_id);

-- =====================================================