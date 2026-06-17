const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const backupFile = path.join(__dirname, '..', 'backups_safety', 'hisecure_erp_pre_hardening_1781527912470.json');

if (!fs.existsSync(backupFile)) {
  console.error(`Backup file not found: ${backupFile}`);
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

async function restoreTable(modelName, data, insertFn) {
  if (!data || data.length === 0) {
    console.log(`No data to restore for ${modelName}`);
    return;
  }
  console.log(`Restoring ${data.length} records for ${modelName}...`);
  for (const item of data) {
    try {
      await insertFn(item);
    } catch (err) {
      console.error(`Error inserting into ${modelName}:`, err.message, JSON.stringify(item));
    }
  }
}

async function main() {
  try {
    console.log('--- STARTING DATABASE RESTORE ---');

    // 1. settings
    await restoreTable('Setting', backup.setting, async (item) => {
      await prisma.setting.create({ data: { key: item.key, value: item.value } });
    });

    // 2. brand
    await restoreTable('Brand', backup.brand, async (item) => {
      await prisma.brand.create({ data: { brand_id: item.brand_id, name: item.name, created_at: new Date(item.created_at) } });
    });

    // 3. technician
    await restoreTable('Technician', backup.technician, async (item) => {
      await prisma.technician.create({ data: { technician_id: item.technician_id, name: item.name, phone: item.phone, specialization: item.specialization, is_active: item.is_active, created_at: new Date(item.created_at) } });
    });

    // 4. location
    await restoreTable('Location', backup.location, async (item) => {
      await prisma.location.create({ data: { location_id: item.location_id, location_code: item.location_code, name: item.name, address: item.address, phone: item.phone, email: item.email, gstin: item.gstin, is_main: item.is_main, is_active: item.is_active, created_at: new Date(item.created_at) } });
    });

    // 5. user
    await restoreTable('User', backup.user, async (item) => {
      await prisma.user.create({ data: { user_id: item.user_id, username: item.username, email: item.email, password_hash: item.password_hash, full_name: item.full_name, role: item.role, phone: item.phone, is_active: item.is_active, last_login: item.last_login ? new Date(item.last_login) : null, created_at: new Date(item.created_at) } });
    });

    // 6. role
    await restoreTable('Role', backup.role, async (item) => {
      await prisma.role.create({ data: { role_id: item.role_id, name: item.name, description: item.description, created_at: new Date(item.created_at) } });
    });

    // 7. permission
    await restoreTable('Permission', backup.permission, async (item) => {
      await prisma.permission.create({ data: { permission_id: item.permission_id, name: item.name, description: item.description, created_at: new Date(item.created_at) } });
    });

    // 8. rolePermission
    await restoreTable('RolePermission', backup.rolePermission, async (item) => {
      await prisma.rolePermission.create({ data: { role_id: item.role_id, permission_id: item.permission_id } });
    });

    // 9. userRole
    await restoreTable('UserRole', backup.userRole, async (item) => {
      await prisma.userRole.create({ data: { user_id: item.user_id, role_id: item.role_id } });
    });

    // 10. company
    await restoreTable('Company', backup.company, async (item) => {
      await prisma.company.create({ data: { company_id: item.company_id, name: item.name, gstin: item.gstin, pan: item.pan, address: item.address, phone: item.phone, email: item.email, bank_name: item.bank_name, bank_account: item.bank_account, code: item.code, ifsc_code: item.ifsc_code, is_active: item.is_active, created_at: new Date(item.created_at) } });
    });

    // 11. customer
    await restoreTable('Customer', backup.customer, async (item) => {
      await prisma.customer.create({ data: { customer_id: item.customer_id, customer_code: item.customer_code, name: item.name, phone: item.phone, email: item.email, address: item.address, city: item.city, state: item.state, pincode: item.pincode, gstin: item.gstin, customer_type: item.customer_type, credit_limit: Number(item.credit_limit), is_active: item.is_active, contact_person: item.contact_person, created_at: new Date(item.created_at) } });
    });

    // 12. supplier
    await restoreTable('Supplier', backup.supplier, async (item) => {
      await prisma.supplier.create({ data: { supplier_id: item.supplier_id, supplier_code: item.supplier_code, name: item.name, contact_person: item.contact_person, phone: item.phone, email: item.email, gstin: item.gstin, pan: item.pan, address: item.address, city: item.city, state: item.state, pincode: item.pincode, is_active: item.is_active, created_at: new Date(item.created_at) } });
    });

    // 13. parts
    await restoreTable('Parts', backup.parts, async (item) => {
      await prisma.parts.create({ data: { part_id: item.part_id, part_number: item.part_number, name: item.name, description: item.description, brand_id: item.brand_id, hsn_code: item.hsn_code, cost_price: item.cost_price ? Number(item.cost_price) : 0, selling_price: Number(item.selling_price), tax_rate: Number(item.tax_rate), stock_quantity: item.stock_quantity, reorder_level: item.reorder_level, is_active: item.is_active, created_at: new Date(item.created_at) } });
    });

    // 14. partStock
    await restoreTable('PartStock', backup.partStock, async (item) => {
      await prisma.partStock.create({ data: { part_id: item.part_id, location_id: item.location_id, quantity: item.quantity } });
    });

    // 15. account
    await restoreTable('Account', backup.account, async (item) => {
      await prisma.account.create({ data: { account_id: item.account_id, code: item.code, name: item.name, type: item.type, is_active: item.is_active, created_at: new Date(item.created_at) } });
    });

    // 16. posSession
    await restoreTable('PosSession', backup.posSession, async (item) => {
      await prisma.posSession.create({ data: { session_id: item.session_id, session_date: new Date(item.session_date), counter_id: item.counter_id, opening_cash: Number(item.opening_cash), closing_cash: Number(item.closing_cash), total_sales: Number(item.total_sales), total_refunds: Number(item.total_refunds), cash_payments: Number(item.cash_payments), upi_payments: Number(item.upi_payments), card_payments: Number(item.card_payments), closed: item.closed, closed_at: item.closed_at ? new Date(item.closed_at) : null, created_at: new Date(item.created_at) } });
    });

    // 17. posTransaction
    await restoreTable('PosTransaction', backup.posTransaction, async (item) => {
      await prisma.posTransaction.create({ data: { transaction_id: item.transaction_id, session_id: item.session_id, invoice_number: item.invoice_number, customer_id: item.customer_id, subtotal: Number(item.subtotal), tax_amount: Number(item.tax_amount), discount: Number(item.discount), total: Number(item.total), cash_received: Number(item.cash_received), change_given: Number(item.change_given), payment_method: item.payment_method, items_json: item.items_json, created_at: new Date(item.created_at) } });
    });

    // 18. salesInvoice + items
    await restoreTable('SalesInvoice', backup.invoices, async (item) => {
      const { items, ...invoiceData } = item;
      const created = await prisma.salesInvoice.create({ data: { ...invoiceData, total_amount: invoiceData.total_amount ? Number(invoiceData.total_amount) : 0, tax_amount: invoiceData.tax_amount ? Number(invoiceData.tax_amount) : 0, grand_total: Number(invoiceData.grand_total), cgst_amount: invoiceData.cgst_amount ? Number(invoiceData.cgst_amount) : 0, sgst_amount: invoiceData.sgst_amount ? Number(invoiceData.sgst_amount) : 0, igst_amount: invoiceData.igst_amount ? Number(invoiceData.igst_amount) : 0, invoice_date: new Date(invoiceData.invoice_date), due_date: invoiceData.due_date ? new Date(invoiceData.due_date) : null, created_at: new Date(invoiceData.created_at) } });
      if (Array.isArray(items)) {
        for (const line of items) {
          const { item_id, invoice_id, ...lineData } = line;
          await prisma.salesInvoiceItems.create({ data: { ...lineData, item_id, invoice_id: created.invoice_id, unit_price: Number(lineData.unit_price), tax_rate: Number(lineData.tax_rate), tax_amount: Number(lineData.tax_amount), total_amount: Number(lineData.total_amount) } });
        }
      }
    });

    // 19. repair + parts
    await restoreTable('Repair', backup.repairs, async (item) => {
      const { parts, ...repairData } = item;
      const created = await prisma.repair.create({ data: { ...repairData, estimated_cost: repairData.estimated_cost ? Number(repairData.estimated_cost) : 0, actual_cost: Number(repairData.actual_cost), received_date: new Date(repairData.received_date), diagnosed_date: repairData.diagnosed_date ? new Date(repairData.diagnosed_date) : null, repair_start_date: repairData.repair_start_date ? new Date(repairData.repair_start_date) : null, completion_date: repairData.completion_date ? new Date(repairData.completion_date) : null, pickup_date: repairData.pickup_date ? new Date(repairData.pickup_date) : null, warranty_expiry: repairData.warranty_expiry ? new Date(repairData.warranty_expiry) : null, created_at: new Date(repairData.created_at) } });
      if (Array.isArray(parts)) {
        for (const p of parts) {
          const { repair_part_id, repair_id, ...pData } = p;
          await prisma.repairParts.create({ data: { ...pData, repair_part_id, repair_id: created.repair_id, price_charged: pData.price_charged ? Number(pData.price_charged) : 0 } });
        }
      }
    });

    // 20. quotation + items
    await restoreTable('Quotation', backup.quotations, async (item) => {
      const { items, ...qData } = item;
      const created = await prisma.quotation.create({ data: { ...qData, subtotal: Number(qData.subtotal), total_discount: Number(qData.total_discount), total_tax: Number(qData.total_tax), total_amount: Number(qData.total_amount), quote_date: new Date(qData.quote_date), valid_until: new Date(qData.valid_until), created_at: new Date(qData.created_at) } });
      if (Array.isArray(items)) {
        for (const line of items) {
          const { quote_item_id, quote_id, ...lineData } = line;
          await prisma.quotationItems.create({ data: { ...lineData, quote_item_id, quote_id: created.quote_id, unit_price: Number(lineData.unit_price), discount_percent: Number(lineData.discount_percent), tax_rate: Number(lineData.tax_rate), total: Number(lineData.total) } });
        }
      }
    });

    // 21. deliveryChallan + items
    await restoreTable('DeliveryChallan', backup.challans, async (item) => {
      const { items, ...dcData } = item;
      const created = await prisma.deliveryChallan.create({ data: { ...dcData, total_amount: Number(dcData.total_amount), challan_date: new Date(dcData.challan_date), expected_delivery_date: dcData.expected_delivery_date ? new Date(dcData.expected_delivery_date) : null, approved_at: dcData.approved_at ? new Date(dcData.approved_at) : null, created_at: new Date(dcData.created_at) } });
      if (Array.isArray(items)) {
        for (const line of items) {
          const { challan_item_id, delivery_challan_id, ...lineData } = line;
          await prisma.deliveryChallanItems.create({ data: { ...lineData, challan_item_id, delivery_challan_id: created.delivery_challan_id, unit_price: lineData.unit_price ? Number(lineData.unit_price) : 0, expiry_date: lineData.expiry_date ? new Date(lineData.expiry_date) : null } });
        }
      }
    });

    // 22. purchaseOrder + items
    await restoreTable('PurchaseOrder', backup.purchaseOrders, async (item) => {
      const { items, ...poData } = item;
      const created = await prisma.purchaseOrder.create({ data: { ...poData, total_amount: Number(poData.total_amount), order_date: new Date(poData.order_date), expected_delivery: poData.expected_delivery ? new Date(poData.expected_delivery) : null, created_at: new Date(poData.created_at) } });
      if (Array.isArray(items)) {
        for (const line of items) {
          const { po_item_id, po_id, ...lineData } = line;
          await prisma.purchaseOrderItems.create({ data: { ...lineData, po_item_id, po_id: created.po_id, unit_price: Number(lineData.unit_price), total_amount: Number(lineData.total_amount), expiration_date: lineData.expiration_date ? new Date(lineData.expiration_date) : null } });
        }
      }
    });

    // 23. stockMovement
    await restoreTable('StockMovement', backup.stockMovements, async (item) => {
      await prisma.stockMovement.create({ data: { id: item.id, partId: item.partId, locationId: item.locationId, movementType: item.movementType, quantity: item.quantity, referenceType: item.referenceType, referenceId: item.referenceId, createdAt: new Date(item.createdAt) } });
    });

    // 24. journalEntry + lines
    await restoreTable('JournalEntry', backup.journalEntries, async (item) => {
      const { lines, ...jeData } = item;
      const created = await prisma.journalEntry.create({ data: { ...jeData, entry_date: new Date(jeData.entry_date), created_at: new Date(jeData.created_at) } });
      if (Array.isArray(lines)) {
        for (const line of lines) {
          const { line_id, entry_id, ...lineData } = line;
          await prisma.journalEntryLine.create({ data: { ...lineData, line_id, entry_id: created.entry_id, amount: Number(lineData.amount) } });
        }
      }
    });

    // 25. attachments
    await restoreTable('Attachment', backup.attachments, async (item) => {
      await prisma.attachment.create({ data: { attachment_id: item.attachment_id, entity_type: item.entity_type, entity_id: item.entity_id, file_name: item.file_name, file_path: item.file_path, mime_type: item.mime_type || 'application/octet-stream', uploaded_by: item.uploaded_by || 1, uploaded_at: item.uploaded_at ? new Date(item.uploaded_at) : new Date() } });
    });

    // 26. salesReturn
    await restoreTable('SalesReturn', backup.salesReturns, async (item) => {
      const { items, ...srData } = item;
      const created = await prisma.salesReturn.create({ data: { ...srData, return_date: new Date(srData.return_date), total_amount: Number(srData.total_amount), tax_amount: Number(srData.tax_amount), grand_total: Number(srData.grand_total) } });
      if (Array.isArray(items)) {
        for (const line of items) {
          const { item_id, return_id, ...lineData } = line;
          await prisma.salesReturnItem.create({ data: { ...lineData, item_id, return_id: created.return_id, unit_price: Number(lineData.unit_price), tax_rate: Number(lineData.tax_rate), tax_amount: Number(lineData.tax_amount), total_amount: Number(lineData.total_amount) } });
        }
      }
    });

    // 27. purchaseReturn
    await restoreTable('PurchaseReturn', backup.purchaseReturns, async (item) => {
      const { items, ...prData } = item;
      const created = await prisma.purchaseReturn.create({ data: { ...prData, return_date: new Date(prData.return_date), total_amount: Number(prData.total_amount) } });
      if (Array.isArray(items)) {
        for (const line of items) {
          const { item_id, return_id, ...lineData } = line;
          await prisma.purchaseReturnItem.create({ data: { ...lineData, item_id, return_id: created.return_id, unit_price: Number(lineData.unit_price), total_amount: Number(lineData.total_amount) } });
        }
      }
    });

    // 28. approvalWorkflow + steps
    await restoreTable('ApprovalWorkflow', backup.approvalWorkflows, async (item) => {
      const { steps, ...awData } = item;
      const created = await prisma.approvalWorkflow.create({ data: { ...awData, threshold: Number(awData.threshold), created_at: new Date(awData.created_at) } });
      if (Array.isArray(steps)) {
        for (const step of steps) {
          const { step_id, workflow_id, ...stepData } = step;
          await prisma.approvalStep.create({ data: { ...stepData, step_id, workflow_id: created.workflow_id, created_at: new Date(stepData.created_at) } });
        }
      }
    });

    // 29. approvalHistory
    await restoreTable('ApprovalHistory', backup.approvalHistories, async (item) => {
      await prisma.approvalHistory.create({ data: { history_id: item.history_id, record_id: item.record_id, step_id: item.step_id, user_id: item.user_id, status: item.status, notes: item.notes, created_at: new Date(item.created_at) } });
    });

    // 30. repairEvent
    await restoreTable('RepairEvent', backup.repairEvents, async (item) => {
      await prisma.repairEvent.create({ data: { event_id: item.event_id, repair_id: item.repair_id, status: item.status, user_id: item.user_id, notes: item.notes, created_at: new Date(item.created_at) } });
    });

    // 31. payment
    await restoreTable('Payment', backup.payments, async (item) => {
      await prisma.payment.create({ data: { payment_id: item.payment_id, repair_id: item.repair_id, amount: Number(item.amount), payment_method: item.payment_method, payment_date: new Date(item.payment_date), status: item.status, notes: item.notes, created_at: new Date(item.created_at) } });
    });

    // 32. deliveryChallanReturns
    await restoreTable('DeliveryChallanReturns', backup.challanReturns, async (item) => {
      await prisma.deliveryChallanReturns.create({ data: { return_id: item.return_id, delivery_challan_id: item.delivery_challan_id, challan_item_id: item.challan_item_id, part_id: item.part_id, quantity: item.quantity, return_date: new Date(item.return_date), reason: item.reason, condition_notes: item.condition_notes, status: item.status, created_at: new Date(item.created_at) } });
    });

    // Reset Sequences for Auto-Increment tables in PostgreSQL
    console.log('Resetting PostgreSQL sequences...');
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
      ['stock_movements', 'id'],
      ['journal_entries', 'entry_id'],
      ['journal_entry_lines', 'line_id'],
      ['attachments', 'attachment_id'],
      ['sales_returns', 'return_id'],
      ['sales_return_items', 'item_id'],
      ['purchase_returns', 'return_id'],
      ['purchase_return_items', 'item_id'],
      ['approval_workflows', 'workflow_id'],
      ['approval_steps', 'step_id'],
      ['approval_histories', 'history_id'],
      ['repair_events', 'event_id'],
      ['payments', 'payment_id']
    ];

    for (const [table, col] of tableIdCols) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', '${col}'), COALESCE((SELECT MAX(${col}) FROM ${table}), 1), true)`
        );
      } catch (err) {
        console.warn(`Could not reset sequence for table ${table}:`, err.message);
      }
    }

    console.log('--- DATABASE RESTORE COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Database restore failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
