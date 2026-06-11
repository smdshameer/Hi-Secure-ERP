-- Migration: Add Quotations Module
-- This script adds the quotations tables, sequences, triggers, and indexes

-- =====================================================
-- 1. CREATE TABLES
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

-- =====================================================
-- 2. CREATE SEQUENCES
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'quote_seq') THEN
        CREATE SEQUENCE quote_seq START 1;
    END IF;
END $$;

-- =====================================================
-- 3. CREATE FUNCTIONS
-- =====================================================

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

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Trigger for auto-numbering quotations
DROP TRIGGER IF EXISTS set_quote_number ON quotations;
CREATE TRIGGER set_quote_number
    BEFORE INSERT ON quotations
    FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- Trigger to update totals when items change
DROP TRIGGER IF EXISTS update_quotation_totals_trigger ON quotation_items;
CREATE TRIGGER update_quotation_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON quotation_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_quotation_totals();

-- =====================================================
-- 5. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_quotation_number ON quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotation_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_date ON quotations(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotation_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_part ON quotation_items(part_id);

-- =====================================================
-- 6. TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_quotation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_quotation_updated_at();

-- =====================================================
-- End of Quotations Migration
-- =====================================================
