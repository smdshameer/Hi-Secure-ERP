-- =====================================================
-- HiSecure ERP RBAC Migration & Seeding Script
-- =====================================================

BEGIN;

-- 1. Create RBAC Tables
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 2. Seed Default Roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full administrative access'),
    ('sales', 'Access to POS, invoices, and quotations'),
    ('technician', 'Access to repairs ticket lifecycle and status updates'),
    ('accountant', 'Access to double-entry ledger, accounting reports, and payroll'),
    ('inventory_manager', 'Access to parts stock levels and purchase orders')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Default Permissions
INSERT INTO permissions (name, description) VALUES
    ('invoice:create', 'Create sales invoices'),
    ('invoice:view', 'View sales invoices'),
    ('invoice:edit', 'Edit sales invoices'),
    ('invoice:delete', 'Delete sales invoices'),
    ('pos:checkout', 'Perform POS checkout operations'),
    ('purchase:create', 'Create purchase orders'),
    ('purchase:receive', 'Approve and receive inventory'),
    ('repairs:create', 'Book repair tickets'),
    ('repairs:update_status', 'Advance repair ticket lifecycle steps'),
    ('ledger:view', 'View double entry ledger and journals'),
    ('settings:edit', 'Edit system printing and organization settings'),
    ('users:manage', 'Manage users and roles')
ON CONFLICT (name) DO NOTHING;

-- 4. Link Permissions to Roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Sales Role Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'sales' AND p.name IN (
    'invoice:create', 'invoice:view', 'invoice:edit', 'pos:checkout', 'repairs:create'
)
ON CONFLICT DO NOTHING;

-- Technician Role Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'technician' AND p.name IN (
    'repairs:create', 'repairs:update_status'
)
ON CONFLICT DO NOTHING;

-- Accountant Role Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'accountant' AND p.name IN (
    'invoice:view', 'ledger:view'
)
ON CONFLICT DO NOTHING;

-- Inventory Manager Role Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.name = 'inventory_manager' AND p.name IN (
    'purchase:create', 'purchase:receive'
)
ON CONFLICT DO NOTHING;

-- 5. Map Existing Users to Roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u
JOIN roles r ON u.role = r.name
ON CONFLICT DO NOTHING;

COMMIT;
