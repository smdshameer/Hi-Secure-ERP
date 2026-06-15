import { Router } from 'express';
import { PayrollService } from '../services/PayrollService';
import { requirePermission } from '../middleware/auth';

export const payrollRouter = Router();
const payrollService = new PayrollService();

// Secure all payroll routes with ledger:view permission
payrollRouter.use(requirePermission('ledger:view'));

payrollRouter.get('/', async (_req, res) => {
  try {
    const entries = await payrollService.getEntries();
    res.json(entries);
  } catch (err: any) {
    if (err.code === 'P2021') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

payrollRouter.post('/', async (req, res) => {
  try {
    const entry = await payrollService.createEntry(req.body);
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create payroll entry' });
  }
});

payrollRouter.put('/:id', async (req, res) => {
  try {
    await payrollService.updateEntry(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payroll entry' });
  }
});

payrollRouter.delete('/:id', async (req, res) => {
  try {
    await payrollService.deleteEntry(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payroll entry' });
  }
});