const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const outPath = path.join(process.cwd(), 'ERP-Architecture.pdf');
const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 50, left: 50, right: 50 } });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const COL_PRIMARY = '#1a237e';
const COL_ACCENT  = '#1565C0';
const COL_TEXT    = '#212121';
const COL_LIGHT   = '#f4f6fa';

const PAGE_W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const BOTTOM = doc.page.height - doc.page.margins.bottom;

function newPageCheck(needed) {
  if (doc.y + needed > BOTTOM) {
    doc.addPage();
  }
}

function h1(text) {
  newPageCheck(30);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(COL_PRIMARY).text(text, doc.page.margins.left, undefined, { width: PAGE_W });
}

function h2(text) {
  newPageCheck(22);
  doc.moveDown(0.15);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COL_ACCENT).text(text, doc.page.margins.left, undefined, { width: PAGE_W });
}

function h3(text) {
  newPageCheck(16);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text(text, doc.page.margins.left, undefined, { width: PAGE_W });
}

function para(text) {
  newPageCheck(16);
  doc.font('Helvetica').fontSize(10).fillColor(COL_TEXT).text(text, doc.page.margins.left, undefined, { width: PAGE_W, lineGap: 3 });
}

function quote(text) {
  newPageCheck(20);
  doc.font('Helvetica-Oblique').fontSize(10).fillColor('#1f2937').text(text, doc.page.margins.left + 10, undefined, { width: PAGE_W - 20, lineGap: 3 });
}

function bullet(text) {
  newPageCheck(16);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COL_ACCENT).text('•', doc.page.margins.left, undefined);
  doc.font('Helvetica').fontSize(10).fillColor(COL_TEXT).text(text, doc.page.margins.left + 14, undefined, { width: PAGE_W - 24, lineGap: 2 });
}

function codeBlock(text) {
  const lines = text.split('\n');
  const needed = lines.length * 12 + 12;
  newPageCheck(needed);
  const y = doc.y;
  const h = needed - 2;
  doc.rect(doc.page.margins.left, y, PAGE_W, h).fill('#f4f6fa').stroke(COL_PRIMARY, 0.5);
  doc.font('Courier').fontSize(8).fillColor(COL_PRIMARY).text(text, doc.page.margins.left + 6, y + 4, { width: PAGE_W - 12, lineGap: 1 });
}

function spacer(h = 8) {
  // just a vertical advance — moveDown is simplest
  newPageCheck(h);
  doc.moveDown(h / 12);
}

function drawTable(headers, rows) {
  const colWidths = headers.map(() => Math.floor(PAGE_W / headers.length));
  const titleH = 20;
  const rowH = 16;
  const needed = titleH + rows.length * rowH + 16;
  newPageCheck(needed);

  let x = doc.page.margins.left;
  let y = doc.y;
  // header bg
  doc.rect(x, y, PAGE_W, titleH).fill(COL_PRIMARY);
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
       .text(h, x + 6, y + 5, { width: colWidths[i] - 12 });
    x += colWidths[i];
  });
  y += titleH;

  rows.forEach((row, ri) => {
    newPageCheck(rowH);
    const bg = ri % 2 === 0 ? COL_LIGHT : '#ffffff';
    doc.rect(doc.page.margins.left, y, PAGE_W, rowH).fill(bg);
    x = doc.page.margins.left;
    row.forEach((cell, ci) => {
      doc.font('Helvetica').fontSize(8).fillColor(COL_TEXT)
         .text(cell, x + 6, y + 3, { width: colWidths[ci] - 12, lineGap: 2 });
      x += colWidths[ci];
    });
    y += rowH;
  });
  doc.y = y + 4;
}

// ---------- Title page ----------
doc.font('Helvetica-Bold').fontSize(24).fillColor(COL_PRIMARY).text('Hi Secure Solutions', doc.page.margins.left, 190, { width: PAGE_W });
doc.font('Helvetica-Bold').fontSize(16).fillColor(COL_ACCENT).text('ERP Architecture Document', doc.page.margins.left, 222, { width: PAGE_W });
doc.font('Helvetica').fontSize(10).fillColor(COL_MUTED).text('Developer explanation script — demo / interview / handoff', doc.page.margins.left, 250, { width: PAGE_W });
doc.addPage();

