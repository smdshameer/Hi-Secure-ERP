import { Router } from 'express';
import { prisma } from '../index';
import { sendEmail } from '../services/emailService';
import { sendWhatsApp } from '../services/whatsappService';
import { sendTelegram } from '../services/telegramService';
import os from 'os';

export const settingsRouter = Router();

// Helper: convert Prisma Decimal objects to plain numbers for JSON serialization
function toPlain(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toPlain);
  if (typeof obj === 'object') {
    // Prisma Decimal objects have a toNumber() method
    if (typeof obj.toNumber === 'function') return obj.toNumber();
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = toPlain(obj[key]);
    }
    return result;
  }
  return obj;
}

// ══════════════════════════════════════════════════════════════════
// SPECIFIC NAMED ROUTES FIRST — must come before /:key wildcards
// ══════════════════════════════════════════════════════════════════

// ── GET all settings ──────────────────────────────────────────────
settingsRouter.get('/', async (_req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const settings: Record<string, any> = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

// ── PUT save settings (full or partial) ──────────────────────────
settingsRouter.put('/', async (req, res) => {
  try {
    const updates = req.body as Record<string, any>;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: value as any },
        update: { value: value as any },
      });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to save settings' }); }
});

// ── GET system health ─────────────────────────────────────────────
settingsRouter.get('/meta/system-health', async (_req, res) => {
  try {
    let dbStatus = 'connected';
    let dbLatencyMs = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }
    const uptimeSeconds = process.uptime();
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    res.json({
      status: 'ok',
      server: {
        uptime_seconds: Math.floor(uptimeSeconds),
        node_version: process.version,
        platform: process.platform,
        memory_used_mb: Math.round(mem.rss / 1024 / 1024),
        memory_heap_mb: Math.round(mem.heapUsed / 1024 / 1024),
        memory_heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      system: {
        total_memory_gb: (totalMem / 1024 / 1024 / 1024).toFixed(1),
        free_memory_gb: (freeMem / 1024 / 1024 / 1024).toFixed(1),
        cpu_cores: os.cpus().length,
        os_type: os.type(),
        hostname: os.hostname(),
      },
      database: {
        status: dbStatus,
        latency_ms: dbLatencyMs,
        provider: 'PostgreSQL',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST test email ───────────────────────────────────────────────
settingsRouter.post('/test-email', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });
    const result = await sendEmail(
      to,
      '✅ HiSecure ERP — Email Test',
      `<div style="font-family:sans-serif;max-width:500px;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1a3480;margin-top:0">📧 Email Test Successful!</h2>
        <p>This is a test email from your <strong>HiSecure ERP</strong> system.</p>
        <p>Your email configuration is working correctly. You can now use email for:</p>
        <ul>
          <li>Sending invoices to customers</li>
          <li>Low stock alerts</li>
          <li>Overdue invoice reminders</li>
          <li>Repair completion notifications</li>
        </ul>
        <p style="color:#64748b;font-size:12px;margin-top:24px;">Sent at ${new Date().toLocaleString('en-IN')}</p>
      </div>`
    );
    if (result.success) {
      res.json({ success: true, message: `Test email sent to ${to}` });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

// ── POST test WhatsApp ────────────────────────────────────────────
settingsRouter.post('/test-whatsapp', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Phone number required' });
    const result = await sendWhatsApp(
      to,
      `✅ *HiSecure ERP* — WhatsApp Test\n\nYour WhatsApp integration is working correctly!\n\nYou can now send:\n• Invoice notifications\n• Repair status updates\n• Low stock alerts\n\n_Sent at ${new Date().toLocaleString('en-IN')}_`
    );
    if (result.success) {
      res.json({ success: true, message: `Test WhatsApp sent to ${to}` });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send WhatsApp' });
  }
});

// ── POST test Telegram ────────────────────────────────────────────
settingsRouter.post('/test-telegram', async (_req, res) => {
  try {
    const result = await sendTelegram(
      `✅ *HiSecure ERP* — Telegram Test\n\nYour Telegram bot is working correctly\!\n\nYou can now receive:\n• Invoice notifications\n• Repair status updates\n• Low stock alerts\n• Daily business summaries\n\n_Sent at ${new Date().toLocaleString('en-IN')}_`
    );
    if (result.success) {
      res.json({ success: true, message: 'Test Telegram message sent!' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send Telegram message' });
  }
});

// ── GET backup — export all data as JSON ────────────────────────
settingsRouter.get('/backup', async (_req, res) => {
  try {
    console.log('[Backup] Starting full data export...');

    const [customers, suppliers, parts, invoices, repairs, quotations, challans, purchaseOrders, dbSettings] =
      await Promise.all([
        prisma.customer.findMany(),
        prisma.supplier.findMany(),
        prisma.parts.findMany(),
        prisma.salesInvoice.findMany({ include: { items: true } }),
        prisma.repair.findMany(),
        prisma.quotation.findMany({ include: { items: true } }),
        prisma.deliveryChallan.findMany({ include: { items: true } }),
        prisma.purchaseOrder.findMany({ include: { items: true } }),
        prisma.setting.findMany(),
      ]);

    // Convert Prisma Decimal objects to plain numbers before JSON serialization
    const backup = toPlain({
      exported_at: new Date().toISOString(),
      version: '2.0',
      data: {
        customers,
        suppliers,
        parts,
        invoices,
        repairs,
        quotations,
        challans,
        purchaseOrders,
        settings: dbSettings,
      },
    });

    const filename = `hisecure-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
    console.log(`[Backup] Export complete. Sending ${filename}`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err: any) {
    console.error('[Backup] Failed:', err);
    res.status(500).json({ error: err.message || 'Backup failed' });
  }
});

// ── GET export invoices CSV ─────────────────────────────────────
settingsRouter.get('/export-invoices-csv', async (_req, res) => {
  try {
    const invoices = await prisma.salesInvoice.findMany({
      include: { customer: { select: { name: true, phone: true, gstin: true } } },
      orderBy: { invoice_date: 'desc' },
    });

    const headers = ['Invoice No', 'Customer Name', 'Phone', 'GSTIN', 'Date', 'Due Date', 'Total', 'Tax', 'Grand Total', 'Status'];
    const rows = invoices.map(inv => [
      inv.invoice_number || '',
      inv.customer?.name || '',
      inv.customer?.phone || '',
      inv.customer?.gstin || '',
      inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '',
      inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '',
      inv.total_amount?.toString() || '0',
      inv.tax_amount?.toString() || '0',
      inv.grand_total?.toString() || '0',
      inv.status || '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// ── POST import — restore from JSON backup ────────────────────────
settingsRouter.post('/import', async (req, res) => {
  const log: string[] = [];
  const warn: string[] = [];
  let total = 0;

  try {
    const backup = req.body;

    if (!backup?.data || !backup?.version) {
      return res.status(400).json({ error: 'Invalid backup file. Expected a HiSecure ERP JSON backup.' });
    }

    const { data } = backup;
    log.push(`📦 Backup from: ${backup.exported_at || 'unknown date'}`);

    // ── 1. Settings ──────────────────────────────────────────────
    if (Array.isArray(data.settings) && data.settings.length > 0) {
      for (const s of data.settings) {
        if (!s.key) continue;
        await prisma.setting.upsert({
          where: { key: s.key },
          create: { key: s.key, value: s.value },
          update: { value: s.value },
        });
      }
      log.push(`✅ Settings: restored ${data.settings.length} entries`);
      total += data.settings.length;
    }

    // ── 2. Customers ──────────────────────────────────────────────
    const customerIdMap: Record<number, number> = {};
    if (Array.isArray(data.customers) && data.customers.length > 0) {
      let count = 0;
      for (const c of data.customers) {
        try {
          const existing = await prisma.customer.findFirst({
            where: { OR: [{ customer_code: c.customer_code }, { phone: c.phone }] },
          });
          if (existing) {
            customerIdMap[c.customer_id] = existing.customer_id;
            warn.push(`⚠️ Customer "${c.name}" already exists — skipped`);
          } else {
            const { customer_id, created_at, updated_at, repairs, salesInvoices, quotations, deliveryChallans, crmContacts, ...rest } = c;
            const created = await prisma.customer.create({ data: { ...rest, credit_limit: rest.credit_limit ?? 0 } });
            customerIdMap[c.customer_id] = created.customer_id;
            count++;
          }
        } catch (e: any) {
          warn.push(`⚠️ Customer "${c.name}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Customers: ${count} imported, ${data.customers.length - count} skipped`);
      total += count;
    }

    // ── 3. Suppliers ──────────────────────────────────────────────
    const supplierIdMap: Record<number, number> = {};
    if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
      let count = 0;
      for (const s of data.suppliers) {
        try {
          const existing = await prisma.supplier.findFirst({ where: { supplier_code: s.supplier_code } });
          if (existing) {
            supplierIdMap[s.supplier_id] = existing.supplier_id;
            warn.push(`⚠️ Supplier "${s.name}" already exists — skipped`);
          } else {
            const { supplier_id, created_at, updated_at, purchaseOrders, deliveryChallansSupplier, ...rest } = s;
            const created = await prisma.supplier.create({ data: rest });
            supplierIdMap[s.supplier_id] = created.supplier_id;
            count++;
          }
        } catch (e: any) {
          warn.push(`⚠️ Supplier "${s.name}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Suppliers: ${count} imported, ${data.suppliers.length - count} skipped`);
      total += count;
    }

    // ── 4. Parts / Inventory ──────────────────────────────────────
    const partIdMap: Record<number, number> = {};
    if (Array.isArray(data.parts) && data.parts.length > 0) {
      let count = 0;
      for (const p of data.parts) {
        try {
          const existing = await prisma.parts.findFirst({ where: { part_number: p.part_number } });
          if (existing) {
            partIdMap[p.part_id] = existing.part_id;
            warn.push(`⚠️ Part "${p.part_number}" already exists — skipped`);
          } else {
            const { part_id, created_at, updated_at, brand_id, brand, repairParts, salesInvoiceItems,
              purchaseOrderItems, quotationItems, deliveryChallanItems, repairPartsForDelivery, ...rest } = p;
            const created = await prisma.parts.create({ data: rest });
            partIdMap[p.part_id] = created.part_id;
            count++;
          }
        } catch (e: any) {
          warn.push(`⚠️ Part "${p.part_number}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Parts: ${count} imported, ${data.parts.length - count} skipped`);
      total += count;
    }

    // ── 5. Sales Invoices ─────────────────────────────────────────
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      let count = 0;
      for (const inv of data.invoices) {
        try {
          const existing = inv.invoice_number
            ? await prisma.salesInvoice.findUnique({ where: { invoice_number: inv.invoice_number } })
            : null;
          if (existing) { warn.push(`⚠️ Invoice "${inv.invoice_number}" already exists — skipped`); continue; }
          const newCustomerId = inv.customer_id ? customerIdMap[inv.customer_id] : undefined;
          const { invoice_id, created_at, updated_at, created_by, customer_id, items, customer, createdBy, ...invRest } = inv;
          const newInv = await prisma.salesInvoice.create({
            data: {
              ...invRest,
              customer_id: newCustomerId || undefined,
              invoice_date: invRest.invoice_date ? new Date(invRest.invoice_date) : new Date(),
              due_date: invRest.due_date ? new Date(invRest.due_date) : undefined,
            },
          });
          if (Array.isArray(items)) {
            for (const item of items) {
              const newPartId = item.part_id ? partIdMap[item.part_id] : undefined;
              if (!newPartId) continue;
              const { item_id, invoice_id: _iid, part_id, part, ...itemRest } = item;
              try {
                await prisma.salesInvoiceItems.create({
                  data: { ...itemRest, invoice_id: newInv.invoice_id, part_id: newPartId },
                });
              } catch {}
            }
          }
          count++;
        } catch (e: any) {
          warn.push(`⚠️ Invoice "${inv.invoice_number}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Sales Invoices: ${count} imported, ${data.invoices.length - count} skipped`);
      total += count;
    }

    // ── 6. Repairs ────────────────────────────────────────────────
    if (Array.isArray(data.repairs) && data.repairs.length > 0) {
      let count = 0;
      for (const r of data.repairs) {
        try {
          const existing = r.ticket_number
            ? await prisma.repair.findUnique({ where: { ticket_number: r.ticket_number } })
            : null;
          if (existing) { warn.push(`⚠️ Repair "${r.ticket_number}" already exists — skipped`); continue; }
          const newCustomerId = r.customer_id ? customerIdMap[r.customer_id] : undefined;
          if (!newCustomerId) { warn.push(`⚠️ Repair "${r.ticket_number}" — customer not found, skipped`); continue; }
          const { repair_id, created_at, updated_at, customer_id, brand_id, assigned_technician_id,
            parts, payments, customer, assigned_technician, brand, ...rest } = r;
          await prisma.repair.create({
            data: {
              ...rest,
              customer_id: newCustomerId,
              received_date: rest.received_date ? new Date(rest.received_date) : new Date(),
              completion_date: rest.completion_date ? new Date(rest.completion_date) : undefined,
              diagnosed_date: rest.diagnosed_date ? new Date(rest.diagnosed_date) : undefined,
              repair_start_date: rest.repair_start_date ? new Date(rest.repair_start_date) : undefined,
              pickup_date: rest.pickup_date ? new Date(rest.pickup_date) : undefined,
              warranty_expiry: rest.warranty_expiry ? new Date(rest.warranty_expiry) : undefined,
            },
          });
          count++;
        } catch (e: any) {
          warn.push(`⚠️ Repair "${r.ticket_number}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Repairs: ${count} imported, ${data.repairs.length - count} skipped`);
      total += count;
    }

    // ── 7. Quotations ─────────────────────────────────────────────
    if (Array.isArray(data.quotations) && data.quotations.length > 0) {
      let count = 0;
      for (const q of data.quotations) {
        try {
          const existing = q.quote_number
            ? await prisma.quotation.findUnique({ where: { quote_number: q.quote_number } })
            : null;
          if (existing) { warn.push(`⚠️ Quotation "${q.quote_number}" already exists — skipped`); continue; }
          const newCustomerId = q.customer_id ? customerIdMap[q.customer_id] : undefined;
          if (!newCustomerId) { warn.push(`⚠️ Quotation "${q.quote_number}" — customer not found, skipped`); continue; }
          const { quote_id, created_at, updated_at, created_by, customer_id, items, customer, createdBy, ...rest } = q;
          const newQ = await prisma.quotation.create({
            data: {
              ...rest,
              customer_id: newCustomerId,
              quote_date: rest.quote_date ? new Date(rest.quote_date) : new Date(),
              valid_until: rest.valid_until ? new Date(rest.valid_until) : new Date(),
            },
          });
          if (Array.isArray(items)) {
            for (const item of items) {
              const newPartId = item.part_id ? partIdMap[item.part_id] : undefined;
              if (!newPartId) continue;
              const { quote_item_id, quote_id: _qid, part_id, part, ...itemRest } = item;
              try {
                await prisma.quotationItems.create({
                  data: { ...itemRest, quote_id: newQ.quote_id, part_id: newPartId },
                });
              } catch {}
            }
          }
          count++;
        } catch (e: any) {
          warn.push(`⚠️ Quotation "${q.quote_number}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Quotations: ${count} imported, ${data.quotations.length - count} skipped`);
      total += count;
    }

    // ── 8. Purchase Orders ────────────────────────────────────────
    if (Array.isArray(data.purchaseOrders) && data.purchaseOrders.length > 0) {
      let count = 0;
      for (const po of data.purchaseOrders) {
        try {
          const existing = po.po_number
            ? await prisma.purchaseOrder.findUnique({ where: { po_number: po.po_number } })
            : null;
          if (existing) { warn.push(`⚠️ PO "${po.po_number}" already exists — skipped`); continue; }
          const newSupplierId = po.supplier_id ? supplierIdMap[po.supplier_id] : undefined;
          if (!newSupplierId) { warn.push(`⚠️ PO "${po.po_number}" — supplier not found, skipped`); continue; }
          const { po_id, created_at, updated_at, created_by, supplier_id, items, supplier, createdBy, ...rest } = po;
          const newPO = await prisma.purchaseOrder.create({
            data: {
              ...rest,
              supplier_id: newSupplierId,
              order_date: rest.order_date ? new Date(rest.order_date) : new Date(),
              expected_delivery: rest.expected_delivery ? new Date(rest.expected_delivery) : undefined,
            },
          });
          if (Array.isArray(items)) {
            for (const item of items) {
              const newPartId = item.part_id ? partIdMap[item.part_id] : undefined;
              if (!newPartId) continue;
              const { po_item_id, po_id: _pid, part_id, part, expiration_date, ...itemRest } = item;
              try {
                await prisma.purchaseOrderItems.create({
                  data: {
                    ...itemRest,
                    po_id: newPO.po_id,
                    part_id: newPartId,
                    expiration_date: expiration_date ? new Date(expiration_date) : undefined,
                  },
                });
              } catch {}
            }
          }
          count++;
        } catch (e: any) {
          warn.push(`⚠️ PO "${po.po_number}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Purchase Orders: ${count} imported, ${data.purchaseOrders.length - count} skipped`);
      total += count;
    }

    // ── 9. Delivery Challans ──────────────────────────────────────
    if (Array.isArray(data.challans) && data.challans.length > 0) {
      let count = 0;
      for (const ch of data.challans) {
        try {
          const existing = ch.challan_number
            ? await prisma.deliveryChallan.findUnique({ where: { challan_number: ch.challan_number } })
            : null;
          if (existing) { warn.push(`⚠️ Challan "${ch.challan_number}" already exists — skipped`); continue; }
          const { delivery_challan_id, created_at, updated_at, created_by, approved_by,
            customer_id, supplier_id, from_location_id, to_location_id,
            items, returns, customer, supplier, createdBy, approvedBy, fromLocation, toLocation, ...rest } = ch;
          const newCh = await prisma.deliveryChallan.create({
            data: {
              ...rest,
              customer_id: customer_id ? customerIdMap[customer_id] : undefined,
              supplier_id: supplier_id ? supplierIdMap[supplier_id] : undefined,
              challan_date: rest.challan_date ? new Date(rest.challan_date) : new Date(),
              expected_delivery_date: rest.expected_delivery_date ? new Date(rest.expected_delivery_date) : undefined,
              approved_at: rest.approved_at ? new Date(rest.approved_at) : undefined,
            },
          });
          if (Array.isArray(items)) {
            for (const item of items) {
              const newPartId = item.part_id ? partIdMap[item.part_id] : undefined;
              if (!newPartId) continue;
              const { challan_item_id, delivery_challan_id: _cid, part_id, created_at: _ca, expiry_date, part, deliveryChallan, ...itemRest } = item;
              try {
                await prisma.deliveryChallanItems.create({
                  data: {
                    ...itemRest,
                    delivery_challan_id: newCh.delivery_challan_id,
                    part_id: newPartId,
                    expiry_date: expiry_date ? new Date(expiry_date) : undefined,
                  },
                });
              } catch {}
            }
          }
          count++;
        } catch (e: any) {
          warn.push(`⚠️ Challan "${ch.challan_number}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Delivery Challans: ${count} imported, ${data.challans.length - count} skipped`);
      total += count;
    }

    res.json({
      success: true,
      total_imported: total,
      log,
      warnings: warn,
      summary: `Import complete. ${total} records restored. ${warn.length} items skipped (already existed or had errors).`,
    });

  } catch (err: any) {
    console.error('[Import] Failed:', err);
    res.status(500).json({ error: err.message || 'Import failed', log, warnings: warn });
  }
});

// ══════════════════════════════════════════════════════════════════
// WILDCARD ROUTES LAST — must come after all specific named routes
// ══════════════════════════════════════════════════════════════════

// ── GET single setting by key ─────────────────────────────────────
settingsRouter.get('/:key', async (req, res) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: req.params.key } });
    res.json(row ? row.value : null);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch setting' }); }
});

// ── PUT single setting by key ─────────────────────────────────────
settingsRouter.put('/:key', async (req, res) => {
  try {
    await prisma.setting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value: req.body.value },
      update: { value: req.body.value },
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to save setting' }); }
});