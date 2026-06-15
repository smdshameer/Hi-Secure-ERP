import { PurchaseRepository } from '../repositories/PurchaseRepository';
import { PartsRepository } from '../repositories/PartsRepository';
import { prisma } from '../index';

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
      include: { items: true }
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

      const totalAmount = Number(po.total_amount || 0);
      const inventoryAccount = await tx.account.findUnique({ where: { code: '103000' } });
      const apAccount = await tx.account.findUnique({ where: { code: '201000' } });

      if (inventoryAccount && apAccount && totalAmount > 0) {
        const je = await tx.journalEntry.create({
          data: {
            entry_date: po.order_date,
            description: `PO received - Order #${po.po_number || poId}`,
            reference_type: 'PurchaseOrder',
            reference_id: poId
          }
        });

        await tx.journalEntryLine.createMany({
          data: [
            {
              entry_id: je.entry_id,
              account_id: inventoryAccount.account_id,
              amount: totalAmount,
              entry_type: 'debit'
            },
            {
              entry_id: je.entry_id,
              account_id: apAccount.account_id,
              amount: totalAmount,
              entry_type: 'credit'
            }
          ]
        });
      }
    }
  }

  // Helper: reverse purchase ledger & restore inventory
  private async reversePurchaseLedgerAndInventory(poId: number, tx: any) {
    const movements = await tx.stockMovement.findMany({
      where: { referenceType: 'PurchaseOrder', referenceId: poId }
    });
    for (const move of movements) {
      const locId = move.locationId || 1;
      const partStock = await tx.partStock.findUnique({
        where: {
          part_id_location_id: {
            part_id: move.partId,
            location_id: locId
          }
        }
      });
      if (partStock) {
        const currentStock = Number(partStock.quantity || 0);
        const newQty = Math.max(0, currentStock - Math.abs(move.quantity));
        await tx.partStock.update({
          where: {
            part_id_location_id: {
              part_id: move.partId,
              location_id: locId
            }
          },
          data: { quantity: newQty }
        });
      }
    }
    await tx.stockMovement.deleteMany({
      where: { referenceType: 'PurchaseOrder', referenceId: poId }
    });

    await tx.journalEntry.deleteMany({
      where: { reference_type: 'PurchaseOrder', reference_id: poId }
    });
  }
}