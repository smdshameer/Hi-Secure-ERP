const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const settings = await prisma.setting.findMany();
    console.log("Settings in DB count:", settings.length);
    console.log(JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("Error querying settings:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
