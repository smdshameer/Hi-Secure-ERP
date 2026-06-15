import { Router } from 'express';
import { DeliveryChallanService } from '../services/DeliveryChallanService';
import { requirePermission, AuthRequest } from '../middleware/auth';

export const deliveryChallansRouter = Router();
const challanService = new DeliveryChallanService();

deliveryChallansRouter.get('/', async (req, res) => {
  try {
    const challans = await challanService.getChallans(req.query);
    res.json(challans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challans' });
  }
});

deliveryChallansRouter.get('/:id', async (req, res) => {
  try {
    const challan = await challanService.getChallanById(Number(req.params.id));
    if (!challan) return res.status(404).json({ error: 'Challan not found' });
    res.json(challan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challan' });
  }
});

deliveryChallansRouter.post('/', requirePermission('invoice:create'), async (req: AuthRequest, res) => {
  try {
    const challan = await challanService.createChallan(req.body, req.userId);
    res.status(201).json(challan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create challan' });
  }
});

deliveryChallansRouter.put('/:id', requirePermission('invoice:create'), async (req, res) => {
  try {
    await challanService.updateChallan(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update challan' });
  }
});

deliveryChallansRouter.patch('/:id/status', requirePermission('invoice:create'), async (req, res) => {
  try {
    await challanService.updateChallanStatus(Number(req.params.id), String(req.body.status));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

deliveryChallansRouter.delete('/:id', requirePermission('invoice:create'), async (req, res) => {
  try {
    await challanService.deleteChallan(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete challan' });
  }
});