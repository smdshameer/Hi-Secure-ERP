# ERP Upgrade — Implementation Plan
**Project:** Hi Secure Solutions ERP
**Strategy:** Incremental upgrade over existing working app

---

## Current State
- ✅ Working monolith: `server.js` (5000 lines, runs on port 3000)
- ✅ Views: `views/` (57 EJS files)
- ✅ Database: `setup-database.sql` (PostgreSQL)
- ✅ Settings module: Works (Company, Print, Tax, Invoice, Quotation, POS tabs)
- ✅ GST Reports: GSTR-1, GSTR-3B export functional
- ✅ Full CRUD: Repairs, Customers, Parts, Sales, Purchases, Quotations, DC, POS, Users

## What's Built So Far (Phase 1 — Modular Structure)
Functional but NOT yet wired into the app:
- `config/database.js` — DB pool config
- `config/settings.js` — Enhanced settings with 12 sections
- `middleware/auth.js` — requireAuth, authorize
- `middleware/feature.js` — Feature gate (checks settings.features.enabled_modules)
- `models/*.js` — 15 model files (repairs, customers, parts, sales, etc.)
- `routes/*.js` — 18 route files (auth, repairs, customers, etc.)
- `server-modular.js` — **NEW** thin entry point (90 lines)

## How to Use Modular Server
```bash
# Old monolithic server (currently runs):
node server.js

# New modular server (preserves all features + adds new ones):
node server-modular.js
```

## Upgrade Strategy
1. Settings module → Feature control panel (Phase 2)
2. Print system → Tally + BillDesk + multi-size themes (Phase 3)
3. Indian Compliance → E-invoicing, E-way bill, Banking, Payroll (Phase 4)
4. Accounting → Day Book, Ledgers, Vouchers, P&L (Phase 5)

---

## Phase 2 — Settings Module Overhaul (CURRENT PRIORITY)

### 2.1 New Settings Schema
```json
{
  "company": { "name", "address", "gstin", "pan", "state", "phone", "email", "website", "bank", "logo_path" },
  "features": {
    "enabled_modules": ["repairs", "sales", "purchases", "inventory", "customers", "suppliers", "locations", "technicians", "users", "settings", "reports", "pos", "quotations", "delivery_challans", "compliance", "accounting", "banking", "payroll", "audit"],
    "repair_ticket_prefix": "RCP", "invoice_prefix": "INV", "quotation_prefix": "QT",
    "purchase_order_prefix": "PO", "delivery_challan_prefix": "DC",
    "auto_generate_numbers": true, "enable_credit_limit_check": true,
    "enable_low_stock_alerts": true, "enable_warranty_tracking": true,
    "enable_delivery_challan": true, "enable_pos": true,
    "enable_eway_bill": false, "enable_e_invoicing": false,
    "enable_gstr1": true, "enable_gstr3b": true,
    "enable_banking": false, "enable_payroll": false,
    "enable_accounting": false, "enable_multi_company": false
  },
  "print": {
    "default_size": "a4",
    "default_theme": "default",
    "available_sizes": ["a4", "a5", "letter", "legal", "thermal-80mm", "thermal-58mm", "half-a4", "barcode-80x150"],
    "available_themes": ["default", "minimal", "compact", "modern", "classic", "tally", "billdesk", "thermal"],
    "show_print_options": true, "auto_open_print_dialog": false,
    "show_hsn_in_print": true, "show_gstin_in_print": true,
    "show_authorized_signature": false
  },
  "tax": { "gst_enabled", "gst_rates", "default_gst_rate", "igst_enabled", "cess_enabled" },
  "invoice": { "prefix", "next_number", "due_days", "terms_conditions", "show_terms_on_print" },
  "quotation": { "prefix", "next_number", "validity_days", "terms_conditions" },
  "pos": { "receipt_footer", "auto_confirm", "cash_payment_label", "card_payment_label", "upi_payment_label" },
  "numbering": { "invoice_next", "quotation_next", "po_next", "dc_next", "repair_next", "voucher_next" },
  "notifications": { "enable_email", "smtp_host", "smtp_port", "sms_provider", "enable_whatsapp" },
  "backup": { "auto_backup", "backup_frequency", "backup_retention_days" },
  "accounting": { "financial_year_start", "accounting_method", "enable_day_book", "enable_ledgers", "enable_pnl", "enable_balance_sheet" }
}
```

### 2.2 Settings UI Enhancement
- Add "Features" tab — toggle each module on/off
- Add "Print" enhancements — Tally/BillDesk theme previews
- Add "Numbering" tab — configure prefixes per document type
- Add "Notifications" tab — email/SMS/WhatsApp config
- Add "Backup" tab — auto-backup settings

### 2.3 Feature Gate Middleware
Wire `requireFeature()` to EVERY route based on settings.

```js
app.get('/repairs', requireAuth, requireFeature('repairs'), handler);
```

---

## Phase 3 — Print System Redesign

