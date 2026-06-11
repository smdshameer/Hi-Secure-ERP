import { Router } from 'express';
import { prisma } from '../index';

export const accountingRouter = Router();

// Get General Ledger
accountingRouter.get('/ledger', async (req, res) => {
  try {
    const { search, dateFrom, dateTo } = req.query;
    
    // Fetch all entries sorted by date ascending to compute accurate running balance
    const entries = await prisma.accountingEntry.findMany({
      orderBy: [
        { entry_date: 'asc' },
        { entry_id: 'asc' }
      ]
    });

    let runningBalance = 0;
    const mapped = entries.map(e => {
      const amount = Number(e.amount);
      if (e.entry_type === 'credit') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
      return {
        id: e.entry_id,
        date: e.entry_date.toISOString(),
        description: e.description || '',
        reference: e.reference_type && e.reference_id ? `${e.reference_type}-${e.reference_id}` : `TX-${e.entry_id}`,
        type: e.entry_type,
        amount: amount,
        balance: runningBalance,
        category: e.account_type || 'other'
      };
    });

    // Filter by date range and search term
    let filtered = mapped;
    if (dateFrom) {
      const from = new Date(dateFrom as string);
      filtered = filtered.filter(e => new Date(e.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo as string);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.date) <= to);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(q) || 
        e.category.toLowerCase().includes(q) ||
        e.reference.toLowerCase().includes(q)
      );
    }

    // Return latest first (descending)
    return res.json(filtered.reverse());
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

// Get Journal Entries
accountingRouter.get('/journal', async (req, res) => {
  try {
    const { search, dateFrom, dateTo } = req.query;
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.entry_date = {};
      if (dateFrom) where.entry_date.gte = new Date(dateFrom as string);
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        where.entry_date.lte = to;
      }
    }
    if (search) {
      where.OR = [
        { description: { contains: String(search), mode: 'insensitive' } },
        { account_type: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const entries = await prisma.accountingEntry.findMany({
      where,
      orderBy: [
        { entry_date: 'desc' },
        { entry_id: 'desc' }
      ]
    });

    const mapped = entries.map(e => {
      const amount = Number(e.amount);
      return {
        id: e.entry_id,
        date: e.entry_date.toISOString(),
        description: e.description || '',
        reference: e.reference_type && e.reference_id ? `${e.reference_type}-${e.reference_id}` : `TX-${e.entry_id}`,
        debit: e.entry_type === 'debit' ? amount : 0,
        credit: e.entry_type === 'credit' ? amount : 0,
        account: e.account_type ? e.account_type.charAt(0).toUpperCase() + e.account_type.slice(1) : 'General',
        status: 'posted'
      };
    });

    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

// Get Trial Balance
accountingRouter.get('/trial-balance', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.entry_date = {};
      if (dateFrom) where.entry_date.gte = new Date(dateFrom as string);
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        where.entry_date.lte = to;
      }
    }

    const entries = await prisma.accountingEntry.findMany({ where });

    const groups: Record<string, { debit: number; credit: number }> = {};
    entries.forEach(e => {
      const accountName = e.account_type 
        ? e.account_type.charAt(0).toUpperCase() + e.account_type.slice(1)
        : 'General';
      if (!groups[accountName]) {
        groups[accountName] = { debit: 0, credit: 0 };
      }
      const amount = Number(e.amount);
      if (e.entry_type === 'debit') {
        groups[accountName].debit += amount;
      } else if (e.entry_type === 'credit') {
        groups[accountName].credit += amount;
      }
    });

    const trialRows = Object.entries(groups).map(([account, val]) => ({
      account,
      debit: val.debit,
      credit: val.credit
    }));

    return res.json(trialRows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

// Keep existing routes for backward compatibility/other modules
accountingRouter.get('/', async (req, res) => {
  try {
    const where: any = {};
    if (req.query.account_type) where.account_type = String(req.query.account_type);
    return res.json(await prisma.accountingEntry.findMany({ where, orderBy: { entry_date: 'desc' }, take: 200 }));
  } catch (err: any) {
    if (err.code === 'P2021') return res.json([]);
    return res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

accountingRouter.post('/', async (req, res) => {
  try {
    const entry = await prisma.accountingEntry.create({
      data: {
        entry_date: req.body.entry_date ? new Date(req.body.entry_date) : new Date(),
        account_type: req.body.account_type,
        description: req.body.description || null,
        amount: Number(req.body.amount),
        entry_type: req.body.entry_type,
        reference_type: req.body.reference_type || null,
        reference_id: req.body.reference_id || null
      }
    });
    return res.status(201).json(entry);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create entry' });
  }
});

accountingRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.accountingEntry.delete({ where: { entry_id: Number(req.params.id) } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete entry' });
  }
});