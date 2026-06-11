const { requireAuth, authorize } = require('../middleware/auth');
const pool = require('../config/database').pool;
const salesModels = require('../models/sales');
const settingsLib = require('../config/settings');

function monthLabel(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getInvoiceMonths() {
  const result = await pool.query(`SELECT DISTINCT to_char(invoice_date, 'YYYY-MM') AS month FROM sales_invoices ORDER BY month DESC LIMIT 24`);
  return result.rows.map(r => r.month);
}

module.exports = function(app) {
  app.get('/reports/gstr1', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    try {
      const [settings, months] = await Promise.all([settingsLib.getSettings(), getInvoiceMonths()]);
      const selectedMonth = req.query.month || '';
      let b2b = [];
      let b2c = [];
      let summary = { total_b2b: 0, total_b2c: 0, total_taxable: 0 };
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-').map(Number);
        const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
        const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
        const invoices = await salesModels.getSalesInvoices('all');
        const filtered = invoices.filter(inv => {
          const d = (inv.invoice_date || '').slice(0, 10);
          return d >= start && d <= end;
        });
        const byId = Object.create(null);
        filtered.forEach(inv => { byId[inv.invoice_id] = inv; });

        const itemsResult = await pool.query(`SELECT sii.*, p.part_number, p.name as part_name, p.hsn_code FROM sales_invoice_items sii JOIN parts p ON sii.part_id = p.part_id WHERE sii.invoice_id = ANY($1::int[])`, [filtered.map(i => i.invoice_id)]);
        const rows = itemsResult.rows.map(item => {
          const invoice = byId[item.invoice_id];
          const hasGstin = !!(invoice && invoice.customer_gstin && String(invoice.customer_gstin).trim().length > 0);
          const taxable = parseFloat(item.total_amount || 0) - parseFloat(item.tax_amount || 0);
          return {
            invoice_number: invoice ? invoice.invoice_number : '',
            invoice_date: invoice ? invoice.invoice_date : '',
            customer_gstin: invoice ? (invoice.customer_gstin || '') : '',
            customer_name: invoice ? (invoice.customer_name || '') : '',
            hsn_code: item.hsn_code || '',
            description: item.part_name || '',
            quantity: parseInt(item.quantity || 0, 10),
            unit_price: parseFloat(item.unit_price || 0),
            taxable_value: taxable,
            tax_rate: parseFloat(item.tax_rate || 0),
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: parseFloat(item.tax_amount || 0),
          };
        });
        b2b = rows.filter(r => r.customer_gstin);
        b2c = rows.filter(r => !r.customer_gstin);
        summary.total_b2b = b2b.length;
        summary.total_b2c = b2c.length;
        summary.total_taxable = rows.reduce((a, r) => a + r.taxable_value, 0);
      }
      res.render('reports/gstr1', {
        settings,
        user: req.session.user || null,
        months,
        selectedMonth,
        b2b,
        b2c,
        summary,
      });
    } catch (err) {
      console.error('GSTR-1 error:', err);
      res.status(500).send('Error loading GSTR-1');
    }
  });

  app.get('/reports/gstr1/export', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    try {
      const selectedMonth = req.query.month || '';
      if (!selectedMonth) return res.status(400).send('Missing month');
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      const invoices = await salesModels.getSalesInvoices('all');
      const filtered = invoices.filter(inv => {
        const d = (inv.invoice_date || '').slice(0, 10);
        return d >= start && d <= end;
      });
      if (!filtered.length) return res.status(404).send('No invoices for selected month');

      const itemsResult = await pool.query(`SELECT sii.*, p.part_number, p.name as part_name, p.hsn_code FROM sales_invoice_items sii JOIN parts p ON sii.part_id = p.part_id WHERE sii.invoice_id = ANY($1::int[])`, [filtered.map(i => i.invoice_id)]);
      const byId = Object.create(null);
      filtered.forEach(inv => { byId[inv.invoice_id] = inv; });

      const rows = itemsResult.rows.map(item => {
        const invoice = byId[item.invoice_id];
        const taxable = parseFloat(item.total_amount || 0) - parseFloat(item.tax_amount || 0);
        const cgst = invoice.place_of_supply ? parseFloat(item.tax_amount || 0) / 2 : 0;
        const sgst = invoice.place_of_supply ? parseFloat(item.tax_amount || 0) / 2 : 0;
        const igst = invoice.place_of_supply ? 0 : parseFloat(item.tax_amount || 0);
        return [
          invoice ? invoice.invoice_number : '',
          invoice ? (invoice.invoice_date || '').slice(0, 10) : '',
          invoice ? (invoice.customer_gstin || '') : '',
          invoice ? (invoice.customer_name || '') : '',
          item.hsn_code || '',
          item.part_name || '',
          item.quantity || 0,
          parseFloat(item.unit_price || 0).toFixed(2),
          taxable.toFixed(2),
          parseFloat(item.tax_rate || 0).toFixed(2),
          cgst.toFixed(2),
          sgst.toFixed(2),
          igst.toFixed(2),
          invoice && invoice.customer_gstin ? 'B2B' : 'B2C',
        ];
      });
      const headers = ['Invoice Number', 'Invoice Date', 'Customer GSTIN', 'Customer Name', 'HSN Code', 'Description', 'Quantity', 'Rate', 'Taxable Value', 'Tax Rate (%)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Type'];
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=GSTR1_${selectedMonth}.csv`);
      res.send(csv);
    } catch (err) {
      console.error('GSTR-1 export error:', err);
      res.status(500).send('Export failed');
    }
  });

  app.get('/reports/gstr3b', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    try {
      const [settings, months] = await Promise.all([settingsLib.getSettings(), getInvoiceMonths()]);
      const selectedMonth = req.query.month || '';
      let data = [];
      let summary = { total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0, total_tax: 0 };
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-').map(Number);
        const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
        const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
        const invoices = await salesModels.getSalesInvoices('all');
        const filtered = invoices.filter(inv => {
          const d = (inv.invoice_date || '').slice(0, 10);
          return d >= start && d <= end;
        });
        const itemsResult = await pool.query(`SELECT sii.*, p.part_number, p.name as part_name FROM sales_invoice_items sii JOIN parts p ON sii.part_id = p.part_id WHERE sii.invoice_id = ANY($1::int[])`, [filtered.map(i => i.invoice_id)]);
        const byId = Object.create(null);
        filtered.forEach(inv => { byId[inv.invoice_id] = inv; });
        const grouped = {};
        itemsResult.rows.forEach(item => {
          const rate = parseFloat(item.tax_rate || 0);
          if (!grouped[rate]) grouped[rate] = { tax_rate: rate, taxable_value: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0 };
          const entry = grouped[rate];
          const taxable = parseFloat(item.total_amount || 0) - parseFloat(item.tax_amount || 0);
          entry.taxable_value += taxable;
          const taxAmt = parseFloat(item.tax_amount || 0);
          if (byId[item.invoice_id] && byId[item.invoice_id].place_of_supply) {
            entry.cgst_amount += taxAmt / 2;
            entry.sgst_amount += taxAmt / 2;
          } else {
            entry.igst_amount += taxAmt;
          }
        });
        data = Object.values(grouped).sort((a, b) => b.tax_rate - a.tax_rate).map(row => ({
          tax_rate: row.tax_rate,
          taxable_value: row.taxable_value.toFixed(2),
          cgst_amount: row.cgst_amount.toFixed(2),
          sgst_amount: row.sgst_amount.toFixed(2),
          igst_amount: row.igst_amount.toFixed(2),
          total_tax: (row.cgst_amount + row.sgst_amount + row.igst_amount).toFixed(2),
        }));
        summary = {
          total_taxable: data.reduce((a, r) => a + parseFloat(r.taxable_value), 0).toFixed(2),
          total_cgst: data.reduce((a, r) => a + parseFloat(r.cgst_amount), 0).toFixed(2),
          total_sgst: data.reduce((a, r) => a + parseFloat(r.sgst_amount), 0).toFixed(2),
          total_igst: data.reduce((a, r) => a + parseFloat(r.igst_amount), 0).toFixed(2),
          total_tax: data.reduce((a, r) => a + parseFloat(r.total_tax), 0).toFixed(2),
        };
      }
      res.render('reports/gstr3b', {
        settings,
        user: req.session.user || null,
        months,
        selectedMonth,
        data,
        summary,
      });
    } catch (err) {
      console.error('GSTR-3B error:', err);
      res.status(500).send('Error loading GSTR-3B');
    }
  });

  app.get('/reports/gstr3b/export', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    try {
      const selectedMonth = req.query.month || '';
      if (!selectedMonth) return res.status(400).send('Missing month');
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      const invoices = await salesModels.getSalesInvoices('all');
      const filtered = invoices.filter(inv => {
        const d = (inv.invoice_date || '').slice(0, 10);
        return d >= start && d <= end;
      });
      if (!filtered.length) return res.status(404).send('No invoices for selected month');

      const itemsResult = await pool.query(`SELECT sii.*, p.part_number, p.name as part_name FROM sales_invoice_items sii JOIN parts p ON sii.part_id = p.part_id WHERE sii.invoice_id = ANY($1::int[])`, [filtered.map(i => i.invoice_id)]);
      const byId = Object.create(null);
      filtered.forEach(inv => { byId[inv.invoice_id] = inv; });
      const grouped = {};
      itemsResult.rows.forEach(item => {
        const rate = parseFloat(item.tax_rate || 0);
        if (!grouped[rate]) grouped[rate] = { tax_rate: rate, taxable_value: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0 };
        const entry = grouped[rate];
        const taxable = parseFloat(item.total_amount || 0) - parseFloat(item.tax_amount || 0);
        entry.taxable_value += taxable;
        const taxAmt = parseFloat(item.tax_amount || 0);
        if (byId[item.invoice_id] && byId[item.invoice_id].place_of_supply) {
          entry.cgst_amount += taxAmt / 2;
          entry.sgst_amount += taxAmt / 2;
        } else {
          entry.igst_amount += taxAmt;
        }
      });
      const rows = Object.values(grouped)
        .sort((a, b) => b.tax_rate - a.tax_rate)
        .map(r => [r.tax_rate, r.taxable_value.toFixed(2), r.cgst_amount.toFixed(2), r.sgst_amount.toFixed(2), r.igst_amount.toFixed(2), (r.cgst_amount + r.sgst_amount + r.igst_amount).toFixed(2)]);
      const headers = ['Tax Rate (%)', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Tax (₹)'];
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=GSTR3B_${selectedMonth}.csv`);
      res.send(csv);
    } catch (err) {
      console.error('GSTR-3B export error:', err);
      res.status(500).send('Export failed');
    }
  });

  // Compliance dashboard
  app.get('/compliance', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    res.render('compliance/dashboard', {
      user: req.session.user || null,
      features: {
        e_invoicing: false,
        eway_bill: false,
        gstr1: true,
        gstr3b: true,
      },
      deadlines: [
        { name: 'GSTR-1', due: '11th of next month', status: 'upcoming' },
        { name: 'GSTR-3B', due: '20th of next month', status: 'upcoming' },
        { name: 'TDS Return (Q3)', due: '31st Jan 2026', status: 'due-soon' },
        { name: 'E-Invoicing', due: 'Continuous (mandatory for >₹5Cr turnover)', status: 'info' },
      ]
    });
  });

  // E-Invoicing placeholder
