const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Update telegram settings
    const telRow = await prisma.setting.findUnique({ where: { key: 'telegram' } });
    const telVal = telRow ? (telRow.value || {}) : {};
    telVal.bot_token = '8738616524:AAGfG7f5CQ3HGQVplUVEL3tpPcu946loXXc';
    telVal.enabled = true;
    
    await prisma.setting.update({
      where: { key: 'telegram' },
      data: { value: telVal }
    });
    console.log('Telegram setting key updated in database.');

    // 2. Update AI settings to enable telegram_ai_enabled
    const aiRow = await prisma.setting.findUnique({ where: { key: 'ai' } });
    const aiVal = aiRow ? (aiRow.value || {}) : {};
    aiVal.telegram_ai_enabled = true;

    await prisma.setting.update({
      where: { key: 'ai' },
      data: { value: aiVal }
    });
    console.log('AI integrations for Telegram enabled in database.');
    
  } catch (err) {
    console.error('Error configuring database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
