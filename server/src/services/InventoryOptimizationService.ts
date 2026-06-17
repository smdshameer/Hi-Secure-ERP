import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';
import { DocumentSeriesService } from './DocumentSeriesService';
import { WarehouseService } from './WarehouseService';

export class InventoryOptimizationService {

  // ── ABC INVENTORY CLASSIFICATION ────────────────────────────────────────
  async getAbcClassification() {
    const parts = await prisma.parts.findMany({
      where: { is_active: true },
      include: { stocks: true }
    });

    // Calculate total value for each part
    const items = parts.map((p: any) => {
      const qty = p.stocks.reduce((sum: number, s: any) => sum + s.quantity, 0);
      const cost = Number(p.cost_price || 0);
      const totalValuation = qty * cost;
      return {
        part_id: p.part_id,
        part_number: p.part_number,
        name: p.name,
        stock_quantity: qty,
        cost_price: cost,
        total_valuation: totalValuation
      };
    });

    // Sort descending by valuation
    items.sort((a, b) => b.total_valuation - a.total_valuation);

    const grandTotalValuation = items.reduce((sum, item) => sum + item.total_valuation, 0);

    let cumulativeValuation = 0;
    const classifiedItems = items.map((item) => {
      cumulativeValuation += item.total_valuation;
      const cumulativePercentage = grandTotalValuation > 0 ? (cumulativeValuation / grandTotalValuation) * 100 : 0;

      let classification: 'A' | 'B' | 'C' = 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        ...item,
        cumulative_percentage: cumulativePercentage,
        classification
      };
    });

