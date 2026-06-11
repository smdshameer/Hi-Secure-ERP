import { Router } from 'express';
import { prisma } from '../index';

export const companiesRouter = Router();
companiesRouter.get('/', async (_req, res) => {
  try { res.json(await prisma.company.findMany({ orderBy: { name: 'asc' } })); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch companies' }); }
});
companiesRouter.post('/', async (req, res) => {
  try {
    const company = await prisma.company.create({
      data: { name: req.body.name, code: req.body.code || `CO-${Date.now()}`, address: req.body.address || null, phone: req.body.phone || null, email: req.body.email || null, gstin: req.body.gstin || null, pan: req.body.pan || null, bank_name: req.body.bank_name || null, bank_account: req.body.bank_account || null, ifsc_code: req.body.ifsc_code || null },
      select: { company_id: true, name: true }
    });
    res.status(201).json(company);
  } catch (err) { res.status(500).json({ error: 'Failed to create company' }); }
});
companiesRouter.put('/:id', async (req, res) => {
  try { await prisma.company.update({ where: { company_id: Number(req.params.id) }, data: req.body }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to update company' }); }
});
companiesRouter.delete('/:id', async (req, res) => {
  try { await prisma.company.delete({ where: { company_id: Number(req.params.id) } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to delete company' }); }
});