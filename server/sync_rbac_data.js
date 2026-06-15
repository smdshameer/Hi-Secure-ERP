const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[RBAC Sync] Starting database synchronization for user roles...');
  try {
    const users = await prisma.user.findMany();
    console.log(`[RBAC Sync] Found ${users.length} users in the database.`);
    
    let linkedCount = 0;
    for (const user of users) {
      const roleName = user.role.toLowerCase();
      const roleRecord = await prisma.role.findUnique({
        where: { name: roleName }
      });
      
      if (roleRecord) {
        await prisma.userRole.upsert({
          where: {
            user_id_role_id: {
              user_id: user.user_id,
              role_id: roleRecord.role_id
            }
          },
          create: {
            user_id: user.user_id,
            role_id: roleRecord.role_id
          },
          update: {}
        });
        linkedCount++;
        console.log(`[RBAC Sync] Linked user "${user.username}" to role "${roleRecord.name}"`);
      } else {
        console.warn(`[RBAC Sync] Role "${roleName}" not found in database for user "${user.username}"`);
      }
    }
    console.log(`[RBAC Sync] Successfully linked ${linkedCount} users to roles.`);
  } catch (err) {
    console.error('[RBAC Sync] Error during synchronization:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
