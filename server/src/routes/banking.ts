import { Router } from 'express';
import { BankingService } from '../services/BankingService';
import { requirePermission } from '../middleware/auth';

export const bankingRouter = Router();
const bankingService = new BankingService();

// Apply ledger:view permission to all banking routes
bankingRouter.use(requirePermission('ledger:view'));

// Get virtual accounts dynamically grouped by bank name + account number
bankingRouter.get('/accounts', async (_req, res) => {
  try {
    const accounts = await bankingService.getAccounts();
    return res.json(accounts);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get transactions for a virtual account (or all)
bankingRouter.get('/transactions', async (req, res) => {
  try {
    const mapped = await bankingService.getTransactions(req.query);
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Original routes for backwards compatibility
bankingRouter.get('/', async (req, res) => {
  try {
    const transactions = await bankingService.getRawTransactions(req.query);
    return res.json(transactions);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

bankingRouter.post('/', async (req, res) => {
  try {
    const tx = await bankingService.createTransaction(req.body);
    return res.status(201).json(tx);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

bankingRouter.patch('/:id/status', async (req, res) => {
  try {
    await bankingService.updateTransactionStatus(Number(req.params.id), String(req.body.status));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

bankingRouter.delete('/:id', async (req, res) => {
  try {
    await bankingService.deleteTransaction(Number(req.params.id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
});