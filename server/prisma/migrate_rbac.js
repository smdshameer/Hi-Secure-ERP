const { PrismaClient } = require('@prisma/client');

async function migrate() {
  const prisma = new PrismaClient();
  console.log("Connected using Prisma. Executing RBAC migrations...");

  try {
    // 1. Create tables
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS permissions (
        permission_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );
    `);

    console.log("RBAC tables verified.");

    // 2. Seed roles
    const roles = [
      { name: 'admin', desc: 'Full administrative access' },
      { name: 'sales', desc: 'Access to POS, invoices, and quotations' },
      { name: 'technician', desc: 'Access to repairs ticket lifecycle and status updates' },
      { name: 'accountant', desc: 'Access to double-entry ledger, accounting reports, and payroll' },
      { name: 'inventory_manager', desc: 'Access to parts stock levels and purchase orders' }
    ];

    for (const r of roles) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING;
      `, r.name, r.desc);
    }

    console.log("Roles seeded.");

    // 3. Seed permissions
    const permissions = [
      { name: 'invoice:create', desc: 'Create sales invoices' },
      { name: 'invoice:view', desc: 'View sales invoices' },
      { name: 'invoice:edit', desc: 'Edit sales invoices' },
      { name: 'invoice:delete', desc: 'Delete sales invoices' },
      
      { name: 'pos:checkout', desc: 'Perform POS checkout operations' },
      
      { name: 'purchase:create', desc: 'Create purchase orders' },
      { name: 'purchase:receive', desc: 'Approve and receive inventory' },
      
      { name: 'repairs:create', desc: 'Book repair tickets' },
      { name: 'repairs:update_status', desc: 'Advance repair ticket lifecycle steps' },
      
      { name: 'ledger:view', desc: 'View double entry ledger and journals' },
      
      { name: 'settings:edit', desc: 'Edit system printing and organization settings' },
      { name: 'users:manage', desc: 'Manage users and roles' }
    ];

    for (const p of permissions) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO permissions (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING;
      `, p.name, p.desc);
    }

    console.log("Permissions seeded.");

    // Retrieve mappings
    const dbRoles = await prisma.$queryRawUnsafe(`SELECT role_id, name FROM roles;`);
    const dbPermissions = await prisma.$queryRawUnsafe(`SELECT permission_id, name FROM permissions;`);

    const roleMap = {};
    dbRoles.forEach(r => roleMap[r.name] = r.role_id);

    const permMap = {};
    dbPermissions.forEach(p => permMap[p.name] = p.permission_id);

    // Link permissions to roles
    const rolePermissions = {
      admin: Object.keys(permMap), // Admin gets all permissions
      sales: ['invoice:create', 'invoice:view', 'invoice:edit', 'pos:checkout', 'repairs:create'],
      technician: ['repairs:create', 'repairs:update_status'],
      accountant: ['invoice:view', 'ledger:view'],
      inventory_manager: ['purchase:create', 'purchase:receive']
    };

    for (const [roleName, perms] of Object.entries(rolePermissions)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      for (const permName of perms) {
        const permId = permMap[permName];
        if (!permId) continue;

        await prisma.$executeRawUnsafe(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, roleId, permId);
      }
    }

    console.log("Permissions linked to Roles.");

    // 4. Map existing users to their corresponding roles in user_roles
    const users = await prisma.$queryRawUnsafe(`SELECT user_id, role FROM users;`);
    for (const u of users) {
      const roleId = roleMap[u.role];
      if (roleId) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, u.user_id, roleId);
      }
    }

    console.log("Existing users linked to RBAC roles.");
    console.log("RBAC migrations complete successfully.");
  } catch (err) {
    console.error("RBAC Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
