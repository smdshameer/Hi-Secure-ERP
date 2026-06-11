# ERP Upgrade — Implementation Plan
**Project:** Hi Secure Solutions ERP  
**Start Date:** 2026-05-29  
**Status:** Phase 0 Complete (Research) — Implementation begins with Phase 1

---

## Overview

This plan upgrades the ERP from a monolithic repair-shop app to a full-featured Indian-compliant business management system with settings-driven feature control and professional printing.

### Architecture Principles
- Every feature controllable via Settings module (feature flags + configuration)
- Modular folder structure (routes/, models/, middleware/, controllers/)
- All Indian compliance requirements met
- Multi-theme, multi-size printing for all documents
- Role-based access control per module

---

## Progress Tracker

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Research & Planning | ✅ Complete | This document |
| 1 — Project Restructure | ✅ 90% | folders, config, middleware, 17 models, 19 routes, server.js; master schema added 2026-05-29 |
| 2 — Settings Module Overhaul | ✅ 85% | full defaults schema; routes have requireFeature on every module; sidebar visibility not yet wired |
| 3 — Print System Redesign | ✅ 85% | print-themes.css wired; A4/A5/Letter/Legal/Thermal/thermal-80mm/5 sizes all working; print preview picker not implemented |
| 4 — Indian Compliance Features | ~25% | GSTR-1 & GSTR-3B stubs exist; e_invoice_logs, eway_bill_logs, tds_records tables exist; APIs not integrated |
| 5 — New ERP Modules | ~10% | accounts + vouchers tables exist with seed COA; no voucher UI or report pages yet |

---

## PHASE 1 — Project Restructure

**Goal:** Split the 5000-line `server.js` into a modular MVC-like structure.

### 1.1 Folder Structure
```
erp-app/
├── server.js              # Entry point (thin — ~100 lines)
├── config/
│   ├── database.js        # PostgreSQL pool config
│   └── settings.js        # Settings helpers
├── middleware/
│   ├── auth.js            # requireAuth + authorize
│   └── feature.js         # Feature gate middleware
├── models/
│   ├── index.js           # Exports all model functions
│   ├── repairs.js
│   ├── customers.js
│   ├── parts.js
│   ├── sales.js
│   ├── invoices.js
│   ├── quotations.js
│   ├── purchases.js
│   ├── deliveryChallans.js
│   ├── technicians.js
│   ├── suppliers.js
│   ├── locations.js
│   ├── users.js
│   ├── settings.js
│   └── accounting.js      # New — for Phase 5
├── routes/
│   ├── index.js           # Route aggregator
│   ├── auth.js
│   ├── dashboard.js
│   ├── repairs.js
│   ├── customers.js
│   ├── parts.js
│   ├── sales.js
│   ├── invoices.js
│   ├── quotations.js
│   ├── purchases.js
│   ├── deliveryChallans.js
│   ├── pos.js
│   ├── technicians.js
│   ├── suppliers.js
│   ├── locations.js
│   ├── users.js
│   ├── settings.js
│   ├── reports.js
│   ├── accounting.js      # New — for Phase 5
│   └── api.js             # JSON APIs (quick create, etc.)
├── views/
│   ├── layout.ejs
│   ├── auth/
│   ├── dashboard.ejs
│   ├── repairs/
│   ├── customers/
│   ├── parts/
│   ├── sales/
│   ├── invoices/
│   ├── quotations/
│   ├── purchases/
│   ├── delivery-challans/
│   ├── pos/
│   ├── technicians/
│   ├── suppliers/
│   ├── locations/
│   ├── users/
│   ├── settings/
│   ├── reports/
│   ├── accounting/        # New — for Phase 5
│   └── errors/
├── public/
│   ├── css/
│   │   ├── main.css
│   │   └── print-themes.css
│   ├── js/
│   │   └── app.js
│   └── uploads/
│       └── logo/
└── migrations/
    └── *.sql
```

### 1.2 Tasks
1. Create all directories
2. Create `config/database.js` — export pool, connect function
3. Create `config/settings.js` — export getSettings, updateSetting, getFeatureFlags
4. Create `middleware/auth.js` — requireAuth, authorize(...roles)
5. Create `middleware/feature.js` — requireFeature('module_name') — checks settings.enabled_features
6. Create `models/` — move all DB queries from server.js into named exports
7. Create `routes/` — move all route handlers from server.js
8. Create new `server.js` — import config, middleware, routes; 50-100 lines
9. Test: every page loads, every form submits