app.get('/compliance/e-invoice', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
  res.render('compliance/e-invoice', { user: req.session.user || null, enabled: false, blocker: 'NIC sandbox credentials are required to enable E-Invoicing. Add IRP credentials in Settings > Compliance when ready.' });
});
app.post('/compliance/e-invoice/generate', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
  res.status(501).json({ success: false, message: 'E-Invoice generation is not configured yet. Connect the NIC IRP sandbox first.' });
});
// E-Way Bill placeholder
app.get('/compliance/eway-bill', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
  res.render('compliance/eway-bill', { user: req.session.user || null, enabled: false, blocker: 'E-Way Bill requires transporter and vehicle details plus EWB API credentials before it can be enabled.' });
});
app.post('/compliance/eway-bill/generate', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
  res.status(501).json({ success: false, message: 'E-Way Bill generation is not configured yet. Enable it from Settings > Compliance after adding API credentials.' });
});
// Banking dashboard placeholder
  app.get('/banking', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    res.render('banking/dashboard', {
      user: req.session.user || null,
      accounts: [],
      transactions: [],
      reconciliationStatus: { matched: 0, unmatched: 0 }
    });
  });

  app.post('/banking/import', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    res.status(501).json({ success: false, message: 'Bank statement import coming soon. Upload CSV from Settings > Banking.' });
  });

  app.get('/banking/reconcile', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    res.status(501).send('Bank reconciliation coming soon.');
  });

  // Payroll dashboard placeholder
  app.get('/payroll', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    res.render('payroll/dashboard', {
      user: req.session.user || null,
      employees: [],
      latestRun: null,
      attendanceSummary: { present: 0, absent: 0, halfDay: 0 }
    });
  });

  app.post('/payroll/process', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    res.status(501).json({ success: false, message: 'Payroll processing coming soon.' });
  });

  app.get('/payroll/reports', requireAuth, authorize('admin', 'accountant'), async (req, res) => {
    res.status(501).send('Payroll reports coming soon.');
  });

  // Multi-company placeholder
  app.get('/companies', requireAuth, authorize('admin'), async (req, res) => {
    res.render('companies/list', {
      user: req.session.user || null,
      companies: [
        { id: 1, name: 'Hi Secure Solutions', gstin: '07AABCH1234R1ZX', state: 'Delhi', active: true }
      ],
      currentCompanyId: 1
    });
  });

  app.post('/companies/switch', requireAuth, authorize('admin'), async (req, res) => {
    res.redirect('/');
  });

  app.get('/companies/:id/settings', requireAuth, authorize('admin'), async (req, res) => {
    res.redirect('/settings');
  });

  // Audit trail
  app.get('/audit', requireAuth, authorize('admin'), async (req, res) => {
    try {
      const logs = await pool.query(`
        SELECT al.*, u.username, u.full_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        ORDER BY al.created_at DESC
        LIMIT 100
      `);
      res.render('audit/index', { logs: logs.rows, user: req.session.user || null });
    } catch (err) {
      // Table may not exist yet
      res.render('audit/index', { logs: [], user: req.session.user || null });
    }
  });

  app.get('/audit/export', requireAuth, authorize('admin'), async (req, res) => {
    try {
      const logs = await pool.query(`
        SELECT al.*, u.username, u.full_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        ORDER BY al.created_at DESC
        LIMIT 1000
      `);
      const headers = ['Date', 'User', 'Role', 'Action', 'Module', 'Record ID', 'IP Address'];
      const rows = logs.rows.map(r => [
        r.created_at, r.full_name || r.username, '', r.action, r.module, r.record_id || '', r.ip_address || ''
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_log.csv');
      res.send(csv);
    } catch (err) {
      res.status(500).send('Export error');
    }
  });
};
