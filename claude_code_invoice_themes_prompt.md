# CLAUDE CODE PROMPT — ERP Invoice Print Themes (Complete Rebuild)
# Copy this ENTIRE file content into Claude Code as a single prompt.
# =====================================================================

I have an Express + EJS + PostgreSQL ERP system (raw SQL, no ORM, 
session-based auth, Helmet CSP). My invoice print themes are broken — 
misaligned and visually identical. I need you to COMPLETELY REBUILD the 
print theme system from scratch.

DO NOT patch existing files unless I specifically ask.
READ my existing invoice print route and EJS files FIRST before writing 
any code. Show me the file tree of everything you will create or modify 
BEFORE writing a single line of code. Wait for my confirmation.

---

## STEP 1 — READ THESE FILES FIRST

Before doing anything, read and summarize:
1. The existing invoice print route (likely routes/invoices.js or similar)
2. The existing invoice print EJS view
3. Any existing print CSS file
4. views/partials/ directory structure

---

## STEP 2 — FILE STRUCTURE TO CREATE

```
views/
  partials/
    print/
      theme-classic.ejs
      theme-modern-blue.ejs
      theme-minimal.ejs
      theme-saffron.ejs
      theme-hisecure.ejs       ← highest priority, pixel-perfect replica
      print-layout.ejs         ← base wrapper used by all themes

public/css/
  print-themes.css             ← all 5 themes, @media print only
```

---

## STEP 3 — SHARED INDIAN GST COMPLIANCE REQUIREMENTS

Every single theme MUST include all of these mandatory fields:

**Company block:**
- Company name, GSTIN, full address, state, state code
- Phone, email, website, logo image
- Bank name, branch, account number, IFSC code
- Terms and conditions text

**Invoice block:**
- Invoice number, invoice date, due date
- Place of supply, reverse charge (Yes / No)
- Invoice type: intra-state (CGST+SGST) or inter-state (IGST)
- Copy type: "Original for Recipient" or "Duplicate for Transporter"

**Customer block:**
- Customer name, GSTIN
- Billing address, shipping address (if different)
- Contact number, Place of Supply state

**Line items table (per row):**
- S.No, Product/Service description, HSN/SAC code
- Quantity, Unit (NOS/MTR/KG etc.), Unit Rate
- Taxable value
- CGST rate % + CGST amount (intra-state)
- SGST rate % + SGST amount (intra-state)
- IGST rate % + IGST amount (inter-state)
- Line total amount

**Summary block:**
- Total taxable value
- Total CGST / Total SGST / Total IGST
- Round off (+ or -)
- Grand total
- Amount in words (Indian format: lakhs/crores)
- Tax amount in words
- Total quantity

**Footer block:**
- Bank details
- Terms and conditions
- QR code image (if available)
- Authorized signatory box with company name
- "This is a computer generated invoice" note

---

## STEP 4 — EJS DATA CONTRACT

All 5 themes receive the SAME data object. Use this exact structure:

```javascript
{
  company: {
    name,           // "HI SECURE SOLUTIONS"
    gstin,          // "33CMAPM9758H1ZQ"
    address,        // "102, Salt Road"
    city,           // "Nagapattinam"
    state,          // "Tamil Nadu"
    state_code,     // "33"
    pincode,
    phone,          // "9042489993"
    email,          // "info@hisecuresolutions.com"
    website,        // "www.hisecuresolutions.com"
    logo_url,       // path to logo image
    bank_name,
    bank_branch,
    account_number,
    ifsc_code,
    terms,          // terms and conditions text
    qr_code_url     // path to QR code image (may be null)
  },
  invoice: {
    number,         // "GST/22/07/021"
    date,           // "23-07-2022"
    due_date,
    place_of_supply,  // "33-Tamil Nadu"
    reverse_charge,   // "No"
    type,           // 'intra' or 'inter'
    copy_type,      // "Original for Recipient"
    ac_balance,     // 0.00
    total_qty       // sum of all quantities
  },
  customer: {
    name,           // "Arokya Mary Mobile Shop"
    gstin,          // may be empty for B2C
    billing_address,  // "7/633, Kadai Theru, Keezhaiyur, Nagapattinam"
    shipping_address, // may be same as billing
    contact         // "9585982260"
  },
  items: [
    {
      sr,             // 1, 2, 3...
      description,    // "Hikvision 2MP 4CH 1SATA..."
      model,          // "IDS-7204HQHI-M1/FA" (may be null)
      warranty,       // "2 Year Warranty" (may be null)
      hsn_sac,        // "8525"
      qty,            // 1
      unit,           // "NOS"
      rate,           // 4050.00
      taxable_value,  // 4050.00
      cgst_rate,      // 9
      cgst_amount,    // 364.50
      sgst_rate,      // 9
      sgst_amount,    // 364.50
      igst_rate,      // 0
      igst_amount,    // 0
      total           // 4779.00
    }
  ],
  summary: {
    taxable_total,    // 16835.00
    cgst_total,       // 1515.15
    sgst_total,       // 1515.15
    igst_total,       // 0
    round_off,        // -0.30
    grand_total,      // 19865.00
    amount_paid,      // 19865.00
    balance,          // 0.00
    amount_in_words,  // "Rupees Nineteen Thousand Eight Hundred Sixty Five Only"
    tax_in_words      // "Rupees Three Thousand Thirty Only"
  }
}
```

