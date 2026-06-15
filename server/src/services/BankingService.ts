import { BankingRepository } from '../repositories/BankingRepository';

export class BankingService {
  private bankingRepo = new BankingRepository();

  async getAccounts() {
    const transactions = await this.bankingRepo.findMany({}, { transaction_date: 'asc' });
    
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

    return Object.values(groups).map((g, idx) => ({
      id: g.firstTxId || (idx + 1),
      name: g.bankName === 'Cash' ? 'Cash Wallet' : `${g.bankName} Account`,
      bankName: g.bankName,
      accountNumber: g.accountNumber,
      ifsc: g.bankName === 'Cash' ? '—' : 'IFSC0001234',
      type: g.bankName === 'Cash' ? 'cash' : 'current',
      balance: g.balance,
      currency: 'INR'
    }));
  }

  async getTransactions(query: any) {
    const { accountId, search } = query;
    let where: any = {};
    
    if (accountId && accountId !== 'all') {
      const id = Number(accountId);
      const representative = await this.bankingRepo.findById(id);
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
    
    const transactions = await this.bankingRepo.findMany(where, { transaction_date: 'desc' });
    
    // To compute balance at each transaction point, compute chronologically first
    const allTxs = await this.bankingRepo.findMany({}, { transaction_date: 'asc' });
    
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
    
    return transactions.map(t => {
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
  }

  async getRawTransactions(query: any) {
    const where: any = {};
    if (query.bank_name) where.bank_name = { contains: String(query.bank_name), mode: 'insensitive' };
    return this.bankingRepo.findMany(where, { transaction_date: 'desc' });
  }

  async createTransaction(data: any) {
    return this.bankingRepo.create({
      transaction_date: data.transaction_date ? new Date(data.transaction_date) : new Date(),
      bank_name: data.bank_name,
      account_number: data.account_number || null,
      transaction_type: data.transaction_type,
      amount: Number(data.amount),
      description: data.description || null,
      reference: data.reference || null,
      status: data.status || 'pending'
    });
  }

  async updateTransactionStatus(id: number, status: string) {
    return this.bankingRepo.update(id, { status });
  }

  async deleteTransaction(id: number) {
    return this.bankingRepo.delete(id);
  }
}
