import { prisma } from '../../index';

export class FinanceReportService {
  static async getTrialBalance() {
    const accounts = await prisma.account.findMany({
      include: {
        journalLines: {
          select: {
            amount: true,
            entry_type: true
          }
        }
      }
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const rows = accounts.map(acc => {
      let debitSum = 0;
      let creditSum = 0;

      acc.journalLines.forEach(line => {
        const amt = Number(line.amount || 0);
        if (line.entry_type.toLowerCase() === 'debit') {
          debitSum += amt;
        } else if (line.entry_type.toLowerCase() === 'credit') {
          creditSum += amt;
        }
      });

      totalDebits += debitSum;
      totalCredits += creditSum;

      // Net balance depends on standard account types: Asset/Expense standard balance is Debit, Liability/Equity/Revenue is Credit.
      const isDebitStd = ['asset', 'expense'].includes(acc.type.toLowerCase());
      const balance = isDebitStd ? (debitSum - creditSum) : (creditSum - debitSum);

      return {
        account_id: acc.account_id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: debitSum,
        credit: creditSum,
        balance,
        balance_type: isDebitStd ? 'debit' : 'credit'
      };
    });

    return {
      totals: {
        total_debit: totalDebits,
        total_credit: totalCredits,
        is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
      },
      accounts: rows
    };
  }

  static async getProfitAndLoss(fromDate?: string, toDate?: string) {
    const whereClause: any = {};
    if (fromDate || toDate) {
      whereClause.entry = {
        entry_date: {}
      };
      if (fromDate) whereClause.entry.entry_date.gte = new Date(fromDate);
      if (toDate) whereClause.entry.entry_date.lte = new Date(toDate);
    }

    const accounts = await prisma.account.findMany({
      include: {
        journalLines: {
          where: whereClause,
          select: {
            amount: true,
            entry_type: true
          }
        }
      }
    });

    const revenueAccounts = [];
    const expenseAccounts = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const acc of accounts) {
      let debitSum = 0;
      let creditSum = 0;

      acc.journalLines.forEach(line => {
        const amt = Number(line.amount || 0);
        if (line.entry_type.toLowerCase() === 'debit') {
          debitSum += amt;
        } else if (line.entry_type.toLowerCase() === 'credit') {
          creditSum += amt;
        }
      });

      const isRevenue = acc.type.toLowerCase() === 'revenue';
      const isExpense = acc.type.toLowerCase() === 'expense';

      if (isRevenue) {
        const balance = creditSum - debitSum; // Revenue normal balance is Credit
        if (debitSum > 0 || creditSum > 0 || balance !== 0) {
          revenueAccounts.push({ code: acc.code, name: acc.name, balance });
          totalRevenue += balance;
        }
      } else if (isExpense) {
        const balance = debitSum - creditSum; // Expense normal balance is Debit
        if (debitSum > 0 || creditSum > 0 || balance !== 0) {
          expenseAccounts.push({ code: acc.code, name: acc.name, balance });
          totalExpenses += balance;
        }
      }
    }

    return {
      revenue: {
        accounts: revenueAccounts,
        total: totalRevenue
      },
      expenses: {
        accounts: expenseAccounts,
        total: totalExpenses
      },
      net_profit: totalRevenue - totalExpenses
    };
  }

  static async getBalanceSheet() {
    // Assets, Liabilities, and Equity balances
    const accounts = await prisma.account.findMany({
      include: {
        journalLines: {
          select: {
            amount: true,
            entry_type: true
          }
        }
      }
    });

    const assetAccounts = [];
    const liabilityAccounts = [];
    const equityAccounts = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const acc of accounts) {
      let debitSum = 0;
      let creditSum = 0;

      acc.journalLines.forEach(line => {
        const amt = Number(line.amount || 0);
        if (line.entry_type.toLowerCase() === 'debit') {
          debitSum += amt;
        } else if (line.entry_type.toLowerCase() === 'credit') {
          creditSum += amt;
        }
      });

      const type = acc.type.toLowerCase();

      if (type === 'asset') {
        const balance = debitSum - creditSum; // Asset standard is Debit
        assetAccounts.push({ code: acc.code, name: acc.name, balance });
        totalAssets += balance;
      } else if (type === 'liability') {
        const balance = creditSum - debitSum; // Liability standard is Credit
        liabilityAccounts.push({ code: acc.code, name: acc.name, balance });
        totalLiabilities += balance;
      } else if (type === 'equity') {
        const balance = creditSum - debitSum; // Equity standard is Credit
        equityAccounts.push({ code: acc.code, name: acc.name, balance });
        totalEquity += balance;
      }
    }

    // Dynamic Retained Earnings from current P&L
    const plReport = await this.getProfitAndLoss();
    const currentNetProfit = plReport.net_profit;

    equityAccounts.push({
      code: '302000',
      name: 'Retained Earnings (Current Net Profit)',
      balance: currentNetProfit
    });
    totalEquity += currentNetProfit;

    return {
      assets: {
        accounts: assetAccounts,
        total: totalAssets
      },
      liabilities: {
        accounts: liabilityAccounts,
        total: totalLiabilities
      },
      equity: {
        accounts: equityAccounts,
        total: totalEquity
      },
      totals: {
        total_assets: totalAssets,
        total_liabilities_and_equity: totalLiabilities + totalEquity,
        is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      }
    };
  }
}