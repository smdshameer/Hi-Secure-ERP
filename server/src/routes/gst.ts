import { Router } from 'express';
import { GstService } from '../services/GstService';
import { requirePermission } from '../middleware/auth';

export const gstRouter = Router();

// GET /purchase-register
gstRouter.get('/purchase-register', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getPurchaseRegister(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch purchase register' });
  }
});

// GET /sales-register
gstRouter.get('/sales-register', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getSalesRegister(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch sales register' });
  }
});

// GET /hsn-summary
gstRouter.get('/hsn-summary', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getHsnSummary(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch HSN summary' });
  }
});

// GET /gstr1
gstRouter.get('/gstr1', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getGstr1(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch GSTR-1 data' });
  }
});

// GET /gstr3b
gstRouter.get('/gstr3b', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getGstr3b(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch GSTR-3B data' });
  }
});
