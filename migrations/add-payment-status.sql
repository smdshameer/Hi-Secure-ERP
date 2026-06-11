-- Add payment status to sales_invoices and purchase_orders
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
CREATE INDEX IF NOT EXISTS idx_sales_invoices_payment_status ON sales_invoices(payment_status);

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_status ON purchase_orders(payment_status);

-- Add payment status to repairs
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
CREATE INDEX IF NOT EXISTS idx_repairs_payment_status ON repairs(payment_status);