// ---------- Part 1 ----------
h1('Part 1 — Short Answer (30-sec elevator pitch)');
quote('"It\'s a full-stack, session-authenticated ERP built on Node.js + Express with EJS server-side rendered views and a PostgreSQL database accessed through raw SQL. The app lives in erp-app/ and covers sales invoicing, purchases, POS, parts inventory, repairs/job cards, CRM, accounting, banking, payroll, stores, and compliance — all tied together through session-based auth and a centralized settings layer."');
spacer(6);

// ---------- Part 2 ----------
h1('Part 2 — Technology Stack');
drawTable(
  ['Layer', 'Technology', 'Why'],
  [
    ['Runtime',              'Node.js',                   'Single language across stack'],
    ['Web framework',        'Express 4.x',               'Middleware pipeline, routing, session mgmt'],
    ['Templating',           'EJS 3.x',                   'Server-side rendering — no client build step'],
    ['Database',             'PostgreSQL',                'ACID transactions for invoices, accounting'],
    ['DB access',            'Raw SQL (node-postgres)',   'Zero ORM — full control, no abstraction tax'],
    ['Auth',                 'Session-based',             'Server-side sessions + CSRF (csurf)'],
    ['Security',             'Helmet CSP, bcrypt',        'CSP headers, password hashing'],
    ['PDF/Print',            'window.print() + EJS themes','Zero external print dependency']
  ]
);
spacer(6);

// ---------- Part 3 ----------
h1('Part 3 — Folder Structure');
codeBlock('erp-app/\n' +
'├── server.js                       # Entry point — Express bootstrap\n' +
'├── routes/\n' +
'│   ├── index.js                    # Dashboard / home\n' +
'│   ├── sales.js                    # Sales invoices, print, issue\n' +
'│   ├── purchases.js                # Purchase invoices\n' +
'│   ├── pos.js                      # Point-of-sale\n' +
'│   ├── parts.js                    # Parts / items catalog\n' +
'│   ├── repairs.js                  # Repair / job card workflow\n' +
'│   ├── quotations.js               # Quote → convert to invoice\n' +
'│   ├── delivery-challans.js        # Delivery note\n' +
'│   ├── customers.js                # Customer master\n' +
'│   ├── suppliers.js                # Supplier master\n' +
'│   ├── accounting.js               # Ledger, journal entries\n' +
'│   ├── banking.js                  # Bank transactions\n' +
'│   ├── payroll.js                  # Employee + salary\n' +
'│   ├── stores.js                   # Godown / warehouse\n' +
'│   ├── audit.js                    # Audit trail\n' +
'│   ├── locations.js                # Branch / site\n' +
'│   ├── crm.js                      # Follow-ups, leads\n' +
'│   ├── users.js                    # User management\n' +
'│   ├── settings.js                 # Company, invoice, print config\n' +
'│   ├── auth.js                     # Login / logout / session\n' +
'│   ├── india.js                    # GST HSN/SAC lookup\n' +
'│   └── search.js                   # Global search\n' +
'├── models/\n' +
'│   ├── invoices.js       # Invoice CRUD\n' +
'│   ├── print.js          # Theme / size context, ALLOWED_THEMES\n' +
'│   └── [other]         # Settings, users, etc.\n' +
'├── views/\n' +
'│   ├── partials/print/\n' +
'│   │   ├── theme-hisecure.ejs\n' +
'│   │   ├── theme-classic.ejs\n' +
'│   │   ├── theme-modern-blue.ejs\n' +
'│   │   ├── theme-minimal.ejs\n' +
'│   │   └── theme-saffron.ejs\n' +
'│   ├── sales/print.ejs   # Print shell (toolbar + #print-area + body)\n' +
'│   └── [module views]\n' +
'├── public/\n' +
'│   ├── css/print-themes.css    # 5 @media-print theme classes\n' +
'│   └── js/print-theme-switcher.js # sessionStorage theme persistence\n' +
'├── middleware/\n' +
'│   ├── auth.js  # requireAuth, authorize(role...)\n' +
'│   └── feature.js # requireFeature(sales|purchase|...)\n' +
'└── config/settings.js         # Company, print defaults, GST config');
spacer(4);

