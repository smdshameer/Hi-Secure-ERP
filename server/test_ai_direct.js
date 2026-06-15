process.env.PORT = '4009';
const { AiService } = require('./dist/services/AiService');

async function main() {
  try {
    console.log('--- TEST 1: 🔧 Repairs List ---');
    const reply1 = await AiService.processChatMessage('🔧 Repairs List', 1);
    console.log('RESPONSE 1:');
    console.log(reply1);

    console.log('\n--- TEST 2: 📊 System Health ---');
    const reply2 = await AiService.processChatMessage('📊 System Health', 1);
    console.log('RESPONSE 2:');
    console.log(reply2);

    process.exit(0);
  } catch (err) {
    console.error('Error running test:', err);
    process.exit(1);
  }
}

main();
