import { Router } from 'express';
import { prisma } from '../index';

export const techniciansRouter = Router();
techniciansRouter.get('/', async (_req, res) => {
  try { res.json(await prisma.technician.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } })); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch technicians' }); }
});
techniciansRouter.post('/', async (req, res) => {
  try {
    const tech = await prisma.technician.create({ data: { name: req.body.name, phone: req.body.phone || null, specialization: req.body.specialization || null }, select: { technician_id: true, name: true } });
    res.status(201).json(tech);
  } catch (err) { res.status(500).json({ error: 'Failed to create technician' }); }
});
techniciansRouter.put('/:id', async (req, res) => {
  try { await prisma.technician.update({ where: { technician_id: Number(req.params.id) }, data: { name: req.body.name, phone: req.body.phone || null, specialization: req.body.specialization || null, is_active: req.body.is_active } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to update technician' }); }
});
techniciansRouter.delete('/:id', async (req, res) => {
  try { await prisma.technician.update({ where: { technician_id: Number(req.params.id) }, data: { is_active: false } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to delete technician' }); }
});