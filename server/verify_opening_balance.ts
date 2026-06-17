/**
 * verify_opening_balance.ts
 * Phase 4A.2 — Financial Opening Balance Migration & Certification Verification Suite
 */

process.env.STANDALONE_SCRIPT = 'true';
import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/index';
import { OpeningBalanceMigrationService } from './src/services/OpeningBalanceMigrationService';
import { AccountingService } from './src/services/AccountingService';
import fs from 'fs';
import path from 'path';

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

async function runVerification() {
  console.log('==================================================');
  console.log('PHASE 4A.2 — OPENING BALANCE MIGRATION VERIFICATION');
  console.log('==================================================\n');

  const accountingService = new AccountingService();

  // ─────────────────────────────────────────────────────────────────
  // PRE-RUN CLEANUP (for repeatable testing)
  // ─────────────────────────────────────────────────────────────────
  console.log('Cleaning up previous migration entries for test safety...');
  const existingMigration = await prisma.journalEntry.findFirst({
    where: { description: 'Opening Balance Migration - Inventory Sync' }
  });
  if (existingMigration) {
    // Bypass prisma client extensions using raw sql delete
    await prisma.$executeRawUnsafe(`DELETE FROM journal_entry_lines WHERE entry_id = ${existingMigration.entry_id}`);
    await prisma.$executeRawUnsafe(`DELETE FROM journal_entries WHERE entry_id = ${existingMigration.entry_id}`);
    console.log(`  - Deleted previous migration journal entry ID ${existingMigration.entry_id}`);
  }
  await prisma.businessEvent.deleteMany({
    where: { event_type: 'OPENING_BALANCE_POSTED' }
  });
  console.log('Cleanup complete.\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Opening balance entry creation
  // ─────────────────────────────────────────────────────────────────
  await test('Test 1: Opening balance entry creation', async () => {
    const verdict = await OpeningBalanceMigrationService.runMigration();
    assert(verdict === 'PRODUCTION_CERTIFIED', `Expected verdict to be PRODUCTION_CERTIFIED, got ${verdict}`);

    const migrationEntry = await prisma.journalEntry.findFirst({
      where: { description: 'Opening Balance Migration - Inventory Sync' },
      include: { lines: true }
    });
    assert(!!migrationEntry, 'Migration journal entry was not created');
    assert(migrationEntry!.lines.length === 2, 'Migration entry must have exactly 2 lines');

    const inventoryAssetAccount = await prisma.account.findFirst({
      where: { OR: [{ code: '1004' }, { name: 'Inventory Asset' }] }
    });
    const retainedEarningsAccount = await prisma.account.findFirst({
      where: { OR: [{ code: '3001' }, { name: 'Retained Earnings' }] }
    });

    const debitLine = migrationEntry!.lines.find(l => l.account_id === inventoryAssetAccount!.account_id && l.entry_type === 'debit');
    const creditLine = migrationEntry!.lines.find(l => l.account_id === retainedEarningsAccount!.account_id && l.entry_type === 'credit');

    assert(!!debitLine, 'Missing debit line to Inventory Asset');
    assert(!!creditLine, 'Missing credit line to Retained Earnings');
    assert(Number(debitLine!.amount) === Number(creditLine!.amount), 'Debit amount does not match credit amount');
    assert(Number(debitLine!.amount) > 0, 'Discrepancy amount must be positive');

    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'OPENING_BALANCE_POSTED' }
    });
    assert(!!event, 'BusinessEvent OPENING_BALANCE_POSTED was not logged');
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Duplicate execution prevention
  // ─────────────────────────────────────────────────────────────────
  await test('Test 2: Duplicate execution prevention', async () => {
    let threw = false;
    try {
      await OpeningBalanceMigrationService.runMigration();
    } catch (err: any) {
      threw = true;
      assert(err.message === 'OPENING_BALANCE_ALREADY_MIGRATED', `Expected OPENING_BALANCE_ALREADY_MIGRATED, got ${err.message}`);
    }
    assert(threw, 'Migration executed twice without throwing an error');
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Ledger balance reconciliation
  // ─────────────────────────────────────────────────────────────────
  await test('Test 3: Ledger balance reconciliation', async () => {
    const partStocksAll = await prisma.partStock.findMany({ include: { part: true } });
    let physicalValuation = 0;
    for (const ps of partStocksAll) {
      physicalValuation += Number(ps.quantity) * Number(ps.part.cost_price || 0);
    }

    const inventoryAssetAccount = await prisma.account.findFirst({
      where: { OR: [{ code: '1004' }, { name: 'Inventory Asset' }] }
    });
    const invLedgerLines = await prisma.journalEntryLine.findMany({
      where: { account_id: inventoryAssetAccount!.account_id }
    });
    const ledgerInventoryValue = invLedgerLines.reduce((sum, line) => {
      return sum + (line.entry_type === 'debit' ? Number(line.amount) : -Number(line.amount));
    }, 0);

    const difference = Math.abs(physicalValuation - ledgerInventoryValue);
    console.log(`    [Verification] Physical Stock Cost: ₹${physicalValuation.toFixed(2)}, GL Ledger stock balance: ₹${ledgerInventoryValue.toFixed(2)}`);
    console.log(`    [Verification] Reconciled difference: ₹${difference.toFixed(2)}`);
    assert(difference < 0.01, `Expected difference to be ₹0.00, got ₹${difference.toFixed(2)}`);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Trial balance remains balanced
  // ─────────────────────────────────────────────────────────────────
  await test('Test 4: Trial balance remains balanced', async () => {
    const tb = await accountingService.getTrialBalance({});
    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of tb) {
      totalDebit += item.net_debit;
      totalCredit += item.net_credit;
    }
    const tbDifference = Math.abs(totalDebit - totalCredit);
    console.log(`    [Verification] Trial Balance: DR ₹${totalDebit.toFixed(2)}, CR ₹${totalCredit.toFixed(2)} (Diff: ₹${tbDifference.toFixed(2)})`);
    assert(tbDifference < 0.01, `Trial balance is out of balance by ₹${tbDifference.toFixed(2)}`);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: Assets = Liabilities + Equity remains valid
  // ─────────────────────────────────────────────────────────────────
  await test('Test 5: Assets = Liabilities + Equity remains valid', async () => {
    const bs = await accountingService.getBalanceSheet({});
    const bsDifference = Math.abs(bs.total_assets - bs.total_liabilities_and_equity);
    console.log(`    [Verification] Balance Sheet: Assets ₹${bs.total_assets.toFixed(2)}, Liabilities+Equity ₹${bs.total_liabilities_and_equity.toFixed(2)} (Diff: ₹${bsDifference.toFixed(2)})`);
    assert(bsDifference < 0.01, `Balance sheet is out of balance by ₹${bsDifference.toFixed(2)}`);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Production certification report generation
  // ─────────────────────────────────────────────────────────────────
  await test('Test 6: Production certification report generation', async () => {
    const projectRootJson = path.resolve(__dirname, '../production_certification_report.json');
    const projectRootMd = path.resolve(__dirname, '../production_certification_report.md');
    const serverJson = path.resolve(__dirname, 'production_certification_report.json');
    const serverMd = path.resolve(__dirname, 'production_certification_report.md');

    assert(fs.existsSync(projectRootJson), 'production_certification_report.json missing from workspace root');
    assert(fs.existsSync(projectRootMd), 'production_certification_report.md missing from workspace root');
    assert(fs.existsSync(serverJson), 'production_certification_report.json missing from server directory');
    assert(fs.existsSync(serverMd), 'production_certification_report.md missing from server directory');

    const jsonContent = JSON.parse(fs.readFileSync(projectRootJson, 'utf8'));
    assert(jsonContent.verdict === 'PRODUCTION_CERTIFIED', `Expected json verdict to be PRODUCTION_CERTIFIED, got ${jsonContent.verdict}`);

    const mdContent = fs.readFileSync(projectRootMd, 'utf8');
    assert(mdContent.includes('PRODUCTION_CERTIFIED'), 'Markdown report does not contain the word PRODUCTION_CERTIFIED');
  });

  console.log('\n==================================================');
  console.log(`VERIFICATION COMPLETE: ${passed}/${totalTests} TESTS PASSED`);
  if (failed > 0) {
    console.error(`❌ ${failed} TESTS FAILED:`);
    failures.forEach(f => console.error(`  → ${f}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! PRODUCTION CERTIFICATION SECURED.');
    console.log('==================================================\n');
    console.log('PRODUCTION_CERTIFIED');
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Verification crashed:', err);
  process.exit(1);
});
