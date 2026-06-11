const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
app.get('/sales', requireAuth, requireFeature('sales'), async (req, res) => {
try {
const status = req.query.status || 'all';
const payment = req.query.payment || 'all';
const invoices = await models.sales.getSalesInvoices(status, payment);
res.render('sales/list', { invoices, statusFilter: status, paymentFilter: payment, user: req.session.user || null });
} catch (err) { console.error(err); res.status(500).send('Error loading sales: ' + err.message); }
});

app.get('/sales/new', requireAuth, requireFeature('sales'), authorize('admin', 'sales'), async (req, res) => {
try {
const [customers, parts, deliveryChallans] = await Promise.all([
models.sales.getActiveCustomers(),
models.sales.getActiveParts(),
models.sales.getDeliveryChallans()
]);
const settings = await models.settings.getSettings();
res.render('sales/new', { customers, parts, settings, deliveryChallans, user: req.session.user || null, errors: [] });
} catch (err) { console.error(err); res.status(500).send('Error loading sales form: ' + err.message); }
});

app.post('/sales', requireAuth, requireFeature('sales'), authorize('admin', 'sales'), [
body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
body('invoice_date').optional({ nullable: true }).isISO8601().withMessage('Invalid invoice date'),
body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid due date'),
body('place_of_supply').optional({ nullable: true }).isLength({ max: 100 }).withMessage('Place of supply is too long'),
body('action').optional().isIn(['save', 'issue']).withMessage('Invalid action'),
body('items_json').custom((value) => {
let items;
try { items = JSON.parse(value || '[]'); } catch (e) { throw new Error('Invalid items JSON'); }
if (!Array.isArray(items) || items.length === 0) throw new Error('At least one item is required');
return true;
})
], async (req, res) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
const [customers, parts, deliveryChallans] = await Promise.all([
models.sales.getActiveCustomers(),
models.sales.getActiveParts(),
models.sales.getDeliveryChallans()
]);
const settings = await models.settings.getSettings();
return res.status(400).render('sales/new', {
errors: errors.array(), customers, parts, settings, deliveryChallans,
user: req.session.user || null
});
}
const { customer_id, invoice_date, due_date, place_of_supply, notes, items_json, action, invoice_number } = req.body;
const rawItems = JSON.parse(items_json || '[]');

let totalAmount = 0, totalTax = 0;
const items = rawItems.map(item => {
var lineTotal = item.quantity * item.unit_price;
var discount = lineTotal * ((item.discount_percent || 0) / 100);
var afterDiscount = lineTotal - discount;
var tax = afterDiscount * ((item.tax_rate || 0) / 100);
totalAmount += afterDiscount;
totalTax += tax;
return {
part_id: item.part_id,
qty: item.quantity,
price: item.unit_price,
taxRate: item.tax_rate || 0,
taxAmt: tax,
lineTotal: afterDiscount
};
});

var taxType = 'IGST', cgstAmt = 0, sgstAmt = 0, igstAmt = totalTax;
try {
var invSettings = await models.settings.getSettings();
var companyState = (invSettings && invSettings.company && invSettings.company.state) ? invSettings.company.state : '';
if (place_of_supply && companyState && place_of_supply === companyState) {
taxType = 'CGST_SGST';
cgstAmt = totalTax / 2;
sgstAmt = totalTax / 2;
igstAmt = 0;
}
} catch (e) { /* use IGST as default */ }

const invoice = await models.invoices.createInvoice({
customer_id, invoice_date, due_date, place_of_supply, notes, items, action,
taxType, cgstAmt, sgstAmt, igstAmt,
totalAmount, totalTax, invoice_number
});
res.redirect(`/sales/${invoice.invoice_id}`);
} catch (err) {
console.error(err);
res.status(500).send('Error creating invoice: ' + err.message);
}
});

