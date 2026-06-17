import { PrismaClient } from '../generated/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- RUNNING RBAC HARDENING SEED SCRIPT ---');

  const permissions = [
    // Existing permissions
    { name: 'invoice:create', description: 'Create sales invoices' },
    { name: 'invoice:view', description: 'View sales invoices' },
    { name: 'invoice:edit', description: 'Edit sales invoices' },
    { name: 'invoice:delete', description: 'Delete sales invoices' },
    { name: 'pos:checkout', description: 'Perform POS checkout operations' },
    { name: 'purchase:create', description: 'Create purchase orders' },
    { name: 'purchase:receive', description: 'Approve and receive inventory' },
    { name: 'repairs:create', description: 'Book repair tickets' },
    { name: 'repairs:update_status', description: 'Advance repair ticket lifecycle steps' },
    { name: 'ledger:view', description: 'View double entry ledger and journals' },
    { name: 'settings:edit', description: 'Edit system settings' },
    { name: 'users:manage', description: 'Manage users and roles' },

    // New granular permissions
    { name: 'accounting:view', description: 'View general ledger, journal, and trial balance' },
    { name: 'accounting:create', description: 'Create journal entries' },
    { name: 'accounting:delete', description: 'Delete journal entries' },
    { name: 'reports:view', description: 'View system and financial reports' },
    { name: 'settings:view', description: 'View system settings' },
    { name: 'attachments:view', description: 'View and download attachments' },
    { name: 'attachments:create', description: 'Upload attachments' },
    { name: 'attachments:delete', description: 'Delete attachments' },
    { name: 'users:view', description: 'View users list' },
    { name: 'approvals:view', description: 'View pending and history workflow approvals' },
    { name: 'approvals:approve', description: 'Approve or reject workflow steps' },
    { name: 'view_parts', description: 'View parts and inventory' },
    { name: 'manage_suppliers', description: 'Manage suppliers and imports' },
  ];

  console.log('Seeding permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: { name: perm.name, description: perm.description },
    });
  }

  // Load all permissions to get their IDs
  const dbPerms = await prisma.permission.findMany();
  const permMap = new Map(dbPerms.map(p => [p.name, p.permission_id]));

  // Load all roles
  const dbRoles = await prisma.role.findMany();
  const roleMap = new Map(dbRoles.map(r => [r.name, r.role_id]));

  // Role mappings definition
  const rolePermissions: Record<string, string[]> = {
    admin: dbPerms.map(p => p.name), // admin gets everything
    sales: [
      'invoice:create',
      'invoice:view',
      'invoice:edit',
      'pos:checkout',
      'repairs:create',
      'attachments:view',
      'attachments:create',
      'view_parts',
    ],
    technician: [
      'repairs:create',
      'repairs:update_status',
      'attachments:view',
    ],
    accountant: [
      'invoice:view',
      'ledger:view',
      'accounting:view',
      'accounting:create',
      'accounting:delete',
      'reports:view',
      'settings:view',
      'attachments:view',
    ],
    inventory_manager: [
      'purchase:create',
      'purchase:receive',
      'attachments:view',
      'attachments:create',
      'view_parts',
      'manage_suppliers',
    ],
  };

  console.log('Mapping permissions to roles...');
  for (const [roleName, permNames] of Object.entries(rolePermissions)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) {
      console.warn(`Role "${roleName}" not found in database, skipping...`);
      continue;
    }

    for (const permName of permNames) {
      const permId = permMap.get(permName);
      if (!permId) continue;

      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: roleId,
            permission_id: permId,
          },
        },
        update: {},
        create: {
          role_id: roleId,
          permission_id: permId,
        },
      });
    }
  }

  console.log('RBAC seeding complete!');
}

main()
  .catch(e => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
