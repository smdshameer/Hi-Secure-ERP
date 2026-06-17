/**
 * ProcurementService.ts
 * Phase 2C — Procurement Operations
 *
 * Implements:
 *   - Purchase Requisition workflow (DRAFT → SUBMITTED → APPROVED → REJECTED → CONVERTED_TO_PO)
 *   - Purchase Order workflow     (DRAFT → APPROVED → SENT → PARTIALLY_RECEIVED → RECEIVED → CANCELLED)
 *   - Goods Receipt Note workflow (DRAFT → VERIFIED → POSTING → POSTED → CANCELLED)
 *
 * Safety Rules:
 *   RULE 1 — GRN Idempotency (reject if POSTING or POSTED)
 *   RULE 2 — Inventory Snapshot Protection (snapshot BEFORE update, rollback via snapshot)
 *   RULE 3 — Transactional Consistency (all GRN posting steps in ONE transaction)
 */

import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';
import { DocumentSeriesService } from './DocumentSeriesService';
import { GstService } from './GstService';

// ─── Weighted Average Cost ─────────────────────────────────────────────────

function calculateWeightedAvgCost(
  currentStock: number,
  currentCost: number,
  receivedQty: number,
  receivedPrice: number
): number {
  const totalQty = currentStock + receivedQty;
  if (totalQty === 0) {
    throw new Error('WEIGHTED_AVG_COST_DIVIDE_BY_ZERO: Total quantity cannot be zero.');
  }
  const newAvgCost =
    (currentStock * currentCost + receivedQty * receivedPrice) / totalQty;
  return parseFloat(newAvgCost.toFixed(6));
}

// ─── Document Number Generation ────────────────────────────────────────────