app.get('/sales/:id', requireAuth, requireFeature('sales'), async (req, res) => {
try {
const invoice = await models.invoices.getInvoiceById(req.params.id);
if (!invoice) return res.status(404).render('errors/404', { message: 'Invoice not found', user: req.session.user || null });
const items = invoice.items || [];
res.render('sales/detail', { invoice, items, totalPaid: 0, user: req.session.user || null });
} catch (err) { console.error(err); res.status(500).send('Error loading invoice: ' + err.message); }
});

app.get('/sales/export', requireAuth, requireFeature('sales'), async (req, res) => {
try {
const XLSX = require('xlsx');
const status = req.query.status || 'all';
const payment = req.query.payment || 'all';
const invoices = await models.sales.getSalesInvoices(status, payment);
const data = invoices.map(inv => ({
'Invoice #': inv.invoice_number,
Customer: inv.customer_name,
'Invoice Date': inv.invoice_date,
'Due Date': inv.due_date || '',
'Total Amount': inv.total_amount,
'Tax Amount': inv.tax_amount,
'Grand Total': inv.grand_total,
Status: inv.status,
'Payment Status': inv.payment_status || 'unpaid',
Notes: inv.notes || ''
}));
const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sales Invoices');
const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename="Sales_Invoices.xlsx"');
res.send(buf);
} catch (err) {
console.error('Sales export failed:', err);
res.status(500).send('Export failed');
}
});

