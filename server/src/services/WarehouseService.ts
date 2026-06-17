import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';
import { DocumentSeriesService } from './DocumentSeriesService';

export class WarehouseService {
  
  // Helper to mutate stock atomically with version locking and negative stock protection
  public static async mutateStock(
    tx: any,
    partId: number,
    locationId: number,
    quantityChange: number,
    userId?: number | null
  ) {
    const current = await tx.partStock.findUnique({
      where: { part_id_location_id: { part_id: partId, location_id: locationId } }
    });

    const currentQty = current ? Number(current.quantity) : 0;
    const currentVersion = current ? current.stock_version : 1;
    const newQty = currentQty + quantityChange;

    // Negative Stock Guard
    if (newQty < 0) {
      await BusinessEventService.logEvent({
        event_type: 'NEGATIVE_STOCK_PREVENTED',
        entity_type: 'PartStock',
        entity_id: partId,
        user_id: userId,
        description: `Deduction of ${Math.abs(quantityChange)} units of part #${partId} at location #${locationId} prevented. Current: ${currentQty}.`
      });
      throw new Error('NEGATIVE_STOCK_PREVENTED');
    }

    if (!current) {
      try {
        await tx.partStock.create({
          data: {
            part_id: partId,
            location_id: locationId,
            quantity: newQty,
            stock_version: 1
          }
        });
      } catch (e) {
        await BusinessEventService.logEvent({
          event_type: 'STOCK_CONFLICT_DETECTED',
          entity_type: 'PartStock',
          entity_id: partId,
          user_id: userId,
          description: `Optimistic concurrency conflict creating stock for part #${partId} at location #${locationId}.`
        });
        throw new Error('STOCK_CONFLICT_DETECTED');
      }
    } else {
      const result = await tx.partStock.updateMany({
        where: {
          part_id: partId,
          location_id: locationId,
          stock_version: currentVersion
        },
        data: {
          quantity: newQty,
          stock_version: currentVersion + 1
        }
      });

      if (result.count === 0) {
        await BusinessEventService.logEvent({
          event_type: 'STOCK_CONFLICT_DETECTED',
          entity_type: 'PartStock',
          entity_id: partId,
          user_id: userId,
          description: `Optimistic concurrency conflict updating stock for part #${partId} at location #${locationId}. Expected version: ${currentVersion}.`
        });
        throw new Error('STOCK_CONFLICT_DETECTED');
      }
    }

    return newQty;
  }

  // ── WAREHOUSE CRUD (LOCATIONS) ──────────────────────────────────────────
  async getWarehouses() {
    return prisma.location.findMany({
      orderBy: { location_id: 'asc' }
    });
  }

  async getWarehouseById(id: number) {
    return prisma.location.findUnique({
      where: { location_id: id },
      include: { warehouseLocations: true }
    });
  }

