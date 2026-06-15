import { Router } from 'express';
import { ReturnService } from '../services/ReturnService';
import { requirePermission, AuthRequest } from '../middleware/auth';

export const returnsRouter = Router();

// POST /api/returns/sales
returnsRouter.post('/sales', requirePermission('invoice:create'), async (req: AuthRequest, res) => {
  try {
    const { invoice_id, items } = req.body;
    if (!invoice_id || !items || !items.length) {
      return res.status(400).json({ error: 'Invoice ID and items list are required' });
    }
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }
    const result = await ReturnService.executeSalesReturn(Number(invoice_id), items, userId);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/returns/purchase
returnsRouter.post('/purchase', requirePermission('purchase:receive'), async (req: AuthRequest, res) => {
  try {
    const { po_id, items } = req.body;
    if (!po_id || !items || !items.length) {
      return res.status(400).json({ error: 'Purchase Order ID and items list are required' });
    }
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }
    const result = await ReturnService.executePurchaseReturn(Number(po_id), items, userId);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/returns/sales
returnsRouter.get('/sales', requirePermission('invoice:view'), async (_req, res) => {
  try {
    const returns = await ReturnService.getSalesReturns();
    res.json(returns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/returns/purchase
returnsRouter.get('/purchase', requirePermission('purchase:receive'), async (_req, res) => {
  try {
    const returns = await ReturnService.getPurchaseReturns();
    res.json(returns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});