const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const adminUsers = await prisma.user.findMany({
      where: {
        username: { in: ['admin', 'ai_test_admin'] }
      },
      select: {
        username: true,
        last_login: true
      }
    });
    console.log('Last logins:');
    console.log(JSON.stringify(adminUsers, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
