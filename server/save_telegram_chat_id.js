const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const telRow = await prisma.setting.findUnique({ where: { key: 'telegram' } });
    const telVal = telRow ? (telRow.value || {}) : {};
    telVal.chat_id = '8429513634';
    telVal.enabled = true;
    
    await prisma.setting.update({
      where: { key: 'telegram' },
      data: { value: telVal }
    });
    console.log('Telegram Chat ID saved successfully in database.');
  } catch (err) {
    console.error('Error configuring chat ID:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
