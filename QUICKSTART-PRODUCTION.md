# Quick Start - Production Server with Settings Module

## Prerequisites

- PostgreSQL installed and running
- Node.js dependencies installed (`npm install`)

---

## One-Command Setup (PowerShell)

**Option A: PowerShell (Recommended)**

1. Open **PowerShell** in the `erp-app` folder
2. Run:
   ```powershell
   .\setup-postgresql.ps1
   ```
3. If you get execution policy error, run first:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
   Then try again.

**Option B: Command Prompt (Batch)**

1. Open **Command Prompt** in the `erp-app` folder
2. Run:
   ```cmd
   setup-postgresql.bat
   ```

---

## What the Script Does

1. Checks if `hisecure_erp` database exists, creates it if not
2. Runs `setup-database.sql` to create all tables (including `settings`)
3. Verifies the `settings` table was created
4. Prints next steps

---

## After Running the Script

### 1. Check/Update `.env` file

Open `erp-app/.env` and verify:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hisecure_erp
DB_USER=postgres
DB_PASSWORD=your_postgres_password
PORT=3000
SESSION_SECRET=any-random-string-here
```

If your PostgreSQL has no password, set `DB_PASSWORD=` (blank).

---

### 2. Install Multer (if not already)

```bash
cd erp-app
npm install multer
```

---

### 3. Start Production Server

```bash
cd erp-app
node server.js
```

You should see:
```
✅ Connected to PostgreSQL database
✅ Database initialization complete
Server running at http://localhost:3000
```

---

### 4. Open Browser

Go to: **http://localhost:3000**

Login:
- **Admin**: `admin` / `admin123`
- **Sales**: `sales` / `admin123`
- **Technician**: `technician` / `admin123`
- **Accountant**: `accountant` / `admin123`
- **Inventory Manager**: `inventory_manager` / `admin123`

---

## Test the New Features

✅ **Settings** (`/settings`):
- Company profile with logo upload
- Print configuration (A4/A5/thermal, themes)
- Tax settings (GST rate, IGST)
- Invoice/Quotation/POS settings

✅ **Sales** (`/sales/new`):
- Auto-fill GST rate from settings
- Quick Add Customer modal (creates customer on the fly)
- Quick Add Part modal (creates part on the fly)

✅ **Print** (`/sales/:id/print`):
- Company logo appears
- GST declaration footer
- Uses selected print theme

---

## Troubleshooting

### "psql is not recognized"
PostgreSQL not installed or not in PATH. Install PostgreSQL first.

### "Connection refused"
PostgreSQL service not running. Start it:
- Windows: `Services` → Start `postgresql-x64-*`
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### "Permission denied" on .ps1 file
Run PowerShell as Administrator, or set execution policy:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Port 3000 in use
Either stop the other process or change PORT in `.env` to `3001`, then use `http://localhost:3001`.

---

## Need Help?

Check the memory files:
- `SETTINGS_MODULE_TEST_REPORT.md` - full test report
- `project_settings-module-complete.md` - implementation details
