import { Router } from 'express';
import { AccountingService } from '../services/AccountingService';
import { requirePermission } from '../middleware/auth';

export const accountingRouter = Router();
const accountingService = new AccountingService();

// Get General Ledger
accountingRouter.get('/ledger', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await accountingService.getLedger(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

// Get Journal Entries
accountingRouter.get('/journal', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await accountingService.getJournal(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

// Get Trial Balance
accountingRouter.get('/trial-balance', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await accountingService.getTrialBalance(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

// GET / for backward compatibility
accountingRouter.get('/', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await accountingService.getLedger(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST /
accountingRouter.post('/', requirePermission('accounting:create'), async (req, res) => {
  try {
    const entry = await accountingService.postJournalEntry(req.body);
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create entry' });
  }
});

// DELETE /:id
accountingRouter.delete('/:id', requirePermission('accounting:delete'), async (req, res) => {
  try {
    await accountingService.deleteJournalEntry(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete entry' });
  }
});

// GET /periods
accountingRouter.get('/periods', requirePermission('accounting:view'), async (_req, res) => {
  try {
    const data = await accountingService.getFiscalPeriods();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch fiscal periods' });
  }
});

// POST /periods
accountingRouter.post('/periods', requirePermission('accounting:create'), async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    const period = await accountingService.createFiscalPeriod(name, start_date, end_date);
    res.status(201).json(period);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create fiscal period' });
  }
});

// PATCH /periods/:id/lock
accountingRouter.patch('/periods/:id/lock', requirePermission('accounting:create'), async (req, res) => {
  try {
    const period = await accountingService.lockFiscalPeriod(Number(req.params.id));
    res.json(period);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to lock fiscal period' });
  }
});

// PATCH /periods/:id/unlock
accountingRouter.patch('/periods/:id/unlock', requirePermission('accounting:create'), async (req, res) => {
  try {
    const period = await accountingService.unlockFiscalPeriod(Number(req.params.id));
    res.json(period);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unlock fiscal period' });
  }
});

// POST /reverse/:id
accountingRouter.post('/reverse/:id', requirePermission('accounting:create'), async (req, res) => {
  try {
    const entry = await accountingService.reverseJournalEntry(Number(req.params.id));
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reverse entry' });
  }
});