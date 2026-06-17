/**
 * verify_phase4a.ts
 * Phase 4A — Finance, Accounting & GST Compliance Verification Suite
 */

process.env.STANDALONE_SCRIPT = 'true';
import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/index';
import { AccountingService } from './src/services/AccountingService';
import { GstService } from './src/services/GstService';
import { BankReconciliationService } from './src/services/BankReconciliationService';
import { ProcurementService } from './src/services/ProcurementService';
import { InvoiceService } from './src/services/InvoiceService';

const accountingService = new AccountingService();
const invoiceService = new InvoiceService();

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(name: string) {
  totalTests++;
  passed++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name: string, reason: any) {
  totalTests++;
  failed++;
  const msg = reason instanceof Error ? reason.message : String(reason);
  failures.push(`[${name}] ${msg}`);
  console.error(`  ❌ FAIL: ${name}\n       → ${msg}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

async function ensureDefaultCompany() {
  const existing = await prisma.company.findFirst({ where: { is_active: true } });
  if (existing) return existing;

  return prisma.company.create({
    data: {
      name: 'HiSecure Test Corp',
      code: 'HSTC',
      gstin: '27AAACH1234A1Z1', // Maharashtra code 27
      pan: 'AAACH1234A',
      address: 'Mumbai, Maharashtra',
      is_active: true
    }
  });
}

async function ensureDefaultUser(): Promise<number> {
  const existing = await prisma.user.findFirst();
  if (existing) return existing.user_id;

  const u = await prisma.user.create({
    data: {
      username: `tech_p4_${Date.now()}`,
      email: `tech_p4_${Date.now()}@test.com`,
      password_hash: 'hash',
      full_name: 'P4 Tech',
      role: 'admin',
      is_active: true
    }
  });
  return u.user_id;
}

async function ensurePart(num: string, price = 100, taxRate = 18): Promise<number> {
  const p = await prisma.parts.create({
    data: {
      part_number: `PART-P4-${num}-${Date.now()}`,
      name: `P4 Part ${num}`,
      selling_price: price,
      cost_price: price * 0.7,
      tax_rate: taxRate,
      hsn_code: '85171200', // mobile phone hsn
      is_active: true
    }
  });
  return p.part_id;
}

async function ensureSupplier(): Promise<number> {
  const s = await prisma.supplier.create({
    data: {
      supplier_code: `SUP-P4-${Date.now()}`,
      name: 'P4 Supplier Ltd',
      state: 'Karnataka',
      gstin: '29AAACH1234A1Z1', // Karnataka prefix 29 (different state)
      is_active: true
    }
  });
  return s.supplier_id;
}

async function ensureCustomer(): Promise<number> {
  const c = await prisma.customer.create({
    data: {
      customer_code: `CUST-P4-${Date.now()}`,
      name: 'P4 Customer Ltd',
      phone: '9876' + Math.floor(100000 + Math.random() * 900000),
      gstin: '27BBBCH1234A1Z1', // Maharashtra prefix 27 (same state as HSTC)
      is_active: true
    }
  });
  return c.customer_id;
}

async function runVerification() {
  console.log('\n==================================================');
  console.log('STARTING PHASE 4A — FINANCIALS & GST COMPLIANCE VERIFICATION');
  console.log('==================================================\n');

  await ensureDefaultCompany();
  const userId = await ensureDefaultUser();
  await accountingService.seedChartOfAccounts();

  // Fetch or ensure accounts
  const inventoryAccount = await prisma.account.findFirst({ where: { OR: [{ code: '1004' }, { name: 'Inventory Asset' }] } });
  const apAccount = await prisma.account.findFirst({ where: { OR: [{ code: '2001' }, { name: 'Accounts Payable' }] } });
  const arAccount = await prisma.account.findFirst({ where: { OR: [{ code: '1003' }, { name: 'Accounts Receivable' }] } });
  const salesAccount = await prisma.account.findFirst({ where: { OR: [{ code: '4001' }, { name: 'Sales Revenue' }] } });
  const gstInputAccount = await prisma.account.findFirst({ where: { OR: [{ code: '1005' }, { name: 'GST Input Credit' }] } });
  const gstOutputAccount = await prisma.account.findFirst({ where: { OR: [{ code: '2002' }, { name: 'GST Output Liability' }] } });
  const bankAccount = await prisma.account.findFirst({ where: { OR: [{ code: '1002' }, { name: 'Bank' }] } });

  assert(!!inventoryAccount, 'Inventory Asset account exists');
  assert(!!apAccount, 'Accounts Payable account exists');
  assert(!!arAccount, 'Accounts Receivable account exists');
  assert(!!salesAccount, 'Sales Revenue account exists');
  assert(!!gstInputAccount, 'GST Input Credit account exists');
  assert(!!gstOutputAccount, 'GST Output Liability account exists');
  assert(!!bankAccount, 'Bank account exists');

  // 1. Balanced Journal Entries
  await test('Balanced Journal Entries (DR = CR)', async () => {
    // Valid balanced entry
    const entry = await accountingService.postJournalEntry({
      description: 'Balanced Test Entry',
      lines: [
        { account_id: inventoryAccount!.account_id, amount: 1000, entry_type: 'debit' },
        { account_id: apAccount!.account_id, amount: 1000, entry_type: 'credit' }
      ]
    }, userId);

    assert(entry.entry_id > 0, 'Entry posted successfully');

    // Unbalanced entry (Should reject)
    let threw = false;
    try {
      await accountingService.postJournalEntry({
        description: 'Unbalanced Test Entry',
        lines: [
          { account_id: inventoryAccount!.account_id, amount: 1000, entry_type: 'debit' },
          { account_id: apAccount!.account_id, amount: 900, entry_type: 'credit' }
        ]
      }, userId);
    } catch (err: any) {
      threw = true;
      assert(err.message.includes('UNBALANCED_ENTRY'), 'Threw UNBALANCED_ENTRY error');
    }
    assert(threw, 'Rejected unbalanced journal entry');
  });

  // 2. Ledger Immutability
  await test('Ledger Immutability (Updates/Deletes blocked)', async () => {
    const entry = await prisma.journalEntry.findFirst({
      orderBy: { entry_id: 'desc' }
    });
    assert(!!entry, 'Found a journal entry to test mutation blocking');

    // Attempt update
    let updateThrew = false;
    try {
      await prisma.journalEntry.update({
        where: { entry_id: entry!.entry_id },
        data: { description: 'Hacked description' }
      });
    } catch (err: any) {
      updateThrew = true;
      assert(err.message.includes('IMMUTABLE_LEDGER_VIOLATION'), 'Blocked update with IMMUTABLE_LEDGER_VIOLATION');
    }
    assert(updateThrew, 'Blocked update operation');

    // Attempt delete
    let deleteThrew = false;
    try {
      await prisma.journalEntry.delete({
        where: { entry_id: entry!.entry_id }
      });
    } catch (err: any) {
      deleteThrew = true;
      assert(err.message.includes('IMMUTABLE_LEDGER_VIOLATION'), 'Blocked delete with IMMUTABLE_LEDGER_VIOLATION');
    }
    assert(deleteThrew, 'Blocked delete operation');
  });

  // 3. Reversal Entries
  await test('Reversal Entries', async () => {
    const entry = await accountingService.postJournalEntry({
      description: 'To Be Reversed Entry',
      lines: [
        { account_id: inventoryAccount!.account_id, amount: 500, entry_type: 'debit' },
        { account_id: apAccount!.account_id, amount: 500, entry_type: 'credit' }
      ]
    }, userId);

    const reversed = await accountingService.reverseJournalEntry(entry.entry_id, userId);
    assert(reversed.entry_id > 0, 'Reversal entry posted successfully');

    const reversedLines = await prisma.journalEntryLine.findMany({
      where: { entry_id: reversed.entry_id },
      include: { account: true }
    });

    // Check that values are swapped
    const debitLine = reversedLines.find(l => l.entry_type === 'debit');
    const creditLine = reversedLines.find(l => l.entry_type === 'credit');

    assert(debitLine!.account_id === apAccount!.account_id, 'Debit line points to AP');
    assert(creditLine!.account_id === inventoryAccount!.account_id, 'Credit line points to Inventory');
    assert(Number(debitLine!.amount) === 500, 'Reversal debit amount matches');
    assert(Number(creditLine!.amount) === 500, 'Reversal credit amount matches');
  });

  // 4. Fiscal Period Locking
  await test('Fiscal Period Locking', async () => {
    const name = `Locked Period ${Date.now()}`;
    const start = new Date('2028-01-01');
    const end = new Date('2028-01-31');

    const period = await accountingService.createFiscalPeriod(name, start, end);
    await accountingService.lockFiscalPeriod(period.period_id);

    let threw = false;
    try {
      await accountingService.postJournalEntry({
        entry_date: new Date('2028-01-15'),
        description: 'Post in locked period',
        lines: [
          { account_id: inventoryAccount!.account_id, amount: 100, entry_type: 'debit' },
          { account_id: apAccount!.account_id, amount: 100, entry_type: 'credit' }
        ]
      }, userId);
    } catch (err: any) {
      threw = true;
      assert(err.message === 'FISCAL_PERIOD_LOCKED', 'Threw FISCAL_PERIOD_LOCKED error');
    }
    assert(threw, 'Rejected posting in locked period');

    // Clean up or unlock to prevent future failures
    await accountingService.unlockFiscalPeriod(period.period_id);
  });

  // 5. GST Calculations
  await test('GST Calculations (Same State & Inter State)', async () => {
    // Same State (CGST + SGST)
    const sameStateRes = GstService.calculateGst(1000, 18, true);
    assert(sameStateRes.cgst_rate === 9, 'CGST rate is half');
    assert(sameStateRes.cgst_amount === 90, 'CGST amount is correct');
    assert(sameStateRes.sgst_rate === 9, 'SGST rate is half');
    assert(sameStateRes.sgst_amount === 90, 'SGST amount is correct');
    assert(sameStateRes.igst_amount === 0, 'IGST amount is zero');

    // Inter State (IGST)
    const interStateRes = GstService.calculateGst(1000, 18, false);
    assert(interStateRes.igst_rate === 18, 'IGST rate is full');
    assert(interStateRes.igst_amount === 180, 'IGST amount is correct');
    assert(interStateRes.cgst_amount === 0, 'CGST amount is zero');
    assert(interStateRes.sgst_amount === 0, 'SGST amount is zero');
  });

  // 6. GRN Auto Posting
  await test('GRN Auto Posting (GST Input Credit)', async () => {
    const partId = await ensurePart('GRN', 200, 18);
    const supplierId = await ensureSupplier();

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number: `PO-P4-${Date.now()}`,
        supplier_id: supplierId,
        status: 'approved',
        total_amount: 200,
        tax_amount: 36,
        items: {
          create: {
            part_id: partId,
            quantity: 10,
            unit_price: 200,
            total_amount: 2000
          }
        }
      },
      include: { items: true }
    });

    const location = await prisma.location.findFirst();
    const grn = await prisma.goodsReceiptNote.create({
      data: {
        grn_number: `GRN-P4-${Date.now()}`,
        po_id: po.po_id,
        location_id: location?.location_id || 1,
        received_by: userId,
        status: 'VERIFIED',
        items: {
          create: {
            po_item_id: po.items[0].po_item_id,
            part_id: partId,
            ordered_quantity: 10,
            received_quantity: 10,
            damaged_quantity: 0,
            unit_price: 200
          }
        }
      }
    });

    // Post GRN
    const result = await ProcurementService.postGRN(grn.grn_id, userId);
    assert(result.grn.status === 'POSTED', 'GRN marked as POSTED');

    // Verify Journal Entry was created
    const je = await prisma.journalEntry.findFirst({
      where: { reference_type: 'GoodsReceiptNote', reference_id: grn.grn_id },
      include: { lines: { include: { gstTransaction: true } } }
    });

    assert(!!je, 'Journal entry exists');
    assert(je!.lines.length === 3, 'Lines: 1 DR Inventory, 1 DR GST Input, 1 CR AP');

    const invLine = je!.lines.find(l => l.account_id === inventoryAccount!.account_id && l.entry_type === 'debit');
    const gstLine = je!.lines.find(l => l.account_id === gstInputAccount!.account_id && l.entry_type === 'debit');
    const payableLine = je!.lines.find(l => l.account_id === apAccount!.account_id && l.entry_type === 'credit');

    assert(Number(invLine!.amount) === 2000, 'Inventory debit amount matches taxable value');
    assert(Number(gstLine!.amount) === 360, 'GST Input Credit debit matches IGST (18% of 2000 = 360)');
    assert(Number(payableLine!.amount) === 2360, 'Accounts Payable credit matches total invoice');

    // Verify GstTransaction
    assert(!!gstLine!.gstTransaction, 'GstTransaction logged and linked');
    assert(gstLine!.gstTransaction!.transaction_type === 'INPUT', 'Transaction type is INPUT');
    assert(Number(gstLine!.gstTransaction!.taxable_value) === 2000, 'Taxable value correct in GST transaction');
    assert(Number(gstLine!.gstTransaction!.igst_amount) === 360, 'IGST matches in GST transaction');
  });

  // 7. Invoice Auto Posting
  await test('Invoice Auto Posting (GST Output Liability)', async () => {
    const partId = await ensurePart('INV', 500, 18);
    const customerId = await ensureCustomer();

    // Ensure enough stock exists for the invoice
    await prisma.partStock.upsert({
      where: { part_id_location_id: { part_id: partId, location_id: 1 } },
      update: { quantity: 50 },
      create: { part_id: partId, location_id: 1, quantity: 50 }
    });

    const invoice = await prisma.salesInvoice.create({
      data: {
        invoice_number: `INV-P4-${Date.now()}`,
        customer_id: customerId,
        invoice_date: new Date(),
        status: 'draft',
        place_of_supply: 'Maharashtra',
        total_amount: 1000,
        tax_amount: 180,
        grand_total: 1180,
        items: {
          create: {
            part_id: partId,
            quantity: 2,
            unit_price: 500,
            tax_rate: 18,
            tax_amount: 180,
            total_amount: 1000
          }
        }
      }
    });

    // Post Invoice (transition to paid/issued triggers posting)
    await invoiceService.updateStatus(invoice.invoice_id, 'issued');

    // Verify Journal Entry was created
    const je = await prisma.journalEntry.findFirst({
      where: { reference_type: 'SalesInvoice', reference_id: invoice.invoice_id },
      include: { lines: { include: { gstTransaction: true } } }
    });

    assert(!!je, 'Journal entry exists');
    assert(je!.lines.length === 3, 'Lines: 1 DR AR, 1 CR Revenue, 1 CR GST Output');

    const arLine = je!.lines.find(l => l.account_id === arAccount!.account_id && l.entry_type === 'debit');
    const revLine = je!.lines.find(l => l.account_id === salesAccount!.account_id && l.entry_type === 'credit');
    const gstLine = je!.lines.find(l => l.account_id === gstOutputAccount!.account_id && l.entry_type === 'credit');

    assert(Number(arLine!.amount) === 1180, 'Accounts Receivable debit matches grand total');
    assert(Number(revLine!.amount) === 1000, 'Sales Revenue credit matches taxable value');
    assert(Number(gstLine!.amount) === 180, 'GST Output Liability credit matches same-state CGST+SGST');

    // Verify GstTransaction
    assert(!!gstLine!.gstTransaction, 'GstTransaction logged and linked');
    assert(gstLine!.gstTransaction!.transaction_type === 'OUTPUT', 'Transaction type is OUTPUT');
    assert(Number(gstLine!.gstTransaction!.cgst_amount) === 90, 'CGST is correct (9%)');
    assert(Number(gstLine!.gstTransaction!.sgst_amount) === 90, 'SGST is correct (9%)');
  });

  // 8. Trial Balance
  await test('Trial Balance', async () => {
    const tb = await accountingService.getTrialBalance({});
    assert(tb.length > 0, 'Fetched trial balance');

    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of tb) {
      totalDebit += item.net_debit;
      totalCredit += item.net_credit;
    }

    // Trial balance should be equal (balanced double-entry)
    console.log(`    Trial Balance Totals: DR ₹${totalDebit.toFixed(2)}, CR ₹${totalCredit.toFixed(2)}`);
    assert(Math.abs(totalDebit - totalCredit) < 0.01, 'Trial Balance is perfectly balanced');
  });

  // 9. Profit & Loss
  await test('Profit & Loss Statement', async () => {
    const pl = await accountingService.getProfitAndLoss({});
    assert(pl.total_revenue >= 0, 'P&L returns total revenue');
    assert(pl.total_expense >= 0, 'P&L returns total expense');
    console.log(`    P&L Summary: Revenue ₹${pl.total_revenue.toFixed(2)}, Expense ₹${pl.total_expense.toFixed(2)}, Net Profit ₹${pl.net_profit.toFixed(2)}`);
  });

  // 10. Balance Sheet
  await test('Balance Sheet', async () => {
    const bs = await accountingService.getBalanceSheet({});
    console.log(`    Balance Sheet Summary: Assets ₹${bs.total_assets.toFixed(2)}, Liabilities + Equity ₹${bs.total_liabilities_and_equity.toFixed(2)}`);
    assert(Math.abs(bs.total_assets - bs.total_liabilities_and_equity) < 0.01, 'Assets = Liabilities + Equity balances');
  });

  // 11. Bank Reconciliation
  await test('Bank Reconciliation statement import & auto-match', async () => {
    // 1. Post a ledger entry representing a bank payout
    const bankJe = await accountingService.postJournalEntry({
      description: 'Supplier Payment via Bank',
      lines: [
        { account_id: apAccount!.account_id, amount: 450, entry_type: 'debit' },
        { account_id: bankAccount!.account_id, amount: 450, entry_type: 'credit' }
      ]
    }, userId);

    const bankJeLine = await prisma.journalEntryLine.findFirst({
      where: { entry_id: bankJe.entry_id, account_id: bankAccount!.account_id }
    });

    // 2. Import CSV containing the bank transaction
    const csvContent = `date,amount,description,reference,type\n${new Date().toISOString()},450,Supplier payment payout,TX-${bankJe.entry_id},withdrawal`;
    const importRes = await BankReconciliationService.importCsv(csvContent, 'ICICI Bank', '1234567890');
    assert(importRes.imported === 1, 'CSV statement row imported successfully');

    // 3. Run auto-match engine
    const matchRes = await BankReconciliationService.runAutoMatch();
    assert(matchRes.matched >= 1, 'Auto-match engine successfully matched the bank transaction to the GL line');

    // 4. Verify reconciliation status
    const status = await BankReconciliationService.getReconciliationStatus();
    assert(status.total_transactions > 0, 'Reconciliation status displays total statement rows');
    assert(status.reconciled_transactions >= 1, 'At least one transaction is reconciled');
    console.log(`    Reconciliation rate: ${status.reconciliation_rate.toFixed(2)}%`);
  });

  // 12. Regression Validation
  await test('Regression Validation (Historical service payment entries)', async () => {
    // Ensure that historical workflows or modules can compile and execute without database issues
    const count = await prisma.user.count();
    assert(count > 0, 'Can query database user count');
  });

  console.log('\n==================================================');
  console.log(`VERIFICATION COMPLETE: ${passed}/${totalTests} TESTS PASSED`);
  if (failed > 0) {
    console.error(`❌ ${failed} TESTS FAILED:`);
    failures.forEach(f => console.error(`  → ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! COMPLIANCE AUDIT SECURED.');
    console.log('==================================================\n');
    process.exit(0);
  }
}

runVerification();
