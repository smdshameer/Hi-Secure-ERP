import { AccountingRepository } from '../repositories/AccountingRepository';
import { prisma } from '../index';

export class AccountingService {
  private accountingRepo = new AccountingRepository();

  async getLedger(query: any) {
    const { search, dateFrom, dateTo } = query;
    const lines = await this.accountingRepo.findLines({});

    let runningBalance = 0;
    const mapped = lines.map((line: any) => {
      const amount = Number(line.amount);
      if (line.entry_type === 'credit') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
      return {
        id: line.line_id,
        date: line.entry.entry_date.toISOString(),
        description: line.entry.description || '',
        reference: line.entry.reference_type && line.entry.reference_id 
          ? `${line.entry.reference_type}-${line.entry.reference_id}` 
          : `TX-${line.entry.entry_id}`,
        type: line.entry_type,
        amount: amount,
        balance: runningBalance,
        category: line.account.name.toLowerCase()
      };
    });

    let filtered = mapped;
    if (dateFrom) {
      const from = new Date(dateFrom as string);
      filtered = filtered.filter((e: any) => new Date(e.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo as string);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e: any) => new Date(e.date) <= to);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter((e: any) => 
        e.description.toLowerCase().includes(q) || 
        e.category.toLowerCase().includes(q) ||
        e.reference.toLowerCase().includes(q)
      );
    }

    return filtered.reverse();
  }

  async getJournal(query: any) {
    const { search, dateFrom, dateTo } = query;
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
        { description: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const entries = await this.accountingRepo.findEntries(where);

    const mapped: any[] = [];
    entries.forEach((e: any) => {
      e.lines.forEach((line: any) => {
        const amount = Number(line.amount);
        mapped.push({
          id: line.line_id,
          date: e.entry_date.toISOString(),
          description: e.description || '',
          reference: e.reference_type && e.reference_id ? `${e.reference_type}-${e.reference_id}` : `TX-${e.entry_id}`,
          debit: line.entry_type === 'debit' ? amount : 0,
          credit: line.entry_type === 'credit' ? amount : 0,
          account: line.account.name,
          status: 'posted'
        });
      });
    });

    return mapped;
  }

  async getTrialBalance(query: any) {
    const { dateFrom, dateTo } = query;
    const where: any = {};
    if (dateFrom || dateTo) {
      where.entry = {
        entry_date: {}
      };
      if (dateFrom) where.entry.entry_date.gte = new Date(dateFrom as string);
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        where.entry.entry_date.lte = to;
      }
    }

    const lines = await this.accountingRepo.findLines(where);

    const groups: Record<string, { debit: number; credit: number }> = {};
    lines.forEach((line: any) => {
      const accountName = line.account.name;
      if (!groups[accountName]) {
        groups[accountName] = { debit: 0, credit: 0 };
      }
      const amount = Number(line.amount);
      if (line.entry_type === 'debit') {
        groups[accountName].debit += amount;
      } else if (line.entry_type === 'credit') {
        groups[accountName].credit += amount;
      }
    });

    return Object.entries(groups).map(([account, val]) => ({
      account,
      debit: val.debit,
      credit: val.credit
    }));
  }

  async postJournalEntry(data: any) {
    return prisma.$transaction(async (tx) => {
      // Validate that total debits === total credits
      let totalDebits = 0;
      let totalCredits = 0;
      data.lines.forEach((l: any) => {
        if (l.entry_type === 'debit') totalDebits += Number(l.amount);
        if (l.entry_type === 'credit') totalCredits += Number(l.amount);
      });

      // Keep it loose for manual adjustments if not checked, but check if we strict
      // We will strictly enforce in Phase 8, let's keep validation here.
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Balanced entry validation failed: Debits (${totalDebits}) !== Credits (${totalCredits})`);
      }

      const je = await this.accountingRepo.createEntry({
        entry_date: data.entry_date ? new Date(data.entry_date) : new Date(),
        description: data.description,
        reference_type: data.reference_type || null,
        reference_id: data.reference_id || null
      }, tx);

      for (const line of data.lines) {
        await tx.journalEntryLine.create({
          data: {
            entry_id: je.entry_id,
            account_id: Number(line.account_id),
            amount: Number(line.amount),
            entry_type: line.entry_type
          }
        });
      }

      return je;
    });
  }

  async deleteJournalEntry(id: number) {
    return this.accountingRepo.deleteEntry(id);
  }
}