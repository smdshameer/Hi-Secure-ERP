/**
 * procurement.ts
 * Phase 2C — Procurement Router
 * Mounted at: /api/procurement
 */

import { Router } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { ProcurementService } from '../services/ProcurementService';

export const procurementRouter = Router();

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE REQUISITIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/procurement/requisitions
 * Create a new Purchase Requisition
 */
procurementRouter.post('/requisitions', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const pr = await ProcurementService.createRequisition({
      ...req.body,
      requested_by: req.userId || req.body.requested_by,
    });
    res.status(201).json(pr);
  } catch (err: any) {
    console.error('[procurement] POST /requisitions error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/procurement/requisitions
 * List Purchase Requisitions
 */
procurementRouter.get('/requisitions', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const prs = await ProcurementService.getRequisitions(req.query as any);
    res.json(prs);
  } catch (err: any) {
    console.error('[procurement] GET /requisitions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/requisitions/:id/approve
 * Approve a Purchase Requisition
 */
procurementRouter.post('/requisitions/:id/approve', requirePermission('purchase:approve'), async (req: AuthRequest, res) => {
  try {
    const prId = Number(req.params.id);
    const userId = req.userId!;
    const pr = await ProcurementService.approveRequisition(prId, userId);
    res.json(pr);
  } catch (err: any) {
    console.error('[procurement] POST /requisitions/:id/approve error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/requisitions/:id/reject
 * Reject a Purchase Requisition
 */
procurementRouter.post('/requisitions/:id/reject', requirePermission('purchase:approve'), async (req: AuthRequest, res) => {
  try {
    const prId = Number(req.params.id);
    const userId = req.userId!;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'VALIDATION_ERROR: Rejection reason is required.' });
    const pr = await ProcurementService.rejectRequisition(prId, userId, reason);
    res.json(pr);
  } catch (err: any) {
    console.error('[procurement] POST /requisitions/:id/reject error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/requisitions/:id/convert-to-po
 * Convert approved Requisition to Purchase Order
 */
procurementRouter.post('/requisitions/:id/convert-to-po', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const prId = Number(req.params.id);
    const userId = req.userId!;
    const result = await ProcurementService.convertRequisitionToPO(prId, userId, req.body);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('[procurement] POST /requisitions/:id/convert-to-po error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/procurement/pos
 * Create a Purchase Order
 */
procurementRouter.post('/pos', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const po = await ProcurementService.createPurchaseOrder({
      ...req.body,
      created_by: req.userId,
    });
    res.status(201).json(po);
  } catch (err: any) {
    console.error('[procurement] POST /pos error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/procurement/pos
 * List Purchase Orders
 */
procurementRouter.get('/pos', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const pos = await ProcurementService.getPurchaseOrders(req.query as any);
    res.json(pos);
  } catch (err: any) {
    console.error('[procurement] GET /pos error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/pos/:id/approve
 * Approve a Purchase Order
 */
procurementRouter.post('/pos/:id/approve', requirePermission('purchase:approve'), async (req: AuthRequest, res) => {
  try {
    const poId = Number(req.params.id);
    const po = await ProcurementService.approvePurchaseOrder(poId, req.userId!);
    res.json(po);
  } catch (err: any) {
    console.error('[procurement] POST /pos/:id/approve error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/pos/:id/send
 * Send Purchase Order to supplier
 */
procurementRouter.post('/pos/:id/send', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const poId = Number(req.params.id);
    const po = await ProcurementService.sendPurchaseOrder(poId, req.userId!);
    res.json(po);
  } catch (err: any) {
    console.error('[procurement] POST /pos/:id/send error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/pos/:id/cancel
 * Cancel a Purchase Order
 */
procurementRouter.post('/pos/:id/cancel', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const poId = Number(req.params.id);
    const po = await ProcurementService.cancelPurchaseOrder(poId, req.userId!);
    res.json(po);
  } catch (err: any) {
    console.error('[procurement] POST /pos/:id/cancel error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/pos/generate-from-catalog
 * Auto-generate PO from low-stock catalog items
 */
procurementRouter.post('/pos/generate-from-catalog', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const result = await ProcurementService.generatePOFromCatalog({
      ...req.body,
      created_by: req.userId,
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.error('[procurement] POST /pos/generate-from-catalog error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GOODS RECEIPT NOTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/procurement/grns
 * Create a GRN
 */
procurementRouter.post('/grns', requirePermission('purchase:receive'), async (req: AuthRequest, res) => {
  try {
    const grn = await ProcurementService.createGRN({
      ...req.body,
      received_by: req.userId || req.body.received_by,
    });
    res.status(201).json(grn);
  } catch (err: any) {
    console.error('[procurement] POST /grns error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/procurement/grns
 * List GRNs
 */
procurementRouter.get('/grns', requirePermission('purchase:receive'), async (req: AuthRequest, res) => {
  try {
    const grns = await ProcurementService.getGRNs(req.query as any);
    res.json(grns);
  } catch (err: any) {
    console.error('[procurement] GET /grns error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/grns/:id/verify
 * Verify a GRN (DRAFT → VERIFIED)
 */
procurementRouter.post('/grns/:id/verify', requirePermission('purchase:receive'), async (req: AuthRequest, res) => {
  try {
    const grnId = Number(req.params.id);
    const grn = await ProcurementService.verifyGRN(grnId, req.userId!);
    res.json(grn);
  } catch (err: any) {
    console.error('[procurement] POST /grns/:id/verify error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/procurement/grns/:id/post
 * Post a GRN (VERIFIED → POSTING → POSTED)
 * SAFETY: GRN Idempotency enforced — rejects if POSTING or POSTED
 */
procurementRouter.post('/grns/:id/post', requirePermission('purchase:receive'), async (req: AuthRequest, res) => {
  try {
    const grnId = Number(req.params.id);
    const result = await ProcurementService.postGRN(grnId, req.userId!);
    res.json(result);
  } catch (err: any) {
    console.error('[procurement] POST /grns/:id/post error:', err.message);
    const isAlreadyProcessed = err.message.includes('GRN_ALREADY_PROCESSED');
    res.status(isAlreadyProcessed ? 409 : 400).json({
      error: err.message,
      code: isAlreadyProcessed ? 'GRN_ALREADY_PROCESSED' : 'GRN_POST_ERROR',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER PERFORMANCE
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/procurement/suppliers/:id/performance
 * Get supplier performance metrics
 */
procurementRouter.get('/suppliers/:id/performance', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const supplierId = Number(req.params.id);
    const performance = await ProcurementService.getSupplierPerformance(supplierId);
    res.json(performance);
  } catch (err: any) {
    console.error('[procurement] GET /suppliers/:id/performance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