async function generateDocNumber(prefix: string, module: string): Promise<string> {
  try {
    const docNum = await DocumentSeriesService.generateNextNumber(module);
    return docNum;
  } catch {
    // Fallback: timestamp-based
    return `${prefix}-${Date.now()}`;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE REQUISITION
// ════════════════════════════════════════════════════════════════════════════

export class ProcurementService {

  // ── CREATE REQUISITION ─────────────────────────────────────────────────
  static async createRequisition(data: {
    requested_by: number;
    supplier_id?: number;
    priority?: string;
    required_by_date?: string;
    remarks?: string;
    items: Array<{ part_id: number; quantity: number; estimated_price?: number; remarks?: string }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error('VALIDATION_ERROR: At least one item is required.');
    }

    const pr_number = await generateDocNumber('PR', 'PurchaseRequisition');

    const pr = await prisma.purchaseRequisition.create({
      data: {
        pr_number,
        requested_by: data.requested_by,
        supplier_id: data.supplier_id || null,
        priority: data.priority || 'NORMAL',
        required_by_date: data.required_by_date ? new Date(data.required_by_date) : null,
        remarks: data.remarks || null,
        status: 'DRAFT',
        items: {
          create: data.items.map((item) => ({
            part_id: item.part_id,
            quantity: item.quantity,
            estimated_price: item.estimated_price ?? null,
            remarks: item.remarks ?? null,
          })),
        },
      },
      include: { items: true, requestedBy: { select: { user_id: true, full_name: true } } },
    });

    await BusinessEventService.logEvent({
      event_type: 'PURCHASE_REQUISITION_CREATED',
      entity_type: 'PurchaseRequisition',
      entity_id: pr.pr_id,
      user_id: data.requested_by,
      description: `Purchase Requisition ${pr.pr_number} created with ${data.items.length} item(s).`,
    });

    return pr;
  }

  // ── LIST REQUISITIONS ──────────────────────────────────────────────────
  static async getRequisitions(query: {
    status?: string;
    requested_by?: number;
    supplier_id?: number;
  }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.requested_by) where.requested_by = query.requested_by;
    if (query.supplier_id) where.supplier_id = query.supplier_id;

    return prisma.purchaseRequisition.findMany({
      where,
      include: {
        items: { include: { part: { select: { part_id: true, name: true, part_number: true } } } },
        requestedBy: { select: { user_id: true, full_name: true } },
        supplier: { select: { supplier_id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ── SUBMIT REQUISITION ─────────────────────────────────────────────────
  static async submitRequisition(prId: number, _userId: number) {
    const pr = await prisma.purchaseRequisition.findUnique({ where: { pr_id: prId } });
    if (!pr) throw new Error('REQUISITION_NOT_FOUND');
    if (pr.status !== 'DRAFT') throw new Error(`INVALID_TRANSITION: Cannot submit from status ${pr.status}`);

    return prisma.purchaseRequisition.update({
      where: { pr_id: prId },
      data: { status: 'SUBMITTED', updated_at: new Date() },
    });
  }

  // ── APPROVE REQUISITION ────────────────────────────────────────────────
  static async approveRequisition(prId: number, approvedBy: number) {
    const pr = await prisma.purchaseRequisition.findUnique({ where: { pr_id: prId } });
    if (!pr) throw new Error('REQUISITION_NOT_FOUND');
    if (!['DRAFT', 'SUBMITTED'].includes(pr.status)) {
      throw new Error(`INVALID_TRANSITION: Cannot approve from status ${pr.status}`);
    }

    const updated = await prisma.purchaseRequisition.update({
      where: { pr_id: prId },
      data: { status: 'APPROVED', approved_by: approvedBy, approved_at: new Date() },
    });

    await BusinessEventService.logEvent({
      event_type: 'PURCHASE_REQUISITION_APPROVED',
      entity_type: 'PurchaseRequisition',
      entity_id: prId,
      user_id: approvedBy,
      description: `Purchase Requisition ${pr.pr_number} approved by user #${approvedBy}.`,
    });

    return updated;
  }

  // ── REJECT REQUISITION ─────────────────────────────────────────────────
  static async rejectRequisition(prId: number, userId: number, reason: string) {
    const pr = await prisma.purchaseRequisition.findUnique({ where: { pr_id: prId } });
    if (!pr) throw new Error('REQUISITION_NOT_FOUND');
    if (!['DRAFT', 'SUBMITTED'].includes(pr.status)) {
      throw new Error(`INVALID_TRANSITION: Cannot reject from status ${pr.status}`);
    }

    const updated = await prisma.purchaseRequisition.update({
      where: { pr_id: prId },
      data: { status: 'REJECTED', rejected_reason: reason, approved_by: userId, approved_at: new Date() },
    });

    await BusinessEventService.logEvent({
      event_type: 'PURCHASE_REQUISITION_REJECTED',
      entity_type: 'PurchaseRequisition',
      entity_id: prId,
      user_id: userId,
      description: `Purchase Requisition ${pr.pr_number} rejected. Reason: ${reason}`,
    });

    return updated;
  }

  // ── CONVERT REQUISITION TO PO ──────────────────────────────────────────
  static async convertRequisitionToPO(prId: number, userId: number, poData?: {
    supplier_id?: number;
    expected_delivery?: string;
    terms?: string;
    notes?: string;
  }) {
    const pr = await prisma.purchaseRequisition.findUnique({
      where: { pr_id: prId },
      include: { items: true },
    });
    if (!pr) throw new Error('REQUISITION_NOT_FOUND');
    if (pr.status !== 'APPROVED') throw new Error('INVALID_TRANSITION: Requisition must be APPROVED to convert to PO.');

    const supplierId = poData?.supplier_id || pr.supplier_id;
    if (!supplierId) throw new Error('VALIDATION_ERROR: Supplier is required for PO creation.');

    return prisma.$transaction(async (tx) => {
      const po_number = await generateDocNumber('PO', 'PurchaseOrder');

      let totalAmount = 0;
      const poItems = pr.items.map((item) => {
        const price = Number(item.estimated_price || 0);
        totalAmount += item.quantity * price;
        return {
          part_id: item.part_id,
          quantity: item.quantity,
          unit_price: price,
          total_amount: item.quantity * price,
        };
      });

      const po = await tx.purchaseOrder.create({
        data: {
          po_number,
          supplier_id: supplierId,
          requisition_id: prId,
          expected_delivery: poData?.expected_delivery ? new Date(poData.expected_delivery) : null,
          total_amount: totalAmount,
          status: 'DRAFT',
          terms: poData?.terms || null,
          notes: poData?.notes || null,
          created_by: userId,
          items: { create: poItems },
        },
        include: { items: true },
      });

      await tx.purchaseRequisition.update({
        where: { pr_id: prId },
        data: { status: 'CONVERTED_TO_PO' },
      });

      await BusinessEventService.logEvent({
        event_type: 'PURCHASE_ORDER_CREATED',
        entity_type: 'PurchaseOrder',
        entity_id: po.po_id,
        user_id: userId,
        description: `PO ${po_number} created from Requisition ${pr.pr_number}.`,
      });

      return { po, pr_id: prId };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // PURCHASE ORDER WORKFLOW
  // ════════════════════════════════════════════════════════════════════════

  // ── CREATE PO ─────────────────────────────────────────────────────────
  static async createPurchaseOrder(data: {
    supplier_id: number;
    requisition_id?: number;
    expected_delivery?: string;
    terms?: string;
    notes?: string;
    created_by?: number;
    items: Array<{ part_id: number; quantity: number; unit_price: number }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error('VALIDATION_ERROR: At least one item is required.');
    }

    const po_number = await generateDocNumber('PO', 'PurchaseOrder');
    let totalAmount = 0;
    const items = data.items.map((item) => {
      const lineTotal = item.quantity * item.unit_price;
      totalAmount += lineTotal;
      return { part_id: item.part_id, quantity: item.quantity, unit_price: item.unit_price, total_amount: lineTotal };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number,
        supplier_id: data.supplier_id,
        requisition_id: data.requisition_id || null,
        expected_delivery: data.expected_delivery ? new Date(data.expected_delivery) : null,
        total_amount: totalAmount,
        status: 'DRAFT',
        terms: data.terms || null,
        notes: data.notes || null,
        created_by: data.created_by || null,
        items: { create: items },
      },
      include: { items: true, supplier: { select: { supplier_id: true, name: true } } },
    });

    await BusinessEventService.logEvent({
      event_type: 'PURCHASE_ORDER_CREATED',
      entity_type: 'PurchaseOrder',
      entity_id: po.po_id,
      user_id: data.created_by || null,
      description: `Purchase Order ${po_number} created. Total: ₹${totalAmount.toFixed(2)}`,
    });

    return po;
  }

  // ── LIST POs ───────────────────────────────────────────────────────────
  static async getPurchaseOrders(query: { status?: string; supplier_id?: number }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.supplier_id) where.supplier_id = query.supplier_id;

    return prisma.purchaseOrder.findMany({
      where,
      include: {
        items: { include: { part: { select: { part_id: true, name: true, part_number: true } } } },
        supplier: { select: { supplier_id: true, name: true } },
        requisition: { select: { pr_id: true, pr_number: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ── APPROVE PO ─────────────────────────────────────────────────────────
  static async approvePurchaseOrder(poId: number, userId: number) {
    const po = await prisma.purchaseOrder.findUnique({ where: { po_id: poId } });
    if (!po) throw new Error('PO_NOT_FOUND');
    if (po.status !== 'DRAFT') throw new Error(`INVALID_TRANSITION: Cannot approve from status ${po.status}`);

    const updated = await prisma.purchaseOrder.update({
      where: { po_id: poId },
      data: { status: 'APPROVED' },
    });

    await BusinessEventService.logEvent({
      event_type: 'PURCHASE_ORDER_APPROVED',
      entity_type: 'PurchaseOrder',
      entity_id: poId,
      user_id: userId,
      description: `Purchase Order ${po.po_number} approved by user #${userId}.`,
    });

    return updated;
  }

  // ── SEND PO ────────────────────────────────────────────────────────────
  static async sendPurchaseOrder(poId: number, userId: number) {
    const po = await prisma.purchaseOrder.findUnique({ where: { po_id: poId } });
    if (!po) throw new Error('PO_NOT_FOUND');
    if (po.status !== 'APPROVED') throw new Error(`INVALID_TRANSITION: Cannot send from status ${po.status}`);

    const updated = await prisma.purchaseOrder.update({
      where: { po_id: poId },
      data: { status: 'SENT' },
    });

    await BusinessEventService.logEvent({
      event_type: 'PURCHASE_ORDER_SENT',
      entity_type: 'PurchaseOrder',
      entity_id: poId,
      user_id: userId,
      description: `Purchase Order ${po.po_number} sent to supplier.`,
    });

    return updated;
  }

  // ── CANCEL PO ──────────────────────────────────────────────────────────
  static async cancelPurchaseOrder(poId: number, _userId: number) {
    const po = await prisma.purchaseOrder.findUnique({ where: { po_id: poId } });
    if (!po) throw new Error('PO_NOT_FOUND');
    if (['RECEIVED', 'CANCELLED'].includes(po.status)) {
      throw new Error(`INVALID_TRANSITION: Cannot cancel a ${po.status} PO.`);
    }

    return prisma.purchaseOrder.update({
      where: { po_id: poId },
      data: { status: 'CANCELLED' },
    });
  }

  // ── GENERATE PO FROM CATALOG (low-stock auto-generation) ───────────────
  static async generatePOFromCatalog(data: {
    supplier_id: number;
    created_by?: number;
    threshold?: number;
  }) {
    const threshold = data.threshold ?? 0;

    // Find all parts at or below reorder level that have a part_stock record
    const lowStockParts = await prisma.parts.findMany({
      where: { is_active: true },
      include: { stocks: true },
    });

    const eligibleParts = lowStockParts.filter((p: any) => {
      const qty = p.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0);
      return qty <= (threshold || Number(p.reorder_level));
    });

    if (eligibleParts.length === 0) {
      return { message: 'No parts below reorder level. No PO generated.', po: null };
    }

    const po_number = await generateDocNumber('PO', 'PurchaseOrder');
    let totalAmount = 0;
    const items = eligibleParts.map((p: any) => {
      const orderQty = Math.max(Number(p.reorder_level) * 2, 10);
      const price = Number(p.cost_price || 0);
      totalAmount += orderQty * price;
      return { part_id: p.part_id, quantity: orderQty, unit_price: price, total_amount: orderQty * price };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number,
        supplier_id: data.supplier_id,
        total_amount: totalAmount,
        status: 'DRAFT',
        notes: 'Auto-generated from low-stock catalog',
        created_by: data.created_by || null,
        items: { create: items },
      },
      include: { items: true },
    });

    await BusinessEventService.logEvent({
      event_type: 'PURCHASE_ORDER_CREATED',
      entity_type: 'PurchaseOrder',
      entity_id: po.po_id,
      user_id: data.created_by || null,
      description: `PO ${po_number} auto-generated from catalog for ${items.length} low-stock part(s).`,
    });

    return { po, items_count: items.length };
  }

  // ════════════════════════════════════════════════════════════════════════
  // GOODS RECEIPT NOTE WORKFLOW
  // ════════════════════════════════════════════════════════════════════════

  // ── CREATE GRN ─────────────────────────────────────────────────────────
  static async createGRN(data: {
    po_id: number;
    received_by: number;
    location_id?: number;
    supplier_invoice?: string;
    remarks?: string;
    items: Array<{
      part_id: number;
      po_item_id?: number;
      ordered_quantity: number;
      received_quantity: number;
      damaged_quantity?: number;
      unit_price: number;
      batch_number?: string;
      remarks?: string;
    }>;
  }) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { po_id: data.po_id },
      include: { items: true },
    });
    if (!po) throw new Error('PO_NOT_FOUND');
    if (!['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw new Error(`INVALID_OPERATION: Cannot create GRN for PO in status ${po.status}`);
    }

    const grn_number = await generateDocNumber('GRN', 'GoodsReceiptNote');

    const grn = await prisma.goodsReceiptNote.create({
      data: {
        grn_number,
        po_id: data.po_id,
        received_by: data.received_by,
        location_id: data.location_id || null,
        supplier_invoice: data.supplier_invoice || null,
        remarks: data.remarks || null,
        status: 'DRAFT',
        items: {
          create: data.items.map((item) => ({
            part_id: item.part_id,
            po_item_id: item.po_item_id || null,
            ordered_quantity: item.ordered_quantity,
            received_quantity: item.received_quantity,
            damaged_quantity: item.damaged_quantity ?? 0,
            shortage_quantity: Math.max(0, item.ordered_quantity - item.received_quantity),
            excess_quantity: Math.max(0, item.received_quantity - item.ordered_quantity),
            unit_price: item.unit_price,
            batch_number: item.batch_number || null,
            remarks: item.remarks || null,
          })),
        },
      },
      include: { items: true },
    });

    await BusinessEventService.logEvent({
      event_type: 'GOODS_RECEIPT_CREATED',
      entity_type: 'GoodsReceiptNote',
      entity_id: grn.grn_id,
      user_id: data.received_by,
      description: `GRN ${grn_number} created for PO ${po.po_number || po.po_id} with ${data.items.length} item(s).`,
    });

    return grn;
  }

  // ── LIST GRNs ──────────────────────────────────────────────────────────
  static async getGRNs(query: { status?: string; po_id?: number }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.po_id) where.po_id = query.po_id;

    return prisma.goodsReceiptNote.findMany({
      where,
      include: {
        items: { include: { part: { select: { part_id: true, name: true } } } },
        purchaseOrder: { select: { po_id: true, po_number: true, supplier_id: true } },
        receivedBy: { select: { user_id: true, full_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ── VERIFY GRN ─────────────────────────────────────────────────────────
  static async verifyGRN(grnId: number, userId: number) {
    const grn = await prisma.goodsReceiptNote.findUnique({
      where: { grn_id: grnId },
      include: { items: true },
    });
    if (!grn) throw new Error('GRN_NOT_FOUND');
    if (grn.status !== 'DRAFT') {
      throw new Error(`INVALID_TRANSITION: Cannot verify GRN in status ${grn.status}`);
    }

    const updated = await prisma.goodsReceiptNote.update({
      where: { grn_id: grnId },
      data: { status: 'VERIFIED' },
    });

    await BusinessEventService.logEvent({
      event_type: 'GOODS_RECEIPT_VERIFIED',
      entity_type: 'GoodsReceiptNote',
      entity_id: grnId,
      user_id: userId,
      description: `GRN ${grn.grn_number} verified and ready for posting.`,
    });

    return updated;
  }

  // ── POST GRN ──────────────────────────────────────────────────────────
  // RULE 1: Idempotency — reject if already POSTING or POSTED
  // RULE 2: Snapshot before inventory update
  // RULE 3: All in ONE transaction
  static async postGRN(grnId: number, userId: number) {
    // Pre-flight idempotency check OUTSIDE transaction (fast fail)
    const grnCheck = await prisma.goodsReceiptNote.findUnique({ where: { grn_id: grnId } });
    if (!grnCheck) throw new Error('GRN_NOT_FOUND');

    if (grnCheck.status === 'POSTING' || grnCheck.status === 'POSTED') {
      // Log the duplicate rejection event
      await BusinessEventService.logEvent({
        event_type: 'GRN_POST_REJECTED_DUPLICATE',
        entity_type: 'GoodsReceiptNote',
        entity_id: grnId,
        user_id: userId,
        description: `GRN ${grnCheck.grn_number} post rejected — already in status ${grnCheck.status}. GRN_ALREADY_PROCESSED.`,
      });
      throw new Error(`GRN_ALREADY_PROCESSED: GRN ${grnCheck.grn_number} is already ${grnCheck.status}.`);
    }

    if (grnCheck.status !== 'VERIFIED') {
      throw new Error(`INVALID_TRANSITION: GRN must be VERIFIED before posting. Current status: ${grnCheck.status}`);
    }

    // RULE 3: Entire posting in ONE atomic transaction
    return prisma.$transaction(async (tx) => {
      // Re-read inside transaction and set to POSTING (optimistic lock)
      const grn = await tx.goodsReceiptNote.findUnique({
        where: { grn_id: grnId },
        include: {
          items: true,
          purchaseOrder: { include: { items: true, supplier: true } },
        },
      });
      if (!grn) throw new Error('GRN_NOT_FOUND');

      // Double-check inside transaction
      if (grn.status === 'POSTING' || grn.status === 'POSTED') {
        await BusinessEventService.logEvent({
          event_type: 'GRN_POST_REJECTED_DUPLICATE',
          entity_type: 'GoodsReceiptNote',
          entity_id: grnId,
          user_id: userId,
          description: `GRN ${grn.grn_number} post rejected inside transaction — already ${grn.status}.`,
        });
        throw new Error(`GRN_ALREADY_PROCESSED: GRN ${grn.grn_number} is already ${grn.status}.`);
      }

      // Mark as POSTING (atomic status transition)
      await tx.goodsReceiptNote.update({
        where: { grn_id: grnId },
        data: { status: 'POSTING' },
      });

      const locationId = grn.location_id || 1;
      const postedItems: Array<{
        part_id: number;
        received_qty: number;
        unit_price: number;
        old_stock: number;
        old_cost: number;
        new_stock: number;
        new_cost: number;
      }> = [];

      // Process each GRN item
      for (const item of grn.items) {
        const acceptedQty = item.received_quantity - (item.damaged_quantity || 0);
        if (acceptedQty <= 0) continue;

        // Fetch current part for stock and cost
        const part = await tx.parts.findUnique({ where: { part_id: item.part_id } });
        if (!part) throw new Error(`PART_NOT_FOUND: Part #${item.part_id} does not exist.`);

        // Fetch actual stock quantity
        const stockRecord = await tx.partStock.findUnique({
          where: { part_id_location_id: { part_id: item.part_id, location_id: locationId } },
        });
        const prevStock = Number(stockRecord?.quantity ?? 0);
        const prevCost = Number(part.cost_price ?? 0);
        const receivedPrice = Number(item.unit_price);

        // Validate negative stock guard
        if (prevStock < 0) {
          throw new Error(`NEGATIVE_STOCK_ERROR: Part #${item.part_id} has negative stock (${prevStock}). Cannot proceed.`);
        }

        // RULE 2: Create inventory snapshot BEFORE updating
        await tx.inventoryAdjustmentSnapshot.create({
          data: {
            part_id: item.part_id,
            grn_id: grnId,
            snapshot_type: 'PRE_GRN',
            stock_quantity: prevStock,
            cost_price: prevCost,
            notes: `Pre-GRN snapshot for GRN ${grn.grn_number}, item part_id=${item.part_id}`,
          },
        });

        // Weighted Average Cost
        let newAvgCost = prevCost;
        if (prevStock + acceptedQty > 0) {
          newAvgCost = calculateWeightedAvgCost(prevStock, prevCost, acceptedQty, receivedPrice);
        }

        const newStock = prevStock + acceptedQty;

        // Update Part cost
        await tx.parts.update({
          where: { part_id: item.part_id },
          data: { cost_price: newAvgCost },
        });

        // Version locking for PartStock:
        const currentPartStock = await tx.partStock.findUnique({
          where: { part_id_location_id: { part_id: item.part_id, location_id: locationId } }
        });
        const currentVersion = currentPartStock ? currentPartStock.stock_version : 1;
        const newPartStockQty = (currentPartStock ? Number(currentPartStock.quantity) : 0) + acceptedQty;

        if (!currentPartStock) {
          try {
            await tx.partStock.create({
              data: {
                part_id: item.part_id,
                location_id: locationId,
                quantity: newPartStockQty,
                stock_version: 1
              }
            });
          } catch (e) {
            await BusinessEventService.logEvent({
              event_type: 'STOCK_CONFLICT_DETECTED',
              entity_type: 'PartStock',
              entity_id: item.part_id,
              user_id: userId,
              description: `Optimistic lock failure during GRN posting for part #${item.part_id} at location #${locationId}`
            }, tx);
            throw new Error('STOCK_CONFLICT_DETECTED');
          }
        } else {
          const updateRes = await tx.partStock.updateMany({
            where: {
              part_id: item.part_id,
              location_id: locationId,
              stock_version: currentVersion
            },
            data: {
              quantity: newPartStockQty,
              stock_version: currentVersion + 1
            }
          });
          if (updateRes.count === 0) {
            await BusinessEventService.logEvent({
              event_type: 'STOCK_CONFLICT_DETECTED',
              entity_type: 'PartStock',
              entity_id: item.part_id,
              user_id: userId,
              description: `Optimistic lock failure during GRN posting for part #${item.part_id} at location #${locationId}`
            }, tx);
            throw new Error('STOCK_CONFLICT_DETECTED');
          }
        }

        // Create StockMovement
        await tx.stockMovement.create({
          data: {
            partId: item.part_id,
            locationId: locationId,
            movementType: 'GRN_RECEIPT',
            quantity: acceptedQty,
            referenceType: 'GoodsReceiptNote',
            referenceId: grnId,
          },
        });

        // Create PartCostHistory
        await tx.partCostHistory.create({
          data: {
            part_id: item.part_id,
            grn_id: grnId,
            old_cost_price: prevCost,
            new_cost_price: newAvgCost,
            adjustment_type: 'GRN_RECEIPT',
            quantity_impact: acceptedQty,
            recorded_by: userId,
            notes: `Weighted avg cost updated via GRN ${grn.grn_number}. Received ${acceptedQty} units @ ₹${receivedPrice.toFixed(2)}`,
          },
        });

        // Emit PART_COST_UPDATED event (only if cost changed)
        if (Math.abs(newAvgCost - prevCost) > 0.001) {
          await BusinessEventService.logEvent({
            event_type: 'PART_COST_UPDATED',
            entity_type: 'Parts',
            entity_id: item.part_id,
            user_id: userId,
            description: `Part #${item.part_id} cost updated from ₹${prevCost.toFixed(2)} to ₹${newAvgCost.toFixed(2)} via GRN ${grn.grn_number}.`,
          }, tx);
        }

        // Update PO item received_quantity
        if (item.po_item_id) {
          await tx.purchaseOrderItems.update({
            where: { po_item_id: item.po_item_id },
            data: { received_quantity: { increment: acceptedQty } },
          });
        }

        postedItems.push({
          part_id: item.part_id,
          received_qty: acceptedQty,
          unit_price: receivedPrice,
          old_stock: prevStock,
          old_cost: prevCost,
          new_stock: newStock,
          new_avg_cost: newAvgCost,
        } as any);
      }

      // Create Journal Entry (DR: Inventory Asset, DR: GST Input Credit, CR: Accounts Payable)
      let totalValue = 0;
      const hasValidItems = grn.items.some(item => {
        const accepted = item.received_quantity - (item.damaged_quantity || 0);
        return accepted > 0;
      });

      if (hasValidItems) {
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

        const supplierGstin = grn.purchaseOrder.supplier?.gstin || '';
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
            entry_date: new Date(),
            description: `GRN Posted — ${grn.grn_number} (PO: ${grn.purchaseOrder.po_number || grn.po_id})`,
            reference_type: 'GoodsReceiptNote',
            reference_id: grnId,
          },
        });

        for (const item of grn.items) {
          const accepted = item.received_quantity - (item.damaged_quantity || 0);
          if (accepted <= 0) continue;

          const part = await tx.parts.findUnique({ where: { part_id: item.part_id } });
          const taxRate = Number(part?.tax_rate ?? 0);
          const hsn = part?.hsn_code || '';
          const itemTaxableValue = Number(item.unit_price) * accepted;
          totalValue += itemTaxableValue;
          const gstResult = GstService.calculateGst(itemTaxableValue, taxRate, isSameState);
          const itemGst = gstResult.cgst_amount + gstResult.sgst_amount + gstResult.igst_amount;
          const itemTotal = itemTaxableValue + itemGst;

          // Debit Inventory Asset
          await tx.journalEntryLine.create({
            data: {
              entry_id: je.entry_id,
              account_id: inventoryAccount.account_id,
              amount: itemTaxableValue,
              entry_type: 'debit',
            },
          });

          // Debit GST Input Credit (if tax exists)
          if (itemGst > 0) {
            const gstLine = await tx.journalEntryLine.create({
              data: {
                entry_id: je.entry_id,
                account_id: gstInputAccount.account_id,
                amount: itemGst,
                entry_type: 'debit',
              },
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
              transaction_type: 'INPUT',
            });
          }

          // Credit Accounts Payable
          await tx.journalEntryLine.create({
            data: {
              entry_id: je.entry_id,
              account_id: apAccount.account_id,
              amount: itemTotal,
              entry_type: 'credit',
            },
          });
        }
      }

      // Update PO status (PARTIALLY_RECEIVED or RECEIVED)
      const poItems = grn.purchaseOrder.items;
      const updatedPoItems = await tx.purchaseOrderItems.findMany({ where: { po_id: grn.po_id } });

      const allReceived = updatedPoItems.every(
        (poi) => Number(poi.received_quantity) >= poi.quantity
      );
      const someReceived = updatedPoItems.some((poi) => Number(poi.received_quantity) > 0);

      const newPoStatus = allReceived ? 'RECEIVED' : someReceived ? 'PARTIALLY_RECEIVED' : grn.purchaseOrder.status;

      await tx.purchaseOrder.update({
        where: { po_id: grn.po_id },
        data: { status: newPoStatus },
      });

      // Supplier Performance Update
      await this.updateSupplierPerformance(grn.purchaseOrder.supplier_id, grn, tx);

      // Mark GRN as POSTED
      const postedGrn = await tx.goodsReceiptNote.update({
        where: { grn_id: grnId },
        data: { status: 'POSTED', posted_at: new Date() },
      });

      await BusinessEventService.logEvent({
        event_type: 'GOODS_RECEIPT_POSTED',
        entity_type: 'GoodsReceiptNote',
        entity_id: grnId,
        user_id: userId,
        description: `GRN ${grn.grn_number} successfully posted. ${postedItems.length} part(s) updated. PO status → ${newPoStatus}.`,
      }, tx);

      return {
        grn: postedGrn,
        items_posted: postedItems.length,
        po_status: newPoStatus,
        total_value: totalValue,
      };
    });
  }

  // ── SUPPLIER PERFORMANCE UPDATE ─────────────────────────────────────────
  private static async updateSupplierPerformance(supplierId: number, grn: any, tx: any) {
    try {
      const po = grn.purchaseOrder;
      const expectedDelivery = po.expected_delivery ? new Date(po.expected_delivery) : null;
      const actualDelivery = new Date(grn.received_date || new Date());

      // Delivery delay check
      let deliveryDelayIncrement = 0;
      if (expectedDelivery && actualDelivery > expectedDelivery) {
        deliveryDelayIncrement = 1;
      }

      // Order accuracy: compare ordered vs received quantities
      const totalOrdered = grn.items.reduce((s: number, i: any) => s + i.ordered_quantity, 0);
      const totalReceived = grn.items.reduce((s: number, i: any) => s + i.received_quantity, 0);
      const accuracyRatio = totalOrdered > 0 ? Math.min(totalReceived / totalOrdered, 1) : 1;
      const orderAccuracyScore = parseFloat((accuracyRatio * 100).toFixed(2));

      // Defect rate
      const totalDamaged = grn.items.reduce((s: number, i: any) => s + (i.damaged_quantity || 0), 0);
      const defectRate = totalReceived > 0
        ? parseFloat(((totalDamaged / totalReceived) * 100).toFixed(2))
        : 0;

      // Upsert supplier governance performance fields
      await tx.supplierGovernance.upsert({
        where: { supplier_id: supplierId },
        create: {
          supplier_id: supplierId,
          delivery_delays_count: deliveryDelayIncrement,
          order_accuracy_score: orderAccuracyScore,
          defect_rate: defectRate,
          price_stability_score: 100,
        },
        update: {
          delivery_delays_count: { increment: deliveryDelayIncrement },
          order_accuracy_score: orderAccuracyScore,
          defect_rate: defectRate,
        },
      });

      await BusinessEventService.logEvent({
        event_type: 'SUPPLIER_PERFORMANCE_UPDATED',
        entity_type: 'Supplier',
        entity_id: supplierId,
        description: `Supplier #${supplierId} performance updated after GRN ${grn.grn_number}. Accuracy: ${orderAccuracyScore}%, Defect: ${defectRate}%.`,
      });
    } catch (err: any) {
      console.error(`[ProcurementService] Supplier performance update failed for supplier #${supplierId}:`, err.message);
      // Non-critical: don't throw, just log
    }
  }

  // ── GET SUPPLIER PERFORMANCE ───────────────────────────────────────────
  static async getSupplierPerformance(supplierId: number) {
    const governance = await prisma.supplierGovernance.findUnique({
      where: { supplier_id: supplierId },
      include: { supplier: { select: { supplier_id: true, name: true } } },
    });

    if (!governance) {
      return {
        supplier_id: supplierId,
        message: 'No performance data available.',
        delivery_delays_count: 0,
        order_accuracy_score: 100,
        defect_rate: 0,
        price_stability_score: 100,
        trust_level: 'STANDARD',
        governance_score: 80,
      };
    }

    // Count total GRNs for this supplier
    const grnCount = await prisma.goodsReceiptNote.count({
      where: { purchaseOrder: { supplier_id: supplierId }, status: 'POSTED' },
    });

    return {
      ...governance,
      grn_count: grnCount,
    };
  }
}
