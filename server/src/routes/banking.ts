import { Router } from 'express';
import { prisma } from '../index';

export const bankingRouter = Router();

// Get virtual accounts dynamically grouped by bank name + account number
bankingRouter.get('/accounts', async (_req, res) => {
  try {
    const transactions = await prisma.bankTransaction.findMany();
    
    const groups: Record<string, { bankName: string; accountNumber: string; balance: number; firstTxId: number }> = {};
    
    transactions.forEach(t => {
      const key = `${t.bank_name || 'Cash'}::${t.account_number || 'Cash'}`;
      if (!groups[key]) {
        groups[key] = {
          bankName: t.bank_name || 'Cash',
          accountNumber: t.account_number || 'Cash',
          balance: 0,
          firstTxId: t.transaction_id
        };
      }
      
      const amount = Number(t.amount);
      const type = t.transaction_type.toLowerCase();
      if (type === 'deposit' || type === 'credit' || type === 'transfer_in') {
        groups[key].balance += amount;
      } else {
        groups[key].balance -= amount;
      }
    });

    const accounts = Object.values(groups).map((g, idx) => ({
      id: g.firstTxId || (idx + 1),
      name: g.bankName === 'Cash' ? 'Cash Wallet' : `${g.bankName} Account`,
      bankName: g.bankName,
      accountNumber: g.accountNumber,
      ifsc: g.bankName === 'Cash' ? '—' : 'IFSC0001234',
      type: g.bankName === 'Cash' ? 'cash' : 'current',
      balance: g.balance,
      currency: 'INR'
    }));

    return res.json(accounts);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get transactions for a virtual account (or all)
bankingRouter.get('/transactions', async (req, res) => {
  try {
    const { accountId, search } = req.query;
    
    let where: any = {};
    
    if (accountId && accountId !== 'all') {
      const id = Number(accountId);
      const representative = await prisma.bankTransaction.findUnique({
        where: { transaction_id: id }
      });
      
      if (representative) {
        where.bank_name = representative.bank_name;
        where.account_number = representative.account_number;
      }
    }
    
    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { reference: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    
    const transactions = await prisma.bankTransaction.findMany({
      where,
      orderBy: { transaction_date: 'desc' }
    });
    
    // To compute balance at each transaction point, compute chronologically first
    const allTxs = await prisma.bankTransaction.findMany({
      orderBy: { transaction_date: 'asc' }
    });
    
    const runningBalances: Record<string, number> = {};
    const txBalances: Record<number, number> = {};
    
    allTxs.forEach(t => {
      const key = `${t.bank_name || 'Cash'}::${t.account_number || 'Cash'}`;
      if (!runningBalances[key]) {
        runningBalances[key] = 0;
      }
      
      const amount = Number(t.amount);
      const type = t.transaction_type.toLowerCase();
      if (type === 'deposit' || type === 'credit' || type === 'transfer_in') {
        runningBalances[key] += amount;
      } else {
        runningBalances[key] -= amount;
      }
      
      txBalances[t.transaction_id] = runningBalances[key];
    });
    
    const mapped = transactions.map(t => {
      const type = t.transaction_type.toLowerCase();
      return {
        id: t.transaction_id,
        accountId: accountId ? Number(accountId) : t.transaction_id,
        accountName: t.bank_name || 'Cash',
        date: t.transaction_date.toISOString(),
        description: t.description || 'Transaction',
        reference: t.reference || `TX-${t.transaction_id}`,
        type: (type === 'deposit' || type === 'credit' || type === 'transfer_in') ? 'credit' : 'debit',
        amount: Number(t.amount),
        balance: txBalances[t.transaction_id] || 0,
        category: 'other'
      };
    });
    
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Original routes for backwards compatibility/other modules
bankingRouter.get('/', async (req, res) => {
  try {
    const where: any = {};
    if (req.query.bank_name) where.bank_name = { contains: String(req.query.bank_name), mode: 'insensitive' };
    return res.json(await prisma.bankTransaction.findMany({ where, orderBy: { transaction_date: 'desc' } }));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

bankingRouter.post('/', async (req, res) => {
  try {
    const tx = await prisma.bankTransaction.create({
      data: {
        transaction_date: req.body.transaction_date ? new Date(req.body.transaction_date) : new Date(),
        bank_name: req.body.bank_name,
        account_number: req.body.account_number || null,
        transaction_type: req.body.transaction_type,
        amount: Number(req.body.amount),
        description: req.body.description || null,
        reference: req.body.reference || null,
        status: req.body.status || 'pending'
      }
    });
    return res.status(201).json(tx);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

bankingRouter.patch('/:id/status', async (req, res) => {
  try {
    await prisma.bankTransaction.update({
      where: { transaction_id: Number(req.params.id) },
      data: { status: String(req.body.status) }
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

bankingRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.bankTransaction.delete({ where: { transaction_id: Number(req.params.id) } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
});