const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
async function main() {
  const quotes = await prisma.quotation.findMany({
    select: {
      quote_id: true,
      quote_number: true,
      status: true,
      total_amount: true,
      _count: { select: { items: true } }
    },
    orderBy: { quote_id: 'desc' },
    take: 30
  });
  console.log('RESULTS_START');
  console.log(JSON.stringify(quotes, null, 2));
  console.log('RESULTS_END');
}
main().catch(console.error).finally(() => prisma.$disconnect());
