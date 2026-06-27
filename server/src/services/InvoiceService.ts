import { InvoiceRepository } from '../repositories/InvoiceRepository';
import { prisma } from '../index';
import { GstService } from './GstService';
import { DocumentSeriesService } from './DocumentSeriesService';

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

  async createInvoice(data: any, userId?: number, tx?: any) {
    const execute = async (currentTx: any) => {
      let totalAmount = 0;
      let calculatedTax = 0;
      if (data.items && data.items.length) {
        data.items.forEach((i: any) => {
          totalAmount += Number(i.quantity) * Number(i.unit_price);
          calculatedTax += Number(i.tax_amount || 0);
        });
      }
      const grandTotal = totalAmount + calculatedTax;

      // Generate invoice number if not provided or empty
      let invoiceNumber = data.invoice_number;
      if (!invoiceNumber || invoiceNumber.trim() === '') {
        invoiceNumber = await DocumentSeriesService.generateNextNumber('Invoice', currentTx);
      }

      const invoice = await currentTx.salesInvoice.create({
        data: {
          customer_id: Number(data.customer_id),
          invoice_number: invoiceNumber,
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
        await this.postInvoiceLedgerAndInventory(invoice.invoice_id, currentTx);
      }

      const { BusinessEventService } = require('./BusinessEventService');
      await BusinessEventService.logEvent({
        event_type: 'Invoice Created',
        entity_type: 'SalesInvoice',
        entity_id: invoice.invoice_id,
        user_id: userId || null,
        description: `Invoice ${invoice.invoice_number || invoice.invoice_id} created with grand total Rs. ${Number(invoice.grand_total).toFixed(2)}`
      });

      return invoice;
    };

    if (tx) {
      return execute(tx);
    } else {
      return prisma.$transaction(async (newTx) => {
        return execute(newTx);
      });
    }
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
      const deleted = await tx.salesInvoice.delete({
        where: { invoice_id: id }
      });

      const { BusinessEventService } = require('./BusinessEventService');
      await BusinessEventService.logEvent({
        event_type: 'Invoice Cancelled',
        entity_type: 'SalesInvoice',
        entity_id: id,
        description: `Invoice ID ${id} was deleted/cancelled.`
      });

      return deleted;
    });
  }

  // Helper: Post ledger & adjust inventory
  private async postInvoiceLedgerAndInventory(invoiceId: number, tx: any) {
    const invoice = await tx.salesInvoice.findUnique({
      where: { invoice_id: invoiceId },
      include: { items: true, customer: true }
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
      // Fetch accounts or seed them as fallback
      let arAccount = await tx.account.findFirst({
        where: { OR: [{ code: '1003' }, { name: 'Accounts Receivable' }] }
      });
      let salesAccount = await tx.account.findFirst({
        where: { OR: [{ code: '4001' }, { name: 'Sales Revenue' }] }
      });
      let gstOutputAccount = await tx.account.findFirst({
        where: { OR: [{ code: '2002' }, { name: 'GST Output Liability' }] }
      });

      if (!arAccount) {
        arAccount = await tx.account.create({ data: { code: '1003', name: 'Accounts Receivable', type: 'ASSET', is_active: true } });
      }
      if (!salesAccount) {
        salesAccount = await tx.account.create({ data: { code: '4001', name: 'Sales Revenue', type: 'REVENUE', is_active: true } });
      }
      if (!gstOutputAccount) {
        gstOutputAccount = await tx.account.create({ data: { code: '2002', name: 'GST Output Liability', type: 'LIABILITY', is_active: true } });
      }

      const customerGstin = invoice.customer?.gstin || '';
      let isSameState = true;
      const company = await tx.company.findFirst({ where: { is_active: true } });
      if (company?.gstin && customerGstin) {
        const compPrefix = company.gstin.trim().substring(0, 2);
        const customerPrefix = customerGstin.trim().substring(0, 2);
        if (compPrefix && customerPrefix && compPrefix !== customerPrefix) {
          isSameState = false;
        }
      }

      const je = await tx.journalEntry.create({
        data: {
          entry_date: invoice.invoice_date,
          description: `Sales Invoice - Invoice #${invoice.invoice_number || invoiceId}`,
          reference_type: 'SalesInvoice',
          reference_id: invoiceId
        }
      });

      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          const part = await tx.parts.findUnique({ where: { part_id: item.part_id } });
          const taxRate = Number(item.tax_rate ?? part?.tax_rate ?? 0);
          const hsn = part?.hsn_code || '';
          const itemTaxableValue = Number(item.unit_price) * item.quantity;
          const gstResult = GstService.calculateGst(itemTaxableValue, taxRate, isSameState);
          const itemGst = gstResult.cgst_amount + gstResult.sgst_amount + gstResult.igst_amount;
          const itemTotal = itemTaxableValue + itemGst;

          // Debit Accounts Receivable
          await tx.journalEntryLine.create({
            data: {
              entry_id: je.entry_id,
              account_id: arAccount.account_id,
              amount: itemTotal,
              entry_type: 'debit'
            }
          });

          // Credit Sales Revenue
          await tx.journalEntryLine.create({
            data: {
              entry_id: je.entry_id,
              account_id: salesAccount.account_id,
              amount: itemTaxableValue,
              entry_type: 'credit'
            }
          });

          // Credit GST Output Liability (if tax exists)
          if (itemGst > 0) {
            const gstLine = await tx.journalEntryLine.create({
              data: {
                entry_id: je.entry_id,
                account_id: gstOutputAccount.account_id,
                amount: itemGst,
                entry_type: 'credit'
              }
            });

            // Record GstTransaction
            await GstService.recordGstTransaction(tx, {
              line_id: gstLine.line_id,
              hsn_sac_code: hsn,
              taxable_value: itemTaxableValue,
              cgst_rate: gstResult.cgst_rate,
              cgst_amount: gstResult.cgst_amount,
              sgst_rate: gstResult.sgst_rate,
              sgst_amount: gstResult.sgst_amount,
              igst_rate: gstResult.igst_rate,
              igst_amount: gstResult.igst_amount,
              gstin: customerGstin,
              transaction_type: 'OUTPUT'
            });
          }
        }
      }
    }
  }

  // Helper: Reverse ledger & restore inventory
  private async reverseInvoiceLedgerAndInventory(invoiceId: number, tx: any) {
    // 1. Calculate net stock movements and create reversing entries
    const movements = await tx.stockMovement.findMany({
      where: { referenceType: 'SalesInvoice', referenceId: invoiceId }
    });

    // Group by partId and locationId to calculate net quantity
    const netMovements: { [key: string]: { partId: number, locationId: number, netQty: number } } = {};
    for (const move of movements) {
      const locId = move.locationId || 1;
      const key = `${move.partId}_${locId}`;
      if (!netMovements[key]) {
        netMovements[key] = { partId: move.partId, locationId: locId, netQty: 0 };
      }
      netMovements[key].netQty += Number(move.quantity);
    }

    // For each non-zero net movement, create a reversing entry (REVERSAL) and adjust stock
    for (const key of Object.keys(netMovements)) {
      const { partId, locationId, netQty } = netMovements[key];
      if (netQty === 0) continue;

      const reverseQty = -netQty;

      await tx.partStock.upsert({
        where: {
          part_id_location_id: {
            part_id: partId,
            location_id: locationId
          }
        },
        update: { quantity: { increment: reverseQty } },
        create: {
          part_id: partId,
          location_id: locationId,
          quantity: reverseQty >= 0 ? reverseQty : 0
        }
      });

      await tx.stockMovement.create({
        data: {
          partId: partId,
          locationId: locationId,
          movementType: 'REVERSAL',
          quantity: reverseQty,
          referenceType: 'SalesInvoice',
          referenceId: invoiceId
        }
      });
    }

    // 2. Post Reversing Journal Entries instead of deleting
    const existingJEs = await tx.journalEntry.findMany({
      where: { reference_type: 'SalesInvoice', reference_id: invoiceId },
      include: { lines: { include: { gstTransaction: true } } }
    });

    for (const je of existingJEs) {
      if (je.description?.startsWith('Reversal of ')) continue;

      const revDescription = `Reversal of Journal Entry #${je.entry_id} - ${je.description || ''}`;
      const alreadyReversed = await tx.journalEntry.findFirst({
        where: { description: revDescription }
      });
      if (alreadyReversed) continue;

      const newJe = await tx.journalEntry.create({
        data: {
          entry_date: new Date(),
          description: revDescription,
          reference_type: 'SalesInvoice',
          reference_id: invoiceId
        }
      });

      for (const line of je.lines) {
        const revLine = await tx.journalEntryLine.create({
          data: {
            entry_id: newJe.entry_id,
            account_id: line.account_id,
            amount: line.amount,
            entry_type: line.entry_type === 'debit' ? 'credit' : 'debit'
          }
        });

        if (line.gstTransaction) {
          await tx.gstTransaction.create({
            data: {
              line_id: revLine.line_id,
              hsn_sac_code: line.gstTransaction.hsn_sac_code,
              taxable_value: line.gstTransaction.taxable_value,
              cgst_rate: line.gstTransaction.cgst_rate,
              cgst_amount: line.gstTransaction.cgst_amount,
              sgst_rate: line.gstTransaction.sgst_rate,
              sgst_amount: line.gstTransaction.sgst_amount,
              igst_rate: line.gstTransaction.igst_rate,
              igst_amount: line.gstTransaction.igst_amount,
              gstin: line.gstTransaction.gstin,
              transaction_type: line.gstTransaction.transaction_type
            }
          });
        }
      }
    }
  }
}