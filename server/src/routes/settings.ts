import { Router } from 'express';
import { prisma } from '../index';
import { sendEmail } from '../services/emailService';
import { sendWhatsApp } from '../services/whatsappService';
import { sendTelegram } from '../services/telegramService';
import os from 'os';
import { AiService } from '../services/AiService';

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

    const [
      customers, suppliers, parts, invoices, repairs, quotations, challans, purchaseOrders, dbSettings,
      brands, technicians, locations, partStocks, stockMovements, accounts, journalEntries, users,
      roles, permissions, rolePermissions, userRoles, attachments, salesReturns, purchaseReturns,
      posSessions, posTransactions, approvalWorkflows, approvalHistories, repairEvents, companies,
      payments, challanReturns
    ] = await Promise.all([
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.parts.findMany(),
      prisma.salesInvoice.findMany({ include: { items: true } }),
      prisma.repair.findMany({ include: { parts: true } }),
      prisma.quotation.findMany({ include: { items: true } }),
      prisma.deliveryChallan.findMany({ include: { items: true } }),
      prisma.purchaseOrder.findMany({ include: { items: true } }),
      prisma.setting.findMany(),
      prisma.brand.findMany(),
      prisma.technician.findMany(),
      prisma.location.findMany(),
      prisma.partStock.findMany(),
      prisma.stockMovement.findMany(),
      prisma.account.findMany(),
      prisma.journalEntry.findMany({ include: { lines: true } }),
      prisma.user.findMany(),
      prisma.role.findMany(),
      prisma.permission.findMany(),
      prisma.rolePermission.findMany(),
      prisma.userRole.findMany(),
      prisma.attachment.findMany(),
      prisma.salesReturn.findMany({ include: { items: true } }),
      prisma.purchaseReturn.findMany({ include: { items: true } }),
      prisma.posSession.findMany(),
      prisma.posTransaction.findMany(),
      prisma.approvalWorkflow.findMany({ include: { steps: true } }),
      prisma.approvalHistory.findMany(),
      prisma.repairEvent.findMany(),
      prisma.company.findMany(),
      prisma.payment.findMany(),
      prisma.deliveryChallanReturns.findMany()
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
        brands,
        technicians,
        locations,
        partStocks,
        stockMovements,
        accounts,
        journalEntries,
        users,
        roles,
        permissions,
        rolePermissions,
        userRoles,
        attachments,
        salesReturns,
        purchaseReturns,
        posSessions,
        posTransactions,
        approvalWorkflows,
        approvalHistories,
        repairEvents,
        companies,
        payments,
        challanReturns
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

    // ── Brands ───────────────────────────────────────────────────
    const brandIdMap: Record<number, number> = {};
    if (Array.isArray(data.brands) && data.brands.length > 0) {
      let count = 0;
      for (const b of data.brands) {
        try {
          const existing = await prisma.brand.findUnique({ where: { name: b.name } });
          if (existing) {
            brandIdMap[b.brand_id] = existing.brand_id;
          } else {
            const created = await prisma.brand.create({ data: { name: b.name } });
            brandIdMap[b.brand_id] = created.brand_id;
            count++;
          }
        } catch (e: any) {
          warn.push(`⚠️ Brand "${b.name}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Brands: ${count} imported`);
      total += count;
    }

    // ── Technicians ──────────────────────────────────────────────
    const technicianIdMap: Record<number, number> = {};
    if (Array.isArray(data.technicians) && data.technicians.length > 0) {
      let count = 0;
      for (const t of data.technicians) {
        try {
          const existing = await prisma.technician.findFirst({ where: { name: t.name } });
          if (existing) {
            technicianIdMap[t.technician_id] = existing.technician_id;
          } else {
            const { technician_id, created_at, repairs, ...rest } = t;
            const created = await prisma.technician.create({ data: rest });
            technicianIdMap[t.technician_id] = created.technician_id;
            count++;
          }
        } catch (e: any) {
          warn.push(`⚠️ Technician "${t.name}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Technicians: ${count} imported`);
      total += count;
    }

    // ── Locations ────────────────────────────────────────────────
    const locationIdMap: Record<number, number> = {};
    if (Array.isArray(data.locations) && data.locations.length > 0) {
      let count = 0;
      for (const l of data.locations) {
        try {
          const existing = await prisma.location.findUnique({ where: { location_code: l.location_code } });
          if (existing) {
            locationIdMap[l.location_id] = existing.location_id;
          } else {
            const { location_id, created_at, updated_at, fromChallans, toChallans, stocks, stockMovements, ...rest } = l;
            const created = await prisma.location.create({ data: rest });
            locationIdMap[l.location_id] = created.location_id;
            count++;
          }
        } catch (e: any) {
          warn.push(`⚠️ Location "${l.name}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Locations: ${count} imported`);
      total += count;
    }

    // ── Users ────────────────────────────────────────────────────
    const userIdMap: Record<number, number> = {};
    if (Array.isArray(data.users) && data.users.length > 0) {
      let count = 0;
      for (const u of data.users) {
        try {
          const existing = await prisma.user.findUnique({ where: { username: u.username } });
          if (existing) {
            userIdMap[u.user_id] = existing.user_id;
          } else {
            const { user_id, created_at, updated_at, approvals, approvedDeliveryChallans, createdDeliveryChallans, createdPurchaseOrders, quotations, createdSalesInvoices, roles, ...rest } = u;
            const created = await prisma.user.create({
              data: {
                ...rest,
                last_login: rest.last_login ? new Date(rest.last_login) : null
              }
            });
            userIdMap[u.user_id] = created.user_id;
            count++;
          }
        } catch (e: any) {
          warn.push(`⚠️ User "${u.username}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Users: ${count} imported`);
      total += count;
    }

    // ── Roles & Permissions ──────────────────────────────────────
    const roleIdMap: Record<number, number> = {};
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      for (const r of data.roles) {
        try {
          const existing = await prisma.role.findUnique({ where: { name: r.name } });
          if (existing) {
            roleIdMap[r.role_id] = existing.role_id;
          } else {
            const { role_id, created_at, updated_at, approvalSteps, permissions, users, ...rest } = r;
            const created = await prisma.role.create({ data: rest });
            roleIdMap[r.role_id] = created.role_id;
          }
        } catch {}
      }
    }

    const permissionIdMap: Record<number, number> = {};
    if (Array.isArray(data.permissions) && data.permissions.length > 0) {
      for (const p of data.permissions) {
        try {
          const existing = await prisma.permission.findUnique({ where: { name: p.name } });
          if (existing) {
            permissionIdMap[p.permission_id] = existing.permission_id;
          } else {
            const { permission_id, created_at, updated_at, roles, ...rest } = p;
            const created = await prisma.permission.create({ data: rest });
            permissionIdMap[p.permission_id] = created.permission_id;
          }
        } catch {}
      }
    }

    if (Array.isArray(data.rolePermissions)) {
      for (const rp of data.rolePermissions) {
        try {
          const newRoleId = roleIdMap[rp.role_id];
          const newPermissionId = permissionIdMap[rp.permission_id];
          if (newRoleId && newPermissionId) {
            await prisma.rolePermission.upsert({
              where: { role_id_permission_id: { role_id: newRoleId, permission_id: newPermissionId } },
              create: { role_id: newRoleId, permission_id: newPermissionId },
              update: {}
            });
          }
        } catch {}
      }
    }

    if (Array.isArray(data.userRoles)) {
      for (const ur of data.userRoles) {
        try {
          const newUserId = userIdMap[ur.user_id];
          const newRoleId = roleIdMap[ur.role_id];
          if (newUserId && newRoleId) {
            await prisma.userRole.upsert({
              where: { user_id_role_id: { user_id: newUserId, role_id: newRoleId } },
              create: { user_id: newUserId, role_id: newRoleId },
              update: {}
            });
          }
        } catch {}
      }
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
            const newBrandId = brand_id ? brandIdMap[brand_id] : null;
            const created = await prisma.parts.create({ data: { ...rest, brand_id: newBrandId } });
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

    // ── Part Stocks & Stock Movements ────────────────────────────
    if (Array.isArray(data.partStocks)) {
      for (const ps of data.partStocks) {
        try {
          const newPartId = partIdMap[ps.part_id];
          const newLocationId = locationIdMap[ps.location_id] || 1;
          if (newPartId) {
            await prisma.partStock.upsert({
              where: { part_id_location_id: { part_id: newPartId, location_id: newLocationId } },
              create: { part_id: newPartId, location_id: newLocationId, quantity: ps.quantity },
              update: { quantity: ps.quantity }
            });
          }
        } catch {}
      }
    }

    if (Array.isArray(data.stockMovements)) {
      for (const sm of data.stockMovements) {
        try {
          const newPartId = partIdMap[sm.partId];
          const newLocationId = sm.locationId ? locationIdMap[sm.locationId] : null;
          if (newPartId) {
            const { id, partId, locationId, createdAt, ...rest } = sm;
            await prisma.stockMovement.create({
              data: {
                ...rest,
                partId: newPartId,
                locationId: newLocationId,
                createdAt: createdAt ? new Date(createdAt) : new Date()
              }
            });
          }
        } catch {}
      }
    }

    // ── Accounts & Journal Entries ───────────────────────────────
    const accountIdMap: Record<number, number> = {};
    if (Array.isArray(data.accounts)) {
      for (const a of data.accounts) {
        try {
          const existing = await prisma.account.findUnique({ where: { code: a.code } });
          if (existing) {
            accountIdMap[a.account_id] = existing.account_id;
          } else {
            const { account_id, created_at, updated_at, journalLines, ...rest } = a;
            const created = await prisma.account.create({ data: rest });
            accountIdMap[a.account_id] = created.account_id;
          }
        } catch {}
      }
    }

    if (Array.isArray(data.journalEntries)) {
      for (const je of data.journalEntries) {
        try {
          const { entry_id, created_at, updated_at, lines, ...rest } = je;
          const createdJe = await prisma.journalEntry.create({
            data: {
              ...rest,
              entry_date: rest.entry_date ? new Date(rest.entry_date) : new Date()
            }
          });
          if (Array.isArray(lines)) {
            for (const line of lines) {
              const newAccountId = accountIdMap[line.account_id];
              if (newAccountId) {
                const { line_id, entry_id: _e, account_id, account, entry, ...lineRest } = line;
                await prisma.journalEntryLine.create({
                  data: {
                    ...lineRest,
                    entry_id: createdJe.entry_id,
                    account_id: newAccountId,
                    amount: Number(lineRest.amount)
                  }
                });
              }
            }
          }
        } catch {}
      }
    }

    // ── 5. Sales Invoices ─────────────────────────────────────────
    const invoiceIdMap: Record<number, number> = {};
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      let count = 0;
      for (const inv of data.invoices) {
        try {
          const existing = inv.invoice_number
            ? await prisma.salesInvoice.findUnique({ where: { invoice_number: inv.invoice_number } })
            : null;
          if (existing) {
            invoiceIdMap[inv.invoice_id] = existing.invoice_id;
            warn.push(`⚠️ Invoice "${inv.invoice_number}" already exists — skipped`);
            continue;
          }
          const newCustomerId = inv.customer_id ? customerIdMap[inv.customer_id] : undefined;
          const newCreatedBy = inv.created_by ? userIdMap[inv.created_by] : null;
          const { invoice_id, created_at, updated_at, created_by, customer_id, items, customer, createdBy, ...invRest } = inv;
          const newInv = await prisma.salesInvoice.create({
            data: {
              ...invRest,
              customer_id: newCustomerId || undefined,
              created_by: newCreatedBy,
              invoice_date: invRest.invoice_date ? new Date(invRest.invoice_date) : new Date(),
              due_date: invRest.due_date ? new Date(invRest.due_date) : undefined,
            },
          });
          invoiceIdMap[inv.invoice_id] = newInv.invoice_id;
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
    const repairIdMap: Record<number, number> = {};
    if (Array.isArray(data.repairs) && data.repairs.length > 0) {
      let count = 0;
      for (const r of data.repairs) {
        try {
          const existing = r.ticket_number
            ? await prisma.repair.findUnique({ where: { ticket_number: r.ticket_number } })
            : null;
          if (existing) {
            repairIdMap[r.repair_id] = existing.repair_id;
            warn.push(`⚠️ Repair "${r.ticket_number}" already exists — skipped`);
            continue;
          }
          const newCustomerId = r.customer_id ? customerIdMap[r.customer_id] : undefined;
          if (!newCustomerId) { warn.push(`⚠️ Repair "${r.ticket_number}" — customer not found, skipped`); continue; }
          const newBrandId = r.brand_id ? brandIdMap[r.brand_id] : null;
          const newTechnicianId = r.assigned_technician_id ? technicianIdMap[r.assigned_technician_id] : null;
          const { repair_id, created_at, updated_at, customer_id, brand_id, assigned_technician_id,
            parts, payments, customer, assigned_technician, brand, repairEvents, ...rest } = r;
          const createdRepair = await prisma.repair.create({
            data: {
              ...rest,
              customer_id: newCustomerId,
              brand_id: newBrandId,
              assigned_technician_id: newTechnicianId,
              received_date: rest.received_date ? new Date(rest.received_date) : new Date(),
              completion_date: rest.completion_date ? new Date(rest.completion_date) : undefined,
              diagnosed_date: rest.diagnosed_date ? new Date(rest.diagnosed_date) : undefined,
              repair_start_date: rest.repair_start_date ? new Date(rest.repair_start_date) : undefined,
              pickup_date: rest.pickup_date ? new Date(rest.pickup_date) : undefined,
              warranty_expiry: rest.warranty_expiry ? new Date(rest.warranty_expiry) : undefined,
            },
          });
          repairIdMap[r.repair_id] = createdRepair.repair_id;

          // Repair parts
          if (Array.isArray(parts)) {
            for (const rp of parts) {
              const newPartId = rp.part_id ? partIdMap[rp.part_id] : null;
              if (newPartId) {
                const { repair_part_id, repair_id: _rid, part_id, part, repair, ...rpRest } = rp;
                await prisma.repairParts.create({
                  data: {
                    ...rpRest,
                    repair_id: createdRepair.repair_id,
                    part_id: newPartId,
                    price_charged: Number(rpRest.price_charged)
                  }
                });
              }
            }
          }
          count++;
        } catch (e: any) {
          warn.push(`⚠️ Repair "${r.ticket_number}" failed: ${e.message}`);
        }
      }
      log.push(`✅ Repairs: ${count} imported, ${data.repairs.length - count} skipped`);
      total += count;
    }

    // ── Repair Events ────────────────────────────────────────────
    if (Array.isArray(data.repairEvents)) {
      for (const re of data.repairEvents) {
        try {
          const newRepairId = repairIdMap[re.repair_id];
          const newUserId = re.user_id ? userIdMap[re.user_id] : null;
          if (newRepairId) {
            const { event_id, repair_id, user_id, timestamp, ...rest } = re;
            await prisma.repairEvent.create({
              data: {
                ...rest,
                repair_id: newRepairId,
                user_id: newUserId,
                timestamp: timestamp ? new Date(timestamp) : new Date()
              }
            });
          }
        } catch {}
      }
    }

    // ── 7. Quotations ─────────────────────────────────────────────
    const quoteIdMap: Record<number, number> = {};
    if (Array.isArray(data.quotations) && data.quotations.length > 0) {
      let count = 0;
      for (const q of data.quotations) {
        try {
          const existing = q.quote_number
            ? await prisma.quotation.findUnique({ where: { quote_number: q.quote_number } })
            : null;
          if (existing) {
            quoteIdMap[q.quote_id] = existing.quote_id;
            warn.push(`⚠️ Quotation "${q.quote_number}" already exists — skipped`);
            continue;
          }
          const newCustomerId = q.customer_id ? customerIdMap[q.customer_id] : undefined;
          if (!newCustomerId) { warn.push(`⚠️ Quotation "${q.quote_number}" — customer not found, skipped`); continue; }
          const newCreatedBy = q.created_by ? userIdMap[q.created_by] : null;
          const newInvoiceId = q.converted_to_invoice_id ? invoiceIdMap[q.converted_to_invoice_id] : null;
          const { quote_id, created_at, updated_at, created_by, customer_id, converted_to_invoice_id, items, customer, createdBy, ...rest } = q;
          const newQ = await prisma.quotation.create({
            data: {
              ...rest,
              customer_id: newCustomerId,
              created_by: newCreatedBy,
              converted_to_invoice_id: newInvoiceId,
              quote_date: rest.quote_date ? new Date(rest.quote_date) : new Date(),
              valid_until: rest.valid_until ? new Date(rest.valid_until) : new Date(),
            },
          });
          quoteIdMap[q.quote_id] = newQ.quote_id;
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
    const poIdMap: Record<number, number> = {};
    if (Array.isArray(data.purchaseOrders) && data.purchaseOrders.length > 0) {
      let count = 0;
      for (const po of data.purchaseOrders) {
        try {
          const existing = po.po_number
            ? await prisma.purchaseOrder.findUnique({ where: { po_number: po.po_number } })
            : null;
          if (existing) {
            poIdMap[po.po_id] = existing.po_id;
            warn.push(`⚠️ PO "${po.po_number}" already exists — skipped`);
            continue;
          }
          const newSupplierId = po.supplier_id ? supplierIdMap[po.supplier_id] : undefined;
          if (!newSupplierId) { warn.push(`⚠️ PO "${po.po_number}" — supplier not found, skipped`); continue; }
          const newCreatedBy = po.created_by ? userIdMap[po.created_by] : null;
          const { po_id, created_at, updated_at, created_by, supplier_id, items, supplier, createdBy, purchaseReturns, ...rest } = po;
          const newPO = await prisma.purchaseOrder.create({
            data: {
              ...rest,
              supplier_id: newSupplierId,
              created_by: newCreatedBy,
              order_date: rest.order_date ? new Date(rest.order_date) : new Date(),
              expected_delivery: rest.expected_delivery ? new Date(rest.expected_delivery) : undefined,
            },
          });
          poIdMap[po.po_id] = newPO.po_id;
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
    const challanIdMap: Record<number, number> = {};
    if (Array.isArray(data.challans) && data.challans.length > 0) {
      let count = 0;
      for (const ch of data.challans) {
        try {
          const existing = ch.challan_number
            ? await prisma.deliveryChallan.findUnique({ where: { challan_number: ch.challan_number } })
            : null;
          if (existing) {
            challanIdMap[ch.delivery_challan_id] = existing.delivery_challan_id;
            warn.push(`⚠️ Challan "${ch.challan_number}" already exists — skipped`);
            continue;
          }
          const { delivery_challan_id, created_at, updated_at, created_by, approved_by,
            customer_id, supplier_id, from_location_id, to_location_id,
            items, returns, customer, supplier, createdBy, approvedBy, fromLocation, toLocation, ...rest } = ch;
          const newCreatedBy = created_by ? userIdMap[created_by] : null;
          const newApprovedBy = approved_by ? userIdMap[approved_by] : null;
          const newFromLocationId = from_location_id ? locationIdMap[from_location_id] : null;
          const newToLocationId = to_location_id ? locationIdMap[to_location_id] : null;
          const newCh = await prisma.deliveryChallan.create({
            data: {
              ...rest,
              customer_id: customer_id ? customerIdMap[customer_id] : undefined,
              supplier_id: supplier_id ? supplierIdMap[supplier_id] : undefined,
              created_by: newCreatedBy,
              approved_by: newApprovedBy,
              from_location_id: newFromLocationId,
              to_location_id: newToLocationId,
              challan_date: rest.challan_date ? new Date(rest.challan_date) : new Date(),
              expected_delivery_date: rest.expected_delivery_date ? new Date(rest.expected_delivery_date) : undefined,
              approved_at: rest.approved_at ? new Date(rest.approved_at) : undefined,
            },
          });
          challanIdMap[ch.delivery_challan_id] = newCh.delivery_challan_id;
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

    // ── Sales & Purchase Returns ─────────────────────────────────
    if (Array.isArray(data.salesReturns)) {
      for (const sr of data.salesReturns) {
        try {
          const existing = await prisma.salesReturn.findUnique({ where: { return_number: sr.return_number } });
          if (existing) continue;

          const newInvoiceId = invoiceIdMap[sr.invoice_id];
          const newCreatedBy = sr.created_by ? userIdMap[sr.created_by] : 1;
          if (!newInvoiceId) continue;

          const { return_id, invoice_id, items, invoice, ...rest } = sr;
          const newSr = await prisma.salesReturn.create({
            data: {
              ...rest,
              invoice_id: newInvoiceId,
              created_by: newCreatedBy || 1,
              return_date: rest.return_date ? new Date(rest.return_date) : new Date(),
              total_amount: Number(rest.total_amount),
              tax_amount: Number(rest.tax_amount),
              grand_total: Number(rest.grand_total)
            }
          });

          if (Array.isArray(items)) {
            for (const item of items) {
              const newPartId = partIdMap[item.part_id];
              if (!newPartId) continue;
              const { item_id, return_id: _r, part_id, part, salesReturn, ...itemRest } = item;
              await prisma.salesReturnItem.create({
                data: {
                  ...itemRest,
                  return_id: newSr.return_id,
                  part_id: newPartId,
                  unit_price: Number(itemRest.unit_price),
                  tax_rate: Number(itemRest.tax_rate),
                  tax_amount: Number(itemRest.tax_amount),
                  total_amount: Number(itemRest.total_amount)
                }
              });
            }
          }
        } catch {}
      }
    }

    if (Array.isArray(data.purchaseReturns)) {
      for (const pr of data.purchaseReturns) {
        try {
          const existing = await prisma.purchaseReturn.findUnique({ where: { return_number: pr.return_number } });
          if (existing) continue;

          const newPoId = poIdMap[pr.po_id];
          const newCreatedBy = pr.created_by ? userIdMap[pr.created_by] : 1;
          if (!newPoId) continue;

          const { return_id, po_id, items, purchaseOrder, ...rest } = pr;
          const newPr = await prisma.purchaseReturn.create({
            data: {
              ...rest,
              po_id: newPoId,
              created_by: newCreatedBy || 1,
              return_date: rest.return_date ? new Date(rest.return_date) : new Date(),
              total_amount: Number(rest.total_amount)
            }
          });

          if (Array.isArray(items)) {
            for (const item of items) {
              const newPartId = partIdMap[item.part_id];
              if (!newPartId) continue;
              const { item_id, return_id: _r, part_id, part, purchaseReturn, ...itemRest } = item;
              await prisma.purchaseReturnItem.create({
                data: {
                  ...itemRest,
                  return_id: newPr.return_id,
                  part_id: newPartId,
                  unit_price: Number(itemRest.unit_price),
                  total_amount: Number(itemRest.total_amount)
                }
              });
            }
          }
        } catch {}
      }
    }

    // ── POS Sessions & Transactions ──────────────────────────────
    const sessionMap: Record<number, number> = {};
    if (Array.isArray(data.posSessions)) {
      for (const s of data.posSessions) {
        try {
          const { session_id, created_at, closed_at, session_date, ...rest } = s;
          const created = await prisma.posSession.create({
            data: {
              ...rest,
              session_date: session_date ? new Date(session_date) : new Date(),
              closed_at: closed_at ? new Date(closed_at) : null,
              opening_cash: Number(rest.opening_cash),
              closing_cash: Number(rest.closing_cash),
              total_sales: Number(rest.total_sales),
              total_refunds: Number(rest.total_refunds),
              cash_payments: Number(rest.cash_payments),
              upi_payments: Number(rest.upi_payments),
              card_payments: Number(rest.card_payments)
            }
          });
          sessionMap[session_id] = created.session_id;
        } catch {}
      }
    }

    if (Array.isArray(data.posTransactions)) {
      for (const t of data.posTransactions) {
        try {
          const newSessionId = sessionMap[t.session_id];
          if (!newSessionId) continue;

          const newCustomerId = t.customer_id ? customerIdMap[t.customer_id] : null;
          const { transaction_id, created_at, session_id, customer_id, ...rest } = t;
          await prisma.posTransaction.create({
            data: {
              ...rest,
              session_id: newSessionId,
              customer_id: newCustomerId,
              subtotal: Number(rest.subtotal),
              tax_amount: Number(rest.tax_amount),
              discount: Number(rest.discount),
              total: Number(rest.total),
              cash_received: Number(rest.cash_received),
              change_given: Number(rest.change_given)
            }
          });
        } catch {}
      }
    }

    // ── Attachments ──────────────────────────────────────────────
    if (Array.isArray(data.attachments)) {
      for (const a of data.attachments) {
        try {
          const newUserId = a.uploaded_by ? userIdMap[a.uploaded_by] : null;
          let newEntityId = a.entity_id;
          const typeLower = a.entity_type.toLowerCase();
          if (typeLower === 'invoice' || typeLower === 'sales') {
            newEntityId = invoiceIdMap[a.entity_id] || a.entity_id;
          } else if (typeLower === 'repair') {
            newEntityId = repairIdMap[a.entity_id] || a.entity_id;
          } else if (typeLower === 'purchase') {
            newEntityId = poIdMap[a.entity_id] || a.entity_id;
          }

          const { attachment_id, created_at, uploaded_at, ...rest } = a;
          await prisma.attachment.create({
            data: {
              ...rest,
              entity_id: newEntityId,
              uploaded_by: newUserId
            }
          });
        } catch {}
      }
    }

    // ── Companies ────────────────────────────────────────────────
    if (Array.isArray(data.companies)) {
      for (const comp of data.companies) {
        try {
          const existing = await prisma.company.findUnique({ where: { code: comp.code } });
          if (!existing) {
            const { company_id, created_at, updated_at, ...rest } = comp;
            await prisma.company.create({ data: rest });
          }
        } catch {}
      }
    }

    // ── Payments ─────────────────────────────────────────────────
    if (Array.isArray(data.payments)) {
      for (const pay of data.payments) {
        try {
          const newRepairId = pay.repair_id ? repairIdMap[pay.repair_id] : null;
          const { payment_id, created_at, repair, repair_id, ...rest } = pay;
          await prisma.payment.create({
            data: {
              ...rest,
              repair_id: newRepairId,
              amount: Number(rest.amount),
              payment_date: rest.payment_date ? new Date(rest.payment_date) : new Date()
            }
          });
        } catch {}
      }
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

// ── POST test AI NIM Connection ────────────────────────────────────
settingsRouter.post('/test-ai', async (req, res) => {
  try {
    const { apiKey, modelId } = req.body;
    await AiService.testNvidiaConnection(apiKey, modelId);
    res.json({ success: true, message: 'NVIDIA NIM Connection successful!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to authenticate with NVIDIA NIM API.' });
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