---

## STEP 5 — GLOBAL CSS RULES (apply to ALL themes)

```css
/* In print-themes.css */

@page {
  size: A4 portrait;
  margin: 10mm 12mm 10mm 12mm;
}

@media print {
  /* Hide everything except the invoice */
  body > *:not(#print-area) { display: none !important; }
  #print-area { display: block !important; }

  /* No buttons, nav, sidebar when printing */
  .no-print, nav, header, footer,
  .btn, button, .sidebar { display: none !important; }

  /* Prevent page break inside line items */
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }

  /* ₹ symbol */
  .rupee { font-family: 'Arial Unicode MS', Arial, sans-serif; }
}

/* Font fallbacks (no CDN — system fonts only) */
.font-serif  { font-family: 'Times New Roman', Times, serif; }
.font-sans   { font-family: Arial, Helvetica, sans-serif; }
.font-mono   { font-family: 'Courier New', Courier, monospace; }
```

---

## STEP 6 — PRINT LAYOUT BASE WRAPPER

`views/partials/print/print-layout.ejs` — wraps all themes:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice <%= invoice.number %></title>
  <link rel="stylesheet" href="/css/print-themes.css">
  <style>
    /* Screen preview styles — removed when printing */
    @media screen {
      body { background: #e0e0e0; padding: 20px; }
      #print-area {
        background: white;
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 10mm 12mm;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      }
    }
  </style>
</head>
<body>
  <div id="print-area" class="theme-<%= theme %>">
    <%- body %>
  </div>
  <div class="no-print" style="text-align:center; margin-top:20px;">
    <button onclick="window.print()" 
      style="padding:10px 30px; font-size:16px; cursor:pointer;">
      🖨️ Print Invoice
    </button>
    <button onclick="window.history.back()" 
      style="padding:10px 20px; font-size:16px; cursor:pointer; margin-left:10px;">
      ← Back
    </button>
  </div>
