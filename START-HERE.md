# 🚀 Quick Start - Production Server with Settings

**You are here because you want the FULL FEATURES including Settings, Logo Upload, Quick Add, etc.**

---

## 📋 What You Need

1. **PostgreSQL** installed and running
   - Download: https://www.postgresql.org/download/windows/
   - Installation: ~5 minutes, use defaults
   - Remember: Set password for `postgres` user (or leave blank)

2. **Node.js** already installed (you have it since demo works)

---

## ⚡ One-Command Setup (After PostgreSQL Install)

### **Option 1: Double-Click (Easiest)**

1. Make sure PostgreSQL service is running
2. Double-click: **`start-production.bat`**
3. That's it! Server starts automatically.

---

### **Option 2: PowerShell (Manual)**

Open PowerShell in the `erp-app` folder and run:

```powershell
.\start-production.ps1
```

If you see execution policy error, run this first:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## 🔧 What the Script Does Automatically

- ✅ Checks PostgreSQL is installed and running
- ✅ Creates `hisecure_erp` database if it doesn't exist
- ✅ Runs `setup-database.sql` to create all tables (including `settings`)
- ✅ Creates default `.env` file if missing
- ✅ Installs `multer` package if needed
- ✅ Starts the production server (`node server.js`)

---

## 🌐 After Server Starts

Open your browser:
```
http://localhost:3000
```

Login with:
- **Username**: `admin`
- **Password**: `admin123`

---

## 🎯 Test New Features

1. **Settings**: Click "Settings" in navbar → `/settings`
   - Edit company info
   - **Upload a logo** (Company tab)
   - Change default GST rate
   - Save and see changes

2. **Sales Invoice**: `/sales/new`
   - Click "Add Item" → Tax rate auto-fills (18% from settings)
   - Click "+ Add New Customer" → Quick create customer
   - Click "Add New Part" in modal → Quick create part

3. **Print Invoice**: Create invoice → Click Print
   - See **company logo** at top
   - See **GST declaration** box
   - Print theme applied (A4/Default)

---

## ❌ Common Issues

### "psql is not recognized"
→ PostgreSQL not installed or not in PATH. Install PostgreSQL.

### "Connection refused"
→ PostgreSQL service not running.
   - Press `Win+R`, type `services.msc`
   - Find `postgresql-x64-*` and **Start** it

### "Port 3000 already in use"
→ Another server running. Stop it or use different port:
   - Edit `.env` → Change `PORT=3001`
   - Access: `http://localhost:3001`

### "settings table doesn't exist"
→ Database not set up. The script should have created it. Try running manually:
```bash
psql -U postgres -d hisecure_erp -f setup-database.sql
```

---

## 📁 Files Created for You

| File | Purpose |
|------|---------|
| `start-production.bat` | **Double-click to start everything** (Windows CMD) |
| `start-production.ps1` | Start everything (PowerShell) |
| `setup-postgresql.bat` | Just DB setup (no server start) |
| `setup-postgresql.ps1` | Just DB setup (PowerShell) |
| `QUICKSTART-PRODUCTION.md` | Detailed guide |
| `SETTINGS_MODULE_TEST_REPORT.md` | Test results |

---

## 🆘 Need Help?

1. Check `QUICKSTART-PRODUCTION.md` for detailed troubleshooting
2. Check `SETTINGS_MODULE_TEST_REPORT.md` for what should work
3. Check terminal output for error messages
4. Make sure PostgreSQL service is running (`services.msc`)

---

**Ready? Run `start-production.bat` and enjoy the new settings module! 🎉**
