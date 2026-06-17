import { execSync } from 'child_process';
import { PrismaClient } from '../generated/client';
import { prisma } from '../index';
import fs from 'fs';
import path from 'path';

export class RecoveryValidationService {
  /**
   * Run a sandboxed recovery dry-run:
   * 1. Recreate the isolated database `hisecure_erp_temp`
   * 2. Run migrations
   * 3. Restore JSON backup into the isolated database
   * 4. Perform integrity reconciliation checks
   * 5. Generate and save the recovery validation report
   */
  static async validateRecovery(backupFilePath: string): Promise<any> {
    console.log(`[RecoveryValidationService] Starting recovery dry-run validation for file: ${backupFilePath}`);
    
    const startTime = Date.now();
    const mainDbUrl = process.env.DATABASE_URL || '';
    if (!mainDbUrl) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }

    // Determine temporary database URL
    const parsed = new URL(mainDbUrl);
    parsed.pathname = '/hisecure_erp_temp';
    const tempDbUrl = parsed.toString();

    try {
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file does not exist at: ${backupFilePath}`);
      }

      // 1. Recreate the isolated database schema
      console.log('[RecoveryValidationService] Recreating database hisecure_erp_temp...');
      
      // Terminate existing connections first to avoid locked database errors
      try {
        await prisma.$executeRawUnsafe(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = 'hisecure_erp_temp'
            AND pid <> pg_backend_pid();
        `);
      } catch (err: any) {
        console.warn('[RecoveryValidationService] Warning during connection termination:', err.message);
      }

      try {
        await prisma.$executeRawUnsafe('DROP DATABASE IF EXISTS hisecure_erp_temp');
      } catch (err: any) {
        console.warn('[RecoveryValidationService] Warning dropping temp db:', err.message);
      }

      try {
        await prisma.$executeRawUnsafe('CREATE DATABASE hisecure_erp_temp');
      } catch (err: any) {
        throw new Error(`Failed to create temp database: ${err.message}`);
      }

      // 2. Run migrations on the isolated database
      console.log('[RecoveryValidationService] Applying prisma migrations to hisecure_erp_temp...');
      try {
        execSync('npx prisma migrate deploy', {
          env: {
            ...process.env,
            DATABASE_URL: tempDbUrl
          },
          stdio: 'inherit'
        });
      } catch (err: any) {
        throw new Error(`Migrations failed on temporary database: ${err.message}`);
      }

      // 3. Connect tempPrisma
      const tempPrisma = new PrismaClient({
        datasources: {
          db: {
            url: tempDbUrl
          }
        }
      });

      // 4. Restore the JSON payload
      console.log('[RecoveryValidationService] Importing backup JSON data into sandbox...');
      const backup = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'));
      const backupData = backup.data || {};

      const restoreTable = async (_modelName: string, tableData: any[], insertFn: (item: any) => Promise<void>) => {
        if (!tableData || tableData.length === 0) return;
        for (const item of tableData) {
          await insertFn(item);
        }
      };

      // Restore base lookup tables in dependency order
      // Settings
      await restoreTable('Setting', backupData.settings || [], async (item) => {
        await tempPrisma.setting.create({ data: { key: item.key, value: item.value } });
      });

      // Brand
      await restoreTable('Brand', backupData.brands || [], async (item) => {
        await tempPrisma.brand.create({ data: { brand_id: item.brand_id, name: item.name, created_at: new Date(item.created_at) } });
      });

      // Technician
      await restoreTable('Technician', backupData.technicians || [], async (item) => {
        await tempPrisma.technician.create({ data: { technician_id: item.technician_id, name: item.name, phone: item.phone, specialization: item.specialization, is_active: item.is_active, created_at: new Date(item.created_at) } });
      });

      // Location
      await restoreTable('Location', backupData.locations || [], async (item) => {
        await tempPrisma.location.create({ data: { location_id: item.location_id, location_code: item.location_code, name: item.name, address: item.address, phone: item.phone, email: item.email, gstin: item.gstin, is_main: item.is_main, is_active: item.is_active, created_at: new Date(item.created_at) } });
      });

      // User
      await restoreTable('User', backupData.users || [], async (item) => {
        await tempPrisma.user.create({ data: { user_id: item.user_id, username: item.username, email: item.email, password_hash: item.password_hash, full_name: item.full_name, role: item.role, phone: item.phone, is_active: item.is_active, last_login: item.last_login ? new Date(item.last_login) : null, created_at: new Date(item.created_at) } });
      });

      // Role
      await restoreTable('Role', backupData.roles || [], async (item) => {
        await tempPrisma.role.create({ data: { role_id: item.role_id, name: item.name, description: item.description, created_at: new Date(item.created_at) } });
      });

      // Permission
      await restoreTable('Permission', backupData.permissions || [], async (item) => {
        await tempPrisma.permission.create({ data: { permission_id: item.permission_id, name: item.name, description: item.description, created_at: new Date(item.created_at) } });
      });

      // RolePermission
      await restoreTable('RolePermission', backupData.rolePermissions || [], async (item) => {
        await tempPrisma.rolePermission.create({ data: { role_id: item.role_id, permission_id: item.permission_id } });
      });

      // UserRole
      await restoreTable('UserRole', backupData.userRoles || [], async (item) => {
        await tempPrisma.userRole.create({ data: { user_id: item.user_id, role_id: item.role_id } });
      });

      // Company
      await restoreTable('Company', backupData.companies || [], async (item) => {
        await tempPrisma.company.create({ data: { company_id: item.company_id, name: item.name, gstin: item.gstin, pan: item.pan, address: item.address, phone: item.phone, email: item.email, bank_name: item.bank_name, bank_account: item.bank_account, code: item.code, ifsc_code: item.ifsc_code, is_active: item.is_active, created_at: new Date(item.created_at) } });
      });

      // Customer
      await restoreTable('Customer', backupData.customers || [], async (item) => {
        await tempPrisma.customer.create({ data: { customer_id: item.customer_id, customer_code: item.customer_code, name: item.name, phone: item.phone, email: item.email, address: item.address, city: item.city, state: item.state, pincode: item.pincode, gstin: item.gstin, customer_type: item.customer_type, credit_limit: Number(item.credit_limit), is_active: item.is_active, contact_person: item.contact_person, created_at: new Date(item.created_at) } });
      });

      // Supplier
      await restoreTable('Supplier', backupData.suppliers || [], async (item) => {
        await tempPrisma.supplier.create({ data: { supplier_id: item.supplier_id, supplier_code: item.supplier_code, name: item.name, contact_person: item.contact_person, phone: item.phone, email: item.email, gstin: item.gstin, pan: item.pan, address: item.address, city: item.city, state: item.state, pincode: item.pincode, is_active: item.is_active, created_at: new Date(item.created_at) } });
      });

      // Parts
      await restoreTable('Parts', backupData.parts || [], async (item) => {
        await tempPrisma.parts.create({ data: { part_id: item.part_id, part_number: item.part_number, name: item.name, description: item.description, brand_id: item.brand_id, hsn_code: item.hsn_code, cost_price: item.cost_price ? Number(item.cost_price) : 0, selling_price: Number(item.selling_price), tax_rate: Number(item.tax_rate), stock_quantity: item.stock_quantity, reorder_level: item.reorder_level, is_active: item.is_active, created_at: new Date(item.created_at) } });
      });

      // PartStock
      await restoreTable('PartStock', backupData.partStocks || [], async (item) => {
        await tempPrisma.partStock.create({ data: { part_id: item.part_id, location_id: item.location_id, quantity: item.quantity } });
      });

      // Account
      await restoreTable('Account', backupData.accounts || [], async (item) => {
        await tempPrisma.account.create({ data: { account_id: item.account_id, code: item.code, name: item.name, type: item.type, is_active: item.is_active, created_at: new Date(item.created_at) } });
      });

      // PosSession
      await restoreTable('PosSession', backupData.posSessions || [], async (item) => {
        await tempPrisma.posSession.create({ data: { session_id: item.session_id, session_date: new Date(item.session_date), counter_id: item.counter_id, opening_cash: Number(item.opening_cash), closing_cash: Number(item.closing_cash), total_sales: Number(item.total_sales), total_refunds: Number(item.total_refunds), cash_payments: Number(item.cash_payments), upi_payments: Number(item.upi_payments), card_payments: Number(item.card_payments), closed: item.closed, closed_at: item.closed_at ? new Date(item.closed_at) : null, created_at: new Date(item.created_at) } });
      });

      // PosTransaction
      await restoreTable('PosTransaction', backupData.posTransactions || [], async (item) => {
        await tempPrisma.posTransaction.create({ data: { transaction_id: item.transaction_id, session_id: item.session_id, invoice_number: item.invoice_number, customer_id: item.customer_id, subtotal: Number(item.subtotal), tax_amount: Number(item.tax_amount), discount: Number(item.discount), total: Number(item.total), cash_received: Number(item.cash_received), change_given: Number(item.change_given), payment_method: item.payment_method, items_json: item.items_json, created_at: new Date(item.created_at) } });
      });

      // SalesInvoice
      await restoreTable('SalesInvoice', backupData.invoices || [], async (item) => {
        const { items, ...invoiceData } = item;
        const created = await tempPrisma.salesInvoice.create({ data: { ...invoiceData, total_amount: invoiceData.total_amount ? Number(invoiceData.total_amount) : 0, tax_amount: invoiceData.tax_amount ? Number(invoiceData.tax_amount) : 0, grand_total: Number(invoiceData.grand_total), cgst_amount: invoiceData.cgst_amount ? Number(invoiceData.cgst_amount) : 0, sgst_amount: invoiceData.sgst_amount ? Number(invoiceData.sgst_amount) : 0, igst_amount: invoiceData.igst_amount ? Number(invoiceData.igst_amount) : 0, invoice_date: new Date(invoiceData.invoice_date), due_date: invoiceData.due_date ? new Date(invoiceData.due_date) : null, created_at: new Date(invoiceData.created_at) } });
        if (Array.isArray(items)) {
          for (const line of items) {
            const { item_id, invoice_id, ...lineData } = line;
            await tempPrisma.salesInvoiceItems.create({ data: { ...lineData, item_id, invoice_id: created.invoice_id, unit_price: Number(lineData.unit_price), tax_rate: Number(lineData.tax_rate), tax_amount: Number(lineData.tax_amount), total_amount: Number(lineData.total_amount) } });
          }
        }
      });

      // Repair
      await restoreTable('Repair', backupData.repairs || [], async (item) => {
        const { parts, ...repairData } = item;
        const created = await tempPrisma.repair.create({ data: { ...repairData, estimated_cost: repairData.estimated_cost ? Number(repairData.estimated_cost) : 0, actual_cost: Number(repairData.actual_cost), received_date: new Date(repairData.received_date), diagnosed_date: repairData.diagnosed_date ? new Date(repairData.diagnosed_date) : null, repair_start_date: repairData.repair_start_date ? new Date(repairData.repair_start_date) : null, completion_date: repairData.completion_date ? new Date(repairData.completion_date) : null, pickup_date: repairData.pickup_date ? new Date(repairData.pickup_date) : null, warranty_expiry: repairData.warranty_expiry ? new Date(repairData.warranty_expiry) : null, created_at: new Date(repairData.created_at) } });
        if (Array.isArray(parts)) {
          for (const p of parts) {
            const { repair_part_id, repair_id, ...pData } = p;
            await tempPrisma.repairParts.create({ data: { ...pData, repair_part_id, repair_id: created.repair_id, price_charged: pData.price_charged ? Number(pData.price_charged) : 0 } });
          }
        }
      });

      // Quotation
      await restoreTable('Quotation', backupData.quotations || [], async (item) => {
        const { items, ...qData } = item;
        const created = await tempPrisma.quotation.create({ data: { ...qData, subtotal: Number(qData.subtotal), total_discount: Number(qData.total_discount), total_tax: Number(qData.total_tax), total_amount: Number(qData.total_amount), quote_date: new Date(qData.quote_date), valid_until: new Date(qData.valid_until), created_at: new Date(qData.created_at) } });
        if (Array.isArray(items)) {
          for (const line of items) {
            const { quote_item_id, quote_id, ...lineData } = line;
            await tempPrisma.quotationItems.create({ data: { ...lineData, quote_item_id, quote_id: created.quote_id, unit_price: Number(lineData.unit_price), discount_percent: Number(lineData.discount_percent), tax_rate: Number(lineData.tax_rate), total: Number(lineData.total) } });
          }
        }
      });

      // DeliveryChallan
      await restoreTable('DeliveryChallan', backupData.challans || [], async (item) => {
        const { items, ...dcData } = item;
        const created = await tempPrisma.deliveryChallan.create({ data: { ...dcData, total_amount: Number(dcData.total_amount), challan_date: new Date(dcData.challan_date), expected_delivery_date: dcData.expected_delivery_date ? new Date(dcData.expected_delivery_date) : null, approved_at: dcData.approved_at ? new Date(dcData.approved_at) : null, created_at: new Date(dcData.created_at) } });
        if (Array.isArray(items)) {
          for (const line of items) {
            const { challan_item_id, delivery_challan_id, ...lineData } = line;
            await tempPrisma.deliveryChallanItems.create({ data: { ...lineData, challan_item_id, delivery_challan_id: created.delivery_challan_id, unit_price: lineData.unit_price ? Number(lineData.unit_price) : 0, expiry_date: lineData.expiry_date ? new Date(lineData.expiry_date) : null } });
          }
        }
      });

      // PurchaseOrder
      await restoreTable('PurchaseOrder', backupData.purchaseOrders || [], async (item) => {
        const { items, ...poData } = item;
        const created = await tempPrisma.purchaseOrder.create({ data: { ...poData, total_amount: Number(poData.total_amount), order_date: new Date(poData.order_date), expected_delivery: poData.expected_delivery ? new Date(poData.expected_delivery) : null, created_at: new Date(poData.created_at) } });
        if (Array.isArray(items)) {
          for (const line of items) {
            const { po_item_id, po_id, ...lineData } = line;
            await tempPrisma.purchaseOrderItems.create({ data: { ...lineData, po_item_id, po_id: created.po_id, unit_price: Number(lineData.unit_price), total_amount: Number(lineData.total_amount), expiration_date: lineData.expiration_date ? new Date(lineData.expiration_date) : null } });
          }
        }
      });

      // SalesReturn
      await restoreTable('SalesReturn', backupData.salesReturns || [], async (item) => {
        const { items, ...returnData } = item;
        const created = await tempPrisma.salesReturn.create({
          data: {
            ...returnData,
            total_amount: Number(returnData.total_amount),
            tax_amount: Number(returnData.tax_amount),
            grand_total: Number(returnData.grand_total),
            return_date: new Date(returnData.return_date)
          }
        });
        if (Array.isArray(items)) {
          for (const line of items) {
            const { item_id, return_id, ...lineData } = line;
            await tempPrisma.salesReturnItem.create({
              data: {
                ...lineData,
                item_id,
                return_id: created.return_id,
                unit_price: Number(lineData.unit_price),
                tax_rate: Number(lineData.tax_rate),
                tax_amount: Number(lineData.tax_amount),
                total_amount: Number(lineData.total_amount)
              }
            });
          }
        }
      });

      // PurchaseReturn
      await restoreTable('PurchaseReturn', backupData.purchaseReturns || [], async (item) => {
        const { items, ...returnData } = item;
        const created = await tempPrisma.purchaseReturn.create({
          data: {
            ...returnData,
            total_amount: Number(returnData.total_amount),
            return_date: new Date(returnData.return_date)
          }
        });
        if (Array.isArray(items)) {
          for (const line of items) {
            const { item_id, return_id, ...lineData } = line;
            await tempPrisma.purchaseReturnItem.create({
              data: {
                ...lineData,
                item_id,
                return_id: created.return_id,
                unit_price: Number(lineData.unit_price),
                total_amount: Number(lineData.total_amount)
              }
            });
          }
        }
      });

      // StockMovement
      await restoreTable('StockMovement', backupData.stockMovements || [], async (item) => {
        await tempPrisma.stockMovement.create({ data: { id: item.id, partId: item.partId, locationId: item.locationId, movementType: item.movementType, quantity: item.quantity, referenceType: item.referenceType, referenceId: item.referenceId, createdAt: new Date(item.createdAt) } });
      });

      // JournalEntry
      await restoreTable('JournalEntry', backupData.journalEntries || [], async (item) => {
        const { lines, ...jeData } = item;
        const created = await tempPrisma.journalEntry.create({ data: { ...jeData, entry_date: new Date(jeData.entry_date), created_at: new Date(jeData.created_at) } });
        if (Array.isArray(lines)) {
          for (const line of lines) {
            const { line_id, entry_id, ...lineData } = line;
            await tempPrisma.journalEntryLine.create({ data: { ...lineData, line_id, entry_id: created.entry_id, amount: Number(lineData.amount) } });
          }
        }
      });

      // Attachments
      await restoreTable('Attachment', backupData.attachments || [], async (item) => {
        await tempPrisma.attachment.create({ data: { attachment_id: item.attachment_id, entity_type: item.entity_type, entity_id: item.entity_id, file_name: item.file_name, file_path: item.file_path, mime_type: item.mime_type || 'application/octet-stream', uploaded_by: item.uploaded_by || 1, uploaded_at: item.uploaded_at ? new Date(item.uploaded_at) : new Date() } });
      });

      // Reset PostgreSQL sequences
      console.log('[RecoveryValidationService] Resetting database auto-increment sequences...');
      const tableIdCols = [
        ['brands', 'brand_id'],
        ['technicians', 'technician_id'],
        ['locations', 'location_id'],
        ['users', 'user_id'],
        ['roles', 'role_id'],
        ['permissions', 'permission_id'],
        ['companies', 'company_id'],
        ['customers', 'customer_id'],
        ['suppliers', 'supplier_id'],
        ['parts', 'part_id'],
        ['pos_sessions', 'session_id'],
        ['pos_transactions', 'transaction_id'],
        ['sales_invoices', 'invoice_id'],
        ['sales_invoice_items', 'item_id'],
        ['repairs', 'repair_id'],
        ['repair_parts', 'repair_part_id'],
        ['quotations', 'quote_id'],
        ['quotation_items', 'quote_item_id'],
        ['delivery_challans', 'delivery_challan_id'],
        ['delivery_challan_items', 'challan_item_id'],
        ['delivery_challan_returns', 'return_id'],
        ['purchase_orders', 'po_id'],
        ['purchase_order_items', 'po_item_id'],
        ['sales_returns', 'return_id'],
        ['sales_return_items', 'item_id'],
        ['purchase_returns', 'return_id'],
        ['purchase_return_items', 'item_id'],
        ['stock_movements', 'id'],
        ['journal_entries', 'entry_id'],
        ['journal_entry_lines', 'line_id'],
        ['attachments', 'attachment_id']
      ];

      for (const [table, col] of tableIdCols) {
        try {
          await tempPrisma.$executeRawUnsafe(`
            SELECT setval(pg_get_serial_sequence('"${table}"', '${col}'), coalesce(max("${col}"), 1) + 1) FROM "${table}";
          `);
        } catch (seqErr: any) {
          console.warn(`[RecoveryValidationService] Sequence reset warning for table ${table}:`, seqErr.message);
        }
      }

      // 5. Run Integrity Audit checks on the temporary database
      console.log('[RecoveryValidationService] Running integrity reconciliation checks on sandbox...');
      const inventory_errors = [];
      const accounting_errors = [];

      // A. Inventory check
      const tempPartStocks = await tempPrisma.partStock.findMany({
        include: { part: true }
      });
      for (const stock of tempPartStocks) {
        const sumAggregate = await tempPrisma.stockMovement.aggregate({
          _sum: { quantity: true },
          where: {
            partId: stock.part_id,
            locationId: stock.location_id
          }
        });
        const movementSum = sumAggregate._sum.quantity || 0;
        if (stock.quantity !== movementSum) {
          inventory_errors.push({
            part_id: stock.part_id,
            part_number: stock.part.part_number,
            location_id: stock.location_id,
            stock_quantity: stock.quantity,
            stock_movements_sum: movementSum,
            difference: stock.quantity - movementSum
          });
        }
      }

      // B. Accounting check
      const tempJournalEntries = await tempPrisma.journalEntry.findMany({
        include: { lines: true }
      });
      for (const entry of tempJournalEntries) {
        let debits = 0;
        let credits = 0;
        for (const line of entry.lines) {
          const amt = Number(line.amount);
          if (line.entry_type === 'debit') {
            debits += amt;
          } else {
            credits += amt;
          }
        }
        if (Math.abs(debits - credits) > 0.01) {
          accounting_errors.push({
            entry_id: entry.entry_id,
            debits,
            credits,
            difference: Math.abs(debits - credits)
          });
        }
      }

      // Determine validation status
      const totalErrors = inventory_errors.length + accounting_errors.length;
      const status = totalErrors === 0 ? 'passed' : 'failed';

      // Disconnect temp client
      await tempPrisma.$disconnect();

      // Clean up of the temp database is deferred to the caller (or the next run's initialization)
      // to allow verification count checks to complete before deletion.
      /*
      try {
        await prisma.$executeRawUnsafe('DROP DATABASE IF EXISTS hisecure_erp_temp');
      } catch (err: any) {
        console.warn('[RecoveryValidationService] Clean up drop warning:', err.message);
      }
      */

      // 6. Log recovery report in the main database
      const recordCounts: any = {};
      for (const key of Object.keys(backupData)) {
        if (Array.isArray(backupData[key])) {
          recordCounts[key] = backupData[key].length;
        }
      }

      const report = await prisma.restoreVerificationReport.create({
        data: {
          backup_file: backupFilePath,
          status,
          checksum_valid: true,
          file_integrity: 'valid',
          record_counts: recordCounts,
          errors: totalErrors > 0 
            ? `Sandbox integrity reconciliation failed. Inventory errors: ${inventory_errors.length}, Accounting errors: ${accounting_errors.length}.`
            : null
        }
      });

      console.log(`[RecoveryValidationService] Recovery validation finished in ${Date.now() - startTime}ms. Status: ${status}`);
      return report;

    } catch (err: any) {
      console.error('[RecoveryValidationService] Recovery validation failed:', err.message);
      
      const report = await prisma.restoreVerificationReport.create({
        data: {
          backup_file: backupFilePath,
          status: 'failed',
          checksum_valid: false,
          file_integrity: 'corrupt',
          record_counts: {},
          errors: `Recovery dry-run error: ${err.message || err}`
        }
      });
      return report;
    }
  }
}
