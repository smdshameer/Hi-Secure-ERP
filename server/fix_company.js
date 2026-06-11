const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const s = await prisma.setting.findFirst({ where: { key: 'company' } });
    console.log('Current company name:', s.value.name);
    console.log('Current GSTIN:', s.value.gstin);
    console.log('Current address:', s.value.address);
    
    // Force update with correct HI SECURE SOLUTIONS data
    const value = { ...s.value };
    value.name = 'HI SECURE SOLUTIONS';
    value.address = '99, Al-Ahad Complex, Main Road, Thittachery, Nagapattinam - 609703';
    value.phone = '9042489993, 9003400586';
    value.email = 'info@hisecuresolutions.com';
    value.website = 'www.hisecuresolutions.com';
    value.gstin = '33CMAPM9758H1ZQ';
    value.state = 'Tamil Nadu';
    value.state_code = '33';
    
    const updated = await prisma.setting.update({
      where: { setting_id: s.setting_id },
      data: { value }
    });
    console.log('\nUpdated company name:', updated.value.name);
    console.log('Updated GSTIN:', updated.value.gstin);
    console.log('Updated address:', updated.value.address);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
