import { RepairRepository } from '../repositories/RepairRepository';
import { prisma } from '../index';

export class RepairService {
  private repairRepo = new RepairRepository();

  async getRepairs(query: any) {
    const { status, search } = query;
    let sql = `
      SELECT r.repair_id, r.ticket_number, r.product_type, r.serial_number,
             r.model_number, r.problem_description, r.repair_status,
             r.estimated_cost, r.actual_cost, r.received_date, r.warranty_status, r.notes,
             c.customer_id, c.name as customer_name, c.phone as customer_phone,
             b.brand_id, b.name as brand_name,
             t.technician_id, t.name as technician_name
       FROM repairs r
       LEFT JOIN customers c ON r.customer_id = c.customer_id
       LEFT JOIN brands b ON r.brand_id = b.brand_id
       LEFT JOIN technicians t ON r.assigned_technician_id = t.technician_id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];

    if (!status || status === 'all') {
      conditions.push(`r.repair_status::text NOT IN ('completed', 'cancelled')`);
    } else {
      params.push(status);
      conditions.push(`r.repair_status::text = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const sIndex = `$${params.length}`;
      conditions.push(`(
        r.ticket_number ILIKE ${sIndex} OR
        r.product_type ILIKE ${sIndex} OR
        r.serial_number ILIKE ${sIndex} OR
        r.model_number ILIKE ${sIndex} OR
        r.problem_description ILIKE ${sIndex} OR
        r.notes ILIKE ${sIndex} OR
        c.name ILIKE ${sIndex} OR
        c.phone ILIKE ${sIndex}
      )`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY r.received_date DESC`;
    const repairs = await this.repairRepo.queryRaw(sql, params);
    
    return (repairs as any[]).map(r => ({
      repair_id: r.repair_id, ticket_number: r.ticket_number, product_type: r.product_type,
      serial_number: r.serial_number, model_number: r.model_number,
      problem_description: r.problem_description, repair_status: r.repair_status,
      estimated_cost: r.estimated_cost, actual_cost: r.actual_cost,
      received_date: r.received_date, warranty_status: r.warranty_status, notes: r.notes,
      customer: r.customer_id ? { customer_id: r.customer_id, name: r.customer_name, phone: r.customer_phone } : null,
      brand: r.brand_id ? { brand_id: r.brand_id, name: r.brand_name } : null,
      assigned_technician: r.technician_id ? { technician_id: r.technician_id, name: r.technician_name } : null,
    }));
  }

  async getRepairById(id: number) {
    return this.repairRepo.findById(id);
  }

  async createRepair(data: any, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const repair = await tx.repair.create({
        data: {
          customer_id: Number(data.customer_id),
          product_type: data.product_type,
          brand_id: data.brand_id ? Number(data.brand_id) : null,
          serial_number: data.serial_number || null,
          model_number: data.model_number || null,
          problem_description: data.problem_description,
          estimated_cost: data.estimated_cost ? Number(data.estimated_cost) : null,
          actual_cost: data.actual_cost ? Number(data.actual_cost) : 0,
          warranty_status: data.warranty_status === 'on' || Boolean(data.warranty_status),
          notes: data.notes || null,
          assigned_technician_id: data.assigned_technician_id ? Number(data.assigned_technician_id) : null,
          repair_status: data.repair_status || 'received'
        }
      });

      // Log to RepairEvent timeline
      await tx.repairEvent.create({
        data: {
          repair_id: repair.repair_id,
          status: repair.repair_status,
          user_id: userId || null,
          notes: 'Repair ticket created/received.'
        }
      });

      if (repair.repair_status === 'completed') {
        await this.postRepairLedgerAndInventory(repair.repair_id, tx);
      }

      return repair;
    });
  }

  async updateRepair(id: number, data: any, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.repair.findUnique({ where: { repair_id: id } });
      if (!existing) throw new Error('Repair not found');

      // Revert previous allocations
      await this.reverseRepairLedgerAndInventory(id, tx);

      const statusData: any = {};
      if (data.repair_status) {
        statusData.repair_status = data.repair_status;
        if (data.repair_status === 'diagnosed') statusData.diagnosed_date = new Date();
        if (data.repair_status === 'in_repair') statusData.repair_start_date = new Date();
        if (data.repair_status === 'completed') statusData.completion_date = new Date();
        if (data.repair_status === 'ready_for_pickup') statusData.pickup_date = new Date();
      }

      const repair = await tx.repair.update({
        where: { repair_id: id },
        data: {
          customer_id: Number(data.customer_id),
          product_type: data.product_type,
          brand_id: data.brand_id ? Number(data.brand_id) : null,
          serial_number: data.serial_number || null,
          model_number: data.model_number || null,
          problem_description: data.problem_description,
          estimated_cost: data.estimated_cost ? Number(data.estimated_cost) : null,
          warranty_status: data.warranty_status === 'on' || Boolean(data.warranty_status),
          notes: data.notes || null,
          assigned_technician_id: data.assigned_technician_id ? Number(data.assigned_technician_id) : null,
          actual_cost: data.actual_cost ? Number(data.actual_cost) : undefined,
          ...statusData
        }
      });

      // Log status changes to RepairEvent timeline
      if (data.repair_status && data.repair_status !== existing.repair_status) {
        await tx.repairEvent.create({
          data: {
            repair_id: id,
            status: data.repair_status,
            user_id: userId || null,
            notes: data.notes || `Status updated to ${data.repair_status}.`
          }
        });
      }

      if (repair.repair_status === 'completed') {
        await this.postRepairLedgerAndInventory(repair.repair_id, tx);
      }

      return repair;
    });
  }

  async updateStatus(id: number, status: string, userId?: number) {
    return prisma.$transaction(async (tx) => {
      // Revert previous allocations
      await this.reverseRepairLedgerAndInventory(id, tx);

      const data: any = { repair_status: status };
      if (status === 'diagnosed') data.diagnosed_date = new Date();
      if (status === 'in_repair') data.repair_start_date = new Date();
      if (status === 'completed') data.completion_date = new Date();
      if (status === 'ready_for_pickup') data.pickup_date = new Date();

      const repair = await tx.repair.update({
        where: { repair_id: id },
        data
      });

      // Log to RepairEvent timeline
      await tx.repairEvent.create({
        data: {
          repair_id: id,
          status,
          user_id: userId || null,
          notes: `Status updated to ${status}.`
        }
      });

      if (status === 'completed') {
        await this.postRepairLedgerAndInventory(id, tx);
      }

      return repair;
    });
  }

  async deleteRepair(id: number) {
    return prisma.$transaction(async (tx) => {
      await this.reverseRepairLedgerAndInventory(id, tx);
      return tx.repair.delete({
        where: { repair_id: id }
      });
    });
  }

  async getBrands() {
    return prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { brand_id: true, name: true } });
  }

  async getTechnicians() {
    return prisma.technician.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { technician_id: true, name: true, specialization: true }
    });
  }

  // Helper: Post repair billing & stock movements
  private async postRepairLedgerAndInventory(repairId: number, tx: any) {
    const repair = await tx.repair.findUnique({
      where: { repair_id: repairId },
      include: { parts: true }
    });
    if (!repair) return;

    // Check if journal entry already exists
    const existingJE = await tx.journalEntry.findFirst({
      where: { reference_type: 'Repair', reference_id: repairId }
    });

    if (!existingJE) {
      // 1. Decrement stock for repair parts and log stock movements at default main location (location_id = 1)
      if (repair.parts && repair.parts.length > 0) {
        for (const item of repair.parts) {
          const part = await tx.parts.findUnique({
            where: { part_id: item.part_id }
          });
          if (!part) continue;

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
            throw new Error(`Insufficient stock for part "${part.name}" on Repair Ticket #${repair.ticket_number}. Available: ${currentStock}, requested: ${requestedQty}`);
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
              movementType: 'REPAIR',
              quantity: -requestedQty,
              referenceType: 'Repair',
              referenceId: repairId
            }
          });
        }
      }

      // 2. Post journal entry for repair billing (actual_cost)
      const actualCost = Number(repair.actual_cost || 0);
      if (actualCost > 0) {
        const cashAccount = await tx.account.findUnique({ where: { code: '101000' } });
        const salesAccount = await tx.account.findUnique({ where: { code: '401000' } });
        if (cashAccount && salesAccount) {
          const je = await tx.journalEntry.create({
            data: {
              entry_date: new Date(),
              description: `Repair completed - Ticket #${repair.ticket_number}`,
              reference_type: 'Repair',
              reference_id: repairId
            }
          });

          await tx.journalEntryLine.createMany({
            data: [
              {
                entry_id: je.entry_id,
                account_id: cashAccount.account_id,
                amount: actualCost,
                entry_type: 'debit'
              },
              {
                entry_id: je.entry_id,
                account_id: salesAccount.account_id,
                amount: actualCost,
                entry_type: 'credit'
              }
            ]
          });
        }
      }
    }
  }

  // Helper: Reverse repair ledger & restore inventory
  private async reverseRepairLedgerAndInventory(repairId: number, tx: any) {
    // 1. Revert stock movements
    const movements = await tx.stockMovement.findMany({
      where: { referenceType: 'Repair', referenceId: repairId }
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
      where: { referenceType: 'Repair', referenceId: repairId }
    });

    // 2. Delete journal entry
    await tx.journalEntry.deleteMany({
      where: { reference_type: 'Repair', reference_id: repairId }
    });
  }
}