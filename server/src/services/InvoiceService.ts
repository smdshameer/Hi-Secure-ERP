import { InvoiceRepository } from '../repositories/InvoiceRepository';
import { prisma } from '../index';

export class InvoiceService {
  private invoiceRepo = new InvoiceRepository();

  async getInvoices(query: any) {
    const { status, customer_id, from_date, to_date, search, limit } = query;
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
    if (search) {
      where.OR = [
        { invoice_number: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { customer: { name: { contains: String(search), mode: 'insensitive' } } },
        { customer: { phone: { contains: String(search), mode: 'insensitive' } } }
      ];
    }
    const take = limit ? Number(limit) : 100;
    return this.invoiceRepo.findMany(where, take);
  }

  async getInvoiceById(id: number) {
    return this.invoiceRepo.findById(id);
  }

  async createInvoice(data: any, userId?: number) {
    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      let calculatedTax = 0;
      if (data.items && data.items.length) {
        data.items.forEach((i: any) => {
          totalAmount += Number(i.quantity) * Number(i.unit_price);
          calculatedTax += Number(i.tax_amount || 0);
        });
      }
      const grandTotal = totalAmount + calculatedTax;

      const invoice = await tx.salesInvoice.create({
        data: {
          customer_id: Number(data.customer_id),
          invoice_number: data.invoice_number || undefined,
          invoice_date: data.invoice_date ? new Date(data.invoice_date) : new Date(),
          due_date: data.due_date ? new Date(data.due_date) : null,
          place_of_supply: data.place_of_supply || null,
          tax_type: data.tax_type || null,
          total_amount: totalAmount,
          tax_amount: calculatedTax,
          grand_total: grandTotal,
          cgst_amount: data.cgst_amount ? Number(data.cgst_amount) : 0,
          sgst_amount: data.sgst_amount ? Number(data.sgst_amount) : 0,
          igst_amount: data.igst_amount ? Number(data.igst_amount) : 0,
          status: data.status || 'draft',
          notes: data.notes || null,
          created_by: userId || null,
          items: data.items?.length ? {
            create: data.items.map((i: any) => ({
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

      if (invoice.status === 'paid' || invoice.status === 'issued') {
        await this.postInvoiceLedgerAndInventory(invoice.invoice_id, tx);
      }

      return invoice;
    });
  }

  async updateInvoice(id: number, data: any) {
    return prisma.$transaction(async (tx) => {
      // Revert ledger/stock allocations first
      await this.reverseInvoiceLedgerAndInventory(id, tx);

      // Delete old items
      await tx.salesInvoiceItems.deleteMany({ where: { invoice_id: id } });

      let totalAmount = 0;
      let calculatedTax = 0;
      if (data.items && data.items.length) {
        data.items.forEach((i: any) => {
          totalAmount += Number(i.quantity) * Number(i.unit_price);
          calculatedTax += Number(i.tax_amount || 0);
        });
      }
      const grandTotal = totalAmount + calculatedTax;

      const invoice = await tx.salesInvoice.update({
        where: { invoice_id: id },
        data: {
          customer_id: data.customer_id ? Number(data.customer_id) : undefined,
          invoice_number: data.invoice_number || undefined,
          invoice_date: data.invoice_date ? new Date(data.invoice_date) : undefined,
          due_date: data.due_date ? new Date(data.due_date) : null,
          place_of_supply: data.place_of_supply || null,
          tax_type: data.tax_type || null,
          total_amount: totalAmount,
          tax_amount: calculatedTax,
          grand_total: grandTotal,
          cgst_amount: data.cgst_amount ? Number(data.cgst_amount) : 0,
          sgst_amount: data.sgst_amount ? Number(data.sgst_amount) : 0,
          igst_amount: data.igst_amount ? Number(data.igst_amount) : 0,
          status: data.status || 'draft',
          notes: data.notes || null,
          items: data.items?.length ? {
            create: data.items.map((i: any) => ({
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

      if (invoice.status === 'paid' || invoice.status === 'issued') {
        await this.postInvoiceLedgerAndInventory(invoice.invoice_id, tx);
      }

      return invoice;
    });
  }

  async updateStatus(id: number, status: string) {
    return prisma.$transaction(async (tx) => {
      // Revert previous allocations
      await this.reverseInvoiceLedgerAndInventory(id, tx);

      const invoice = await tx.salesInvoice.update({
        where: { invoice_id: id },
        data: { status }
      });

      if (status === 'paid' || status === 'issued') {
        await this.postInvoiceLedgerAndInventory(id, tx);
      }

      return invoice;
    });
  }

  async deleteInvoice(id: number) {
    return prisma.$transaction(async (tx) => {
      await this.reverseInvoiceLedgerAndInventory(id, tx);
      return tx.salesInvoice.delete({
        where: { invoice_id: id }
      });
    });
  }

  // Helper: Post ledger & adjust inventory
  private async postInvoiceLedgerAndInventory(invoiceId: number, tx: any) {
    const invoice = await tx.salesInvoice.findUnique({
      where: { invoice_id: invoiceId },
      include: { items: true }
    });
    if (!invoice) return;

    // Check if journal entry already exists
    const existingJE = await tx.journalEntry.findFirst({
      where: { reference_type: 'SalesInvoice', reference_id: invoiceId }
    });

    if (!existingJE) {
      // 1. Decrement stock for invoice items and log stock movements
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          const part = await tx.parts.findUnique({
            where: { part_id: item.part_id }
          });
          if (!part) throw new Error(`Product ID ${item.part_id} not found`);

          const partStock = await tx.partStock.findUnique({
            where: {
              part_id_location_id: {
                part_id: item.part_id,
                location_id: 1 // default main location
              }
            }
          });

          const currentStock = Number(partStock?.quantity ?? 0);
          const requestedQty = Number(item.quantity);
          if (currentStock < requestedQty) {
            throw new Error(`Insufficient stock for "${part.name}": available ${currentStock}, requested ${requestedQty}`);
          }

          await tx.partStock.update({
            where: {
              part_id_location_id: {
                part_id: item.part_id,
                location_id: 1
              }
            },
            data: { quantity: { decrement: requestedQty } }
          });

          await tx.stockMovement.create({
            data: {
              partId: item.part_id,
              locationId: 1,
              movementType: 'SALE',
              quantity: -requestedQty,
              referenceType: 'SalesInvoice',
              referenceId: invoiceId
            }
          });
        }
      }

      // 2. Post journal entry
      const grandTotal = Number(invoice.grand_total || 0);
      const debitCode = invoice.status === 'paid' ? '101000' : '104000';
      const debitAccount = await tx.account.findUnique({ where: { code: debitCode } });
      const salesAccount = await tx.account.findUnique({ where: { code: '401000' } });

      if (debitAccount && salesAccount && grandTotal > 0) {
        const je = await tx.journalEntry.create({
          data: {
            entry_date: invoice.invoice_date,
            description: `Sales Invoice - Invoice #${invoice.invoice_number || invoiceId}`,
            reference_type: 'SalesInvoice',
            reference_id: invoiceId
          }
        });

        await tx.journalEntryLine.createMany({
          data: [
            {
              entry_id: je.entry_id,
              account_id: debitAccount.account_id,
              amount: grandTotal,
              entry_type: 'debit'
            },
            {
              entry_id: je.entry_id,
              account_id: salesAccount.account_id,
              amount: grandTotal,
              entry_type: 'credit'
            }
          ]
        });
      }
    }
  }

  // Helper: Reverse ledger & restore inventory
  private async reverseInvoiceLedgerAndInventory(invoiceId: number, tx: any) {
    // 1. Revert stock movements and increment stock
    const movements = await tx.stockMovement.findMany({
      where: { referenceType: 'SalesInvoice', referenceId: invoiceId }
    });
    for (const move of movements) {
      const locId = move.locationId || 1;
      await tx.partStock.upsert({
        where: {
          part_id_location_id: {
            part_id: move.partId,
            location_id: locId
          }
        },
        update: { quantity: { increment: Math.abs(move.quantity) } },
        create: {
          part_id: move.partId,
          location_id: locId,
          quantity: Math.abs(move.quantity)
        }
      });
    }
    await tx.stockMovement.deleteMany({
      where: { referenceType: 'SalesInvoice', referenceId: invoiceId }
    });

    // 2. Delete journal entry
    await tx.journalEntry.deleteMany({
      where: { reference_type: 'SalesInvoice', reference_id: invoiceId }
    });
  }
}