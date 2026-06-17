import { PurchaseRepository } from '../repositories/PurchaseRepository';
import { PartsRepository } from '../repositories/PartsRepository';
import { prisma } from '../index';
import { GstService } from './GstService';

export class PurchaseService {
  private purchaseRepo = new PurchaseRepository();
  private partsRepo = new PartsRepository();

  async getPurchases(query: any) {
    const { status, supplier_id, search } = query;
    const where: any = {};
    if (status) where.status = String(status);
    if (supplier_id) where.supplier_id = Number(supplier_id);
    if (search) {
      where.OR = [
        { po_number: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { supplier: { name: { contains: String(search), mode: 'insensitive' } } },
        { supplier: { phone: { contains: String(search), mode: 'insensitive' } } }
      ];
    }
    return this.purchaseRepo.findMany(where);
  }

  async getPurchaseById(id: number) {
    return this.purchaseRepo.findById(id);
  }

  async createPurchase(data: any, userId?: number) {
    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      if (data.items && data.items.length) {
        data.items.forEach((i: any) => {
          totalAmount += Number(i.quantity) * Number(i.unit_price);
        });
      }

      let status = data.status || 'draft';
      // If PO exceeds ₹50,000 threshold and is not a draft, enforce pending approval
      if (status !== 'draft' && status !== 'pending_approval' && totalAmount >= 50000) {
        status = 'pending_approval';
      }

      const po = await tx.purchaseOrder.create({
        data: {
          supplier_id: Number(data.supplier_id),
          order_date: data.order_date ? new Date(data.order_date) : new Date(),
          expected_delivery: data.expected_delivery ? new Date(data.expected_delivery) : null,
          notes: data.notes || null,
          total_amount: totalAmount,
          status: status,
          created_by: userId || null,
          items: data.items?.length ? {
            create: data.items.map((i: any) => ({
              part_id: Number(i.part_id),
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              total_amount: Number(i.quantity) * Number(i.unit_price),
              batch_number: i.batch_number || null,
              expiration_date: i.expiration_date ? new Date(i.expiration_date) : null
            }))
          } : undefined
        }
      });

      if (po.status === 'received') {
        await this.postPurchaseLedgerAndInventory(po.po_id, tx);
      }

      const { BusinessEventService } = require('./BusinessEventService');
      await BusinessEventService.logEvent({
        event_type: po.status === 'received' ? 'Purchase Received' : 'PO Created',
        entity_type: 'PurchaseOrder',
        entity_id: po.po_id,
        user_id: userId || null,
        description: `Purchase Order ${po.po_number || po.po_id} created with total Rs. ${Number(po.total_amount).toFixed(2)} (Status: ${po.status})`
      });

      return po;
    });
  }

  async updatePurchase(id: number, data: any) {
    return prisma.$transaction(async (tx) => {
      // Revert previous ledger/stock modifications
      await this.reversePurchaseLedgerAndInventory(id, tx);

      let totalAmount = 0;
      if (data.items && data.items.length) {
        data.items.forEach((i: any) => {
          totalAmount += Number(i.quantity) * Number(i.unit_price);
        });
      }

      let status = data.status;
      if (status !== 'draft' && status !== 'approved' && status !== 'pending_approval' && totalAmount >= 50000) {
        status = 'pending_approval';
      }

      const po = await tx.purchaseOrder.update({
        where: { po_id: id },
        data: {
          supplier_id: Number(data.supplier_id),
          order_date: data.order_date ? new Date(data.order_date) : undefined,
          expected_delivery: data.expected_delivery ? new Date(data.expected_delivery) : null,
          status: status,
          notes: data.notes || null,
          total_amount: totalAmount,
          items: data.items?.length ? {
            create: data.items.map((i: any) => ({
              part_id: Number(i.part_id),
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              total_amount: Number(i.quantity) * Number(i.unit_price),
              batch_number: i.batch_number || null,
              expiration_date: i.expiration_date ? new Date(i.expiration_date) : null
            }))
          } : undefined
        }
      });

      if (po.status === 'received') {
        // Enforce approval for received orders
        if (Number(po.total_amount) >= 50000 && (po.status as string) !== 'approved' && data.status !== 'approved') {
          // If marked received but not approved, double-check if we need to fail
          throw new Error('Cannot receive this purchase order. It exceeds ₹50,000 and has not been approved.');
        }
        await this.postPurchaseLedgerAndInventory(po.po_id, tx);
      }

      return po;
    });
  }

  async updateStatus(id: number, newStatus: string) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { po_id: id }
      });
      if (!po) throw new Error('Purchase order not found');

      // Enforce approvals threshold check
      if ((newStatus === 'received' || newStatus === 'ordered') && po.status !== 'approved' && Number(po.total_amount) >= 50000) {
        throw new Error(`Cannot transition to "${newStatus}" status. This Purchase Order exceeds the threshold of ₹50,000 and must be approved first.`);
      }

      // Revert previous allocations
      await this.reversePurchaseLedgerAndInventory(id, tx);

      const updatedPo = await tx.purchaseOrder.update({
        where: { po_id: id },
        data: { status: newStatus }
      });

      if (newStatus === 'received') {
        await this.postPurchaseLedgerAndInventory(id, tx);
      }

      const { BusinessEventService } = require('./BusinessEventService');
      let eventType = 'PO Updated';
      if (newStatus === 'approved') eventType = 'PO Approved';
      else if (newStatus === 'received') eventType = 'Purchase Received';

      await BusinessEventService.logEvent({
        event_type: eventType,
        entity_type: 'PurchaseOrder',
        entity_id: id,
        description: `Purchase Order ID ${id} transitioned to status: ${newStatus}`
      });

      return updatedPo;
    });
  }

  async deletePurchase(id: number) {
    return prisma.$transaction(async (tx) => {
      await this.reversePurchaseLedgerAndInventory(id, tx);
      return tx.purchaseOrder.delete({
        where: { po_id: id }
      });
    });
  }

  // Helper: post purchase ledger & adjust inventory
  private async postPurchaseLedgerAndInventory(poId: number, tx: any) {
    const po = await tx.purchaseOrder.findUnique({
      where: { po_id: poId },
      include: { items: true, supplier: true }
    });
    if (!po) return;

    const existingJE = await tx.journalEntry.findFirst({
      where: { reference_type: 'PurchaseOrder', reference_id: poId }
    });

    if (!existingJE) {
      if (po.items && po.items.length > 0) {
        for (const item of po.items) {
          // Increment stock in main warehouse (location_id = 1)
          await tx.partStock.upsert({
            where: {
              part_id_location_id: {
                part_id: item.part_id,
                location_id: 1
              }
            },
            update: { quantity: { increment: item.quantity } },
            create: {
              part_id: item.part_id,
              location_id: 1,
              quantity: item.quantity
            }
          });

          await tx.stockMovement.create({
            data: {
              partId: item.part_id,
              locationId: 1,
              movementType: 'PURCHASE',
              quantity: item.quantity,
              referenceType: 'PurchaseOrder',
              referenceId: poId
            }
          });
        }
      }

      // Fetch accounts or seed them as fallback
      let inventoryAccount = await tx.account.findFirst({
        where: { OR: [{ code: '1004' }, { name: 'Inventory Asset' }] }
      });
      let gstInputAccount = await tx.account.findFirst({
        where: { OR: [{ code: '1005' }, { name: 'GST Input Credit' }] }
      });
      let apAccount = await tx.account.findFirst({
        where: { OR: [{ code: '2001' }, { name: 'Accounts Payable' }] }
      });

      if (!inventoryAccount) {
        inventoryAccount = await tx.account.create({ data: { code: '1004', name: 'Inventory Asset', type: 'ASSET', is_active: true } });
      }
      if (!gstInputAccount) {
        gstInputAccount = await tx.account.create({ data: { code: '1005', name: 'GST Input Credit', type: 'ASSET', is_active: true } });
      }
      if (!apAccount) {
        apAccount = await tx.account.create({ data: { code: '2001', name: 'Accounts Payable', type: 'LIABILITY', is_active: true } });
      }

      const supplierGstin = po.supplier?.gstin || '';
      let isSameState = true;
      const company = await tx.company.findFirst({ where: { is_active: true } });
      if (company?.gstin && supplierGstin) {
        const compPrefix = company.gstin.trim().substring(0, 2);
        const supplierPrefix = supplierGstin.trim().substring(0, 2);
        if (compPrefix && supplierPrefix && compPrefix !== supplierPrefix) {
          isSameState = false;
        }
      }

      const je = await tx.journalEntry.create({
        data: {
          entry_date: po.order_date,
          description: `PO received - Order #${po.po_number || poId}`,
          reference_type: 'PurchaseOrder',
          reference_id: poId
        }
      });

      if (po.items && po.items.length > 0) {
        for (const item of po.items) {
          const part = await tx.parts.findUnique({ where: { part_id: item.part_id } });
          const taxRate = Number(part?.tax_rate ?? 0);
          const hsn = part?.hsn_code || '';
          const itemTaxableValue = Number(item.unit_price) * item.quantity;
          const gstResult = GstService.calculateGst(itemTaxableValue, taxRate, isSameState);
          const itemGst = gstResult.cgst_amount + gstResult.sgst_amount + gstResult.igst_amount;
          const itemTotal = itemTaxableValue + itemGst;

          // Debit Inventory Asset
          await tx.journalEntryLine.create({
            data: {
              entry_id: je.entry_id,
              account_id: inventoryAccount.account_id,
              amount: itemTaxableValue,
              entry_type: 'debit'
            }
          });

          // Debit GST Input Credit (if tax exists)
          if (itemGst > 0) {
            const gstLine = await tx.journalEntryLine.create({
              data: {
                entry_id: je.entry_id,
                account_id: gstInputAccount.account_id,
                amount: itemGst,
                entry_type: 'debit'
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
              gstin: supplierGstin,
              transaction_type: 'INPUT'
            });
          }

          // Credit Accounts Payable
          await tx.journalEntryLine.create({
            data: {
              entry_id: je.entry_id,
              account_id: apAccount.account_id,
              amount: itemTotal,
              entry_type: 'credit'
            }
          });
        }
      }
    }
  }

  // Helper: reverse purchase ledger & restore inventory
  private async reversePurchaseLedgerAndInventory(poId: number, tx: any) {
    const movements = await tx.stockMovement.findMany({
      where: { referenceType: 'PurchaseOrder', referenceId: poId }
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

    for (const key of Object.keys(netMovements)) {
      const { partId, locationId, netQty } = netMovements[key];
      if (netQty === 0) continue;

      const reverseQty = -netQty;

      const partStock = await tx.partStock.findUnique({
        where: {
          part_id_location_id: {
            part_id: partId,
            location_id: locationId
          }
        }
      });

      if (partStock) {
        const currentQty = Number(partStock.quantity || 0);
        const newQty = Math.max(0, currentQty + reverseQty);
        await tx.partStock.update({
          where: {
            part_id_location_id: {
              part_id: partId,
              location_id: locationId
            }
          },
          data: { quantity: newQty }
        });
      }

      await tx.stockMovement.create({
        data: {
          partId: partId,
          locationId: locationId,
          movementType: 'REVERSAL',
          quantity: reverseQty,
          referenceType: 'PurchaseOrder',
          referenceId: poId
        }
      });
    }

    // 2. Post Reversing Journal Entries instead of deleting
    const existingJEs = await tx.journalEntry.findMany({
      where: { reference_type: 'PurchaseOrder', reference_id: poId },
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
          reference_type: 'PurchaseOrder',
          reference_id: poId
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