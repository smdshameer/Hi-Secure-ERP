# ERP Application Route Map

## Overview
This document provides a comprehensive map of all routes in the ERP application, organized by module. This will help in understanding the current structure and planning enhancements for Indian compliance.

## Authentication Routes
- `GET /login` - Display login page
- `POST /login` - Process login
- `GET /logout` - Logout user

## Dashboard Routes
- `GET /` - Main dashboard with statistics

## Repair Management Routes
- `GET /repairs` - List all repairs with filtering
- `GET /repairs/new` - Display new repair form
- `POST /repairs` - Create new repair
- `GET /repairs/:id` - View repair details
- `GET /repairs/:id/edit` - Edit repair form
- `POST /repairs/:id` - Update repair
- `GET /repairs/:id/print` - Print repair details
- `POST /repairs/:id/status` - Update repair status
- `POST /repairs/:id/assign` - Assign technician to repair
- `POST /repairs/:id/payments` - Add payment to repair
- `POST /repairs/:id/parts` - Add parts to repair

## Customer Management Routes
- `GET /customers` - List all customers
- `GET /customers/new` - Display new customer form
- `POST /customers` - Create new customer
- `GET /customers/export` - Export customers to CSV
- `POST /customers/bulk-delete` - Delete multiple customers
- `GET /customers/:id` - View customer details
- `GET /customers/:id/print` - Print customer details
- `GET /customers/:id/edit` - Edit customer form
- `POST /customers/:id` - Update customer
- `POST /customers/:id/delete` - Delete customer
- `POST /customers/:id/notes` - Add customer notes
- `POST /customers/:id/credit` - Adjust customer credit

## Parts/Inventory Management Routes
- `GET /parts` - List all parts
- `GET /parts/new` - Display new part form
- `POST /parts` - Create new part
- `POST /parts/bulk-delete` - Delete multiple parts
- `GET /parts/export` - Export parts to CSV
- `GET /parts/:id` - View part details
- `GET /parts/:id/print` - Print part details
- `GET /parts/:id/edit` - Edit part form
- `POST /parts/:id` - Update part
- `POST /parts/:id/delete` - Delete part

## Settings Module Routes
- `GET /settings` - View system settings
- `POST /settings/update` - Update settings
- `GET /settings/reset` - Reset settings to defaults

## API Routes (Quick Add)
- `POST /api/customers/quick` - Quick add customer
- `POST /api/parts/quick` - Quick add part

## Sales Invoice Routes
- `GET /sales` - List sales invoices
- `GET /sales/new` - Display new sales invoice form
- `POST /sales` - Create new sales invoice
- `GET /sales/:id` - View sales invoice details
- `GET /sales/:id/edit` - Edit sales invoice form
- `POST /sales/:id` - Update sales invoice
- `GET /sales/:id/print` - Print sales invoice
- `POST /sales/:id/status` - Update sales invoice status
- `GET /sales/:id/delivery-challan` - Create delivery challan from invoice

## Reports Routes
- `GET /reports` - View reports dashboard

## Search Routes
- `GET /search` - Global search across entities

## POS (Point of Sale) Routes
- `GET /pos` - POS interface
- `POST /pos/add-item` - Add item to cart
- `POST /pos/remove-item` - Remove item from cart
- `POST /pos/clear-cart` - Clear shopping cart
- `POST /pos/checkout` - Process POS checkout
- `GET /pos/receipt/:invoiceId` - View POS receipt

## Quotation Routes
- `GET /quotations` - List quotations
- `GET /quotations/new` - Display new quotation form
- `POST /quotations` - Create new quotation
- `GET /quotations/:id` - View quotation details
- `GET /quotations/:id/edit` - Edit quotation form
- `POST /quotations/:id` - Update quotation
- `GET /quotations/:id/print` - Print quotation
- `POST /quotations/:id/convert` - Convert quotation to invoice
- `GET /quotations/:id/status` - Update quotation status

## Delivery Challan Routes
- `GET /delivery-challans` - List delivery challans
- `GET /delivery-challans/new` - Display new delivery challan form
- `POST /delivery-challans` - Create new delivery challan
- `GET /delivery-challans/:id` - View delivery challan details
- `POST /delivery-challans/:id` - Update delivery challan
- `POST /delivery-challans/:id/status` - Update delivery challan status
- `POST /delivery-challans/:id/returns` - Process returns
- `GET /delivery-challans/:id/print` - Print delivery challan

## Planned Enhancements for Indian Compliance

### GST Compliance Features
1. **GST Reports Module**
   - `GET /reports/gstr1` - GSTR-1 report generation
   - `GET /reports/gstr3b` - GSTR-3B report generation
   - `GET /reports/gstr9` - Annual GSTR-9 report
   - `GET /reports/hsn-summary` - HSN-wise summary report

2. **E-Way Bill Integration**
   - `GET /eway-bill/generate` - Generate E-Way bill
   - `POST /eway-bill/cancel` - Cancel E-Way bill
   - `GET /eway-bill/track` - Track E-Way bill status

3. **E-Invoice Module**
   - `POST /e-invoice/generate` - Generate E-Invoice
   - `POST /e-invoice/cancel` - Cancel E-Invoice
   - `GET /e-invoice/status` - Check E-Invoice status

### Additional Indian-Specific Features
1. **Banking Integration**
   - `GET /banking` - Banking dashboard
   - `POST /banking/import` - Import bank statements
   - `GET /banking/reconcile` - Bank reconciliation

2. **Payroll Module**
   - `GET /payroll` - Payroll dashboard
   - `GET /payroll/employees` - Employee payroll details
   - `POST /payroll/process` - Process payroll
   - `GET /payroll/reports` - Payroll reports

3. **Compliance Dashboard**
   - `GET /compliance` - Compliance status overview
   - `GET /compliance/deadlines` - Upcoming compliance deadlines
   - `POST /compliance/acknowledge` - Acknowledge compliance completion

4. **Multi-Company Support**
   - `GET /companies` - Manage multiple companies
   - `POST /companies/switch` - Switch between companies
   - `GET /companies/:id/settings` - Company-specific settings

5. **Audit Trail**
   - `GET /audit` - View audit trail
   - `GET /audit/export` - Export audit trail

## Security and Access Control
All routes will be protected with appropriate role-based access control:
- Admin: Full access to all features
- Sales: Access to sales, customers, quotations
- Technician: Access to repairs, parts
- Accountant: Access to sales, reports, compliance
- Inventory Manager: Access to parts, delivery challans

## Print and Export Enhancements
- `GET /export/:module` - Export data in various formats (PDF, Excel, CSV)
- `GET /print/:module/:id` - Print with Indian compliance formatting