import { Router } from 'express';
import { PurchaseService } from '../services/PurchaseService';
import { requirePermission } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

export const purchasesRouter = Router();
const purchaseService = new PurchaseService();

purchasesRouter.get('/', requirePermission('purchase:create'), async (req, res) => {
  try {
    const orders = await purchaseService.getPurchases(req.query);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

purchasesRouter.get('/:id', requirePermission('purchase:create'), async (req, res) => {
  try {
    const order = await purchaseService.getPurchaseById(Number(req.params.id));
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

purchasesRouter.post('/', requirePermission('purchase:create'), async (req: AuthRequest, res) => {
  try {
    const order = await purchaseService.createPurchase(req.body, req.userId);
    res.status(201).json(order);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create purchase order' });
  }
});

purchasesRouter.put('/:id', requirePermission('purchase:create'), async (req, res) => {
  try {
    const poId = Number(req.params.id);
    const order = await purchaseService.updatePurchase(poId, req.body);
    res.json(order);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update purchase order' });
  }
});

purchasesRouter.patch('/:id/status', requirePermission('purchase:receive'), async (req, res) => {
  try {
    const poId = Number(req.params.id);
    const status = String(req.body.status);
    const order = await purchaseService.updateStatus(poId, status);
    res.json(order);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
});

purchasesRouter.delete('/:id', requirePermission('purchase:create'), async (req, res) => {
  try {
    const poId = Number(req.params.id);
    await purchaseService.deletePurchase(poId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete purchase order' });
  }
});