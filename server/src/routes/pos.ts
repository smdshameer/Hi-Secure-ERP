import { Router } from 'express';
import { prisma } from '../index';

export const posRouter = Router();

// Process POS Checkout
posRouter.post('/checkout', async (req, res) => {
  try {
    const { customerId: reqCustomerId, customerName, customerPhone, customerGstin, paymentMode, items } = req.body;
    
    let customerId: number | null = null;
    const parsedId = reqCustomerId ? Number(reqCustomerId) : null;

    if (parsedId && parsedId > 0) {
      const customer = await prisma.customer.findUnique({
        where: { customer_id: parsedId }
      });
      if (customer) {
        customerId = customer.customer_id;
      }
    }

    if (!customerId && customerPhone) {
      const customerByPhone = await prisma.customer.findFirst({
        where: { phone: customerPhone }
      });
      if (customerByPhone) {
        customerId = customerByPhone.customer_id;
      }
    }

    if (!customerId && customerName) {
      const customerByName = await prisma.customer.findFirst({
        where: { name: { equals: customerName, mode: 'insensitive' } }
      });
      if (customerByName) {
        customerId = customerByName.customer_id;
      } else {
        const phoneVal = customerPhone || `99999${Math.floor(10000 + Math.random() * 90000)}`;
        let finalPhone = phoneVal;
        let phoneExists = await prisma.customer.findFirst({ where: { phone: finalPhone } });
        while (phoneExists) {
          finalPhone = `99999${Math.floor(10000 + Math.random() * 90000)}`;
          phoneExists = await prisma.customer.findFirst({ where: { phone: finalPhone } });
        }
        
        const newCust = await prisma.customer.create({
          data: {
            name: customerName,
            customer_code: `CUST-${Date.now().toString().slice(-6)}`,
            phone: finalPhone,
            gstin: customerGstin || null,
            customer_type: 'retail'
          }
        });
        customerId = newCust.customer_id;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoiceNumber = `INV-POS-${Date.now().toString().slice(-8)}`;
      
      let subtotal = 0;
      let taxAmount = 0;
      const invoiceItemsData = [];
      
      for (const item of items) {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice);
        const itemTax = lineTotal * (Number(item.taxRate || 0) / 100);
        subtotal += lineTotal;
        taxAmount += itemTax;
        
        invoiceItemsData.push({
          part_id: Number(item.productId),
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          tax_rate: Number(item.taxRate || 0),
          tax_amount: itemTax,
          total_amount: lineTotal + itemTax
        });
      }
      
      const calculatedGrandTotal = subtotal + taxAmount;
      
      // Create Sales Invoice
      const invoice = await tx.salesInvoice.create({
        data: {
          invoice_number: invoiceNumber,
          customer_id: customerId,
          invoice_date: new Date(),
          due_date: null,
          place_of_supply: 'TN',
          tax_type: 'CGST_SGST',
          total_amount: subtotal,
          tax_amount: taxAmount,
          grand_total: calculatedGrandTotal,
          cgst_amount: taxAmount / 2,
          sgst_amount: taxAmount / 2,
          igst_amount: 0,
          status: 'paid',
          notes: `POS checkout payment mode: ${paymentMode}`,
          items: {
            create: invoiceItemsData
          }
        }
      });
      
      // Update inventory stock levels
      for (const item of items) {
        await tx.parts.update({
          where: { part_id: Number(item.productId) },
          data: {
            stock_quantity: {
              decrement: Number(item.quantity)
            }
          }
        });
      }
      
      // Create Accounting Entry
      await tx.accountingEntry.create({
        data: {
          entry_date: new Date(),
          account_type: 'sales',
          description: `POS sale payment (${paymentMode}) - Invoice ${invoiceNumber}`,
          amount: calculatedGrandTotal,
          entry_type: 'credit',
          reference_type: 'SalesInvoice',
          reference_id: invoice.invoice_id
        }
      });
      
      // Create Bank/Cash Transaction
      if (paymentMode === 'cash') {
        await tx.bankTransaction.create({
          data: {
            transaction_date: new Date(),
            bank_name: 'Cash',
            account_number: 'Cash',
            transaction_type: 'credit',
            amount: calculatedGrandTotal,
            description: `POS checkout cash payment - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            status: 'completed'
          }
        });
      } else {
        await tx.bankTransaction.create({
          data: {
            transaction_date: new Date(),
            bank_name: paymentMode.toUpperCase(),
            account_number: paymentMode.toUpperCase(),
            transaction_type: 'credit',
            amount: calculatedGrandTotal,
            description: `POS checkout ${paymentMode} payment - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            status: 'completed'
          }
        });
      }
      
      return invoice;
    });

    return res.status(201).json({ success: true, invoice: result });
  } catch (err) {
    console.error('POS Checkout error:', err);
    return res.status(500).json({ error: 'Checkout transaction failed' });
  }
});

posRouter.post('/sessions', async (req, res) => {
  try {
    const session = await prisma.posSession.create({
      data: { counter_id: req.body.counter_id || 'COUNTER-1', opening_cash: Number(req.body.opening_cash || 0) },
      select: { session_id: true, counter_id: true }
    });
    return res.status(201).json(session);
  } catch (err) {
    console.error('POS create session error:', err);
    return res.status(500).json({ error: 'Failed to start session' });
  }
});

posRouter.get('/sessions/current', async (_req, res) => {
  try {
    const session = await prisma.posSession.findFirst({ where: { closed: false }, orderBy: { created_at: 'desc' } });
    return res.json(session ?? { session_id: null, message: 'No active session' });
  } catch (err: any) {
    if (err.code === 'P2021') return res.json({ session_id: null, message: 'POS not configured' });
    console.error('POS get session error:', err);
    return res.status(500).json({ error: 'Failed to get session' });
  }
});

posRouter.post('/transactions', async (req, res) => {
  try {
    const tx = await prisma.posTransaction.create({
      data: {
        session_id: Number(req.body.session_id),
        invoice_number: `POS-${Date.now()}`,
        customer_id: req.body.customer_id ? Number(req.body.customer_id) : null,
        subtotal: Number(req.body.subtotal),
        tax_amount: Number(req.body.tax_amount || 0),
        discount: Number(req.body.discount || 0),
        total: Number(req.body.total),
        cash_received: Number(req.body.cash_received || 0),
        change_given: Number(req.body.change_given || 0),
        payment_method: req.body.payment_method || 'cash',
        items_json: req.body.items_json || [],
      },
    });
    return res.status(201).json(tx);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

posRouter.get('/transactions', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const txs = await prisma.posTransaction.findMany({
      where: sessionId ? { session_id: Number(sessionId) } : undefined,
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return res.json(txs);
  } catch (err: any) {
    if (err.code === 'P2021') return res.json([]);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});