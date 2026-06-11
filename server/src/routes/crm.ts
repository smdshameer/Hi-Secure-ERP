import { Router } from 'express';
import { prisma } from '../index';

export const crmRouter = Router();
crmRouter.get('/', async (req, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.source) where.source = String(req.query.source);
    res.json(await prisma.crmContact.findMany({ where, include: { customer: { select: { name: true, phone: true } } }, orderBy: { created_at: 'desc' } }));
  } catch (err: any) {
    if (err.code === 'P2021') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch CRM contacts' });
  }
});
crmRouter.post('/', async (req, res) => {
  try {
    const contact = await prisma.crmContact.create({ data: { customer_id: req.body.customer_id ? Number(req.body.customer_id) : null, name: req.body.name, phone: req.body.phone || null, email: req.body.email || null, company: req.body.company || null, source: req.body.source || null, status: req.body.status || 'new', notes: req.body.notes || null, assigned_to: req.body.assigned_to || null } });
    res.status(201).json(contact);
  } catch (err) { res.status(500).json({ error: 'Failed to create contact' }); }
});
crmRouter.patch('/:id/status', async (req, res) => {
  try { await prisma.crmContact.update({ where: { contact_id: Number(req.params.id) }, data: { status: String(req.body.status) } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to update status' }); }
});
crmRouter.put('/:id', async (req, res) => {
  try { await prisma.crmContact.update({ where: { contact_id: Number(req.params.id) }, data: req.body }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to update contact' }); }
});
crmRouter.delete('/:id', async (req, res) => {
  try { await prisma.crmContact.delete({ where: { contact_id: Number(req.params.id) } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to delete contact' }); }
});