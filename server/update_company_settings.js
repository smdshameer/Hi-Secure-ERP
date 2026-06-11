const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const companySetting = await prisma.setting.findFirst({
      where: { key: 'company' }
    });
    if (companySetting) {
      const value = companySetting.value;
      console.log("Current company settings:", JSON.stringify(value, null, 2));
      // Update only if name is wrong placeholder
      if (value.name === 'Test' || value.name === 'TEST' || !value.name) {
        value.name = 'HI SECURE SOLUTIONS';
        value.address = '99, Al-Ahad Complex, Main Road, Thittachery, Nagapattinam - 609703';
        value.phone = '9042489993, 9003400586';
        value.email = 'info@hisecuresolutions.com';
        value.website = 'www.hisecuresolutions.com';
        value.gstin = '33CMAPM9758H1ZQ';
        value.state = 'Tamil Nadu';
        value.state_code = '33';
        const updated = await prisma.setting.update({
          where: { setting_id: companySetting.setting_id },
          data: { value }
        });
        console.log("Updated company settings in DB:", JSON.stringify(updated.value, null, 2));
      } else {
        console.log("Company name is already set to:", value.name, "- no update needed.");
      }
    } else {
      console.log("Company setting not found in DB.");
    }
  } catch (err) {
    console.error("Error updating settings:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
