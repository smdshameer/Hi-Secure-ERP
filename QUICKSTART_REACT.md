# HiSecure ERP — React + TypeScript Upgrade: Quick Setup Guide

## Architecture (3 Servers Running Side by Side)

| Service | Port | Purpose |
|---------|------|---------|
| Express + EJS | 3004 | **Existing production app** (UNCHANGED) |
| Express + TS + Prisma | 3005 | **New API backend** (Phase 1) |
| React + Vite | 5173 | **New React frontend** (Phase 2) |

During migration, all 3 run simultaneously:
- Users keep using EJS on port 3004 (no downtime)
- React dev on 5173 connects to TS API on 3005
- Both share the **same PostgreSQL database**

---

## Step 1 — Install Server Dependencies

```bash
cd erp-app/server
npm install
npx prisma generate
```

Then run the Prisma migration to sync the schema with your existing database:
```bash
npx prisma db push
```

If you prefer to let Prisma generate a migration instead:
```bash
npx prisma migrate dev --name init
```

---

## Step 2 — Install Client Dependencies

```bash
cd erp-app/client
npm install
```

---

## Step 3 — Seed the Database (First Time Only)

You need at least one admin user to login:

```bash
cd erp-app/server
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function seed() {
  const hash = await bcrypt.hash('admin123', 12);
  await prisma.user.create({ data: { username: 'admin', email: 'admin@hisecure.com', password_hash: hash, full_name: 'System Admin', role: 'admin' } });
  console.log('Admin user created: admin / admin123');
  process.exit(0);
}
seed();
"
```

---

## Step 4 — Run Everything

### Terminal 1 — Existing EJS App (port 3004) — NO CHANGES
```bash
cd erp-app
node server.js
```

### Terminal 2 — New TS API Server (port 3005)
```bash
cd erp-app/server
npm run dev
# Or: npx ts-node-dev --respawn --transpile-only src/index.ts
```

### Terminal 3 — React Dev Server (port 5173)
```bash
cd erp-app/client
npm run dev
```

---

## Step 5 — Test

1. Open http://localhost:5173 → React login page
2. Login with `admin` / `admin123`
3. You'll see the React Dashboard
4. Existing EJS app still runs on http://localhost:3004

---

## What's Built So Far

### Backend (server/src/routes/)
- ✅ `auth.ts` — Login/register with JWT
- ✅ `dashboard.ts` — Dashboard stats API
- ✅ `repairs.ts` — Full CRUD + status transitions
- ✅ `customers.ts` — Full CRUD
- ✅ `parts.ts` — Full CRUD + stock management + stats
- ✅ `invoices.ts` — Full CRUD with GST breakdown
- ✅ `quotations.ts` — Full CRUD
- ✅ `purchases.ts` — Purchase orders CRUD
- ✅ `suppliers.ts` — Full CRUD
- ✅ `deliveryChallans.ts` — Full CRUD
- ✅ `technicians.ts` — CRUD
- ✅ `locations.ts` — CRUD
- ✅ `users.ts` — CRUD
- ✅ `reports.ts` — Sales, repairs, inventory reports
- ✅ `settings.ts` — Key-value settings store
- ✅ `payroll.ts` — CRUD
- ✅ `accounting.ts` — CRUD
- ✅ `banking.ts` — CRUD
- ✅ `companies.ts` — CRUD
- ✅ `crm.ts` — CRM contacts CRUD
- ✅ `pos.ts` — POS sessions + transactions

### Frontend (client/src/pages/)
- ✅ Login page
- ✅ Dashboard with stats + chart
- ✅ Repairs (full CRUD + status dropdown)
- ✅ Invoices (full CRUD + line items + GST)
- ✅ POS (cart, checkout, payment modes)
- ✅ Quotations (line items, discounts)
- ✅ CRM (contacts pipeline)
- ✅ Products/Parts (inventory management)
- ✅ Suppliers
- ✅ Purchase Orders
- ✅ Delivery Challans
- ✅ Customers
- ✅ Technicians
- ✅ Locations
- ✅ Users (role-based)
- ✅ Reports (multi-tab)
- ✅ Settings (company, print, tax config)

### Shared Design
- Navy blue (#1a3480) sidebar matching your current ERP
- Lucide icons (same style as Tabler)
- Tailwind CSS with custom brand colors
- Responsive data tables with modals

---

## Notes

- Your **existing EJS app is completely untouched** — it keeps running on port 3004
- The new TS API on 3005 connects to the **same PostgreSQL database** — zero data migration needed
- When both are working, gradually switch pages from EJS → React
- Keep EJS as fallback until you're 100% happy with React