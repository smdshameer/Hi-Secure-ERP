-- =====================================================
-- HiSecure ERP Phase 5-7 Database Migration
-- =====================================================

BEGIN;

-- 1. Ensure at least one main location is set
UPDATE locations SET is_main = true WHERE location_id = 1;

-- 2. Create Approval Workflow tables
CREATE TABLE IF NOT EXISTS approval_workflows (
    workflow_id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) UNIQUE NOT NULL,
    threshold DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_steps (
    step_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES approval_workflows(workflow_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_workflow_step UNIQUE (workflow_id, step_number)
);

CREATE TABLE IF NOT EXISTS approval_histories (
    history_id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL,
    step_id INTEGER NOT NULL REFERENCES approval_steps(step_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Create Multi-Location Inventory Table
CREATE TABLE IF NOT EXISTS part_stocks (
    part_id INTEGER NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (part_id, location_id)
);

-- 4. Upgrade Audit Log Table with JSONB diff columns
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB DEFAULT NULL;

-- 5. Seed default Purchase Order approval workflow (threshold 50,000, requires Admin role approval)
INSERT INTO approval_workflows (entity_type, threshold)
VALUES ('PurchaseOrder', 50000.00)
ON CONFLICT (entity_type) DO NOTHING;

INSERT INTO approval_steps (workflow_id, role_id, step_number)
SELECT w.workflow_id, r.role_id, 1
FROM approval_workflows w, roles r
WHERE w.entity_type = 'PurchaseOrder' AND r.name = 'admin'
ON CONFLICT (workflow_id, step_number) DO NOTHING;

-- 6. Migrate existing parts stock to the main location (location_id = 1)
INSERT INTO part_stocks (part_id, location_id, quantity)
SELECT part_id, 1, COALESCE(stock_quantity, 0)
FROM parts
ON CONFLICT (part_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;

COMMIT;
