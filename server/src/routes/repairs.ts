import { Router } from 'express';
import { RepairService } from '../services/RepairService';
import { requirePermission, requireRole, AuthRequest } from '../middleware/auth';

export const repairsRouter = Router();
const repairService = new RepairService();

repairsRouter.get('/', requirePermission('repairs:create'), async (req, res) => {
  try {
    const repairs = await repairService.getRepairs(req.query);
    res.json(repairs);
  } catch (err) {
    console.error('Get repairs error:', err);
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

repairsRouter.get('/:id', requirePermission('repairs:create'), async (req, res) => {
  try {
    const repair = await repairService.getRepairById(Number(req.params.id));
    if (!repair) return res.status(404).json({ error: 'Repair not found' });
    res.json(repair);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repair' });
  }
});

repairsRouter.post('/', requirePermission('repairs:create'), async (req: AuthRequest, res) => {
  try {
    const repair = await repairService.createRepair(req.body, req.userId);
    res.status(201).json(repair);
  } catch (err: any) {
    console.error('Create repair error:', err);
    res.status(500).json({ error: err.message || 'Failed to create repair' });
  }
});

repairsRouter.put('/:id', requirePermission('repairs:update_status'), async (req: AuthRequest, res) => {
  try {
    const repairId = Number(req.params.id);
    const repair = await repairService.updateRepair(repairId, req.body, req.userId);
    res.json(repair);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update repair' });
  }
});

repairsRouter.patch('/:id/status', requirePermission('repairs:update_status'), async (req: AuthRequest, res) => {
  try {
    const repairId = Number(req.params.id);
    const status = String(req.body.status);
    const repair = await repairService.updateStatus(repairId, status, req.userId);
    res.json(repair);
  } catch (err: any) {
    console.error('Update status error:', err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
});

repairsRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await repairService.deleteRepair(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete repair' });
  }
});

repairsRouter.get('/meta/brands', requirePermission('repairs:create'), async (_req, res) => {
  try {
    const brands = await repairService.getBrands();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

repairsRouter.get('/meta/technicians', requirePermission('repairs:create'), async (_req, res) => {
  try {
    const technicians = await repairService.getTechnicians();
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});