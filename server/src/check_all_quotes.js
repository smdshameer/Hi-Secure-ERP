const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
async function main() {
  const quote110 = await prisma.quotation.findUnique({
    where: { quote_id: 110 },
    include: { items: { include: { part: true } } }
  });
  console.log('RESULTS_START');
  console.log(JSON.stringify({ quote110 }, null, 2));
  console.log('RESULTS_END');
}
main().catch(console.error).finally(() => prisma.$disconnect());
