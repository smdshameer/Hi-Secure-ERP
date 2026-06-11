import { Router } from 'express';
import { prisma } from '../index';

export const locationsRouter = Router();
locationsRouter.get('/', async (_req, res) => {
  try { res.json(await prisma.location.findMany({ orderBy: { name: 'asc' } })); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch locations' }); }
});
locationsRouter.post('/', async (req, res) => {
  try {
    const loc = await prisma.location.create({
      data: { location_code: req.body.location_code || `LOC-${Date.now()}`, name: req.body.name, address: req.body.address || null, phone: req.body.phone || null, email: req.body.email || null, gstin: req.body.gstin || null, is_main: req.body.is_main || false },
      select: { location_id: true, location_code: true }
    });
    res.status(201).json(loc);
  } catch (err) { res.status(500).json({ error: 'Failed to create location' }); }
});
locationsRouter.put('/:id', async (req, res) => {
  try { await prisma.location.update({ where: { location_id: Number(req.params.id) }, data: req.body }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to update location' }); }
});
locationsRouter.delete('/:id', async (req, res) => {
  try { await prisma.location.delete({ where: { location_id: Number(req.params.id) } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to delete location' }); }
});