---

## PHASE 2 — Settings Module Overhaul

**Goal:** Make every feature controllable from Settings — remove hardcoded behavior.

### 2.1 New Settings Schema
```json
{
  "features": {
    "enabled_modules": ["repairs", "sales", "purchases", "inventory", "pos", "quotations", "delivery_challans", "accounting", "reports"],
    "repair_ticket_prefix": "RCP",
    "invoice_prefix": "INV",
    "quotation_prefix": "QT",
    "purchase_order_prefix": "PO",
    "delivery_challan_prefix": "DC",
    "auto_generate_numbers": true,
    "require_approval_for_invoices": false,
    "require_approval_for_purchases": false,
    "enable_credit_limit_check": true,
    "enable_low_stock_alerts": true,
    "enable_warranty_tracking": true,
    "enable_delivery_challan": true,
    "enable_pos": true,
    "enable_eway_bill": false,
    "enable_e_invoicing": false,
    "enable_gstr1": true,
    "enable_gstr3b": true,
    "default_payment_terms": "Payment due within 15 days",
    "default_delivery_days": 7,
    "quotation_validity_days": 30,
    "warranty_months": 3
  },
  "company": { ... existing ... },
  "print": { ... expanded in Phase 3 ... },
  "tax": { ... existing + new ... },
  "invoice": { ... existing ... },
  "quotation": { ... existing ... },
  "pos": { ... existing ... },
  "accounting": {
    "financial_year_start": "04-01",
    "accounting_method": "accrual",
    "default_cash_account": "Cash-in-Hand",
    "default_bank_account": "Bank-ICICI",
    "default_sales_account": "Sales-A/c",
    "default_purchase_account": "Purchases-A/c",
    "round_off_decimals": 2,
    "enable_day_book": true,
    "enable_cash_book": true,
    "enable_bank_book": true,
    "enable_ledgers": true,
    "enable_trial_balance": true,
    "enable_pnl": true,
    "enable_balance_sheet": true
  },
  "numbering": {
    "invoice_next": 1,
    "quotation_next": 1,
    "po_next": 1,
    "dc_next": 1,
    "repair_next": 1,
    "voucher_next": 1
  },
  "notifications": {
    "enable_email": false,
    "enable_sms": false,
    "enable_whatsapp": false,
    "low_stock_alert_email": "",
    "new_invoice_notify": true,
    "payment_received_notify": true
  },
  "backup": {
    "auto_backup": false,
    "backup_frequency": "daily",
    "backup_retention_days": 30,
    "backup_path": "./backups/"
  }
}
```

### 2.2 Settings UI Sections
1. **Company Profile** — Name, address, GSTIN, PAN, bank details, logo
2. **Features** — Toggle modules on/off (repairs, sales, POS, etc.)
3. **Numbering** — Prefixes and next numbers for all documents
4. **Tax** — GST rates, default rate, IGST toggle, HSN codes
5. **Print** — Default size, theme, theme library (see Phase 3)
6. **Accounting** — FY start, accounts, features toggle
7. **Notifications** — Email/SMS/WhatsApp settings
8. **Backup** — Auto-backup settings

### 2.3 Feature Gate Middleware
```js
// middleware/feature.js
async function requireFeature(featureName, req, res, next) {
  const settings = await getSettings();
  const enabled = settings.features?.enabled_modules?.includes(featureName);
  if (!enabled) {
    return res.status(403).render('errors/403', {
      message: 'This module is disabled in settings',
      user: req.session.user
    });
  }
  next();
}
```

Every route will be wrapped:
```js
app.get('/repairs', requireAuth, requireFeature('repairs'), async (req, res) => { ... });
```

If a module is disabled, the sidebar link is auto-hidden (via `res.locals.enabledFeatures` injected by middleware).

### 2.4 Tasks
1. Expand settings database schema with new sections
2. Update `getSettings()` defaults to include all new sections
3. Create Settings views (sidebar tabbed interface)
4. Add feature gate middleware
5. Wire `requireFeature()` to every route
6. Update sidebar to show/hide based on enabled features
7. Add numbering system (configurable prefixes + auto-increment)

---

## PHASE 3 — Print System Redesign

**Goal:** Every document printable in any paper size with any theme.

