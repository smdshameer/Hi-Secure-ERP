const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const printSetting = await prisma.setting.findFirst({
      where: { key: 'print' }
    });
    if (printSetting) {
      const value = printSetting.value;
      value.default_theme = 'hisecure';
      const updated = await prisma.setting.update({
        where: { setting_id: printSetting.setting_id },
        data: { value }
      });
      console.log("Updated print settings in DB to hisecure:", JSON.stringify(updated, null, 2));
    } else {
      console.log("Print setting not found in DB.");
    }
  } catch (err) {
    console.error("Error updating settings:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