// ---------- Part 4 ----------
h1('Part 4 — Request / Response Flow (sales print)');
bullet('GET /sales/:id/print?theme=hisecure');
bullet('[requireAuth] checks req.session.user — redirects to /login if missing');
bullet('[requireFeature("sales")] gated access');
bullet('models/invoices.getInvoiceById(id) — raw SQL: SELECT * FROM invoices WHERE id=$1');
bullet('models/print.getPrintContext(req) — reads req.query.theme + settings.print.default_theme');
bullet('resolve path → views/partials/print/theme-{theme}.ejs');
bullet('ejs.renderFile(themePath, { invoice, settings, user }) → raw HTML table string');
bullet('res.render("sales/print", { printTheme, availableThemes, body, layout:false })');
bullet('Browser: #print-area.theme-hisecure renders invoice; .no-print toolbar hidden during @media print');
spacer(4);

// ---------- Part 5 ----------
h1('Part 5 — The Data Contract (Invoice to Theme)');
para('Every theme receives the same shape (models/print.js normalizes it):');
codeBlock('invoice: {\n  invoice_number, invoice_date, customer_name, customer_address,\n  state, pincode, customer_gstin, customer_phone,\n  total_amount, cgst_amount, sgst_amount, igst_amount,\n  grand_total, round_off, amount_paid, balance,\n  items: [ { sr, description, model, hsn_sac, quantity, rate,\n             total, cgst_rate, cgst_amount, sgst_rate,\n             sgst_amount, igst_rate, igst_amount } ],\n  status\n}\n\nsettings: {\n  company: { name, address, city, state, pincode,\n             phone, email, website, gstin, logo_path,\n             qr_code_url, bank },\n  invoice: { terms_conditions }\n}');
spacer(2);

// ---------- Part 6 ----------
h1('Part 6 — Print Theme Architecture');
quote('Key insight: the CSS class is applied by the wrapper, but the inline styles inside each theme EJS do the actual visual work.');
bullet('public/css/print-themes.css — @page rules, @media print hides, 5 theme classes');
bullet('views/partials/print/theme-{name}.ejs — each is a self-contained <table> invoice with inline styles');
bullet('views/sales/print.ejs — outer shell (theme/size <select> toolbar + #print-area.theme-<%=printTheme%>)');
spacer(2);

// ---------- Part 7 ----------
h1('Part 7 — Modules & What They Cover');
drawTable(
  ['Route file', 'Business domain', 'Key tables'],
  [
    ['sales.js',             'Sales invoices, print, issue',             'invoices, invoice_items'],
    ['purchases.js',         'Vendor purchases',                         'purchases, purchase_items'],
    ['pos.js',               'Point-of-sale counter sales',              'sales (fast path)'],
    ['parts.js',             'Item/part master (HSN, price, stock)',    'parts, part_stock'],
    ['repairs.js',           'Job card / AMC / service',                 'repairs, repair_items'],
    ['quotations.js',        'Quote → convert to invoice',              'quotations'],
    ['delivery-challans.js', 'Delivery note',                            'delivery_challans'],
    ['customers.js',         'Customer master, addresses, GSTIN',       'customers'],
    ['suppliers.js',         'Supplier master',                          'suppliers'],
    ['accounting.js',        'Ledger, journal, trail balance',           'journal_entries, ledgers'],
    ['banking.js',           'Bank book, reconciliation',                 'bank_transactions'],
    ['payroll.js',           'Employees, salary, attendance',           'employees, salary'],
    ['stores.js',            'Godown / warehouse transfers',             'stores, stock_movements'],
    ['audit.js',             'Audit log viewer',                          'audit_log'],
    ['locations.js',         'Branches / sites',                          'locations'],
    ['crm.js',               'Follow-ups, leads, complaints',             'leads, followups'],
    ['settings.js',          'Company info, invoice terms',               'company_settings'],
    ['india.js',             'GST HSN/SAC rate lookup',                   'cached/static']
  ]
);
spacer(6);

