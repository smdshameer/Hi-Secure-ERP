import { Router } from 'express';
import { prisma } from '../index';

export const invoicesRouter = Router();

invoicesRouter.get('/', async (req, res) => {
  try {
    const { status, customer_id, from_date, to_date, search, limit } = req.query;
    const where: any = {};
    if (status) {
      if (status === 'unpaid') {
        where.status = { in: ['issued', 'partial'] };
      } else {
        where.status = String(status);
      }
    }
    if (customer_id) where.customer_id = Number(customer_id);
    if (from_date) where.invoice_date = { ...where.invoice_date, gte: new Date(String(from_date)) };
    if (to_date) where.invoice_date = { ...where.invoice_date, lte: new Date(String(to_date)) };
    if (search) where.OR = [
      { invoice_number: { contains: String(search), mode: 'insensitive' } },
      { notes: { contains: String(search), mode: 'insensitive' } },
      { customer: { name: { contains: String(search), mode: 'insensitive' } } },
      { customer: { phone: { contains: String(search), mode: 'insensitive' } } },
    ];
    
    const takeLimit = limit ? Number(limit) : 100;

    const invoices = await prisma.salesInvoice.findMany({
      where,
      include: { customer: { select: { name: true, phone: true, gstin: true } }, _count: { select: { items: true } } },
      orderBy: { invoice_date: 'desc' },
      take: takeLimit,
    });
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

invoicesRouter.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { invoice_id: Number(req.params.id) },
      include: { customer: true, items: { include: { part: { include: { brand: { select: { name: true } } } } } }, createdBy: { select: { full_name: true } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

invoicesRouter.post('/', async (req, res) => {
  try {
    const { customer_id, invoice_date, due_date, place_of_supply, tax_type, tax_amount, cgst_amount, sgst_amount, igst_amount, status, notes, items, invoice_number } = req.body;
    const invoice = await prisma.salesInvoice.create({
      data: {
        customer_id: Number(customer_id),
        invoice_number: invoice_number || undefined,
        invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
        due_date: due_date ? new Date(due_date) : null,
        place_of_supply: place_of_supply || null,
        tax_type: tax_type || null,
        tax_amount: tax_amount ? Number(tax_amount) : 0,
        cgst_amount: cgst_amount ? Number(cgst_amount) : 0,
        sgst_amount: sgst_amount ? Number(sgst_amount) : 0,
        igst_amount: igst_amount ? Number(igst_amount) : 0,
        status: status || 'draft',
        notes: notes || null,
        items: items?.length ? { create: items.map((i: any) => ({ part_id: Number(i.part_id), quantity: Number(i.quantity), unit_price: Number(i.unit_price), tax_rate: Number(i.tax_rate || 0), tax_amount: Number(i.tax_amount || 0), total_amount: Number(i.total_amount), batch_number: i.batch_number || null })) } : undefined,
      },
      select: { invoice_id: true, invoice_number: true, grand_total: true },
    });
    res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

invoicesRouter.put('/:id', async (req, res) => {
  try {
    const { customer_id, invoice_date, due_date, place_of_supply, tax_type, tax_amount, cgst_amount, sgst_amount, igst_amount, status, notes, items, invoice_number } = req.body;
    const invoiceId = Number(req.params.id);
    
    await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.salesInvoiceItems.deleteMany({ where: { invoice_id: invoiceId } });
      
      // Calculate totals
      let totalAmount = 0;
      let calculatedTax = 0;
      if (items && items.length) {
        items.forEach((i: any) => {
          totalAmount += Number(i.quantity) * Number(i.unit_price);
          calculatedTax += Number(i.tax_amount || 0);
        });
      }
      const grandTotal = totalAmount + calculatedTax;
      
      // Update invoice header and recreate items
      await tx.salesInvoice.update({
        where: { invoice_id: invoiceId },
        data: {
          customer_id: customer_id ? Number(customer_id) : undefined,
          invoice_number: invoice_number || undefined,
          invoice_date: invoice_date ? new Date(invoice_date) : undefined,
          due_date: due_date ? new Date(due_date) : null,
          place_of_supply: place_of_supply || null,
          tax_type: tax_type || null,
          total_amount: totalAmount,
          tax_amount: calculatedTax,
          grand_total: grandTotal,
          cgst_amount: cgst_amount ? Number(cgst_amount) : 0,
          sgst_amount: sgst_amount ? Number(sgst_amount) : 0,
          igst_amount: igst_amount ? Number(igst_amount) : 0,
          status: status || 'draft',
          notes: notes || null,
          items: items?.length ? {
            create: items.map((i: any) => ({
              part_id: Number(i.part_id),
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              tax_rate: Number(i.tax_rate || 0),
              tax_amount: Number(i.tax_amount || 0),
              total_amount: Number(i.total_amount),
              batch_number: i.batch_number || null
            }))
          } : undefined
        }
      });
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

invoicesRouter.patch('/:id/status', async (req, res) => {
  try {
    await prisma.salesInvoice.update({ where: { invoice_id: Number(req.params.id) }, data: { status: String(req.body.status) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

invoicesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.salesInvoice.delete({ where: { invoice_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});