### 3.1 Paper Sizes Supported
| Size | Dimensions | Use Case |
|------|-----------|----------|
| A4 | 210×297mm | Invoices, Quotations, Reports |
| A5 | 148×210mm | Small invoices, receipts |
| Letter | 216×279mm | US customers |
| Legal | 216×356mm | Long invoices |
| Thermal 58mm | 58mm×auto | POS receipt |
| Thermal 80mm | 80mm×auto | POS receipt |
| Half A4 | 105×297mm | Delivery challan |
| Custom | User-defined | Any |

### 3.2 Print Themes
| Theme | Style | Best For |
|-------|-------|----------|
| **Default** | Blue header, standard business | General use |
| **Minimal** | No borders, clean lines | Modern offices |
| **Compact** | Small fonts, dense info | Thermal printers |
| **Modern** | Indigo accent, rounded corners | Tech companies |
| **Classic** | Serif font, double borders | Traditional |
| **Tally** | Exact TallyPrime format | Tally-compatible books |
| **BillDesk** | Bold header, centered | Retail POS |

### 3.3 Print Architecture
Each print route:
1. Accepts `?size=a4&theme=modern` query params (defaults to settings)
2. Passes `pageSize` and `printTheme` to the EJS view
3. View adds `<body class="print-theme-{theme}">` and `<style>@page { size: {size} }</style>`
4. Print CSS handles all formatting

### 3.4 Tally Theme Specifics
- Exact column alignment as TallyPrime
- "Tax Invoice" / "Delivery Challan" headers
- HSN summary table at bottom
- Tally-style totals with words (Rupees In Words)
- Terms & conditions in Tally format

### 3.5 Tasks
1. Create `print-themes.css` with all 7 themes (Tally theme new)
2. Create `print-sizes.css` with @page rules for all sizes
3. Update all print routes to accept size+theme params
4. Update all print EJS views to use theme class + page size
5. Add print preview page (choose size+theme before printing)
6. Add "Print Settings" shortcut on every document
7. Add barcode-80x150 size for product labels

---

## PHASE 4 — Indian Compliance Features

**Goal:** Meet all mandatory Indian business compliance requirements.

### 4.1 E-Invoicing (IRN)
- [ ] Add `e_invoice` table (irn, ack_no, ack_date, qr_code, signed_invoice)
- [ ] IRP API integration (sandbox first, production later)
- [ ] Generate QR code with IRN + seller/buyer GSTIN + invoice value
- [ ] Cancel IRN flow (within 24hrs of generation)
- [ ] Mark invoices as E-invoiced in UI

### 4.2 E-Way Bill
- [ ] Add `eway_bill` fields to delivery_challans (already partially exists)
- [ ] EWB API integration for generation/cancellation
- [ ] Auto-calculate distance between pincodes
- [ ] Vehicle number + driver tracking

### 4.3 GSTR Reports (Enhance Existing)
- [ ] GSTR-1 B2CS (small) invoices < ₹2.5L
- [ ] GSTR-1 HSN summary
- [ ] GSTR-1 amendment (CDNUR)
- [ ] GSTR-2A auto-fetch (optional — GSP integration)
- [ ] GSTR-3B complete form with all tables
- [ ] GSTR-3B interest/late fee calculation

### 4.4 TDS/TCS Returns
- [ ] TDS deduction on payments to vendors
- [ ] TCS collection on sales
- [ ] Form 26Q / 27Q report generation
- [ ] TDS certificate generation

### 4.5 Other Compliance
- [ ] Party-wise ledger (customer/supplier statement)
- [ ] Day book / Cash book
- [ ] Stock statement with HSN-wise valuation
- [ ] Professional Tax (if applicable per state)
- [ ] Labour Welfare Fund tracking

### 4.6 Tasks
1. Create database tables for e_invoice, eway_bill_logs, tds_records
2. Build IRN generation flow (with NIC API integration)
3. Build E-way bill flow
4. Enhance GSTR-1 with HSN summary + B2CS
5. Enhance GSTR-3B with complete form
6. Add TDS/TCS module
7. Add party-wise ledger report

---

## PHASE 5 — New ERP Modules

**Goal:** Complete ERP with accounting and full business management.

### 5.1 Accounting Module
**Chart of Accounts (COA):**
```
Assets
├── Current Assets
│   ├── Bank Accounts (predefined: ICICI, HDFC, SBI, etc.)
│   ├── Cash-in-Hand
│   ├── Sundry Debtors
│   └── Inventory/Stock
├── Fixed Assets
│   ├── Furniture
│   └── Electronics
Liabilities
├── Current Liabilities
│   ├── Sundry Creditors
│   ├── GST Payable
│   ├── TDS Payable
│   └── Statutory Dues
Income
├── Sales (main revenue)
├── Service Income (repairs)
└── Other Income
Expenses
├── Purchases
├── Cost of Goods Sold
├── Salary Expenses
└── Office Expenses
```

