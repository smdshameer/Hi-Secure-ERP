import { Router } from 'express';
import { AccountingService } from '../services/AccountingService';
import { requirePermission } from '../middleware/auth';

export const accountingRouter = Router();
const accountingService = new AccountingService();

// Apply permission check to all accounting routes
accountingRouter.use(requirePermission('ledger:view'));

// Get General Ledger
accountingRouter.get('/ledger', async (req, res) => {
  try {
    const data = await accountingService.getLedger(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

// Get Journal Entries
accountingRouter.get('/journal', async (req, res) => {
  try {
    const data = await accountingService.getJournal(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

// Get Trial Balance
accountingRouter.get('/trial-balance', async (req, res) => {
  try {
    const data = await accountingService.getTrialBalance(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

// GET / for backward compatibility
accountingRouter.get('/', async (req, res) => {
  try {
    const data = await accountingService.getLedger(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST /
accountingRouter.post('/', async (req, res) => {
  try {
    const entry = await accountingService.postJournalEntry(req.body);
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create entry' });
  }
});

// DELETE /:id
accountingRouter.delete('/:id', async (req, res) => {
  try {
    await accountingService.deleteJournalEntry(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete entry' });
  }
});