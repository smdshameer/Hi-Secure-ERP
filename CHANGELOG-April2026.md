# ERP Updates - April 2026

## 🎉 What's New

All changes have been applied directly to the existing codebase.

### ✅ Completed Enhancements

#### 1. **GST Compliance** (Major)
- **[NEW]** GSTR-1 Export: `/reports/gstr1` → CSV for outward supplies
- **[NEW]** GSTR-3B Draft: `/reports/gstr3b` → Tax summary by rate
- **[FIXED]** Auto tax rate from part's `tax_rate` (no manual entry)
- **[FIXED]** Place of Supply logic: CGST+SGST vs IGST auto-determination
- **[ADDED]** GST Declaration footer on invoice print
- **[ADDED]** GSTIN format validation on customer/supplier creation

#### 2. **Credit Management**
- **[NEW]** Credit limit enforcement before invoice creation
- Admin can override limits

#### 3. **Settings Module**
- Auto-initialization on first run (no more blank settings)
- Company info, tax rates, print themes pre-configured

---

## 📍 Where to Find New Features

### GSTR-1 Export
1. Login as admin/accountant
2. Go to **Reports** → **GSTR-1**
3. Select month → Click **Export CSV**

### GSTR-3B Draft
1. Login as admin/accountant
2. Go to **Reports** → **GSTR-3B**
3. Select month → View summary table → **Export CSV**

### GST Settings
- **Settings** menu → Configure tax rates, company GSTIN, etc.

### Customer GSTIN Validation
- **Customers** → Add Customer → Enter GSTIN
- Invalid format shows error immediately

### Sales Invoice Improvements
- **Sales** → New Invoice
- When adding items: Tax % auto-fills from part's tax rate
- Place of Supply: State dropdown (auto from customer GSTIN)
- Print invoice: Shows proper GST breakdown (CGST/SGST or IGST)

---

## 🚀 How to Deploy

This system requires PostgreSQL. Follow these steps:

1. **Install PostgreSQL** (if not installed)
   - Windows: https://www.postgresql.org/download/windows/
   - Mac: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. Create database: `createdb -U postgres hisecure_erp`

3. Run schema: `psql -U postgres -d hisecure_erp -f setup-database.sql`

4. Edit `.env` with your database password (DB_PASSWORD)

5. Seed sample data (optional):
   ```bash
   node scripts/seed-demo-data.js
   ```

6. Start server:
   ```bash
   npm install
   node server.js
   ```

Then open: **http://localhost:3000**

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| `server.js` | GST features, validation, reports |
| `views/sales/print.ejs` | Enhanced GST footer |
| `views/reports/gstr1.ejs` | NEW GSTR-1 page |
| `views/reports/gstr3b.ejs` | NEW GSTR-3B page |
| `start-prod.bat` | NEW startup helper |

---

## 🧪 Quick Test Checklist

1. ✅ **GSTIN Validation**: Try creating customer with bad GSTIN
2. ✅ **Auto Tax Rate**: Add item to invoice → tax % should fill automatically
3. ✅ **Place of Supply**: Create invoice → check tax type in DB (CGST_SGST or IGST)
4. ✅ **Print Invoice**: Click Print → see GST declaration
5. ✅ **Reports**: GSTR-1 and GSTR-3B pages accessible to admin/accountant

---

## ❓ Need Help?

If something doesn't work:
1. Check PostgreSQL is running (production)
2. Ensure you restarted the server after changes
3. Clear browser cache (Ctrl+F5)
4. Look at console for error messages
