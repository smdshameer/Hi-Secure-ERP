import { prisma } from '../index';
import * as XLSX from 'xlsx';
import { BusinessEventService } from './BusinessEventService';

export class BankReconciliationService {
  /**
   * Parse Excel date serial number or string
   */
  private static parseDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
      return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Helper to normalize references for comparison
   */
  private static normalizeRef(ref?: string | null): string {
    if (!ref) return '';
    return ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Import bank transaction statement from CSV data
   */
  static async importCsv(csvContent: string, bankName: string, accountNumber: string) {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) throw new Error('EMPTY_CSV');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const importedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });

        // Determine transaction date
        const dateVal = row.date || row['transaction date'] || row['tx date'] || row.booking_date;
        const date = dateVal ? new Date(dateVal) : new Date();

        // Determine amount
        const amtVal = row.amount || row.value || row.value_amt || row.withdrawal || row.deposit;
        const amount = Math.abs(Number(amtVal || 0));

        // Determine type
        let type = row.type || row['transaction type'] || row.mode || '';
        if (row.withdrawal && Number(row.withdrawal) > 0) type = 'withdrawal';
        if (row.deposit && Number(row.deposit) > 0) type = 'deposit';
        if (!type) type = 'deposit'; // default

        // Determine reference & description
        const reference = row.reference || row.ref || row['reference number'] || row['cheque number'] || '';
        const description = row.description || row.narration || row.remarks || 'Bank Transaction';

        await tx.bankTransaction.create({
          data: {
            transaction_date: date,
            amount,
            description,
            account_number: accountNumber || null,
            bank_name: bankName,
            reference: reference || null,
            status: 'pending',
            transaction_type: type
          }
        });
        count++;
      }
      return count;
    });

    return { imported: importedCount };
  }

  /**
   * Import bank transaction statement from Excel file buffer
   */
  static async importExcel(buffer: Buffer, bankName: string, accountNumber: string) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    if (rows.length === 0) throw new Error('EMPTY_EXCEL');

    const importedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of rows) {
        // Find keys case-insensitively
        const keys = Object.keys(row);
        const findKey = (candidates: string[]) => {
          return keys.find(k => candidates.includes(k.toLowerCase().trim()));
        };

        const dateKey = findKey(['date', 'transaction date', 'tx date', 'value date']);
        const date = dateKey ? this.parseDate(row[dateKey]) : new Date();

        const amtKey = findKey(['amount', 'value', 'value amt', 'amount(inr)']);
        const amount = Math.abs(Number(amtKey ? row[amtKey] : 0));

        const refKey = findKey(['reference', 'ref', 'reference number', 'ref no', 'cheque number', 'chq no']);
        const reference = refKey ? String(row[refKey]).trim() : '';

        const descKey = findKey(['description', 'narration', 'remarks', 'particulars']);
        const description = descKey ? String(row[descKey]).trim() : 'Bank Transaction';

        const typeKey = findKey(['type', 'transaction type', 'mode', 'dr/cr']);
        const type = typeKey ? String(row[typeKey]).toLowerCase().trim() : 'deposit';

        await tx.bankTransaction.create({
          data: {
            transaction_date: date,
            amount,
            description,
            account_number: accountNumber || null,
            bank_name: bankName,
            reference: reference || null,
            status: 'pending',
            transaction_type: type
          }
        });
        count++;
      }
      return count;
    });

    return { imported: importedCount };
  }

  /**
   * Auto-match engine
   * Matches pending bank transactions against general ledger journal lines
   * Criteria: Amount, Date ±3 days, Reference Number
   */
  static async runAutoMatch() {
    // 1. Get all pending bank transactions
    const pendingTxs = await prisma.bankTransaction.findMany({
      where: { status: 'pending' },
      orderBy: { transaction_date: 'asc' }
    });

    // 2. Find Bank accounts in COA
    const bankAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { code: '1002' },
          { name: { contains: 'Bank', mode: 'insensitive' } }
        ]
      }
    });
    const bankAccountIds = bankAccounts.map(a => a.account_id);

    if (bankAccountIds.length === 0) return { matched: 0 };

    let matchedCount = 0;

    for (const bankTx of pendingTxs) {
      // Find matching journal lines that are:
      // - Linked to Bank Account
      // - Not already reconciled
      // - Amount equals bankTx.amount (considering Decimal format)
      // - Within ±3 days of bankTx.transaction_date
      const dateMin = new Date(bankTx.transaction_date.getTime() - 3 * 24 * 60 * 60 * 1000);
      const dateMax = new Date(bankTx.transaction_date.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Find candidates
      const candidates = await prisma.journalEntryLine.findMany({
        where: {
          account_id: { in: bankAccountIds },
          amount: bankTx.amount,
          entry: {
            entry_date: {
              gte: dateMin,
              lte: dateMax
            }
          },
          reconciledBankTransaction: null // not reconciled
        },
        include: {
          entry: true
        }
      });

      // Match by reference
      const bankRefNormalized = this.normalizeRef(bankTx.reference);
      let bestMatch = null;

      for (const cand of candidates) {
        // Check exact reference match or partial reference matches
        const jeRef = cand.entry.reference_id ? String(cand.entry.reference_id) : '';
        const jeDesc = cand.entry.description || '';
        
        const candRefs = [
          this.normalizeRef(jeRef),
          this.normalizeRef(cand.entry.reference_type),
          this.normalizeRef(jeDesc),
          this.normalizeRef(`TX-${cand.entry.entry_id}`),
          this.normalizeRef(`JE-${cand.entry.entry_id}`)
        ];

        // If reference is empty or matched
        if (
          !bankRefNormalized || 
          candRefs.some(ref => ref.includes(bankRefNormalized) || bankRefNormalized.includes(ref))
        ) {
          bestMatch = cand;
          break;
        }
      }

      if (bestMatch) {
        // Reconcile inside transaction
        await prisma.$transaction(async (tx) => {
          await tx.bankTransaction.update({
            where: { transaction_id: bankTx.transaction_id },
            data: {
              status: 'reconciled',
              reconciled_line_id: bestMatch!.line_id
            }
          });

          await BusinessEventService.logEvent({
            event_type: 'BANK_RECONCILIATION_MATCHED',
            entity_type: 'BankTransaction',
            entity_id: bankTx.transaction_id,
            description: `Auto-matched bank transaction ref ${bankTx.reference || 'N/A'} (₹${bankTx.amount}) with Journal Line ID ${bestMatch!.line_id}`
          }, tx);
        });
        matchedCount++;
      }
    }

    return { matched: matchedCount };
  }

  /**
   * Retrieve reconciliation status & metrics
   */
  static async getReconciliationStatus() {
    const totalCount = await prisma.bankTransaction.count();
    const reconciledCount = await prisma.bankTransaction.count({ where: { status: 'reconciled' } });
    const pendingCount = await prisma.bankTransaction.count({ where: { status: 'pending' } });

    // Calculate bank balance from statement
    const bankTxs = await prisma.bankTransaction.findMany();
    let statementBalance = 0;
    for (const tx of bankTxs) {
      const amt = Number(tx.amount);
      const type = tx.transaction_type.toLowerCase();
      if (type === 'deposit' || type === 'credit' || type === 'transfer_in') {
        statementBalance += amt;
      } else {
        statementBalance -= amt;
      }
    }

    // Calculate reconciled balance vs ledger balance
    const bankAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { code: '1002' },
          { name: { contains: 'Bank', mode: 'insensitive' } }
        ]
      }
    });
    const bankAccountIds = bankAccounts.map(a => a.account_id);

    // Ledger balance
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: { account_id: { in: bankAccountIds } }
    });
    let ledgerBalance = 0;
    for (const line of ledgerLines) {
      const amt = Number(line.amount);
      if (line.entry_type === 'debit') {
        ledgerBalance += amt;
      } else {
        ledgerBalance -= amt;
      }
    }

    return {
      total_transactions: totalCount,
      reconciled_transactions: reconciledCount,
      pending_transactions: pendingCount,
      reconciliation_rate: totalCount > 0 ? (reconciledCount / totalCount) * 100 : 0,
      statement_bank_balance: statementBalance,
      ledger_bank_balance: ledgerBalance,
      unreconciled_difference: statementBalance - ledgerBalance
    };
  }
}