</body>
</html>
```

---

## STEP 7 — THE 5 THEMES

---

### THEME 1: "Classic" (.theme-classic)

**Visual style:** Black and white, traditional Indian ledger invoice.
No color fills except light gray for header row.

**Layout spec:**
```
┌─────────────────────────────────────────────────────────────┐
│              TAX INVOICE          [Invoice No / Date]       │
├──────────────────────────┬──────────────────────────────────┤
│  [LOGO]                  │  COMPANY NAME (large, bold)      │
│  [Tagline]               │  Address, Phone, Email           │
│                          │  GSTIN: XXXXXXXXXXXXXXXXX        │
├──────────────────────────┴──────────────────────────────────┤
│  Bill To:                                                   │
│  [Customer Name, Address, GSTIN, Contact, PoS]             │
├─────────┬───────────────────┬────────┬───┬──────┬────┬─────┤
│ S.No    │ DESCRIPTION       │HSN/SAC │QTY│ UNIT │RATE│ AMT │
├─────────┼───────────────────┼────────┼───┼──────┼────┼─────┤
│ rows...                                                     │
├──────────────────────────────────┬──────────────────────────┤
│  Delivery Terms / Total Qty      │  Subtotal / Tax / Total  │
├──────────────────────────────────┴──────────────────────────┤
│  Amount in Words: Rupees ... Only                           │
├─────────────────────────────┬───────────────────────────────┤
│  Terms & Conditions         │  GRAND TOTAL: ₹ XX,XXX        │
│  Bank Details               │  Amount Paid / Balance        │
│                             │  [Authorized Signatory]       │
└─────────────────────────────┴───────────────────────────────┘
```

**CSS specifics:**
- Font: Times New Roman 9pt body, 14pt company name
- All borders: 1px solid #333333
- Header row: background #f0f0f0, bold
- Zero color used — pure B&W
- Company name: uppercase, letter-spacing: 1px
- "TAX INVOICE" centered top: 11pt bold uppercase

---

### THEME 2: "Modern Blue" (.theme-modern-blue)

**Visual style:** Corporate, navy blue accents, clean two-column header.

**Layout spec:**
```
┌─────────────────────────────────────────────────────────────┐
│ [LOGO left]              [COMPANY NAME right, navy bold]    │
│                          [Address right-aligned]            │
│                          [GSTIN right]                      │
├──────────────────────────────────────────────────────────────┤
│ ████████████████ TAX INVOICE ████████████ (Original Copy)  │  ← navy bar
├─────────────────────────────┬───────────────────────────────┤
│ BILL TO                     │ Invoice No:                   │  ← light blue bg
│ [Customer details]          │ Date:                         │
│                             │ Due Date:                     │
│                             │ Place of Supply:              │
├──────────────────────────────────────────────────────────────┤
│ ████ S.No ████ DESCRIPTION ████ HSN ████ QTY ████ ...      │  ← navy header
├──────────────────────────────────────────────────────────────┤
│ rows with alternating #f5f8ff shading                       │
├──────────────────────────────────────────────────────────────┤
│ [Summary right-aligned box with navy borders]               │
├──────────────────────────────────────────────────────────────┤
│ ████████████ AMOUNT IN WORDS ████████████████████████████  │  ← navy bar
│ [words]                                                     │
├──────────────────────────────────────────────────────────────┤
│ [Terms left]              │ ████ TOTAL: ₹ XX,XXX ████      │  ← navy
│                           │ Amount Paid / Balance           │
│                           │ [Signatory]                     │
└───────────────────────────┴─────────────────────────────────┘
```

**CSS specifics:**
- Primary: #1a237e (navy), Accent: #1565c0 (blue)
- Font: Arial 9pt, company name 15pt
- Table header: background #1a237e, color white, 9pt bold
- Alternating rows: white / #f5f8ff
- Section bars: background #1a237e, color white, padding 5px 8px
- Blue left border accent on Bill To box: 4px solid #1565c0
- Summary box: border 2px solid #1a237e, right-aligned

---

### THEME 3: "Minimal" (.theme-minimal)

**Visual style:** Ultra-clean, whitespace-heavy, editorial/magazine style.
Inspired by modern SaaS invoice design.

**Layout spec:**
```
┌─────────────────────────────────────────────────────────────┐
│ [LOGO top-left]                   INVOICE        [#number] │
│                                   Date: XX-XX-XXXX          │
├─────────────────────────────────────────────────────────────┤
│                     ─────────────────────────               │  ← thin divider
│ FROM                              TO                        │
│ Company name bold                 Customer name bold        │
│ Address small gray                Address small gray        │
│ GSTIN small                       GSTIN small               │
│                     ─────────────────────────               │
├─────────────────────────────────────────────────────────────┤
│ DESCRIPTION              HSN    QTY    RATE       AMOUNT   │  ← gray header
│ ─────────────────────────────────────────────────────────   │
│ rows with only bottom border per row                        │
│ ─────────────────────────────────────────────────────────   │
├─────────────────────────────────────────────────────────────┤
│                            Subtotal           ₹ XX,XXX     │
│                            CGST 9%            ₹ XXX        │
│                            SGST 9%            ₹ XXX        │
│                            ─────────────────────────       │
│                            TOTAL              ₹ XX,XXX     │  ← bold line
├─────────────────────────────────────────────────────────────┤
│ Amount in Words                                             │
│ [italic text]                                               │
├─────────────────────────────────────────────────────────────┤
│ [Terms small gray left]    [Bank details right]             │
│                            [Signatory right]               │
│ ─────────────────────────────────────────────────────────   │
│         This is a computer generated invoice                │  ← centered small
└─────────────────────────────────────────────────────────────┘
```

**CSS specifics:**
- Zero color backgrounds — white only
- Borders: ONLY bottom borders on table rows (1px solid #e0e0e0)
- Font: Georgia (serif) for company name, Arial for body
- Company name: 18pt, very bold, tracking 2px
- "INVOICE" word: 24pt, light weight (300), gray #666
- Invoice number: 11pt bold, right-aligned
- Tax summary: right-aligned plain text, no box/border
- Total row: top border 2px solid #333, bold 11pt
- Amount in words: italic, #555
- Footer: 7pt, color #999
- NO colored section bars — just typography hierarchy

---

### THEME 4: "Professional Saffron" (.theme-saffron)

**Visual style:** Indian business style with saffron and green patriotic accents.
Dense, traditional, decorative header.

**Layout spec:**
```
┌─────────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████   │  ← saffron top stripe 4px
│ ████████████████████████████████████████████████████████   │  ← white stripe 2px  
│ ████████████████████████████████████████████████████████   │  ← green stripe 4px
├─────────────────────────────────────────────────────────────┤
│              [LOGO center-left]                             │
│         ══ COMPANY NAME (large, saffron) ══                │
│              Address | Phone | Email                        │
│              GSTIN: XXXXXXXXXXXXXXXXX                       │
│ ────────────────── TAX INVOICE ──────────────────          │  ← decorative divider
├─────────────────────────────────────────────────────────────┤
│ ██ BILL TO ████████████████ INVOICE DETAILS ██████████████ │  ← saffron bars
│  Customer name                Invoice No:                   │
│  Address                      Date:                         │
│  GSTIN | Contact | PoS        Reverse Charge:               │
├─────────────────────────────────────────────────────────────┤
│ ██ S.No ██ PARTICULARS ██ HSN ██ QTY ██ RATE ██ TAX ██ AMT│  ← green header
│ rows...                                                     │
│                         [ORIGINAL FOR RECIPIENT watermark] │
├─────────────────────────────────────────────────────────────┤
│ Total Qty: XX        │ Sub Total        ₹ XX,XXX.XX        │
├──────────────────────┼─────────────────────────────────────┤
│ ██ AMOUNT IN WORDS ████████████████████████████████████   │  ← saffron bar
│ Rupees ... Only                                             │
├─────────────────────────────────────────────────────────────┤
│ ██ TERMS & CONDITIONS ██████████ ██ TOTAL: ₹ XX,XXX ██   │
│ Terms text               │ Amount Paid                      │
│ Bank Details             │ Balance                          │
│ [QR Code]                │ [Auth Signatory]                 │
└─────────────────────────────────────────────────────────────┘
```

**CSS specifics:**
- Saffron: #FF6F00, Green: #1B5E20, Dark: #212121
- Font: Arial bold for headers, Arial for body
- Tricolor stripe: 3px saffron + 2px white + 3px green top border
- Company name: 16pt bold, color #FF6F00, text-align center
- "TAX INVOICE" divider: border-top/bottom 1px solid #FF6F00, text centered
- Table header: background #1B5E20, color white
- Saffron section bars: background #FF6F00, color white, bold
- Watermark: position absolute, rotate(-45deg), opacity 0.06,
  font-size 48pt, color #FF6F00, center of items table
  text: "ORIGINAL FOR RECIPIENT"
- Summary amounts: right-aligned, saffron color for totals

---

### THEME 5: "HiSecure Classic" (.theme-hisecure) ← HIGHEST PRIORITY

**This is a pixel-perfect replica of the reference invoice screenshot.**
Match this EXACTLY — layout, colors, spacing, column widths, all section bars.

**Reference colors:**
- Primary blue: #1565C0
- Light blue header bg: #E3F2FD  
- White: #FFFFFF
- Border: #BDBDBD
- Text dark: #212121

**EXACT LAYOUT — row by row:**

**ROW 0 — Top bar (full width, no background)**
```
|        TAX INVOICE (center, bold 11pt)    (Original Copy) right 9pt |
```
Bottom border: 1px solid #BDBDBD

**ROW 1 — Company header (no border box, open layout)**
```
| [LOGO image 120x60px left]    | HI SECURE SOLUTIONS (15pt bold right)  |
| [Tagline italic small]        | 102, Salt Road, (9pt right)            |
|                               | Nagapattinam (9pt right)               |
|                               | Contact: 9042489993 (9pt right)        |
|                               | Email: info@... (9pt right)            |
|                               | Website: www... (9pt right)            |
|                               | GSTIN: 33CMAPM9758H1ZQ (9pt right)    |
```

**ROW 2 — Bill To + Invoice Details (bordered box)**
```
┌─────────────────────────────────────────┬──────────────────────────────┐
│ █████ Bill To : ████████████████████   │                              │
│ (white text on #1565C0 background)      │  Invoice No. :  GST/22/07/  │
│                                         │  (bold italic value)         │
│ Arokya Mary Mobile Shop                 │                              │
│ (14pt bold #212121)                     │  Date        :  23-07-2022  │
│                                         │  (bold value)                │
│ 7/633, Kadai Theru, Keezhaiyur,        │                              │
│ Nagapattinam (9pt)                      │  A/c Balance :  ₹ 0.00 Cr  │
│                                         │  (bold value)                │
│ Contact: 9585982260  PoS: 33-Tamil Nadu │                              │
└─────────────────────────────────────────┴──────────────────────────────┘
```
- Left cell width: 62%, Right cell width: 38%
- "Bill To :" label: background #1565C0, color white, padding 4px 8px,
  font-size 10pt bold — spans full left cell top
- Right cell: each row is label (gray) + colon + bold value

**ROW 3 — Items Table**
```
Column headers (background #1565C0, white text, 9pt bold, center-aligned):
| S.No | PRODUCT / SERVICE NAME | HSN/SAC | QTY |  | UNIT PRICE | GST | AMOUNT |
  4%      34%                     10%      6%  5%   12%          7%    10%
```
- Header: background #1565C0, color #FFFFFF, 9pt bold
- Data rows: white background, 1px solid #BDBDBD borders
- Product name: 9pt bold #212121
- Model/warranty: 8pt normal #555555, display on next lines
- QTY and unit in separate sub-columns within QTY column
- All amount cells: right-aligned, ₹ prefix
- Alternating rows: NO shading — all white

**ROW 4 — Delivery Terms + Summary**
```
┌────────────────────────────────────┬──────────────────────────────────┐
│ Delivery Terms :    Total Qty : 77 │ Sub Total          ₹ 16,835.00  │
│                                    │ Add CGST (9%)         ₹ 1,515.15 │
│                                    │ Add SGST (9%)         ₹ 1,515.15 │
│                                    │ Round Off (-)             ₹ 0.30 │
└────────────────────────────────────┴──────────────────────────────────┘
```
- Left: "Delivery Terms :" bold + "Total Qty : XX" right-aligned same line
- Right: label left, value right, no borders inside

**ROW 5 — Invoice Amount in Words (full-width blue bar)**
```
| █████████████ Invoice Amount in Words ████████████████████████████  |
```
background #1565C0, color white, padding 5px 8px, 9pt bold

**ROW 6 — Words text**
```
┌────────────────────────────────────┬──────────────────────────────────┐
│ Rupees Nineteen Thousand Eight     │                                  │
│ Hundred Sixty Five Only            │   [Bank details if space]        │
└────────────────────────────────────┴──────────────────────────────────┘
```

**ROW 7 — Terms/Declaration + TOTAL (split blue bars)**
```
┌────────────────────────────────────┬──────────────────────────────────┐
│ █████ Terms / Declaration █████   │ ███ TOTAL      ₹ 19,865.00 ████ │
└────────────────────────────────────┴──────────────────────────────────┘
```
Both cells: background #1565C0, color white, bold

**ROW 8 — Terms content + Payment summary**
```
┌────────────────────────────────────┬──────────────────────────────────┐
│ Items sold once will not be        │ Amount Paid       ₹ 19,865.00   │
│ refunded...                        │ Balance                  ₹ 0.00 │
│ (8pt text, multi-line)             │                                  │
│                                    │                                  │
│ [QR Code image bottom-right]       │ [Authorized Signatory box]       │
│                                    │ For: COMPANY NAME                │
└────────────────────────────────────┴──────────────────────────────────┘
```
- Terms text: 8pt #333333
- QR code: 60x60px, bottom-right of left cell
- Amount Paid / Balance: label left, value right, 9pt
- Signatory: dashed top border, "Authorized Signatory" small center

---

## STEP 8 — UPDATE INVOICE ROUTE

Find the existing invoice print route and update it to support theme selection.

Add `?theme=` query parameter support:

```javascript
// In your invoice print route (routes/invoices.js or similar)
router.get('/:id/print', requireAuth, async (req, res) => {
  try {
    const theme = req.query.theme || 'hisecure'; // default to hisecure
    const validThemes = ['classic', 'modern-blue', 'minimal', 'saffron', 'hisecure'];
    const selectedTheme = validThemes.includes(theme) ? theme : 'hisecure';

    // ... existing invoice data fetch query (keep as-is) ...

    res.render('invoices/print', {
      // ... existing data ...
      theme: selectedTheme,
      layout: false  // if using express-ejs-layouts
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating invoice');
  }
});
```

Also add a theme selector button bar on the SCREEN view (hidden during print):

```html
<!-- Add above the invoice in print-layout.ejs, inside .no-print div -->
<div class="no-print" style="text-align:center; margin-bottom:10px;">
  <strong>Theme:</strong>
  <% ['hisecure','classic','modern-blue','minimal','saffron'].forEach(t => { %>
    <a href="?theme=<%= t %>" 
       style="margin:0 4px; padding:4px 10px; 
              background: '<%= theme===t ? '#1565C0' : '#eee' %>'; 
              color: '<%= theme===t ? '#fff' : '#333' %>'; 
              text-decoration:none; border-radius:3px; font-size:12px;">
      <%= t %>
    </a>
  <% }) %>
</div>
```

---

## STEP 9 — CONSTRAINTS & QUALITY RULES

1. Use HTML `<table>` for ALL invoice layouts — NOT CSS Grid or Flexbox
   (tables are far more reliable for print rendering in Chrome)
2. All CSS inside `@media print {}` blocks — no screen styles in print-themes.css
3. No npm packages unless absolutely required
4. No CDN fonts — system fonts with fallbacks only:
   - sans: Arial, Helvetica, sans-serif
   - serif: 'Times New Roman', Times, serif
5. ₹ symbol: always wrap in `<span class="rupee">₹</span>` 
   with font-family: 'Arial Unicode MS', Arial
6. Test each theme in Chrome → Ctrl+P → check A4 preview for:
   - No content overflowing right edge
   - No orphaned rows on page 2
   - All borders visible
   - Logo image loads
7. Each theme MUST be visually distinct at first glance — 
   different color scheme, different header layout, different typography
8. Amount in words must use Indian numbering (lakhs/crores format)
9. All monetary values formatted as: ₹ X,XX,XXX.XX (Indian comma format)
10. If invoice.type === 'inter', show IGST column; hide CGST/SGST columns
    If invoice.type === 'intra', show CGST+SGST columns; hide IGST column

---

## STEP 10 — DELIVERY CHECKLIST

Before finishing, verify and confirm each item:

- [ ] All 5 theme EJS files created
- [ ] print-themes.css created with all 5 theme classes
- [ ] print-layout.ejs base wrapper created
- [ ] Invoice route updated with ?theme= support
- [ ] Theme selector UI added (screen only, hidden on print)
- [ ] All 5 themes show all mandatory GST fields
- [ ] Theme 5 (hisecure) matches reference screenshot layout
- [ ] ₹ symbol renders correctly in all themes
- [ ] @media print hides nav/buttons
- [ ] No CDN dependencies
- [ ] Table layout used (not flexbox/grid) for invoice body
- [ ] Indian number format (XX,XX,XXX.XX) used throughout

---

## IMPORTANT FINAL NOTE

Theme 5 "HiSecure Classic" is the HIGHEST PRIORITY.
The reference screenshot is from an actual working invoice.
If you are unsure about any measurement, spacing, or color — 
refer to the screenshot description in STEP 7 above.

Start by reading existing files → show file tree → wait for approval → 
then build Theme 5 first → then the remaining 4 themes → 
then update the route.
```