    return {
      grand_total_valuation: grandTotalValuation,
      items: classifiedItems
    };
  }

  // ── INVENTORY VALUATION ────────────────────────────────────────────────
  async getValuationReport() {
    const warehouses = await prisma.location.findMany({
      include: {
        stocks: {
          include: {
            part: true
          }
        }
      }
    });

    let systemTotalValuation = 0;
    const warehouseValuations = warehouses.map((wh) => {
      let whValuation = 0;
      const stockItems = wh.stocks.map((s) => {
        const cost = Number(s.part.cost_price || 0);
        const itemValuation = s.quantity * cost;
        whValuation += itemValuation;
        return {
          part_id: s.part_id,
          part_number: s.part.part_number,
          name: s.part.name,
          quantity: s.quantity,
          cost_price: cost,
          valuation: itemValuation
        };
      });

      systemTotalValuation += whValuation;
      return {
        location_id: wh.location_id,
        location_code: wh.location_code,
        name: wh.name,
        total_valuation: whValuation,
        items: stockItems
      };
    });

    return {
      system_total_valuation: systemTotalValuation,
      warehouses: warehouseValuations
    };
  }

  // ── FIFO-BASED STOCK AGING ANALYSIS ──────────────────────────────────────
  async getStockAgingAnalysis() {
    const stocks = await prisma.partStock.findMany({
      include: { part: true, location: true }
    });

    const now = new Date();
    const result = [];

    for (const stock of stocks) {
      let remainingQty = stock.quantity;
      if (remainingQty <= 0) continue;

      // Initialize buckets
      let bucket0_30 = 0;
      let bucket31_60 = 0;
      let bucket61_90 = 0;
      let bucket90Plus = 0;

      // Fetch positive stock movements (receipts, positive adjustments, etc.)
      const movements = await prisma.stockMovement.findMany({
        where: {
          partId: stock.part_id,
          locationId: stock.location_id,
          quantity: { gt: 0 }
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const move of movements) {
        if (remainingQty <= 0) break;

        const moveQty = move.quantity;
        const allocatedQty = Math.min(remainingQty, moveQty);
        remainingQty -= allocatedQty;

        const diffTime = Math.abs(now.getTime() - move.createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          bucket0_30 += allocatedQty;
        } else if (diffDays <= 60) {
          bucket31_60 += allocatedQty;
        } else if (diffDays <= 90) {
          bucket61_90 += allocatedQty;
        } else {
          bucket90Plus += allocatedQty;
        }
      }

      // If there is still quantity without positive movements, allocate it to oldest bucket
      if (remainingQty > 0) {
        bucket90Plus += remainingQty;
      }

      const cost = Number(stock.part.cost_price || 0);
      result.push({
        part_id: stock.part_id,
        part_number: stock.part.part_number,
        name: stock.part.name,
        location_id: stock.location_id,
        location_name: stock.location.name,
        total_quantity: stock.quantity,
        cost_price: cost,
        total_valuation: stock.quantity * cost,
        buckets: {
          '0_30_days': bucket0_30,
          '31_60_days': bucket31_60,
          '61_90_days': bucket61_90,
          '90_plus_days': bucket90Plus
        }
      });
    }

    return result;
  }

  // ── DEAD STOCK DETECTION ────────────────────────────────────────────────
  async getDeadStockReport(daysThreshold = 180) {
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - daysThreshold);

    const stocks = await prisma.partStock.findMany({
      where: { quantity: { gt: 0 } },
      include: { part: true, location: true }
    });

    const deadStockItems = [];

    for (const stock of stocks) {
      // Find any movements in the period
      const recentMovement = await prisma.stockMovement.findFirst({
        where: {
          partId: stock.part_id,
          locationId: stock.location_id,
          createdAt: { gte: cutOffDate }
        }
      });

      if (!recentMovement) {
        const cost = Number(stock.part.cost_price || 0);
        deadStockItems.push({
          part_id: stock.part_id,
          part_number: stock.part.part_number,
          name: stock.part.name,
          location_id: stock.location_id,
          location_name: stock.location.name,
          quantity: stock.quantity,
          cost_price: cost,
          valuation: stock.quantity * cost,
          last_movement_at: null
        });
      }
    }

    return deadStockItems;
  }

  // ── REORDER SUGGESTIONS & AUTO PURCHASE SUGGESTIONS ──────────────────────
  async getReorderSuggestions() {
    const parts = await prisma.parts.findMany({
      where: { is_active: true },
      include: { stocks: true }
    });

    const suggestions = [];

    for (const part of parts) {
      const physicalQty = part.stocks.reduce((sum: number, s: any) => sum + s.quantity, 0);

      // Fetch active reservations
      const activeReservations = await prisma.stockReservation.findMany({
        where: { part_id: part.part_id, status: 'ACTIVE' }
      });
      const reservedQty = activeReservations.reduce((sum: number, r: any) => sum + r.quantity, 0);
      const availableQty = physicalQty - reservedQty;

      if (availableQty <= part.reorder_level) {
        // Find a default supplier: look at the last Purchase Order for this part
        const lastPoi = await prisma.purchaseOrderItems.findFirst({
          where: { part_id: part.part_id },
          orderBy: { po_id: 'desc' },
          include: { purchaseOrder: true }
        });

        let supplier_id = null;
        let supplier_name = 'Unknown Supplier';

        if (lastPoi?.purchaseOrder) {
          supplier_id = lastPoi.purchaseOrder.supplier_id;
          const supplier = await prisma.supplier.findUnique({ where: { supplier_id } });
          supplier_name = supplier ? supplier.name : 'Unknown Supplier';
        } else {
          // Fallback to first supplier in system
          const firstSupplier = await prisma.supplier.findFirst({ where: { is_active: true } });
          if (firstSupplier) {
            supplier_id = firstSupplier.supplier_id;
            supplier_name = firstSupplier.name;
          }
        }

        const cost = Number(part.cost_price || 0);
        const suggestedOrderQty = Math.max(part.reorder_level * 2, 10);

        suggestions.push({
          part_id: part.part_id,
          part_number: part.part_number,
          name: part.name,
          physical_quantity: physicalQty,
          reserved_quantity: reservedQty,
          available_quantity: availableQty,
          reorder_level: part.reorder_level,
          suggested_order_qty: suggestedOrderQty,
          cost_price: cost,
          estimated_cost: suggestedOrderQty * cost,
          supplier_id,
          supplier_name
        });
      }
    }

    return suggestions;
  }

  // ── CYCLE COUNTING WORKFLOW ──────────────────────────────────────────────
  async createCycleCount(locationId: number, partIds: number[], plannedDate: Date, countedBy?: number, notes?: string) {
    const count_number = await DocumentSeriesService.generateNextNumber('CycleCount');

    const items = [];
    for (const partId of partIds) {
      const stock = await prisma.partStock.findUnique({
        where: { part_id_location_id: { part_id: partId, location_id: locationId } }
      });
      const expected_qty = stock ? Number(stock.quantity) : 0;
      items.push({
        part_id: partId,
        expected_qty,
        status: 'PENDING'
      });
    }

    return prisma.cycleCount.create({
      data: {
        count_number,
        location_id: locationId,
        status: 'PLANNED',
        planned_date: plannedDate,
        counted_by: countedBy || null,
        notes: notes || null,
        items: {
          create: items
        }
      },
      include: { items: true }
    });
  }

  async startCycleCount(countId: number) {
    const count = await prisma.cycleCount.findUnique({ where: { count_id: countId } });
    if (!count) throw new Error('CYCLE_COUNT_NOT_FOUND');
    if (count.status !== 'PLANNED') throw new Error(`INVALID_TRANSITION: Cannot start a cycle count in status ${count.status}`);

    return prisma.cycleCount.update({
      where: { count_id: countId },
      data: { status: 'IN_PROGRESS' }
    });
  }

  async recordCountItem(countId: number, partId: number, countedQty: number) {
    const item = await prisma.cycleCountItem.findFirst({
      where: { count_id: countId, part_id: partId }
    });

    if (!item) throw new Error('CYCLE_COUNT_ITEM_NOT_FOUND');

    const variance = countedQty - item.expected_qty;

    return prisma.cycleCountItem.update({
      where: { item_id: item.item_id },
      data: {
        counted_qty: countedQty,
        variance,
        status: 'COUNTED'
      }
    });
  }

  async submitCycleCount(countId: number, userId: number) {
    const count = await prisma.cycleCount.findUnique({
      where: { count_id: countId },
      include: { items: true }
    });

    if (!count) throw new Error('CYCLE_COUNT_NOT_FOUND');
    if (count.status !== 'IN_PROGRESS') {
      throw new Error(`INVALID_TRANSITION: Cannot submit cycle count in status ${count.status}`);
    }

    // Verify all items have been counted
    const uncounted = count.items.some(i => i.status === 'PENDING');
    if (uncounted) {
      throw new Error('UNCOUNTED_ITEMS: All planned parts must be counted before submission.');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.cycleCount.update({
        where: { count_id: countId },
        data: { status: 'PENDING_APPROVAL' }
      });

      await BusinessEventService.logEvent({
        event_type: 'CYCLE_COUNT_SUBMITTED',
        entity_type: 'CycleCount',
        entity_id: countId,
        user_id: userId,
        description: `Cycle count ${count.count_number} submitted for approval.`
      }, tx);

      return updated;
    });
  }

  async approveCycleCount(countId: number, approvedBy: number) {
    return prisma.$transaction(async (tx) => {
      const count = await tx.cycleCount.findUnique({
        where: { count_id: countId },
        include: { items: true }
      });

      if (!count) throw new Error('CYCLE_COUNT_NOT_FOUND');
      if (count.status !== 'PENDING_APPROVAL') {
        throw new Error(`INVALID_TRANSITION: Cannot approve cycle count in status ${count.status}`);
      }

      await BusinessEventService.logEvent({
        event_type: 'CYCLE_COUNT_APPROVED',
        entity_type: 'CycleCount',
        entity_id: countId,
        user_id: approvedBy,
        description: `Cycle count ${count.count_number} approved.`
      }, tx);

      // Apply stock adjustments for items with variance
      for (const item of count.items) {
        const variance = item.variance ?? 0;
        if (variance !== 0) {
          // Adjust stock using WarehouseService OCC & Negative Stock helper
          await WarehouseService.mutateStock(tx, item.part_id, count.location_id, variance, approvedBy);

          // Log stock movement inside transaction
          await tx.stockMovement.create({
            data: {
              partId: item.part_id,
              locationId: count.location_id,
              movementType: 'CYCLE_COUNT_ADJUSTMENT',
              quantity: variance,
              referenceType: 'CycleCount',
              referenceId: countId
            }
          });
        }
      }

      // Mark CycleCount as COMPLETED
      const completed = await tx.cycleCount.update({
        where: { count_id: countId },
        data: { status: 'COMPLETED', completed_date: new Date() }
      });

      await BusinessEventService.logEvent({
        event_type: 'CYCLE_COUNT_COMPLETED',
        entity_type: 'CycleCount',
        entity_id: countId,
        user_id: approvedBy,
        description: `Cycle count ${count.count_number} stock adjustments applied and count completed.`
      }, tx);

      return completed;
    });
  }
}
