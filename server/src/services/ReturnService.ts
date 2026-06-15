import { prisma } from '../index';
import { DocumentSeriesService } from './DocumentSeriesService';
import { AuditService } from './AuditService';
import { ReturnRepository } from '../repositories/ReturnRepository';

export class ReturnService {
  private static returnRepo = new ReturnRepository();

  static async getSalesReturns() {
    return this.returnRepo.findSalesReturns();
  }

  static async getPurchaseReturns() {
    return this.returnRepo.findPurchaseReturns();
  }
  /**
   * Executes a customer sales return (Credit Note).
   * Increments inventory, creates reversing ledger entries, and writes audit logs.
   */
  static async executeSalesReturn(invoiceId: number, items: { part_id: number; quantity: number }[], userId: number) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch original invoice & items
      const invoice = await tx.salesInvoice.findUnique({
        where: { invoice_id: invoiceId },
        include: { items: true, customer: true }
      });
      if (!invoice) throw new Error('Original Sales Invoice not found');

      // Check return quantities against original items
      for (const retItem of items) {
        const origItem = invoice.items.find(i => i.part_id === Number(retItem.part_id));
        if (!origItem) {
          throw new Error(`Part ID ${retItem.part_id} was not purchased in this invoice`);
        }
        if (Number(retItem.quantity) <= 0) {
          throw new Error('Return quantity must be greater than zero');
        }
        
        // Fetch previously returned quantity for this part in this invoice
        const prevReturns = await tx.salesReturn.findMany({
          where: { invoice_id: invoiceId },
          include: { items: true }
        });
        const totalPrevQty = prevReturns.reduce((sum: number, r: any) => {
          const matched = r.items.find((i: any) => i.part_id === Number(retItem.part_id));
          return sum + (matched ? Number(matched.quantity) : 0);
        }, 0);

        if (totalPrevQty + Number(retItem.quantity) > Number(origItem.quantity)) {
          throw new Error(
            `Cannot return ${retItem.quantity} units. Original: ${origItem.quantity}, previously returned: ${totalPrevQty}`
          );
        }
      }

      // 2. Generate sequential Sales Return number
      const returnNumber = await DocumentSeriesService.generateNextNumber('SalesReturn', tx);

      // 3. Compute return amounts
      let totalAmount = 0;
      let taxAmount = 0;

      const returnItemsData = [];
      for (const retItem of items) {
        const origItem = invoice.items.find(i => i.part_id === Number(retItem.part_id))!;
        const price = Number(origItem.unit_price);
        const taxRate = Number(origItem.tax_rate);
        
        const lineTotal = Number(retItem.quantity) * price;
        const lineTax = lineTotal * (taxRate / 100);
        
        totalAmount += lineTotal;
        taxAmount += lineTax;

        returnItemsData.push({
          part_id: Number(retItem.part_id),
          quantity: Number(retItem.quantity),
          unit_price: price,
          tax_rate: taxRate,
          tax_amount: lineTax,
          total_amount: lineTotal
        });
      }
      const grandTotal = totalAmount + taxAmount;

      // 4. Create Sales Return record
      const salesReturn = await tx.salesReturn.create({
        data: {
          return_number: returnNumber,
          invoice_id: invoiceId,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          created_by: userId,
          items: {
            create: returnItemsData
          }
        },
        include: { items: true }
      });

      // 5. Adjust Inventory & Stock Movements
      // Default location is 1 (Main Warehouse)
      const locationId = 1; 
      for (const retItem of returnItemsData) {
        await tx.partStock.upsert({
          where: {
            part_id_location_id: {
              part_id: retItem.part_id,
              location_id: locationId
            }
          },
          update: { quantity: { increment: retItem.quantity } },
          create: {
            part_id: retItem.part_id,
            location_id: locationId,
            quantity: retItem.quantity
          }
        });

        await tx.stockMovement.create({
          data: {
            partId: retItem.part_id,
            locationId,
            movementType: 'RETURN_IN',
            quantity: retItem.quantity,
            referenceType: 'SalesReturn',
            referenceId: salesReturn.return_id
          }
        });
      }

      // 6. Post double-entry ledger reversing entries
      const salesAccount = await tx.account.findUnique({ where: { code: '401000' } });
      const creditCode = invoice.status === 'paid' ? '101000' : '104000';
      const creditAccount = await tx.account.findUnique({ where: { code: creditCode } });

      if (salesAccount && creditAccount && grandTotal > 0) {
        const je = await tx.journalEntry.create({
          data: {
            entry_date: salesReturn.return_date,
            description: `Sales Return - Credit Note #${returnNumber} for Invoice #${invoice.invoice_number}`,
            reference_type: 'SalesReturn',
            reference_id: salesReturn.return_id
          }
        });

        await tx.journalEntryLine.createMany({
          data: [
            {
              entry_id: je.entry_id,
              account_id: salesAccount.account_id, // Debit Sales (revenue reduction)
              amount: grandTotal,
              entry_type: 'debit'
            },
            {
              entry_id: je.entry_id,
              account_id: creditAccount.account_id, // Credit Cash/Receivable
              amount: grandTotal,
              entry_type: 'credit'
            }
          ]
        });
      }

