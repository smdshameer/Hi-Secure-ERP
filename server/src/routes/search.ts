import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) return res.json({ customers: [], parts: [], repairs: [], invoices: [], suppliers: [], quotations: [], deliveryChallans: [] });

    const numericId = parseInt(q, 10);
    const isNumeric = !isNaN(numericId) && numericId <= 2147483647;

    // Build common customer search filters to match linked transactions
    const customerMatchConditions: any[] = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { gstin: { contains: q, mode: 'insensitive' } },
    ];
    if (isNumeric) {
      customerMatchConditions.push({ customer_id: numericId });
    }

    // Search customers
    const customers = await prisma.customer.findMany({
      where: {
        OR: customerMatchConditions,
      },
      take: 15,
      orderBy: { name: 'asc' },
      select: { customer_id: true, name: true, phone: true, email: true, gstin: true },
    });

    // Search parts/products
    const parts = await prisma.parts.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { part_number: { contains: q, mode: 'insensitive' } },
          { hsn_code: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      orderBy: { name: 'asc' },
      select: { part_id: true, name: true, part_number: true, hsn_code: true, selling_price: true, stock_quantity: true },
    });

    // Search repairs (check ticket_number, product_type, notes OR linked customer parameters)
    const repairs = await prisma.repair.findMany({
      where: {
        OR: [
          { ticket_number: { contains: q, mode: 'insensitive' } },
          { product_type: { contains: q, mode: 'insensitive' } },
          { serial_number: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { problem_description: { contains: q, mode: 'insensitive' } },
          { customer: { OR: customerMatchConditions } },
        ],
      },
      take: 15,
      orderBy: { created_at: 'desc' },
      select: {
        repair_id: true,
        ticket_number: true,
        product_type: true,
        repair_status: true,
        customer: { select: { name: true } },
      },
    });

    // Search invoices (check invoice_number, notes/metadata OR linked customer parameters)
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        OR: [
          { invoice_number: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { customer: { OR: customerMatchConditions } },
        ],
      },
      take: 15,
      orderBy: { created_at: 'desc' },
      select: {
        invoice_id: true,
        invoice_number: true,
        status: true,
        total_amount: true,
        customer: { select: { name: true } },
      },
    });

    // Search suppliers
    const suppliers = await prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { gstin: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      orderBy: { name: 'asc' },
      select: { supplier_id: true, name: true, phone: true, email: true, gstin: true },
    });

    // Search quotations (check quote_number, notes/metadata OR linked customer parameters)
    const quotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { quote_number: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { customer: { OR: customerMatchConditions } },
        ],
      },
      take: 15,
      orderBy: { created_at: 'desc' },
      select: {
        quote_id: true,
        quote_number: true,
        status: true,
        total_amount: true,
        customer: { select: { name: true } },
      },
    });

    // Search delivery challans (check challan_number, vehicle_number, notes/metadata OR linked customer parameters)
    const deliveryChallans = await prisma.deliveryChallan.findMany({
      where: {
        OR: [
          { challan_number: { contains: q, mode: 'insensitive' } },
          { vehicle_number: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { customer: { OR: customerMatchConditions } },
        ],
      },
      take: 15,
      orderBy: { created_at: 'desc' },
      select: {
        delivery_challan_id: true,
        challan_number: true,
        status: true,
        vehicle_number: true,
        customer: { select: { name: true } },
      },
    });

    res.json({ customers, parts, repairs, invoices, suppliers, quotations, deliveryChallans });
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
});

export default router;