app.get('/sales/:id/print', requireAuth, requireFeature('sales'), async (req, res) => {
  try {
    const invoice = await models.invoices.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).render('errors/404', { message: 'Invoice not found', user: req.session.user || null });
    const settings = await models.settings.getSettings();
    const { getPrintContext, ALLOWED_THEMES } = require('../models/print');
    const ejs = require('ejs');
    const path = require('path');
    const printCtx = await getPrintContext(req);
    const defaultTheme = (settings.print && settings.print.default_theme) ? (settings.print.default_theme === 'mobile-shop' ? 'classic' : settings.print.default_theme) : 'classic';
    const theme = req.query.theme || defaultTheme;
    const validThemes = ['classic', 'modern-blue', 'minimal', 'saffron', 'tally'];
    const selectedTheme = validThemes.includes(theme) ? theme : 'classic';
    const themePath = path.join(process.cwd(), 'views', 'partials', 'print', 'theme-' + selectedTheme + '.ejs');

    // Indian Currency Number to Words converter
    function convertToIndianWords(num) {
      num = Math.round(parseFloat(num || 0));
      if (isNaN(num) || num === 0) return 'Zero Only';

      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      function getBelowThousand(n) {
        let str = '';
        if (n >= 100) {
          str += ones[Math.floor(n / 100)] + ' Hundred ';
          n %= 100;
        }
        if (n > 0) {
          if (n < 20) {
            str += ones[n] + ' ';
          } else {
            str += tens[Math.floor(n / 10)] + ' ';
            if (n % 10 > 0) {
              str += ones[n % 10] + ' ';
            }
          }
        }
        return str.trim();
      }

      let result = '';
      if (num >= 10000000) {
        const cr = Math.floor(num / 10000000);
        result += getBelowThousand(cr) + ' Crore ';
        num %= 10000000;
      }
      if (num >= 100000) {
        const lk = Math.floor(num / 100000);
        result += getBelowThousand(lk) + ' Lakh ';
        num %= 100000;
      }
      if (num >= 1000) {
        const th = Math.floor(num / 1000);
        result += getBelowThousand(th) + ' Thousand ';
        num %= 1000;
      }
      if (num > 0) {
        result += getBelowThousand(num) + ' ';
      }
      return `Rupees ${result.trim()} Only`;
    }

    // Format currency to Indian standard representation
    const formatCurrency = (val) => {
      const n = parseFloat(val || 0);
      return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Date formatting helper (DD-MM-YYYY)
    const formatDate = (dVal) => {
      if (!dVal) return '';
      const d = new Date(dVal);
      if (isNaN(d.getTime())) return String(dVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const isInter = invoice.tax_type === 'IGST';

    // Map to strict data contract from Step 4
    const companySettings = settings.company || {};
    const bankSettings = companySettings.bank || {};
    const invoiceSettings = settings.invoice || {};

    const taxable_total = parseFloat(invoice.total_amount || 0);
    const tax_total = parseFloat(invoice.tax_amount || 0);
    const raw_grand_total = taxable_total + tax_total;
    const grand_total = Math.round(raw_grand_total);
    const round_off = grand_total - raw_grand_total;

    const isPaid = invoice.payment_status === 'paid';
    const amount_paid = isPaid ? grand_total : 0.00;
    const balance = isPaid ? 0.00 : grand_total;

    const data = {
      company: {
        name: companySettings.name || 'HI SECURE SOLUTIONS',
        gstin: companySettings.gstin || '33CMAPM9758H1ZQ',
        address: companySettings.address || '102, Salt Road',
        city: companySettings.city || 'Nagapattinam',
        state: companySettings.state || 'Tamil Nadu',
        state_code: companySettings.gstin ? companySettings.gstin.substring(0, 2) : '33',
        pincode: companySettings.pincode || '611001',
        phone: companySettings.phone || '9042489993',
        email: companySettings.email || 'info@hisecuresolutions.com',
        website: companySettings.website || 'www.hisecuresolutions.com',
        logo_url: companySettings.logo_path || null,
        bank_name: bankSettings.name || companySettings.bank_name || '',
        bank_branch: bankSettings.branch || companySettings.bank_branch || '',
        account_number: bankSettings.account_number || companySettings.account_number || '',
        ifsc_code: bankSettings.ifsc_code || companySettings.ifsc_code || '',
        terms: invoiceSettings.terms_conditions || '',
        qr_code_url: companySettings.qr_code_url || null
      },
      invoice: {
        number: invoice.invoice_number || '',
        date: formatDate(invoice.invoice_date),
        due_date: formatDate(invoice.due_date),
        place_of_supply: invoice.place_of_supply || '',
        reverse_charge: invoice.reverse_charge ? 'Yes' : 'No',
        type: isInter ? 'inter' : 'intra',
        copy_type: (invoice.status === 'issued' || invoice.status === 'paid') ? 'Original for Recipient' : 'Duplicate for Transporter',
        ac_balance: parseFloat(invoice.ac_balance || 0.00),
        total_qty: (invoice.items || []).reduce((sum, item) => sum + parseInt(item.quantity || 0), 0)
      },
      customer: {
        name: invoice.customer_name || '',
        gstin: invoice.customer_gstin || '',
        billing_address: [invoice.customer_address, invoice.city, invoice.state, invoice.pincode].filter(Boolean).join(', ') || '',
        shipping_address: [invoice.customer_address, invoice.city, invoice.state, invoice.pincode].filter(Boolean).join(', ') || '',
        contact: invoice.customer_phone || ''
      },
      items: (invoice.items || []).map((item, idx) => {
        const qty = parseInt(item.quantity || 0);
        const rate = parseFloat(item.unit_price || 0);
        const taxable_value = qty * rate;
        const tax_rate = parseFloat(item.tax_rate || 0);
        const tax_amount = parseFloat(item.tax_amount || 0);

        return {
          sr: idx + 1,
          description: item.description || item.part_name || '',
          model: item.model || item.part_number || null,
          warranty: item.warranty || null,
          hsn_sac: item.hsn_sac || item.hsn_code || '',
          qty,
          unit: item.unit || 'NOS',
          rate,
          taxable_value,
          cgst_rate: !isInter ? tax_rate / 2 : 0,
          cgst_amount: !isInter ? tax_amount / 2 : 0,
          sgst_rate: !isInter ? tax_rate / 2 : 0,
          sgst_amount: !isInter ? tax_amount / 2 : 0,
          igst_rate: isInter ? tax_rate : 0,
          igst_amount: isInter ? tax_amount : 0,
          total: parseFloat(item.total_amount || (taxable_value + tax_amount))
        };
      }),
      summary: {
        taxable_total,
        cgst_total: !isInter ? tax_total / 2 : 0,
        sgst_total: !isInter ? tax_total / 2 : 0,
        igst_total: isInter ? tax_total : 0,
        round_off,
        grand_total,
        amount_paid,
        balance,
        amount_in_words: convertToIndianWords(grand_total),
        tax_in_words: convertToIndianWords(tax_total)
      }
    };

    let body = '';
    try {
      body = await ejs.renderFile(themePath, { ...data, theme: selectedTheme, fmt: formatCurrency });
    } catch (e) {
      body = '<p style="color:red;">Theme render failed: ' + e.message + '</p>';
    }

    res.render('partials/print/print-layout', {
      ...data,
      theme: selectedTheme,
      body,
      user: req.session.user || null,
      layout: false,
      fmt: formatCurrency,
      settings,
      printTheme: selectedTheme,
      printSize: req.query.size || (settings.print && settings.print.default_size) || 'a4'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading invoice for print');
  }
});

app.post('/sales/:id/issue', requireAuth, requireFeature('sales'), authorize('admin', 'sales'), async (req, res) => {
try {
await models.invoices.updateInvoiceStatus(req.params.id, 'issued');
res.redirect(`/sales/${req.params.id}`);
} catch (err) { console.error(err); res.status(500).send('Error issuing invoice'); }
});

app.post('/sales/:id/payment', requireAuth, requireFeature('sales'), authorize('admin', 'sales'), async (req, res) => {
try {
await models.invoices.updateInvoicePaymentStatus(req.params.id, 'paid');
res.redirect(`/sales/${req.params.id}`);
} catch (err) { console.error(err); res.status(500).send('Error updating payment'); }
});

app.get('/sales/:id/edit', requireAuth, requireFeature('sales'), authorize('admin', 'sales'), async (req, res) => {
try {
const invoice = await models.invoices.getInvoiceById(req.params.id);
if (!invoice) return res.status(404).render('errors/404', { message: 'Invoice not found', user: req.session.user || null });
if (invoice.status !== 'draft') return res.status(400).send('Only draft invoices can be edited');
const [customers, parts] = await Promise.all([models.sales.getActiveCustomers(), models.sales.getActiveParts()]);
res.render('sales/edit', { invoice, customers, parts, user: req.session.user || null, errors: [] });
} catch (err) { console.error(err); res.status(500).send('Error loading invoice for editing'); }
});

app.post('/sales/:id', requireAuth, requireFeature('sales'), authorize('admin', 'sales'), [
body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
body('invoice_date').optional({ nullable: true }).isISO8601().withMessage('Invalid invoice date'),
body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid due date')
], async (req, res) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
const invoice = await models.invoices.getInvoiceById(req.params.id);
const [customers, parts] = await Promise.all([models.sales.getActiveCustomers(), models.sales.getActiveParts()]);
return res.status(400).render('sales/edit', { invoice, customers, parts, errors: errors.array(), user: req.session.user || null });
}
const invoiceId = req.params.id;
const invoice = await models.invoices.getInvoiceById(invoiceId);
if (!invoice) return res.status(500).send('Invoice not found');
if (invoice.status !== 'draft') return res.status(400).send('Only draft invoices can be edited');
const { customer_id, invoice_date, due_date, place_of_supply, notes, invoice_number } = req.body;
await models.invoices.updateInvoice(invoiceId, { customer_id: parseInt(customer_id), invoice_date, due_date, place_of_supply, notes, invoice_number });
res.redirect(`/sales/${invoiceId}`);
} catch (err) { console.error('Error updating invoice:', err); res.status(500).send('Error updating invoice'); }
});
};
