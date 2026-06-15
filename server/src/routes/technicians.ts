import { Router } from 'express';
import { TechnicianService } from '../services/TechnicianService';
import { requirePermission } from '../middleware/auth';

export const techniciansRouter = Router();
const technicianService = new TechnicianService();

techniciansRouter.get('/', async (_req, res) => {
  try {
    const techs = await technicianService.getTechnicians();
    res.json(techs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

techniciansRouter.post('/', requirePermission('repairs:update_status'), async (req, res) => {
  try {
    const tech = await technicianService.createTechnician(req.body);
    res.status(201).json(tech);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

techniciansRouter.put('/:id', requirePermission('repairs:update_status'), async (req, res) => {
  try {
    await technicianService.updateTechnician(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update technician' });
  }
});

techniciansRouter.delete('/:id', requirePermission('repairs:update_status'), async (req, res) => {
  try {
    await technicianService.deleteTechnician(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});