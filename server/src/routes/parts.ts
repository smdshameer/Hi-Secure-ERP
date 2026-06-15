import { Router } from 'express';
import { InventoryService } from '../services/InventoryService';
import { AuthRequest, requirePermission } from '../middleware/auth';

export const partsRouter = Router();

const inventoryService = new InventoryService();

partsRouter.get('/', async (req, res) => {
  try {
    const parts = await inventoryService.getParts(req.query);
    res.json(parts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

partsRouter.get('/stats', async (_req, res) => {
  try {
    const stats = await inventoryService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

partsRouter.get('/brands', async (_req, res) => {
  try {
    const brands = await inventoryService.getBrands();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

partsRouter.get('/:id', async (req, res) => {
  try {
    const part = await inventoryService.getPartById(Number(req.params.id));
    if (!part) return res.status(404).json({ error: 'Part not found' });
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

partsRouter.post('/', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const part = await inventoryService.createPart(req.body, req.userId);
    res.status(201).json(part);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create part' });
  }
});

partsRouter.post('/import', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid payload: products must be an array.' });
    }
    const result = await inventoryService.importPartsInBulk(products, req.userId);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to import parts' });
  }
});

partsRouter.delete('/bulk', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: ids must be a non-empty array.' });
    }
    const result = await inventoryService.deletePartsBulk(ids.map(Number), req.userId);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to bulk delete parts' });
  }
});

partsRouter.put('/:id', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    await inventoryService.updatePart(Number(req.params.id), req.body, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update part' });
  }
});

partsRouter.delete('/:id', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    await inventoryService.deletePart(Number(req.params.id), req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

partsRouter.patch('/:id/stock', requirePermission('purchase:create'), async (req, res) => {
  try {
    const { quantity_change } = req.body;
    const partId = Number(req.params.id);
    await inventoryService.adjustStock(partId, Number(quantity_change), 'ManualAdjustment', partId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update stock' });
  }
});

partsRouter.post('/:id/transfer', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const partId = Number(req.params.id);
    const { from_location_id, to_location_id, quantity } = req.body;
    if (!from_location_id || !to_location_id || !quantity) {
      return res.status(400).json({ error: 'Missing parameters: from_location_id, to_location_id, and quantity are required.' });
    }
    await inventoryService.transferStock(partId, Number(from_location_id), Number(to_location_id), Number(quantity), req.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to transfer stock' });
  }
});

partsRouter.get('/:id/movements', requirePermission('purchase:create'), async (req, res) => {
  try {
    const movements = await inventoryService.getMovements(Number(req.params.id));
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});