// ---------- Part 8 ----------
h1('Part 8 — Security Model');
bullet('requireAuth — every route checks req.session.user; redirects to /login if missing');
bullet('requireFeature("sales") — module-level feature allowlist in session');
bullet('authorize("admin","sales") — row-level write action gating');
bullet('bcrypt for password hashing; password never returned from DB');
bullet('helmet sets CSP headers; csurf blocks CSRF on state-changing routes');
bullet('express-rate-limit throttles repeated calls');
spacer(6);

// ---------- Part 9 ----------
h1('Part 9 — Print Architecture Explained');
para('Why five separate .ejs files instead of one template + CSS-only theming? Because invoice printers (thermal, A4, A5) need pixel control over header row heights, column widths, border styles, row shading, and Indian number formatting (1,23,456.78). Each .ejs file is a self-contained <table> with all styling inline — it doesn\'t depend on CSS being correct in the browser\'s print engine. This is the reliable approach for identical output from Chrome → Print → PDF.');
bullet('CSS hides nav/buttons during @media print, provides utilities (.font-serif, .rupee), and is the future pull toward cleaner separation.');
bullet('JS switcher persists the user\'s theme choice in sessionStorage so it survives page reloads during the session.');
spacer(6);

// ---------- Part 10 ----------
h1('Part 10 — Common Interview Talking Points');

h3('Q: Why raw SQL instead of an ORM?');
quote('"All financial records — invoices, journal entries, balances — need strict SQL control for rounding, GST math, and audit trails. An ORM adds a layer I\'d have to peel back anyway. Raw SQL + parameterized queries keeps it explicit."');

h3('Q: How do you handle GST?');
quote('"Tax type is stored at invoice level (CGST_SGST vs IGST). The place of supply state is compared against company state to auto-pick intra vs inter. Each line item carries cgst_rate/sgst_rate/igst_rate pre-calculated at entry."');

h3('Q: What\'s the offline story?');
quote('"None — this is a traditional server-rendered ERP. All state is in Postgres. No PWA, no Service Worker. That keeps the trust model simple for accounting data."');

h3('Q: How do you add a new module?');
quote('"Drop a routes file, a model, and an EJS view — follow the requireAuth → requireFeature → res.render pattern. For print: add a new theme-{name}.ejs under partials/print/ and list it in ALLOWED_THEMES."');
spacer(6);

// ---------- Part 11 ----------
h1('Part 11 — One-Line Architecture Diagram');
codeBlock('Browser (EJS-rendered HTML)\n' +
'    ↑ HTTP (sessions, csurf)\n' +
'Express routes (per module)\n' +
'    ↑ calls models/*.js (raw SQL via node-postgres)\n' +
'    ↑ queries PostgreSQL (invoices, ledgers, customers, ...)');

// footer — page numbers at bottom-center
const totalPages = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
doc.on('pageAdded', () => {
  const pg = doc.bufferedPageRange ? doc.bufferedPageRange().start + 1 : 1;
  doc.font('Helvetica').fontSize(8).fillColor('#888888')
     .text(`Hi Secure Solutions — ERP Architecture Document — Page ${pg}`, doc.page.margins.left, BOTTOM + 14, { width: PAGE_W, align: 'center' });
});

doc.end();

stream.on('finish', () => {
  console.log('PDF generated: ' + outPath);
});
stream.on('error', (err) => {
  console.error('Stream error:', err.message);
  process.exit(1);
});
