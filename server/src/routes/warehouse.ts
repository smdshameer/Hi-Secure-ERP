import { Router } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { WarehouseService } from '../services/WarehouseService';
import { InventoryOptimizationService } from '../services/InventoryOptimizationService';
import { prisma } from '../index';

export const warehouseRouter = Router();
const warehouseService = new WarehouseService();
const optimizationService = new InventoryOptimizationService();

// ── WAREHOUSE (LOCATION) CRUD ──────────────────────────────────────────
warehouseRouter.get('/warehouses', requirePermission('inventory:read'), async (_req: AuthRequest, res) => {
  try {
    const list = await warehouseService.getWarehouses();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

warehouseRouter.get('/warehouses/:id', requirePermission('inventory:read'), async (req: AuthRequest, res) => {
  try {
    const wh = await warehouseService.getWarehouseById(Number(req.params.id));
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });
    res.json(wh);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

warehouseRouter.post('/warehouses', requirePermission('warehouse:manage'), async (req: AuthRequest, res) => {
  try {
    const wh = await warehouseService.createWarehouse(req.body, req.userId);
    res.status(201).json(wh);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.put('/warehouses/:id', requirePermission('warehouse:manage'), async (req: AuthRequest, res) => {
  try {
    const wh = await warehouseService.updateWarehouse(Number(req.params.id), req.body, req.userId);
    res.json(wh);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.delete('/warehouses/:id', requirePermission('warehouse:manage'), async (req: AuthRequest, res) => {
  try {
    await warehouseService.deleteWarehouse(Number(req.params.id), req.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── BIN LOCATION CRUD ───────────────────────────────────────────────────
warehouseRouter.post('/locations', requirePermission('warehouse:manage'), async (req: AuthRequest, res) => {
  try {
    const bin = await warehouseService.createWarehouseLocation(req.body);
    res.status(201).json(bin);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.get('/locations/:locationId', requirePermission('inventory:read'), async (req: AuthRequest, res) => {
  try {
    const list = await warehouseService.getWarehouseLocations(Number(req.params.locationId));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── STOCK RESERVATION ──────────────────────────────────────────────────
warehouseRouter.post('/reservations', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const reservation = await warehouseService.reserveStock(req.body, req.userId);
    res.status(201).json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/reservations/:id/release', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const reservation = await warehouseService.releaseReservation(Number(req.params.id), req.userId);
    res.json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/reservations/:id/fulfill', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const reservation = await warehouseService.fulfillReservation(Number(req.params.id), req.userId);
    res.json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── STOCK TRANSFERS ─────────────────────────────────────────────────────
warehouseRouter.post('/transfers', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const transfer = await warehouseService.createStockTransfer({
      ...req.body,
      requested_by: req.userId || req.body.requested_by
    });
    res.status(201).json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/transfers/:id/approve', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const transfer = await warehouseService.approveStockTransfer(Number(req.params.id), req.userId || 1);
    res.json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/transfers/:id/ship', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const transfer = await warehouseService.shipStockTransfer(Number(req.params.id), req.userId);
    res.json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/transfers/:id/complete', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const transfer = await warehouseService.completeStockTransfer(Number(req.params.id), req.userId || 1);
    res.json(transfer);
  } catch (err: any) {
    if (err.message === 'TRANSFER_ALREADY_PROCESSED' || err.message === 'STOCK_CONFLICT_DETECTED' || err.message === 'NEGATIVE_STOCK_PREVENTED') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

warehouseRouter.post('/transfers/:id/cancel', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const transfer = await warehouseService.cancelStockTransfer(Number(req.params.id), req.userId);
    res.json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── CYCLE COUNTING ──────────────────────────────────────────────────────
warehouseRouter.post('/cycle-counts', requirePermission('inventory:count'), async (req: AuthRequest, res) => {
  try {
    const { location_id, part_ids, planned_date, notes } = req.body;
    const count = await optimizationService.createCycleCount(
      Number(location_id),
      part_ids.map(Number),
      new Date(planned_date),
      req.userId,
      notes
    );
    res.status(201).json(count);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/cycle-counts/:id/start', requirePermission('inventory:count'), async (req: AuthRequest, res) => {
  try {
    const count = await optimizationService.startCycleCount(Number(req.params.id));
    res.json(count);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/cycle-counts/:id/record', requirePermission('inventory:count'), async (req: AuthRequest, res) => {
  try {
    const { part_id, counted_qty } = req.body;
    const item = await optimizationService.recordCountItem(
      Number(req.params.id),
      Number(part_id),
      Number(counted_qty)
    );
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/cycle-counts/:id/submit', requirePermission('inventory:count'), async (req: AuthRequest, res) => {
  try {
    const count = await optimizationService.submitCycleCount(Number(req.params.id), req.userId || 1);
    res.json(count);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

warehouseRouter.post('/cycle-counts/:id/approve', requirePermission('warehouse:manage'), async (req: AuthRequest, res) => {
  try {
    const count = await optimizationService.approveCycleCount(Number(req.params.id), req.userId || 1);
    res.json(count);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── INVENTORY OPTIMIZATION REPORTS ───────────────────────────────────────
warehouseRouter.get('/optimization/abc-classification', requirePermission('inventory:read'), async (_req: AuthRequest, res) => {
  try {
    const report = await optimizationService.getAbcClassification();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

warehouseRouter.get('/optimization/aging-analysis', requirePermission('inventory:read'), async (_req: AuthRequest, res) => {
  try {
    const report = await optimizationService.getStockAgingAnalysis();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

warehouseRouter.get('/optimization/dead-stock', requirePermission('inventory:read'), async (req: AuthRequest, res) => {
  try {
    const report = await optimizationService.getDeadStockReport(
      req.query.days ? Number(req.query.days) : undefined
    );
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

warehouseRouter.get('/optimization/reorder-suggestions', requirePermission('inventory:read'), async (_req: AuthRequest, res) => {
  try {
    const report = await optimizationService.getReorderSuggestions();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

warehouseRouter.get('/optimization/valuation', requirePermission('inventory:read'), async (_req: AuthRequest, res) => {
  try {
    const report = await optimizationService.getValuationReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── AUDIT TRAIL ──────────────────────────────────────────────────────────
warehouseRouter.get('/audit-trail', requirePermission('inventory:read'), async (_req: AuthRequest, res) => {
  try {
    const events = await prisma.businessEvent.findMany({
      where: {
        OR: [
          { entity_type: 'StockTransfer' },
          { entity_type: 'CycleCount' },
          { entity_type: 'StockReservation' },
          { entity_type: 'PartStock' },
          { event_type: { startsWith: 'STOCK_' } },
          { event_type: { startsWith: 'TRANSFER_' } },
          { event_type: { startsWith: 'CYCLE_' } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
