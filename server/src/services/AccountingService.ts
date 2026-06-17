import { prisma } from '../index';
import { DocumentSeriesService } from './DocumentSeriesService';
import { BusinessEventService } from './BusinessEventService';

export class AccountingService {
  // ─── SEED CHART OF ACCOUNTS ──────────────────────────────────────────────
  async seedChartOfAccounts() {
    try {
      await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('accounts', 'account_id'), COALESCE(MAX(account_id), 1)) FROM accounts;
      `);
    } catch (e) {
      console.warn('Could not reset accounts sequence:', e);
    }

    const defaultAccounts = [
      { code: '1001', name: 'Cash', type: 'ASSET' },
      { code: '1002', name: 'Bank', type: 'ASSET' },
      { code: '1003', name: 'Accounts Receivable', type: 'ASSET' },
      { code: '1004', name: 'Inventory Asset', type: 'ASSET' },
      { code: '1005', name: 'GST Input Credit', type: 'ASSET' },
      { code: '2001', name: 'Accounts Payable', type: 'LIABILITY' },
      { code: '2002', name: 'GST Output Liability', type: 'LIABILITY' },
      { code: '3001', name: 'Retained Earnings', type: 'EQUITY' },
      { code: '4001', name: 'Sales Revenue', type: 'REVENUE' },
      { code: '5001', name: 'Cost of Goods Sold', type: 'EXPENSE' },
      { code: '5002', name: 'Service Expense', type: 'EXPENSE' }
    ];

    for (const acc of defaultAccounts) {
      const existing = await prisma.account.findUnique({
        where: { code: acc.code }
      });
      if (!existing) {
        await prisma.account.create({
          data: {
            code: acc.code,
            name: acc.name,
            type: acc.type,
            is_active: true
          }
        });
      }
    }
  }

  // ─── JOURNAL ENTRIES ─────────────────────────────────────────────────────
  async postJournalEntry(data: {
    entry_date?: Date;
    description: string;
    reference_type?: string;
    reference_id?: number;
    lines: Array<{
      account_id: number;
      amount: number;
      entry_type: 'debit' | 'credit';
    }>;
  }, userId?: number) {
    const entryDate = data.entry_date ? new Date(data.entry_date) : new Date();

    // 1. Fiscal Period Lock Check
    const lockedPeriod = await prisma.fiscalPeriod.findFirst({
      where: {
        is_locked: true,
        start_date: { lte: entryDate },
        end_date: { gte: entryDate }
      }
    });

    if (lockedPeriod) {
      throw new Error('FISCAL_PERIOD_LOCKED');
    }

    // 2. Debit-Credit Balance Validation
    let debitSum = 0;
    let creditSum = 0;

    for (const line of data.lines) {
      if (line.amount <= 0) {
        throw new Error('INVALID_AMOUNT: Line amount must be greater than zero.');
      }
      if (line.entry_type === 'debit') {
        debitSum += Number(line.amount);
      } else if (line.entry_type === 'credit') {
        creditSum += Number(line.amount);
      } else {
        throw new Error('INVALID_ENTRY_TYPE: Must be debit or credit.');
      }
    }

    // Compare with a small epsilon for rounding tolerance
    if (Math.abs(debitSum - creditSum) > 0.001) {
      throw new Error(`UNBALANCED_ENTRY: Debits (${debitSum}) must equal Credits (${creditSum}).`);
    }

    // 3. Save entry in a transaction
    return prisma.$transaction(async (tx) => {
      const je = await tx.journalEntry.create({
        data: {
          entry_date: entryDate,
          description: data.description,
          reference_type: data.reference_type || null,
          reference_id: data.reference_id || null
        }
      });

      for (const line of data.lines) {
        await tx.journalEntryLine.create({
          data: {
            entry_id: je.entry_id,
            account_id: line.account_id,
            amount: line.amount,
            entry_type: line.entry_type
          }
        });
      }

      await BusinessEventService.logEvent({
        event_type: 'JOURNAL_ENTRY_POSTED',
        entity_type: 'JournalEntry',
        entity_id: je.entry_id,
        user_id: userId,
        description: `Journal Entry #${je.entry_id} posted: ${data.description}`
      }, tx);

      return je;
    });
  }

  // ─── REVERSAL JOURNAL ENTRY SUPPORT ──────────────────────────────────────
  async reverseJournalEntry(entryId: number, userId?: number) {
    const original = await prisma.journalEntry.findUnique({
      where: { entry_id: entryId },
      include: { lines: true }
    });
    if (!original) throw new Error('JOURNAL_ENTRY_NOT_FOUND');

    const reversedLines = original.lines.map(line => ({
      account_id: line.account_id,
      amount: Number(line.amount),
      entry_type: (line.entry_type === 'debit' ? 'credit' : 'debit') as 'debit' | 'credit'
    }));

    return this.postJournalEntry({
      entry_date: new Date(),
      description: `Reversal of Journal Entry #${entryId} - ${original.description || ''}`,
      reference_type: 'JournalEntry',
      reference_id: entryId,
      lines: reversedLines
    }, userId);
  }

  async deleteJournalEntry(_entryId: number, _userId?: number) {
    throw new Error('IMMUTABLE_LEDGER_VIOLATION');
  }

  // ─── GENERAL LEDGER / JOURNAL QUERY ──────────────────────────────────────
  async getLedger(query: { search?: string; dateFrom?: string; dateTo?: string; account_id?: number }) {
    const where: any = {};
    if (query.account_id) {
      where.account_id = Number(query.account_id);
    }
    if (query.dateFrom || query.dateTo) {
      where.entry = { entry_date: {} };
      if (query.dateFrom) where.entry.entry_date.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.entry.entry_date.lte = to;
      }
    }

    const lines = await prisma.journalEntryLine.findMany({
      where,
      include: {
        entry: true,
        account: true
      },
      orderBy: [
        { entry: { entry_date: 'asc' } },
        { line_id: 'asc' }
      ]
    });

    let runningBalance = 0;
    const mapped = lines.map(line => {
      const amt = Number(line.amount);
      const isDebit = line.entry_type === 'debit';
      const type = line.account.type.toUpperCase();

      // Determine balance sign based on account category
      const factor = ['ASSET', 'EXPENSE'].includes(type) ? (isDebit ? 1 : -1) : (isDebit ? -1 : 1);
      runningBalance += amt * factor;

      return {
        line_id: line.line_id,
        entry_id: line.entry_id,
        date: line.entry.entry_date,
        description: line.entry.description || '',
        reference: line.entry.reference_type && line.entry.reference_id 
          ? `${line.entry.reference_type}-${line.entry.reference_id}` 
          : `TX-${line.entry_id}`,
        account_name: line.account.name,
        account_code: line.account.code,
        account_type: line.account.type,
        debit: isDebit ? amt : 0,
        credit: !isDebit ? amt : 0,
        balance: runningBalance
      };
    });

    if (query.search) {
      const q = query.search.toLowerCase();
      return mapped.filter(x => 
        x.description.toLowerCase().includes(q) ||
        x.account_name.toLowerCase().includes(q) ||
        x.reference.toLowerCase().includes(q)
      );
    }

    return mapped;
  }

  async getJournal(query: { search?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (query.dateFrom || query.dateTo) {
      where.entry_date = {};
      if (query.dateFrom) where.entry_date.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.entry_date.lte = to;
      }
    }
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    return prisma.journalEntry.findMany({
      where,
      include: {
        lines: { include: { account: true } }
      },
      orderBy: { entry_date: 'desc' }
    });
  }

  // ─── FINANCIAL REPORTS ───────────────────────────────────────────────────
  async getTrialBalance(query: { dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (query.dateFrom || query.dateTo) {
      where.entry = { entry_date: {} };
      if (query.dateFrom) where.entry.entry_date.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.entry.entry_date.lte = to;
      }
    }

    const lines = await prisma.journalEntryLine.findMany({
      where,
      include: { account: true }
    });

    const summary: Record<string, { code: string; type: string; debit: number; credit: number }> = {};

    for (const line of lines) {
      const name = line.account.name;
      if (!summary[name]) {
        summary[name] = {
          code: line.account.code,
          type: line.account.type,
          debit: 0,
          credit: 0
        };
      }
      const amt = Number(line.amount);
      if (line.entry_type === 'debit') {
        summary[name].debit += amt;
      } else {
        summary[name].credit += amt;
      }
    }

    return Object.entries(summary).map(([account, val]) => {
      const netDebit = val.debit >= val.credit ? val.debit - val.credit : 0;
      const netCredit = val.credit > val.debit ? val.credit - val.debit : 0;
      return {
        account,
        code: val.code,
        type: val.type,
        total_debit: val.debit,
        total_credit: val.credit,
        net_debit: netDebit,
        net_credit: netCredit
      };
    });
  }

  async getProfitAndLoss(query: { dateFrom?: string; dateTo?: string }) {
    const trial = await this.getTrialBalance(query);

    const revenue = [];
    const expense = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const item of trial) {
      const type = item.type.toUpperCase();
      if (type === 'REVENUE' || type === 'INCOME') {
        const val = item.net_credit - item.net_debit; // Net credit balance
        revenue.push({ account: item.account, code: item.code, balance: val });
        totalRevenue += val;
      } else if (type === 'EXPENSE') {
        const val = item.net_debit - item.net_credit; // Net debit balance
        expense.push({ account: item.account, code: item.code, balance: val });
        totalExpense += val;
      }
    }

    const netProfit = totalRevenue - totalExpense;

    return {
      revenue,
      expense,
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      net_profit: netProfit
    };
  }

  async getBalanceSheet(query: { dateFrom?: string; dateTo?: string }) {
    const trial = await this.getTrialBalance(query);
    const pl = await this.getProfitAndLoss(query);

    const assets = [];
    const liabilities = [];
    const equity = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const item of trial) {
      const type = item.type.toUpperCase();
      if (type === 'ASSET') {
        const val = item.net_debit - item.net_credit;
        assets.push({ account: item.account, code: item.code, balance: val });
        totalAssets += val;
      } else if (type === 'LIABILITY') {
        const val = item.net_credit - item.net_debit;
        liabilities.push({ account: item.account, code: item.code, balance: val });
        totalLiabilities += val;
      } else if (type === 'EQUITY') {
        const val = item.net_credit - item.net_debit;
        equity.push({ account: item.account, code: item.code, balance: val });
        totalEquity += val;
      }
    }

    // Retained Earnings gets P&L Net Profit/Loss added
    const plEarningsIndex = equity.findIndex(e => e.account === 'Retained Earnings');
    if (plEarningsIndex >= 0) {
      equity[plEarningsIndex].balance += pl.net_profit;
    } else {
      equity.push({ account: 'Retained Earnings', code: '3001', balance: pl.net_profit });
    }
    totalEquity += pl.net_profit;

    return {
      assets,
      liabilities,
      equity,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      total_liabilities_and_equity: totalLiabilities + totalEquity
    };
  }

  // ─── FISCAL PERIOD CONTROL ───────────────────────────────────────────────
  async createFiscalPeriod(name: string, startDate: Date, endDate: Date) {
    return prisma.fiscalPeriod.create({
      data: {
        name,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        is_locked: false
      }
    });
  }

  async lockFiscalPeriod(periodId: number) {
    return prisma.fiscalPeriod.update({
      where: { period_id: periodId },
      data: { is_locked: true }
    });
  }

  async unlockFiscalPeriod(periodId: number) {
    return prisma.fiscalPeriod.update({
      where: { period_id: periodId },
      data: { is_locked: false }
    });
  }

  async getFiscalPeriods() {
    return prisma.fiscalPeriod.findMany({
      orderBy: { start_date: 'asc' }
    });
  }
}