**Vouchers:**
| Type | Module | Effect |
|------|--------|--------|
| Payment | Pay to supplier/expense | Dr Expense / Cr Bank |
| Receipt | Receive from customer | Dr Bank / Cr Income |
| Contra | Transfer between Bank↔Cash | Dr Cash / Cr Bank |
| Journal | Any adjustment | Dr Account / Cr Account |
| Debit Note | Return/damage | Dr Supplier / Cr Stock |
| Credit Note | Return/discount | Dr Income / Cr Customer |

**Reports:**
- [ ] Ledger (single account statement)
- [ ] Day Book (all vouchers date-wise)
- [ ] Cash Book (only cash transactions)
- [ ] Bank Book (only bank transactions)
- [ ] Trial Balance (Trading + P&L)
- [ ] Trading Account
- [ ] Profit & Loss Statement
- [ ] Balance Sheet
- [ ] Ratio Analysis

### 5.2 Database Tables for Accounting
```sql
-- Chart of Accounts
CREATE TABLE accounts (
  account_id SERIAL PRIMARY KEY,
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset/liability/income/expense
  parent_account_id INT REFERENCES accounts(account_id),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance_type VARCHAR(10) DEFAULT 'Dr', -- Dr/Cr
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers header
CREATE TABLE vouchers (
  voucher_id SERIAL PRIMARY KEY,
  voucher_number VARCHAR(50) UNIQUE NOT NULL,
  voucher_type VARCHAR(20) NOT NULL, -- payment/receipt/contra/journal/debit_note/credit_note
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type VARCHAR(50), -- invoice/po/dc/repair
  reference_id INT,
  narration TEXT,
  total_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft', -- draft/approved/cancelled
  created_by INT REFERENCES users(user_id),
  approved_by INT REFERENCES users(user_id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voucher entries (double entry)
CREATE TABLE voucher_entries (
  entry_id SERIAL PRIMARY KEY,
  voucher_id INT NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
  account_id INT NOT NULL REFERENCES accounts(account_id),
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_logs (
  log_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  record_id INT,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 Tasks
1. Create COA with default Indian chart of accounts
2. Create voucher_tables (header + entries)
3. Build voucher creation UI (all 6 types)
4. Build voucher approval flow
5. Auto-generate journal entries from:
   - Sales Invoice → Dr Debtors / Cr Sales + GST Payable
   - Payment Received → Dr Bank / Cr Debtors
   - Purchase Order → Dr Purchases / Cr Creditors
   - Repair Payment → Dr Bank / Cr Service Income
6. Build all 8 accounting reports
7. Add audit log to every CRUD operation
8. Add backup/restore functionality

---

## Execution Order

```
Phase 0 ██████████████████████ DONE (This plan)
Phase 1 ░░░░░░░░░░░░░░░░░░░░░ NEXT — Restructure project
Phase 2 ░░░░░░░░░░░░░░░░░░░░░ After P1 — Settings overhaul
Phase 3 ░░░░░░░░░░░░░░░░░░░░░ After P2 — Print redesign
Phase 4 ░░░░░░░░░░░░░░░░░░░░░ After P3 — Indian compliance
Phase 5 ░░░░░░░░░░░░░░░░░░░░░ After P4 — Accounting modules
```

Each phase is independently deliverable and testable. After each phase:
1. Test all existing features still work
2. Commit changes
3. Update this plan's status table
4. Proceed to next phase

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Single developer, large scope | Phase-by-phase delivery, each tested |
| Database schema changes may break existing data | Use `ADD COLUMN IF NOT EXISTS`, never drop columns |
| Settings changes affect live operations | Preview before save, rollback option |
| Print theme CSS may conflict with Bootstrap | Use `body.print-theme-X` scoping, test all themes |
| IRN API requires production credentials | Build with sandbox, graceful fallback to non-e-invoiced |
| Large file edits may hit context limits | Break work into per-file commits, use Edit tool |

---

## Notes
- This plan was saved to `IMPLEMENTATION_PLAN.md` for session recovery
- Each phase begins only after previous phase is tested and committed
- Settings module is the backbone — all feature control flows through it
- Indian compliance follows MCA/GSTN official formats exactly
