# Hi Secure Solutions - ERP System

A complete web-based ERP system for LED TV & CCTV service center built with Node.js, Express, PostgreSQL, and Bootstrap 5.

## Features

### Core Modules
- **Dashboard** - Overview of active repairs, new repairs, customers, inventory, and delivery status
- **Repair Management** - Complete service workflow from receipt to pickup
- **Customer Management** - CRM with GSTIN tracking and credit limits
- **Inventory/Parts** - Stock management with HSN codes, reorder alerts, and barcode support
- **Delivery Challan** - Track goods movement for sales, job work, branch transfers, and consignments
- **Sales & Purchase** (coming soon) - Complete sales cycle with GST invoices
- **Payment Tracking** - Multi-mode payment recording
- **Reports & Analytics** - Revenue, GST, inventory, and operational reports
- **Responsive Design** - Works on desktop, tablet, and mobile

### Indian Compliance Features
- ✅ HSN & SAC codes support
- ✅ GST tax structure (CGST/SGST/IGST)
- ✅ E-Way Bill tracking
- ✅ Customer GSTIN validation
- ✅ GST invoice format (coming soon)
- ✅ GSTR-1 & GSTR-3B export ready (coming soon)
- ✅ Reverse charge mechanism support
- ✅ Multiple tax categories (nil, exempt, taxed)

### Modern Features
- ✅ Barcode/QR code scanning
- ✅ Database audit trail
- ✅ Role-based access control (users, roles, permissions)
- ✅ Multi-branch support
- ✅ Batch & serial number tracking
- ✅ Returns management
- ✅ Real-time inventory updates
- ✅ Mobile-friendly interface

## Prerequisites

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)

## Installation

### 1. Install Dependencies

```bash
cd erp-app
npm install
```

### 2. Set Up Database

Create a PostgreSQL database:

```sql
CREATE DATABASE hisecure_erp;
```

Update the `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hisecure_erp
DB_USER=postgres
DB_PASSWORD=yourpassword
PORT=3000
```

### 3. Run SQL Schema

Execute the SQL schema file in your database:

```bash
psql -U postgres -d hisecure_erp -f database-schema.sql
```

### 4. Add Sample Data (Optional)

```bash
psql -U postgres -d hisecure_erp -f sample-data.sql
```

### 5. Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 6. Access the Application

Open browser and go to: **http://localhost:3000**

## Quick Start Guide

### 1. Create Your First Customer
- Go to **Customers** → **Add Customer**
- Fill in customer details
- Save

### 2. Create a Repair Ticket
- Go to **Repairs** → **New Repair**
- Select customer, enter product details
- Save

### 3. Add Parts to Repair
- Open the repair detail
- Click **Add Part** button
- Select parts and quantities

### 4. Record Payments
- On repair detail page, click **Add Payment**
- Enter amount and payment method

### 5. Track Progress
- Update repair status (Received → Diagnosed → In Repair → Ready → Completed)
- Assign technicians as needed

## Default Users/Data

The system starts with empty data. You can:
- **No default login** - System is open by default
- **Add technicians** through database or future admin panel

## File Structure

```
erp-app/
├── server.js              # Main application entry
├── package.json           # Dependencies
├── .env                   # Environment variables (create from .env.example)
├── public/                # Static files
│   └── js/
│       └── app.js         # Client-side JavaScript
└── views/                 # EJS templates
    ├── layout.ejs         # Main layout
    ├── dashboard.ejs      # Dashboard page
    ├── repairs/
    │   ├── list.ejs       # Repairs list
    │   ├── detail.ejs     # Repair details
    │   └── new.ejs        # New repair form
    ├── customers/
    │   ├── list.ejs       # Customers list
    │   └── new.ejs        # New customer form
    ├── parts/
    │   ├── list.ejs       # Parts inventory
    │   └── new.ejs        # New part form
    └── reports.ejs        # Analytics page
```

## Database Schema

The system uses the following main tables:
- `customers` - Customer information
- `repairs` - Repair tickets
- `technicians` - Technician details
- `parts` - Inventory parts
- `repair_parts` - Parts used in repairs (junction table)
- `payments` - Payment records
- `payments_reconciliation` - Payment reconciliation
- `*_audit` - Audit trail tables for all major entities

## Development

### Adding a New Page

1. Create route in `server.js`
2. Create EJS view in `views/` directory
3. Update navigation in `views/layout.ejs`

### Styling

Uses Bootstrap 5.3 with custom CSS in `views/layout.ejs`. Modify as needed.

## Troubleshooting

**Database connection error:**
- Check PostgreSQL is running
- Verify credentials in `.env`
- Ensure database exists

**Port already in use:**
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill -9` (Mac/Linux)

**Pages not loading:**
- Check console for errors
- Ensure all dependencies installed: `npm install`
- Clear browser cache

## Security Notes

**For Production:**
- Change `SESSION_SECRET` in `.env`
- Set `cookie: { secure: true }` for HTTPS
- Add authentication middleware
- Implement user roles and permissions
- Use prepared statements (already in use)
- Enable HTTPS
- Set up database backups

## License

Private - Hi Secure Solutions

## Support

Contact: support@hisecuresolutions.com
