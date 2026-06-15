const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { const cust = await prisma.customer.findFirst({ where: { gstin: '33AALFE2983R1ZP' } }); console.log(cust); } main().catch(console.error).finally(() => prisma.$disconnect());

