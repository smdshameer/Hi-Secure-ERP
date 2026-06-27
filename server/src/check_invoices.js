const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
async function main() {
  const invoices = await prisma.salesInvoice.findMany({
    select: {
      invoice_id: true,
      invoice_number: true,
      status: true,
      grand_total: true,
      notes: true,
      _count: { select: { items: true } }
    },
    orderBy: { invoice_id: 'desc' },
    take: 10
  });
  console.log('RESULTS_START');
  console.log(JSON.stringify(invoices, null, 2));
  console.log('RESULTS_END');
}
main().catch(console.error).finally(() => prisma.$disconnect());