  async createWarehouse(data: any, userId?: number) {
    const code = data.location_code || `WH-${Date.now()}`;
    return prisma.$transaction(async (tx) => {
      const wh = await tx.location.create({
        data: {
          location_code: code,
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          gstin: data.gstin || null,
          is_main: data.is_main || false,
          is_active: data.is_active !== false
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'WAREHOUSE_CREATED',
        entity_type: 'Location',
        entity_id: wh.location_id,
        user_id: userId,
        description: `Warehouse ${wh.name} (${wh.location_code}) created.`
      }, tx);

      return wh;
    });
  }

  async updateWarehouse(id: number, data: any, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.location.findUnique({ where: { location_id: id } });
      if (!existing) throw new Error('Warehouse not found');

      const { location_id, created_at, updated_at, ...updateData } = data;
      const wh = await tx.location.update({
        where: { location_id: id },
        data: updateData
      });

      await BusinessEventService.logEvent({
        event_type: 'WAREHOUSE_UPDATED',
        entity_type: 'Location',
        entity_id: id,
        user_id: userId,
        description: `Warehouse ${wh.name} updated.`
      }, tx);

      return wh;
    });
  }

  async deleteWarehouse(id: number, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.location.findUnique({ where: { location_id: id } });
      if (!existing) throw new Error('Warehouse not found');

      await tx.partStock.deleteMany({ where: { location_id: id } });
      await tx.stockMovement.deleteMany({ where: { locationId: id } });
      const wh = await tx.location.delete({ where: { location_id: id } });

      await BusinessEventService.logEvent({
        event_type: 'WAREHOUSE_DELETED',
        entity_type: 'Location',
        entity_id: id,
        user_id: userId,
        description: `Warehouse ${wh.name} deleted and associated stocks removed.`
      }, tx);

      return wh;
    });
  }

  // ── BIN LOCATION CRUD ───────────────────────────────────────────────────
  async createWarehouseLocation(data: {
    location_id: number;
    zone?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    name: string;
  }) {
    return prisma.warehouseLocation.create({
      data: {
        location_id: data.location_id,
        zone: data.zone || null,
        rack: data.rack || null,
        shelf: data.shelf || null,
        bin: data.bin || null,
        name: data.name
      }
    });
  }

  async getWarehouseLocations(locationId: number) {
    return prisma.warehouseLocation.findMany({
      where: { location_id: locationId },
      orderBy: { name: 'asc' }
    });
  }

  async updateBinStock(binLocationId: number, partId: number, qtyChange: number) {
    return prisma.binStock.upsert({
      where: { warehouse_location_id_part_id: { warehouse_location_id: binLocationId, part_id: partId } },
      update: { quantity: { increment: qtyChange } },
      create: { warehouse_location_id: binLocationId, part_id: partId, quantity: qtyChange }
    });
  }

  // ── STOCK RESERVATION ──────────────────────────────────────────────────
  async reserveStock(data: {
    part_id: number;
    location_id: number;
    quantity: number;
    reference_type: string;
    reference_id: number;
    expires_at?: Date;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      // 1. Calculate Dynamic Available Stock
      const activeReservations = await tx.stockReservation.findMany({
        where: { part_id: data.part_id, location_id: data.location_id, status: 'ACTIVE' }
      });
      const reservedQty = activeReservations.reduce((sum: number, res: any) => sum + res.quantity, 0);

      const stock = await tx.partStock.findUnique({
        where: { part_id_location_id: { part_id: data.part_id, location_id: data.location_id } }
      });
      const physicalQty = stock ? Number(stock.quantity) : 0;
      const availableStock = physicalQty - reservedQty;

      // 2. Validate requested quantity
      if (data.quantity > availableStock) {
        await BusinessEventService.logEvent({
          event_type: 'STOCK_RESERVATION_REJECTED',
          entity_type: 'Parts',
          entity_id: data.part_id,
          user_id: userId,
          description: `Stock reservation rejected for part #${data.part_id} at location #${data.location_id}. Requested: ${data.quantity}, Available: ${availableStock}.`
        });
        throw new Error('INSUFFICIENT_AVAILABLE_STOCK');
      }

      // 3. Create reservation
      const res = await tx.stockReservation.create({
        data: {
          part_id: data.part_id,
          location_id: data.location_id,
          quantity: data.quantity,
          reference_type: data.reference_type,
          reference_id: data.reference_id,
          expires_at: data.expires_at || null,
          status: 'ACTIVE'
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'STOCK_RESERVED',
        entity_type: 'StockReservation',
        entity_id: res.reservation_id,
        user_id: userId,
        description: `Reserved ${data.quantity} units of part #${data.part_id} at location #${data.location_id} for ${data.reference_type} #${data.reference_id}.`
      }, tx);

      return res;
    });
  }

  async releaseReservation(reservationId: number, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const res = await tx.stockReservation.findUnique({ where: { reservation_id: reservationId } });
      if (!res) throw new Error('RESERVATION_NOT_FOUND');
      if (res.status !== 'ACTIVE') throw new Error(`INVALID_STATUS: Cannot release a reservation in status ${res.status}`);

      const updated = await tx.stockReservation.update({
        where: { reservation_id: reservationId },
        data: { status: 'RELEASED' }
      });

      await BusinessEventService.logEvent({
        event_type: 'STOCK_RESERVATION_RELEASED',
        entity_type: 'StockReservation',
        entity_id: reservationId,
        user_id: userId,
        description: `Released reservation of ${res.quantity} units of part #${res.part_id} at location #${res.location_id}.`
      }, tx);

      return updated;
    });
  }

  async fulfillReservation(reservationId: number, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const res = await tx.stockReservation.findUnique({ where: { reservation_id: reservationId } });
      if (!res) throw new Error('RESERVATION_NOT_FOUND');
      if (res.status !== 'ACTIVE') throw new Error(`INVALID_STATUS: Cannot fulfill a reservation in status ${res.status}`);

      // Deduct physical stock with OCC & negative stock protection
      await WarehouseService.mutateStock(tx, res.part_id, res.location_id, -res.quantity, userId);

      // Log movement
      await tx.stockMovement.create({
        data: {
          partId: res.part_id,
          locationId: res.location_id,
          movementType: 'RESERVATION_FULFILL',
          quantity: -res.quantity,
          referenceType: 'StockReservation',
          referenceId: reservationId
        }
      });

      // Update reservation status
      const updated = await tx.stockReservation.update({
        where: { reservation_id: reservationId },
        data: { status: 'FULFILLED' }
      });

      await BusinessEventService.logEvent({
        event_type: 'STOCK_RESERVATION_FULFILLED',
        entity_type: 'StockReservation',
        entity_id: reservationId,
        user_id: userId,
        description: `Fulfilled reservation of ${res.quantity} units of part #${res.part_id} at location #${res.location_id}.`
      }, tx);

      return updated;
    });
  }

  // ── STOCK TRANSFERS ─────────────────────────────────────────────────────
  async createStockTransfer(data: {
    from_location_id: number;
    to_location_id: number;
    items: Array<{ part_id: number; quantity: number }>;
    requested_by?: number;
    notes?: string;
  }) {
    if (data.from_location_id === data.to_location_id) {
      throw new Error('INVALID_TRANSFER: Origin and target locations must be different.');
    }

    const transfer_number = await DocumentSeriesService.generateNextNumber('StockTransfer');

    return prisma.stockTransfer.create({
      data: {
        transfer_number,
        from_location_id: data.from_location_id,
        to_location_id: data.to_location_id,
        requested_by: data.requested_by || null,
        notes: data.notes || null,
        status: 'DRAFT',
        items: {
          create: data.items.map(i => ({
            part_id: i.part_id,
            quantity: i.quantity
          }))
        }
      },
      include: { items: true }
    });
  }

  async approveStockTransfer(transferId: number, approvedBy: number) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { transfer_id: transferId },
        include: { items: true }
      });

      if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
      if (transfer.status !== 'DRAFT') {
        throw new Error(`INVALID_TRANSITION: Cannot approve a transfer in status ${transfer.status}`);
      }

      const updated = await tx.stockTransfer.update({
        where: { transfer_id: transferId },
        data: { status: 'APPROVED', approved_by: approvedBy }
      });

      await BusinessEventService.logEvent({
        event_type: 'TRANSFER_APPROVED',
        entity_type: 'StockTransfer',
        entity_id: transferId,
        user_id: approvedBy,
        description: `Stock Transfer ${transfer.transfer_number} approved.`
      }, tx);

      return updated;
    });
  }

  async shipStockTransfer(transferId: number, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { transfer_id: transferId }
      });

      if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
      if (transfer.status !== 'APPROVED') {
        throw new Error(`INVALID_TRANSITION: Cannot ship a transfer in status ${transfer.status}`);
      }

      const updated = await tx.stockTransfer.update({
        where: { transfer_id: transferId },
        data: { status: 'IN_TRANSIT' }
      });

      await BusinessEventService.logEvent({
        event_type: 'TRANSFER_SHIPPED',
        entity_type: 'StockTransfer',
        entity_id: transferId,
        user_id: userId,
        description: `Stock Transfer ${transfer.transfer_number} shipped (IN_TRANSIT).`
      }, tx);

      return updated;
    });
  }

  async completeStockTransfer(transferId: number, userId: number) {
    // 1. Fast-fail Idempotency Check Outside Transaction
    const check = await prisma.stockTransfer.findUnique({
      where: { transfer_id: transferId },
      include: { items: true }
    });

    if (!check) throw new Error('TRANSFER_NOT_FOUND');
    if (check.status === 'COMPLETING' || check.status === 'COMPLETED') {
      await BusinessEventService.logEvent({
        event_type: 'TRANSFER_COMPLETION_REJECTED_DUPLICATE',
        entity_type: 'StockTransfer',
        entity_id: transferId,
        user_id: userId,
        description: `Duplicate stock transfer completion rejected. Transfer: ${check.transfer_number}, current status: ${check.status}.`
      });
      throw new Error('TRANSFER_ALREADY_PROCESSED');
    }

    if (check.status !== 'IN_TRANSIT') {
      throw new Error(`INVALID_TRANSITION: Cannot complete transfer in status ${check.status}`);
    }

    // 2. Execute within an atomic transaction with locks
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { transfer_id: transferId },
        include: { items: true }
      });

      if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
      
      // Double check inside transaction
      if (transfer.status === 'COMPLETING' || transfer.status === 'COMPLETED') {
        await BusinessEventService.logEvent({
          event_type: 'TRANSFER_COMPLETION_REJECTED_DUPLICATE',
          entity_type: 'StockTransfer',
          entity_id: transferId,
          user_id: userId,
          description: `Duplicate stock transfer completion rejected inside transaction. Transfer: ${transfer.transfer_number}, current status: ${transfer.status}.`
        });
        throw new Error('TRANSFER_ALREADY_PROCESSED');
      }

      // Transition to COMPLETING (Optimistic Status Lock)
      await tx.stockTransfer.update({
        where: { transfer_id: transferId },
        data: { status: 'COMPLETING' }
      });

      // Process stock updates
      for (const item of transfer.items) {
        // Origin warehouse decrement (OCC + Negative Stock Protection inside mutateStock)
        await WarehouseService.mutateStock(tx, item.part_id, transfer.from_location_id, -item.quantity, userId);

        // Destination warehouse increment (OCC inside mutateStock)
        await WarehouseService.mutateStock(tx, item.part_id, transfer.to_location_id, item.quantity, userId);

        // Create movements inside same transaction
        await tx.stockMovement.create({
          data: {
            partId: item.part_id,
            locationId: transfer.from_location_id,
            movementType: 'TRANSFER_OUT',
            quantity: -item.quantity,
            referenceType: 'StockTransfer',
            referenceId: transferId
          }
        });

        await tx.stockMovement.create({
          data: {
            partId: item.part_id,
            locationId: transfer.to_location_id,
            movementType: 'TRANSFER_IN',
            quantity: item.quantity,
            referenceType: 'StockTransfer',
            referenceId: transferId
          }
        });
      }

      // Mark as COMPLETED
      const completed = await tx.stockTransfer.update({
        where: { transfer_id: transferId },
        data: { status: 'COMPLETED' }
      });

      await BusinessEventService.logEvent({
        event_type: 'TRANSFER_COMPLETED',
        entity_type: 'StockTransfer',
        entity_id: transferId,
        user_id: userId,
        description: `Stock Transfer ${transfer.transfer_number} successfully completed. ${transfer.items.length} item(s) moved.`
      }, tx);

      return completed;
    });
  }

  async cancelStockTransfer(transferId: number, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { transfer_id: transferId }
      });

      if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
      if (['COMPLETING', 'COMPLETED', 'CANCELLED'].includes(transfer.status)) {
        throw new Error(`INVALID_TRANSITION: Cannot cancel transfer in status ${transfer.status}`);
      }

      const updated = await tx.stockTransfer.update({
        where: { transfer_id: transferId },
        data: { status: 'CANCELLED' }
      });

      await BusinessEventService.logEvent({
        event_type: 'TRANSFER_CANCELLED',
        entity_type: 'StockTransfer',
        entity_id: transferId,
        user_id: userId,
        description: `Stock Transfer ${transfer.transfer_number} cancelled.`
      }, tx);

      return updated;
    });
  }
}
