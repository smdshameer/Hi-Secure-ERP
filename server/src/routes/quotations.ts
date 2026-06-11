import { Router } from 'express';
import { prisma } from '../index';

export const quotationsRouter = Router();

quotationsRouter.get('/', async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (customer_id) where.customer_id = Number(customer_id);
    if (search) {
      where.OR = [
        { quote_number: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { customer: { name: { contains: String(search), mode: 'insensitive' } } },
        { customer: { phone: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const quotations = await prisma.quotation.findMany({
      where,
      include: { customer: { select: { name: true, phone: true } }, _count: { select: { items: true } } },
      orderBy: { quote_date: 'desc' },
    });
    res.json(quotations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

quotationsRouter.get('/:id', async (req, res) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { quote_id: Number(req.params.id) },
      include: { customer: true, items: { include: { part: true } }, createdBy: { select: { full_name: true } } },
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

quotationsRouter.post('/', async (req, res) => {
  try {
    const { customer_id, quote_date, valid_until, terms, notes, items } = req.body;
    const quotation = await prisma.quotation.create({
      data: {
        customer_id: Number(customer_id),
        quote_date: quote_date ? new Date(quote_date) : new Date(),
        valid_until: new Date(valid_until),
        terms: terms || 'This quotation is valid for 30 days from the date of issue.',
        notes: notes || null,
        items: items?.length ? { create: items.map((i: any) => ({ part_id: Number(i.part_id), quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount_percent: Number(i.discount_percent || 0), tax_rate: Number(i.tax_rate || 0), total: Number(i.total) })) } : undefined,
      },
      select: { quote_id: true, quote_number: true, total_amount: true },
    });
    res.status(201).json(quotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

quotationsRouter.put('/:id', async (req, res) => {
  try {
    const { customer_id, quote_date, valid_until, terms, notes, status, items } = req.body;
    const quoteId = Number(req.params.id);
    
    await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.quotationItems.deleteMany({ where: { quote_id: quoteId } });
      
      // Calculate totals
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let totalAmount = 0;
      
      if (items && items.length) {
        items.forEach((i: any) => {
          const qty = Number(i.quantity || 1);
          const price = Number(i.unit_price || 0);
          const disc = Number(i.discount_percent || 0);
          const taxRate = Number(i.tax_rate || 0);
          
          const lineSub = qty * price;
          const lineDisc = lineSub * (disc / 100);
          const lineTaxable = lineSub - lineDisc;
          const lineTax = lineTaxable * (taxRate / 100);
          const lineTotal = lineTaxable + lineTax;
          
          subtotal += lineSub;
          totalDiscount += lineDisc;
          totalTax += lineTax;
          totalAmount += lineTotal;
        });
      }
      
      // Update quotation header and recreate items
      await tx.quotation.update({
        where: { quote_id: quoteId },
        data: {
          customer_id: customer_id ? Number(customer_id) : undefined,
          quote_date: quote_date ? new Date(quote_date) : undefined,
          valid_until: valid_until ? new Date(valid_until) : undefined,
          terms,
          notes: notes || null,
          status,
          subtotal,
          total_discount: totalDiscount,
          total_tax: totalTax,
          total_amount: totalAmount,
          items: items?.length ? {
            create: items.map((i: any) => ({
              part_id: Number(i.part_id),
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              discount_percent: Number(i.discount_percent || 0),
              tax_rate: Number(i.tax_rate || 0),
              total: Number(i.total)
            }))
          } : undefined
        }
      });
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

quotationsRouter.patch('/:id/status', async (req, res) => {
  try {
    await prisma.quotation.update({ where: { quote_id: Number(req.params.id) }, data: { status: String(req.body.status) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

quotationsRouter.post('/:id/convert', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quotation = await prisma.quotation.findUnique({
      where: { quote_id: id },
      include: { items: true, customer: true }
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    
    // Create sales invoice
    const invoice = await prisma.salesInvoice.create({
      data: {
        customer_id: quotation.customer_id,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 15 * 86400000), // 15 days default
        place_of_supply: quotation.customer?.state || null,
        tax_type: 'gst',
        status: 'draft',
        notes: `Converted from Quotation: ${quotation.quote_number}`,
        items: {
          create: quotation.items.map(i => {
            const qty = Number(i.quantity);
            const rate = Number(i.unit_price);
            const discPercent = Number(i.discount_percent || 0);
            const taxRate = Number(i.tax_rate || 0);
            
            const discountedRate = rate * (1 - discPercent / 100);
            const taxable = qty * discountedRate;
            const tax = taxable * (taxRate / 100);
            const total = taxable + tax;
            
            return {
              part_id: i.part_id,
              quantity: qty,
              unit_price: discountedRate,
              tax_rate: taxRate,
              tax_amount: tax,
              total_amount: total
            };
          })
        }
      }
    });

    // Update quotation status
    await prisma.quotation.update({
      where: { quote_id: id },
      data: {
        status: 'converted',
        converted_to_invoice_id: invoice.invoice_id
      }
    });

    res.json({ success: true, invoiceId: invoice.invoice_id });
  } catch (err) {
    console.error('Convert quote error:', err);
    res.status(500).json({ error: 'Failed to convert quotation to invoice' });
  }
});

quotationsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.quotation.delete({ where: { quote_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});