import { prisma } from '../index';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { PartsRepository } from '../repositories/PartsRepository';

export class PosService {
  private customerRepo = new CustomerRepository();
  private partsRepo = new PartsRepository();

  async checkout(checkoutData: any) {
    const { customerId: reqCustomerId, customerName, customerPhone, customerGstin, paymentMode, items } = checkoutData;
    
    let customerId: number | null = null;
    const parsedId = reqCustomerId ? Number(reqCustomerId) : null;

    if (parsedId && parsedId > 0) {
      const customer = await this.customerRepo.findById(parsedId);
      if (customer) {
        customerId = customer.customer_id;
      }
    }

    if (!customerId && customerPhone) {
      const customers = await this.customerRepo.findMany({ phone: customerPhone }, 1);
      if (customers.length > 0) {
        customerId = customers[0].customer_id;
      }
    }

    if (!customerId && customerName) {
      const customers = await this.customerRepo.findMany({ name: { equals: customerName, mode: 'insensitive' } }, 1);
      if (customers.length > 0) {
        customerId = customers[0].customer_id;
      } else {
        const phoneVal = customerPhone || `99999${Math.floor(10000 + Math.random() * 90000)}`;
        let finalPhone = phoneVal;
        let phoneExists = await this.customerRepo.findMany({ phone: finalPhone }, 1);
        while (phoneExists.length > 0) {
          finalPhone = `99999${Math.floor(10000 + Math.random() * 90000)}`;
          phoneExists = await this.customerRepo.findMany({ phone: finalPhone }, 1);
        }
        
        const newCust = await this.customerRepo.create({
          name: customerName,
          customer_code: `CUST-${Date.now().toString().slice(-6)}`,
          phone: finalPhone,
          gstin: customerGstin || null,
          customer_type: 'retail'
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
      
      // Location Resolution Strategy:
      // 1. POS Session Location
      // 2. Branch Location
      // 3. Company Default Location
      // Fallback of location_id = 1
      let resolvedLocationId = 1;
      if (checkoutData.locationId) {
        resolvedLocationId = Number(checkoutData.locationId);
      } else if (checkoutData.location_id) {
        resolvedLocationId = Number(checkoutData.location_id);
      } else {
        const currentSession = await tx.posSession.findFirst({
          where: { closed: false },
          orderBy: { created_at: 'desc' }
        });
        if (currentSession && (currentSession as any).location_id) {
          resolvedLocationId = Number((currentSession as any).location_id);
        } else {
          const companySetting = await tx.setting.findUnique({ where: { key: 'company' } });
          const branchSetting = await tx.setting.findUnique({ where: { key: 'branch' } });
          if (branchSetting && (branchSetting.value as any)?.default_location_id) {
            resolvedLocationId = Number((branchSetting.value as any).default_location_id);
          } else if (companySetting && (companySetting.value as any)?.default_location_id) {
            resolvedLocationId = Number((companySetting.value as any).default_location_id);
          }
        }
      }
      if (!resolvedLocationId || isNaN(resolvedLocationId)) {
        resolvedLocationId = 1;
      }

      // Verify and update inventory stock levels atomically
      for (const item of items) {
        const productId = Number(item.productId);
        const requestedQty = Number(item.quantity);

        const part = await tx.parts.findUnique({
          where: { part_id: productId },
          select: { name: true },
        });
        if (!part) {
          throw new Error(`Product ID ${productId} not found`);
        }

        const partStock = await tx.partStock.findUnique({
          where: {
            part_id_location_id: {
              part_id: productId,
              location_id: resolvedLocationId
            }
          }
        });
        const currentStock = partStock ? Number(partStock.quantity) : 0;

        const updateResult = await tx.partStock.updateMany({
          where: {
            part_id: productId,
            location_id: resolvedLocationId,
            quantity: { gte: requestedQty }
          },
          data: { quantity: { decrement: requestedQty } }
        });

        if (updateResult.count === 0) {
          throw new Error(
            `Insufficient stock for "${part.name}": available ${currentStock}, requested ${requestedQty}`
          );
        }

        await tx.stockMovement.create({
          data: {
            partId: productId,
            locationId: resolvedLocationId,
            movementType: 'SALE',
            quantity: -requestedQty,
            referenceType: 'SalesInvoice',
            referenceId: invoice.invoice_id
          }
        });
      }
      
      // Create Double-Entry Journal Entry
      const cashAccount = await tx.account.findUnique({ where: { code: '101000' } });
      const salesAccount = await tx.account.findUnique({ where: { code: '401000' } });

      if (cashAccount && salesAccount) {
        const je = await tx.journalEntry.create({
          data: {
            entry_date: new Date(),
            description: `POS sale payment (${paymentMode}) - Invoice ${invoiceNumber}`,
            reference_type: 'SalesInvoice',
            reference_id: invoice.invoice_id
          }
        });

        await tx.journalEntryLine.createMany({
          data: [
            {
              entry_id: je.entry_id,
              account_id: cashAccount.account_id,
              amount: calculatedGrandTotal,
              entry_type: 'debit'
            },
            {
              entry_id: je.entry_id,
              account_id: salesAccount.account_id,
              amount: calculatedGrandTotal,
              entry_type: 'credit'
            }
          ]
        });
      }
      
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

    return result;
  }

  async createSession(counterId: string, openingCash: number) {
    return prisma.posSession.create({
      data: { counter_id: counterId, opening_cash: openingCash },
      select: { session_id: true, counter_id: true }
    });
  }

  async getCurrentSession() {
    return prisma.posSession.findFirst({
      where: { closed: false },
      orderBy: { created_at: 'desc' }
    });
  }

  async createTransaction(data: any) {
    return prisma.posTransaction.create({
      data: {
        session_id: Number(data.session_id),
        invoice_number: `POS-${Date.now()}`,
        customer_id: data.customer_id ? Number(data.customer_id) : null,
        subtotal: Number(data.subtotal),
        tax_amount: Number(data.tax_amount || 0),
        discount: Number(data.discount || 0),
        total: Number(data.total),
        cash_received: Number(data.cash_received || 0),
        change_given: Number(data.change_given || 0),
        payment_method: data.payment_method || 'cash',
        items_json: data.items_json || [],
      },
    });
  }

  async getTransactions(sessionId?: number) {
    return prisma.posTransaction.findMany({
      where: sessionId ? { session_id: sessionId } : undefined,
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }
}