# HiSecure ERP v1.0 Restoration Audit

This document provides a comprehensive audit of the user experience (UX), user interface (UI), and workflow divergences between the current React/Fastify implementation and the original Express/EJS HiSecure ERP v1.0.

---

## 1. Main Navigation & Layout

### Original v1.0 Implementation (EJS/Bootstrap)
* **Navbar**:
  - Gradient header (`linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)`).
  - Search bar in navbar (`action="/search"`) allowing global search across customers, parts, and repairs.
  - Dropdown in navbar showing authenticated user's full name, email, role badge (`admin`, `technician`, etc.), profile link, and logout button.
* **Sidebar**:
  - Vertical layout with a gradient background (`linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)`).
  - Navigation icons using Bootstrap Icons (`bi-*`).
  - Dynamic badges showing `stats.new_repairs` (Red) next to Repairs and `stats.low_stock` (Warning) next to Products.
  - Menu options: Dashboard, Repairs, Invoices, POS, Quotations, CRM, Products, Suppliers, Purchase Orders, Delivery Challan, Customers, Technicians, Locations, Users, Reports, Settings, Payroll, Accounting, Banking, Companies.
* **Footer**:
  - Centered copyright notice (`&copy; 2026 Hi Secure Solutions - LED TV & CCTV Service Center`) with white background and top border.

### Current Implementation (React/Tailwind)
* **Topbar**:
  - Simple flat background header with a basic user info string and a logout form.
  - No global search bar.
* **Sidebar**:
  - Flat grey/white layout using Lucide React icons.
  - No notifications/count badges (such as low stock or new repairs) on the navigation items.
  - Missing several modules in the menu.

### Differences & UI/Workflow Regressions
* **Regressions**: Loss of dynamic notification badges on navigation items. Loss of global search bar in the navbar.
* **UI Regressions**: Sidebar and topbar are flat and generic compared to the original blue gradient layouts.

---

## 2. Dashboard

### Original v1.0 Implementation
* **KPI Cards**:
  - Structured 3D card deck with custom hover transitions (`transform: translateY(-6px) scale(1.02)`, glass-effect overlays, and colored stats icons).
  - Displays: Active Repairs (Blue), New Repairs (Warning), Customers (Info), Low Stock (Danger), Completed Month Count + Revenue (Success), Pending Invoices + Awaiting Revenue (Warning), 30-Day Revenue (Green), Low Stock Items (Info).
  - Stretched links pointing to corresponding listings (e.g. clicking "New Repairs" card goes to `/repairs?status=received`).
* **Visuals**:
  - 6-month Revenue Overview bar chart rendered with Chart.js using custom blue coloring.
  - Quick Actions column showing links to New Invoice, New Quotation, New Repair, Add Customer, and New Purchase Order.
* **Recent Records**:
  - Two side-by-side tables: Recent Repairs (5 rows with Ticket, Customer, Product, Status badge, Age in shop) and Recent Invoices (5 rows with Invoice number, Customer, Amount, Status badge, Date).

### Current Implementation
* **KPI Cards**:
  - Simple, flat cards showing Total, In Progress, Completed, and Delivered counts.
  - Lacks revenue details, pending invoices, completed month stats, and direct navigation links.
* **Visuals**:
  - Single line chart spanning the width. Lacks the Quick Actions sidebar.
  - Lacks Recent Repairs and Recent Invoices tables.

### Differences & UI/Workflow Regressions
* **Workflow Regressions**: Users cannot quickly perform core actions (New Repair, Add Customer) or check list details by clicking the KPI cards.
* **Information Density**: Significant reduction in density. Original dashboard showed recent repairs, invoices, and multiple KPI metrics, whereas the current one shows only basic counts and a line chart.

---

## 3. Customer Directory

### Original v1.0 Implementation
* **List Screen**:
  - Multi-select checkboxes with a bulk-delete action (`Delete Selected` count).
  - Export to Excel button calling `/customers/export`.
  - Detailed table showing Name, Phone, GSTIN, Type, Total Repairs, Lifetime Value, Actions (View, Edit, Delete).
  - Clean pagination.
* **Dedicated Screens**:
  - Separate pages for View Details (`/customers/:id`), Edit Customer (`/customers/:id/edit`), and Add Customer (`/customers/new`).
  - View Details page contains a sidebar of customer properties, a KPI box for stats (Total Repairs, Lifetime Value), a Repair History table, a Sales Invoices table, a Quotations table, a Notes & Interactions timeline with an inline note addition form, and a Credit Limit Adjustment modal.

### Current Implementation
* **List Screen**:
  - Table shows only Name, Phone, City, and Type.
  - Lacks GSTIN, Total Repairs, and Lifetime Value columns.
  - Lacks bulk-delete, select checkbox, and Excel export.
  - Add and Edit operations are performed inside a generic modal instead of dedicated pages.
* **Dedicated Screens**:
  - No customer details page exists. History, invoices, notes, and credit adjustments are entirely inaccessible.

### Differences & UI/Workflow Regressions
* **Workflow Regressions**: Users cannot view a customer's repair history, invoices, or add notes. Bulk actions and Excel exports are completely broken.
* **UI Regressions**: High information density table replaced by a sparse, column-light layout.

---

## 4. Repair Workshop

### Original v1.0 Implementation
* **List Screen**:
  - Header actions: New Repair button, Export to Excel button, and a status button group (All, Received, In Repair, Ready, Completed).
  - Table showing Ticket, Customer, Contact (Phone), Product (Type & Brand), Serial Number, Status badge, Received Date, Est. Cost, Actions (View).
* **Dedicated Screens**:
  - Separate page for details (`/repairs/:id`), edit (`/repairs/:id/edit`), and print invoice.
  - Details page shows customer info, product parameters, problem descriptions, notes, and payments.

### Current Implementation
* **List Screen**:
  - Standard table showing ticket, customer, phone, product, brand, status, cost, technician, days.
  - Lacks Serial Number column in list.
  - Filters are in a dropdown instead of the original button groups.
  - Lacks Excel export.
* **Dedicated Screens**:
  - Uses a pop-up modal for detail view, using tab layouts for Details, Parts, Payments, and Actions.

### Differences & UI/Workflow Regressions
* **Workflow Regressions**: Lacks status-segmented quick button group filters. Lacks Excel export.
* **UI Regressions**: Serial number and quick filters are missing or altered.

---

## 5. Products & Inventory

### Original v1.0 Implementation
* **List Screen**:
  - Table columns: Part Number, Name, HSN Code, Stock, Reorder Level, Selling Price, Actions.
  - Export to Excel and print options.
* **Dedicated Screens**:
  - Separate routes for New Product, Edit Product, and Details.

### Current Implementation
* **List Screen**:
  - Simple table without export or print actions.

### Differences & UI/Workflow Regressions
* **Workflow Regressions**: Lacks print/export features.

---

## 6. Quotations, Invoices, & Document Prefixes

### Original v1.0 Implementation
* **Forms & Billing**:
  - Standard document numbers generated dynamically based on settings prefixes.
  - Separate dedicated pages for creation with dense item input grids.

### Current Implementation
* **Forms & Billing**:
  - Missing prefixes or settings linkages in several routes.

---

## 7. AMC & Service Tickets

### Original v1.0 Implementation
* Was not part of the core v1.0 EJS view folder (these were implemented during Phase A in React).

### Current Implementation
* Modern React views.

### Regressions
* Workflows in React differ in density and structure from the standard EJS list/detail page layout patterns.
