import fs from 'fs';
import path from 'path';
import { prisma } from '../index';

export class IntegrityAuditService {
  private static reportsDir = path.join(process.cwd(), '..', 'reports', 'integrity');

  private static init() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Run the integrity reconciliation check
   */
  static async runAudit(scope: 'INCREMENTAL' | 'FULL' = 'INCREMENTAL'): Promise<any> {
    this.init();
    const startTime = Date.now();
    const runDate = new Date();
    
    console.log(`[IntegrityAuditService] Starting ${scope} integrity audit check...`);

    const inventoryErrors: any[] = [];
    const accountingErrors: any[] = [];
    const businessErrors: any[] = [];
    const warnings: string[] = [];
    let partsToCheck: any[] = [];
    let journalEntries: any[] = [];

    const dateLimit = new Date();
    if (scope === 'INCREMENTAL') {
      dateLimit.setDate(dateLimit.getDate() - 2); // Look back 48 hours for safety margin
    } else {
      dateLimit.setFullYear(2000); // Check everything
    }

    try {
      // ════════════════════════════════════════════════════════════
      // 1. Inventory Integrity Check
      // ════════════════════════════════════════════════════════════
      console.log('[IntegrityAuditService] Checking inventory integrity...');
      
      // Get target parts based on scope
      if (scope === 'INCREMENTAL') {
        const recentMovements = await prisma.stockMovement.findMany({
          where: { createdAt: { gte: dateLimit } },
          select: { partId: true },
          distinct: ['partId']
        });
        const partIds = recentMovements.map(m => m.partId);
        partsToCheck = await prisma.parts.findMany({
          where: { part_id: { in: partIds } },
          include: { stocks: true }
        });
      } else {
        partsToCheck = await prisma.parts.findMany({
          include: { stocks: true }
        });
      }

      for (const part of partsToCheck) {
        // Sum stock movements for every location this part has stock
        for (const stock of part.stocks) {
          const sumAggregate = await prisma.stockMovement.aggregate({
            _sum: { quantity: true },
            where: {
              partId: part.part_id,
              locationId: stock.location_id
            }
          });

          const movementSum = sumAggregate._sum.quantity || 0;
          if (stock.quantity !== movementSum) {
            inventoryErrors.push({
              part_id: part.part_id,
              part_number: part.part_number,
              name: part.name,
              location_id: stock.location_id,
              stock_quantity: stock.quantity,
              stock_movements_sum: movementSum,
              difference: stock.quantity - movementSum
            });
          }
        }
      }

      // ════════════════════════════════════════════════════════════
      // 2. Accounting Integrity Check
      // ════════════════════════════════════════════════════════════
      console.log('[IntegrityAuditService] Checking accounting integrity...');
      
      journalEntries = await prisma.journalEntry.findMany({
        where: scope === 'INCREMENTAL' ? { entry_date: { gte: dateLimit } } : {},
        include: { lines: true }
      });

      for (const entry of journalEntries) {
        let debits = 0;
        let credits = 0;
        for (const line of entry.lines) {
          const amount = Number(line.amount);
          if (line.entry_type === 'debit') {
            debits += amount;
          } else if (line.entry_type === 'credit') {
            credits += amount;
          }
        }

        // Check for mismatch (using a small float tolerance)
        if (Math.abs(debits - credits) > 0.01) {
          accountingErrors.push({
            entry_id: entry.entry_id,
            entry_date: entry.entry_date.toISOString(),
            description: entry.description,
            reference_type: entry.reference_type,
            reference_id: entry.reference_id,
            debits_sum: debits,
            credits_sum: credits,
            difference: debits - credits
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // 3. Business Integrity Check
      // ════════════════════════════════════════════════════════════
      console.log('[IntegrityAuditService] Checking business events integrity...');

      // 3.1 Invoices
      const invoices = await prisma.salesInvoice.findMany({
        where: {
          created_at: { gte: dateLimit },
          status: { in: ['issued', 'paid'] }
        }
      });
      for (const inv of invoices) {
        // Verify StockMovement
        const smCount = await prisma.stockMovement.count({
          where: { referenceType: 'Invoice', referenceId: inv.invoice_id }
        });
        if (smCount === 0) {
          businessErrors.push(`Invoice #${inv.invoice_number} (ID: ${inv.invoice_id}) has no stock movements logged.`);
        }
        
        // Verify JournalEntry
        const jeCount = await prisma.journalEntry.count({
          where: { reference_type: 'Invoice', reference_id: inv.invoice_id }
        });
        if (jeCount === 0) {
          businessErrors.push(`Invoice #${inv.invoice_number} (ID: ${inv.invoice_id}) has no accounting journal entry logged.`);
        }

        // Verify AuditLog
        const alCount = await prisma.auditLog.count({
          where: { entity_type: 'Invoice', entity_id: inv.invoice_id }
        });
        if (alCount === 0) {
          warnings.push(`Invoice #${inv.invoice_number} (ID: ${inv.invoice_id}) has no security audit log.`);
        }
      }

      // 3.2 Purchases
      const purchases = await prisma.purchaseOrder.findMany({
        where: {
          created_at: { gte: dateLimit },
          status: 'received'
        }
      });
      for (const po of purchases) {
        const smCount = await prisma.stockMovement.count({
          where: { referenceType: 'PurchaseOrder', referenceId: po.po_id }
        });
        if (smCount === 0) {
          businessErrors.push(`Purchase Order #${po.po_number} (ID: ${po.po_id}) has no stock movements logged.`);
        }

        const jeCount = await prisma.journalEntry.count({
          where: { reference_type: 'PurchaseOrder', reference_id: po.po_id }
        });
        if (jeCount === 0) {
          businessErrors.push(`Purchase Order #${po.po_number} (ID: ${po.po_id}) has no accounting journal entry logged.`);
        }

        const alCount = await prisma.auditLog.count({
          where: { entity_type: 'PurchaseOrder', entity_id: po.po_id }
        });
        if (alCount === 0) {
          warnings.push(`Purchase Order #${po.po_number} (ID: ${po.po_id}) has no audit log.`);
        }
      }

      // 3.3 Repairs
      const repairs = await prisma.repair.findMany({
        where: {
          created_at: { gte: dateLimit },
          repair_status: 'completed'
        }
      });
      for (const rep of repairs) {
        // StockMovement (if parts were consumed)
        const partCount = await prisma.repairParts.count({ where: { repair_id: rep.repair_id } });
        if (partCount > 0) {
          const smCount = await prisma.stockMovement.count({
            where: { referenceType: 'Repair', referenceId: rep.repair_id }
          });
          if (smCount === 0) {
            businessErrors.push(`Repair Ticket #${rep.ticket_number} (ID: ${rep.repair_id}) consumed parts but has no stock movements.`);
          }
        }

        // JournalEntry (if payment completed or cost registered)
        const jeCount = await prisma.journalEntry.count({
          where: { reference_type: 'Repair', reference_id: rep.repair_id }
        });
        if (jeCount === 0 && Number(rep.actual_cost) > 0) {
          businessErrors.push(`Repair Ticket #${rep.ticket_number} (ID: ${rep.repair_id}) is completed with cost ${rep.actual_cost} but has no journal entry.`);
        }

        // AuditLog
        const alCount = await prisma.auditLog.count({
          where: { entity_type: 'Repair', entity_id: rep.repair_id }
        });
        if (alCount === 0) {
          warnings.push(`Repair Ticket #${rep.ticket_number} (ID: ${rep.repair_id}) has no audit log.`);
        }
      }

      // 3.4 Returns
      const salesReturns = await prisma.salesReturn.findMany({
        where: { return_date: { gte: dateLimit } }
      });
      for (const ret of salesReturns) {
        const smCount = await prisma.stockMovement.count({
          where: { referenceType: 'SalesReturn', referenceId: ret.return_id }
        });
        if (smCount === 0) {
          businessErrors.push(`Sales Return #${ret.return_number} (ID: ${ret.return_id}) has no stock movements logged.`);
        }

        const jeCount = await prisma.journalEntry.count({
          where: { reference_type: 'SalesReturn', reference_id: ret.return_id }
        });
        if (jeCount === 0) {
          businessErrors.push(`Sales Return #${ret.return_number} (ID: ${ret.return_id}) has no journal entry.`);
        }
      }

      // 3.5 Transfers
      const transfers = await prisma.stockMovement.findMany({
        where: {
          createdAt: { gte: dateLimit },
          movementType: { in: ['TRANSFER_IN', 'TRANSFER_OUT'] }
        },
        select: { referenceId: true },
        distinct: ['referenceId']
      });
      for (const t of transfers) {
        if (!t.referenceId) continue;
        const matchingMovements = await prisma.stockMovement.findMany({
          where: { referenceType: 'StockTransfer', referenceId: t.referenceId }
        });
        // A transfer must have at least one IN and one OUT
        const ins = matchingMovements.filter(m => m.movementType === 'TRANSFER_IN');
        const outs = matchingMovements.filter(m => m.movementType === 'TRANSFER_OUT');
        if (ins.length === 0 || outs.length === 0) {
          businessErrors.push(`Stock Transfer sequence ID ${t.referenceId} is unbalanced. In: ${ins.length}, Out: ${outs.length}`);
        }
      }

    } catch (err: any) {
      console.error('[IntegrityAuditService] Error during audit run:', err);
      warnings.push(`Audit run encountered exception: ${err.message}`);
    }

    const duration = Date.now() - startTime;
    const hasErrors = inventoryErrors.length > 0 || accountingErrors.length > 0 || businessErrors.length > 0;
    const status = hasErrors ? 'FAILED' : 'SUCCESS';

    const warningsJson = [...warnings, ...businessErrors];

    // Generate output file paths
    const dateStr = runDate.toISOString().split('T')[0];
    const reportBaseName = `integrity_audit_${scope.toLowerCase()}_${dateStr}_${runDate.getTime()}`;
    
    const jsonPath = path.join(this.reportsDir, `${reportBaseName}.json`);
    const mdPath = path.join(this.reportsDir, `${reportBaseName}.md`);

    // 4. Save JSON Report
    const jsonReport = {
      audit_scope: scope,
      run_date: runDate.toISOString(),
      status,
      duration_ms: duration,
      report_path: mdPath,
      counts: {
        inventory_errors: inventoryErrors.length,
        accounting_errors: accountingErrors.length,
        warnings: warningsJson.length
      },
      inventory_errors: inventoryErrors,
      accounting_errors: accountingErrors,
      warnings: warningsJson
    };

    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf-8');

    // 5. Save Markdown Report
    const mdReport = `# HiSecure ERP — Nightly Integrity Audit Report

* **Audit Run Date:** ${runDate.toLocaleString('en-IN')}
* **Audit Scope:** \`${scope}\`
* **Status:** ${status === 'SUCCESS' ? '🟢 SUCCESS (PASSED)' : '🔴 FAILED (MISMATCHES DETECTED)'}
* **Execution Duration:** ${duration} ms

---

## 1. Mismatch Statistics
| Audit Category | Records Tested | Mismatches Found | Status |
|---|---|---|---|
| Inventory (Stocks vs movements) | ${partsToCheck.length} parts | ${inventoryErrors.length} | ${inventoryErrors.length === 0 ? '✅ Passed' : '❌ Failed'} |
| Ledger (Debits vs Credits) | ${journalEntries.length} entries | ${accountingErrors.length} | ${accountingErrors.length === 0 ? '✅ Passed' : '❌ Failed'} |
| Business Document Logs | Verified recent | ${businessErrors.length} | ${businessErrors.length === 0 ? '✅ Passed' : '❌ Failed'} |

---

## 2. Inventory Discrepancy details
${inventoryErrors.length === 0 ? '*No discrepancies found. All part stocks match stock movements ledgers.*' : 
`| Part ID | SKU | Name | Location ID | Stock Quantity | Stock Movement Sum | Difference |
|---|---|---|---|---|---|---|
${inventoryErrors.map(e => `| ${e.part_id} | ${e.part_number} | ${e.name} | ${e.location_id} | ${e.stock_quantity} | ${e.stock_movements_sum} | ${e.difference} |`).join('\n')}`}

---

## 3. Accounting Discrepancy details
${accountingErrors.length === 0 ? '*No discrepancies found. All journal entries are perfectly balanced.*' : 
`| Entry ID | Date | Description | Reference Type | Reference ID | Debits Sum | Credits Sum | Mismatch Difference |
|---|---|---|---|---|---|---|---|
${accountingErrors.map(e => `| ${e.entry_id} | ${e.entry_date} | ${e.description || 'N/A'} | ${e.reference_type || 'N/A'} | ${e.reference_id || 'N/A'} | ${e.debits_sum} | ${e.credits_sum} | ${e.difference} |`).join('\n')}`}

---

## 4. Warnings & Business Logic Issues
${warningsJson.length === 0 ? '*No warnings or missing transaction entries detected.*' : 
warningsJson.map(w => `* ⚠️ ${w}`).join('\n')}

---
*Generated automatically by HiSecure ERP Integrity Audit Service.*
`;

    fs.writeFileSync(mdPath, mdReport, 'utf-8');

    // 6. Write to database table `integrity_audit_runs`
    await prisma.integrityAuditRun.create({
      data: {
        audit_scope: scope,
        run_date: runDate,
        status,
        inventory_errors: inventoryErrors as any,
        accounting_errors: accountingErrors as any,
        warnings: warningsJson as any,
        duration_ms: duration,
        report_path: mdPath
      }
    });

    console.log(`[IntegrityAuditService] Integrity check completed. Status: ${status}. Report saved to: ${mdPath}`);
    return jsonReport;
  }
}
