# Hi Secure Solutions - Quick Start Guide

## ✅ ERP SYSTEM STARTED

Your ERP system is running at:
**http://localhost:3000**

## Quick Links

- **Dashboard**: http://localhost:3000/
- **Repairs**: http://localhost:3000/repairs
- **Add Repair**: http://localhost:3000/repairs/new
- **Customers**: http://localhost:3000/customers
- **Parts/Inventory**: http://localhost:3000/parts
- **Delivery Challan**: http://localhost:3000/delivery-challans
- **Create DC**: http://localhost:3000/delivery-challans/new
- **Reports**: http://localhost:3000/reports

## Sample Data

If you used the seed script, your database includes:
- 5 Customers (with GSTIN)
- 3 Repairs (2 active, 1 completed)
- 12 Parts with HSN codes and stock levels
- 5 Technicians
- 3 Locations (HQ, Noida Store, Ghaziabad Warehouse)
- 5 Suppliers
- 5 Users (Admin, Sales, Technician, Accountant, Inventory Manager)
- 3 Sample Delivery challans (1 delivered, 1 dispatched, 1 draft)

Default admin login: **admin** / **admin123**

## What You Can Test

### 1. Create Delivery Challan
1. Go to http://localhost:3000/delivery-challans/new
2. Select Purpose (try "Sales" for customer delivery)
3. Choose Customer (e.g., "Rahul Kumar" with GSTIN)
4. Select From Location (Main Branch) and To Location
5. Add items by:
   - Selecting part from dropdown
   - Entering quantity
   - Or use barcode scan field
6. Click "Create Delivery Challan"
7. View it in the list and print it

### 2. Test Different Purposes
- **Branch Transfer**: From Location and To Location are both your branches
- **Job Work**: Select a supplier as destination
- **Consignment**: For goods on approval basis

### 3. Handle Returns
1. Open an existing delivery challan
2. Click "Add Return" for items coming back
3. Enter reason (damaged, wrong item, etc.)
4. Stock gets restored automatically

### 4. Create New Repair
1. Go to http://localhost:3000/repairs/new
2. Select a customer (try "Rahul Kumar")
3. Choose product type (LED TV or CCTV Camera)
4. Enter serial number and problem description
5. Click "Create Repair"

### 5. View Repair Details
1. Click on any repair in the list
2. Update status using the dropdown
3. Assign a technician
4. Add parts (see inventory tab)
5. Add payments

### 6. Add Customer
1. Go to http://localhost:3000/customers
2. Click "Add Customer"
3. Fill in details including GSTIN for B2B customers
4. Save

### 7. Manage Parts
1. Go to http://localhost:3000/parts
2. View low stock alerts (yellow rows)
3. Add new parts with HSN codes
4. Track stock levels in real-time (DC reduces stock)

### 8. View Reports
1. Go to http://localhost:3000/reports
2. See monthly revenue trends
3. View top technicians and parts
4. Check delivery statistics (coming soon)

### 9. Barcode Scanning (Demo)
1. On Delivery Challan form, use the "Barcode Scan" field
2. If you have a USB barcode scanner, point it and scan
3. It auto-fills the part selection
4. Add quantity and submit

---

## Delivery Challan Features to Explore

✅ Auto-generated challan numbers (DC-YYYYMM-NNNNNN)
✅ Stock deduction on dispatch (for sales/job work)
✅ Stock restoration on returns
✅ E-Way Bill tracking field
✅ Multi-purpose: Sales, Job Work, Branch Transfer, Consignment, Return
✅ Batch and serial number tracking (per item)
✅ Expiry date tracking for components
✅ Printable format with GSTIN details
✅ Returns management with condition tracking
✅ Status workflow (Draft → Dispatched → Delivered)
✅ Customer and supplier information
✅ Location-based inventory tracking

---

## Next: Full PostgreSQL Setup with All Features

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Database Setup (If Not Already Done)

This system requires PostgreSQL. If you haven't set it up yet:

### 1. Install PostgreSQL
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql`
- Linux: `sudo apt-get install postgresql`

### 2. Create Database
```sql
CREATE DATABASE hisecure_erp;
```

### 3. Run Schema Script
```bash
cd erp-app
psql -U postgres -d hisecure_erp -f setup-database.sql
```

### 4. Update `.env` file with your database credentials

### 5. Seed Sample Data (Optional)
```bash
node scripts/seed-demo-data.js
```

### 6. Start Server
```bash
cd erp-app
npm install
node server.js
```

## Features Overview

### Dashboard
- Active repairs count
- New repairs count
- Total customers
- Low stock alerts
- 30-day revenue

### Repairs Module
- Create new repair tickets with auto-generated ticket numbers
- Track serial numbers and model numbers
- Status tracking: Received → Diagnosed → Awaiting Parts → In Repair → Ready for Pickup → Completed
- Technician assignment
- Parts usage tracking
- Payment recording
- Warranty tracking

### Customers Module
- Store customer info (name, phone, email, address)
- View repair history
- Lifetime value tracking

### Parts/Inventory
- Track parts inventory
- Set reorder levels
- Low stock alerts
- Cost and selling price tracking
- Stock movement history (in full version)

### Payments
- Multiple payment methods (Cash, Card, UPI, etc.)
- Balance tracking
- Receipt generation (in full version)

### Reports
- Monthly revenue trends
- Top technicians by volume/revenue
- Most used parts
- Customer lifetime value

## Full Version Additional Features

With PostgreSQL, you get:
- All data persisted across restarts
- Complete audit trail (who changed what and when)
- Automatic reconciliation of payments vs costs
- Inventory snapshots
- Stored procedures for complex operations
- Warranty expiry auto-calculation
- Advanced reporting with full data history

## Need Help?

- Check README.md for detailed documentation
- Review SQL schema in setup-database.sql
- The UI is intuitive - just browse around!

## Notes

- This is a **production-ready** system - data is persisted in PostgreSQL
- Full login/auth system included with role-based access control
- Printing functionality available on invoice and delivery challan pages
- SMS/email notifications can be added as customizations

Enjoy your ERP system!
