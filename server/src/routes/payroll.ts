import { Router } from 'express';
import { prisma } from '../index';

export const payrollRouter = Router();
payrollRouter.get('/', async (_req, res) => {
  try { res.json(await prisma.payrollEntry.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] })); }
  catch (err: any) {
    if (err.code === 'P2021') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});
payrollRouter.post('/', async (req, res) => {
  try {
    const entry = await prisma.payrollEntry.create({ data: { employee_name: req.body.employee_name, month: Number(req.body.month), year: Number(req.body.year), basic_salary: Number(req.body.basic_salary), allowances: Number(req.body.allowances || 0), deductions: Number(req.body.deductions || 0), net_salary: Number(req.body.net_salary), payment_date: req.body.payment_date ? new Date(req.body.payment_date) : null, status: req.body.status || 'pending', notes: req.body.notes || null } });
    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ error: 'Failed to create payroll entry' }); }
});
payrollRouter.put('/:id', async (req, res) => {
  try { await prisma.payrollEntry.update({ where: { entry_id: Number(req.params.id) }, data: req.body }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to update payroll entry' }); }
});
payrollRouter.delete('/:id', async (req, res) => {
  try { await prisma.payrollEntry.delete({ where: { entry_id: Number(req.params.id) } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to delete payroll entry' }); }
});