### 3.1 Paper Sizes
| Size | Dimensions | Use Case |
|------|-----------|----------|
| A4 | 210×297mm | Invoice, Quotation, DC |
| A5 | 148×210mm | Small invoice |
| Letter | 216×279mm | US format |
| Legal | 216×356mm | Long invoice |
| Thermal 80mm | 80mm×auto | POS receipt |
| Thermal 58mm | 58mm×auto | Mini receipt |
| Half A4 | 105×297mm | Delivery challan |
| Barcode 80×150 | Label size | Product label |

### 3.2 Print Themes (Add to print-themes.css)
**TALLY theme** — matches TallyPrime exact style:
- Header: "Tax Invoice" in bold
- Column layout: specific widths matching Tally
- HSN summary at bottom
- "For [Company]" authorized signatory
- Rupees In Words
- Tally-style terms

**BILLDESK theme** — bold, retail-friendly:
- Large company name centered
- Bold borders
- Emphasis on totals
- QR code placeholder

**THERMAL theme** — for POS printers:
- No borders
- Monospace font
- 58mm/80mm @page size
- Compact layout

### 3.3 Print Architecture
Every print route gets:
```
?size=a4&theme=modern
```
Defaults come from settings. Dropdown on every print page to change.

---

## Phase 4 — Indian Compliance

### 4.1 E-Invoicing (IRN)
New tables:
```sql
e_invoices (id, invoice_id, irn, ack_no, ack_date, qr_code, signed_invoice, status, cancelled_at)
```

Features:
- Generate IRN via NIC API (sandbox)
- QR code with IRN + seller/buyer GSTIN + invoice value
- Cancel IRN (within 24hrs)
- Fallback: mark as "Manual E-Invoice" if API unavailable

### 4.2 E-Way Bill
New table: `eway_bills (id, challan_id, ewb_no, ewb_date, ewb_valid_upto, distance, status)`

Features:
- Generate via EWB API
- Auto-calculate distance between pincodes
- Vehicle/driver tracking
- Cancel EWB

### 4.3 Banking Integration
New table: `bank_transactions (id, date, description, amount, type, reconciled, reference_id)`

Features:
- Import bank statement (CSV/Excel)
- Auto-match with invoices
- Bank reconciliation dashboard
- Outstanding cheques tracking

### 4.4 Payroll Module
New tables: `employees`, `salary_structures`, `payroll_runs`, `attendance`

Features:
- Employee master
- Salary structure (basic, HRA, DA, PF, ESI, TDS)
- Attendance tracking
- Payroll run → salary slips
- PF/ESI challan generation
- TDS deduction

---

## Phase 5 — Accounting Module

### 5.1 Chart of Accounts (COA)
```sql
accounts (id, code, name, type, parent_id, opening_balance, opening_balance_type, is_active)
```
Default COA hierarchy (Indian standard):
- Assets: Bank, Cash, Debtors, Inventory, Fixed Assets
- Liabilities: Creditors, GST Payable, TDS Payable, Loans
- Income: Sales, Service Income, Other Income
- Expenses: Purchases, Salary, Rent, Utilities

### 5.2 Double-Entry Vouchers
```sql
vouchers (id, number, type, date, narration, total, status, created_by, approved_by)
voucher_entries (id, voucher_id, account_id, description, debit, credit)
```

Types: Payment, Receipt, Contra, Journal, Debit Note, Credit Note

### 5.3 Auto-Journal Generation
- Sales Invoice → Dr Debtors, Cr Sales, Cr GST Payable
- Payment Received → Dr Bank, Cr Debtors
- Purchase → Dr Purchases, Cr Creditors

### 5.4 Reports
- Ledger (Trial Balance for one account)
- Day Book (all vouchers date-wise)
- Cash Book / Bank Book
- Trading Account
- P&L Statement
- Balance Sheet
- Ratio Analysis

### 5.5 Audit Trail
```sql
audit_logs (id, user_id, action, module, record_id, old_values, new_values, ip, created_at)
```
Track every create/update/delete across all modules.

---

## Execution Order
1. ✅ Project structure (Phase 1)
2. 🔄 Settings Features tab (Phase 2) — NEXT
3. Print themes (Phase 3)
4. Indian compliance (Phase 4)
5. Accounting (Phase 5)

Each phase is tested independently before moving to next.

---

## File Reference
| File | Purpose | Lines |
|------|---------|-------|
| `server-modular.js` | New thin entry point | 90 |
| `server.js` (backup: server-backup.js) | Current working monolith | 5024 |
| `config/settings.js` | All settings management | 205 |
| `config/database.js` | DB connection + pool | 45 |
| `middleware/feature.js` | Feature gate per module | 18 |
| `models/*.js` | 15 model files | ~800 total |
| `routes/*.js` | 18 route files | ~1200 total |
| `IMPLEMENTATION_PLAN.md` | This file | — |

Backup the original `server.js` before switching to `server-modular.js`.
