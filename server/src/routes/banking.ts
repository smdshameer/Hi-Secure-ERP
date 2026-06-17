import { Router } from 'express';
import { BankingService } from '../services/BankingService';
import { requirePermission } from '../middleware/auth';

export const bankingRouter = Router();
const bankingService = new BankingService();

// Get virtual accounts dynamically grouped by bank name + account number
bankingRouter.get('/accounts', requirePermission('accounting:view'), async (_req, res) => {
  try {
    const accounts = await bankingService.getAccounts();
    return res.json(accounts);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get transactions for a virtual account (or all)
bankingRouter.get('/transactions', requirePermission('accounting:view'), async (req, res) => {
  try {
    const mapped = await bankingService.getTransactions(req.query);
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Original routes for backwards compatibility
bankingRouter.get('/', requirePermission('accounting:view'), async (req, res) => {
  try {
    const transactions = await bankingService.getRawTransactions(req.query);
    return res.json(transactions);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

bankingRouter.post('/', requirePermission('accounting:create'), async (req, res) => {
  try {
    const tx = await bankingService.createTransaction(req.body);
    return res.status(201).json(tx);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

bankingRouter.patch('/:id/status', requirePermission('accounting:create'), async (req, res) => {
  try {
    await bankingService.updateTransactionStatus(Number(req.params.id), String(req.body.status));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

bankingRouter.delete('/:id', requirePermission('accounting:delete'), async (req, res) => {
  try {
    await bankingService.deleteTransaction(Number(req.params.id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Import reconciliation service and multer
import { BankReconciliationService } from '../services/BankReconciliationService';
import multer from 'multer';
const upload = multer();

// GET /reconciliation/status
bankingRouter.get('/reconciliation/status', requirePermission('accounting:view'), async (_req, res) => {
  try {
    const status = await BankReconciliationService.getReconciliationStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reconciliation status' });
  }
});

// POST /reconciliation/auto-match
bankingRouter.post('/reconciliation/auto-match', requirePermission('accounting:create'), async (_req, res) => {
  try {
    const result = await BankReconciliationService.runAutoMatch();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to run auto-match' });
  }
});

// POST /reconciliation/import-csv
bankingRouter.post('/reconciliation/import-csv', requirePermission('accounting:create'), async (req, res) => {
  try {
    const { csv_content, bank_name, account_number } = req.body;
    const result = await BankReconciliationService.importCsv(csv_content, bank_name, account_number);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to import CSV' });
  }
});

// POST /reconciliation/import-excel
bankingRouter.post('/reconciliation/import-excel', requirePermission('accounting:create'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { bank_name, account_number } = req.body;
    const result = await BankReconciliationService.importExcel(req.file.buffer, bank_name, account_number);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to import Excel' });
  }
});