      // 7. Audit Log
      await AuditService.log(
        userId,
        null,
        'CREATE',
        'SalesReturn',
        salesReturn.return_id,
        null,
        salesReturn
      );

      return salesReturn;
    });
  }

  /**
   * Executes a vendor purchase return (Debit Note).
   * Decrements inventory (verifies availability), creates reversing ledger entries, and writes audit logs.
   */
  static async executePurchaseReturn(poId: number, items: { part_id: number; quantity: number }[], userId: number) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch original purchase order & items
      const po = await tx.purchaseOrder.findUnique({
        where: { po_id: poId },
        include: { items: true, supplier: true }
      });
      if (!po) throw new Error('Original Purchase Order not found');

      // Check return quantities and stock availability
      const locationId = 1; // Default warehouse
      for (const retItem of items) {
        const origItem = po.items.find(i => i.part_id === Number(retItem.part_id));
        if (!origItem) {
          throw new Error(`Part ID ${retItem.part_id} was not ordered in this PO`);
        }
        if (Number(retItem.quantity) <= 0) {
          throw new Error('Return quantity must be greater than zero');
        }

        // Fetch previously returned quantity for this part in this PO
        const prevReturns = await tx.purchaseReturn.findMany({
          where: { po_id: poId },
          include: { items: true }
        });
        const totalPrevQty = prevReturns.reduce((sum: number, r: any) => {
          const matched = r.items.find((i: any) => i.part_id === Number(retItem.part_id));
          return sum + (matched ? Number(matched.quantity) : 0);
        }, 0);

        if (totalPrevQty + Number(retItem.quantity) > Number(origItem.quantity)) {
          throw new Error(
            `Cannot return ${retItem.quantity} units. Original: ${origItem.quantity}, previously returned: ${totalPrevQty}`
          );
        }

        // Check stock availability in the warehouse
        const stockRow = await tx.partStock.findUnique({
          where: {
            part_id_location_id: {
              part_id: Number(retItem.part_id),
              location_id: locationId
            }
          }
        });
        const available = stockRow ? Number(stockRow.quantity) : 0;
        if (available < Number(retItem.quantity)) {
          throw new Error(
            `Insufficient stock to return. Available: ${available}, requested return: ${retItem.quantity}`
          );
        }
      }

      // 2. Generate sequential Purchase Return number
      const returnNumber = await DocumentSeriesService.generateNextNumber('PurchaseReturn', tx);

      // 3. Compute return amounts
      let totalAmount = 0;
      const returnItemsData = [];
      for (const retItem of items) {
        const origItem = po.items.find(i => i.part_id === Number(retItem.part_id))!;
        const price = Number(origItem.unit_price);
        const lineTotal = Number(retItem.quantity) * price;
        totalAmount += lineTotal;

        returnItemsData.push({
          part_id: Number(retItem.part_id),
          quantity: Number(retItem.quantity),
          unit_price: price,
          total_amount: lineTotal
        });
      }

      // 4. Create Purchase Return record
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          return_number: returnNumber,
          po_id: poId,
          total_amount: totalAmount,
          created_by: userId,
          items: {
            create: returnItemsData
          }
        },
        include: { items: true }
      });

      // 5. Adjust Inventory & Stock Movements
      for (const retItem of returnItemsData) {
        await tx.partStock.update({
          where: {
            part_id_location_id: {
              part_id: retItem.part_id,
              location_id: locationId
            }
          },
          data: { quantity: { decrement: retItem.quantity } }
        });

        await tx.stockMovement.create({
          data: {
            partId: retItem.part_id,
            locationId,
            movementType: 'RETURN_OUT',
            quantity: -retItem.quantity,
            referenceType: 'PurchaseReturn',
            referenceId: purchaseReturn.return_id
          }
        });
      }

      // 6. Post double-entry ledger reversing entries
      const apAccount = await tx.account.findUnique({ where: { code: '201000' } });
      const inventoryAccount = await tx.account.findUnique({ where: { code: '103000' } });

      if (apAccount && inventoryAccount && totalAmount > 0) {
        const je = await tx.journalEntry.create({
          data: {
            entry_date: purchaseReturn.return_date,
            description: `Purchase Return - Debit Note #${returnNumber} for PO #${po.po_number}`,
            reference_type: 'PurchaseReturn',
            reference_id: purchaseReturn.return_id
          }
        });

        await tx.journalEntryLine.createMany({
          data: [
            {
              entry_id: je.entry_id,
              account_id: apAccount.account_id, // Debit Accounts Payable (liability reduction)
              amount: totalAmount,
              entry_type: 'debit'
            },
            {
              entry_id: je.entry_id,
              account_id: inventoryAccount.account_id, // Credit Inventory Asset
              amount: totalAmount,
              entry_type: 'credit'
            }
          ]
        });
      }

      // 7. Audit Log
      await AuditService.log(
        userId,
        null,
        'CREATE',
        'PurchaseReturn',
        purchaseReturn.return_id,
        null,
        purchaseReturn
      );

      return purchaseReturn;
    });
  }
}