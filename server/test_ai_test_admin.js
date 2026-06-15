const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = ['admin', 'ai_test_admin', 'ai_test_user'];
    for (const username of users) {
      const dbUser = await prisma.user.findUnique({ where: { username } });
      if (!dbUser) {
        console.log(`User "${username}" not found in DB!`);
        continue;
      }
      const passwords = ['admin123456', 'admin@123', 'admin123', 'admin'];
      console.log(`\nUser: ${username}`);
      console.log(`Active: ${dbUser.is_active}`);
      console.log(`Hash: ${dbUser.password_hash}`);
      for (const pw of passwords) {
        const isMatch = await bcrypt.compare(pw, dbUser.password_hash);
        if (isMatch) {
          console.log(`-> PASSWORD IS MATCHING: "${pw}"`);
        }
      }
    }
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
