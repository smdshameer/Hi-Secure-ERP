# HiSecure ERP v1.0 Restoration Plan

This plan outlines the priority, requirements, dependencies, and estimated effort to restore the React/Fastify client to look, feel, and operate exactly like the original HiSecure ERP v1.0.

---

## 1. Dashboard (Priority 1)

### What must be restored:
* **KPI Row**: Restore the 8-card grid layout with the custom Bootstrap cards (Active Repairs, New Repairs, Customers, Low Stock, Completed Month count+revenue, Pending Invoices count+amount, 30-Day Revenue, Low Stock Items).
* **Revenue Overview**: Restore the Bar Chart (Chart.js) matching the 6-month aggregate overview.
* **Quick Actions Column**: Re-introduce the side-column with the five quick links (New Invoice, New Quotation, New Repair, Add Customer, New Purchase Order).
* **Recent Records Table**: Re-introduce the two side-by-side tables (Recent Repairs, Recent Invoices) with original columns.

### Estimated Effort:
* **Frontend**: 1 day (Rebuilding Dashboard layout & cards, styling).
* **Backend APIs**: 0.5 days (Already optimized `/api/dashboard` payload returns almost all required properties).

### Dependencies:
* None.

---

## 2. Navigation & Layout (Priority 2)

### What must be restored:
* **Navbar**: Restore blue gradient, global search bar, and user profile/logout dropdown.
* **Sidebar**: Restore blue gradient, Bootstrap icons, menu list hierarchy, and count badges (`stats.new_repairs` and `stats.low_stock`).
* **Footer**: Center copyright layout with top border.

### Estimated Effort:
* **Frontend**: 1 day (Update `AppShell`, `Sidebar`, and `Topbar` styling, add badge logic).
* **Backend APIs**: 0.5 days (Provide badges counts on global session or layout APIs).

### Dependencies:
* Dashboard API (for sidebar counts).

---

## 3. Customers Page (Priority 3)

### What must be restored:
* **List Page**:
  - Add select checkboxes, bulk delete button, and Excel export button.
  - Restore columns: Name, Phone, GSTIN, Type, Total Repairs, Lifetime Value.
* **Dedicated Routes**:
  - Create separate pages/routes for Customer details (`/customers/:id`), Create Customer (`/customers/new`), and Edit Customer (`/customers/:id/edit`).
  - **Details Page**: Create the multi-tab detailed view showing Customer Information, Statistics, Repair History, Sales Invoices, Quotations, Notes timeline (with adding capability), and Credit Limit Adjustment.

### Estimated Effort:
* **Frontend**: 2 days (Creating sub-routes, list/detail views, note timeline, credit limit modal).
* **Backend APIs**: 1 day (Implement bulk-delete, Excel export, and credit adjustments APIs).

### Dependencies:
* Navigation / Routing setup.

---

## 4. Repairs Page (Priority 4)

### What must be restored:
* **List Page**:
  - Add quick status filter button group (All, Received, In Repair, Ready, Completed).
  - Add Export to Excel.
  - Restore columns: Ticket, Customer, Contact, Product, Serial Number, Status, Received, Est. Cost.
* **Dedicated Routes**:
  - Create separate routes/pages for Repairs details (`/repairs/:id`), Create (`/repairs/new`), and Edit (`/repairs/:id/edit`).

### Estimated Effort:
* **Frontend**: 1.5 days.
* **Backend APIs**: 0.5 days (Excel export endpoint).

### Dependencies:
* Customer routing structure.

---

## 5. Inventory & Products (Priority 5)

### What must be restored:
* **List Page**:
  - Restore columns: Part Number, Name, HSN Code, Stock, Reorder Level, Selling Price.
  - Add print and Excel export.
* **Dedicated Routes**:
  - Separate pages for creation, edit, and details.

### Estimated Effort:
* **Frontend**: 1 day.
* **Backend APIs**: 0.5 days.

### Dependencies:
* None.

---

## 6. Quotations (Priority 6)

### What must be restored:
* Dedicated routes for Quotation creation, edit, and print templates.
* Restore original grid inputs and formatting.

### Estimated Effort:
* **Frontend**: 1.5 days.

### Dependencies:
* Customer selection API.

---

## 7. AMC & Service Tickets (Priority 7 & 8)

### What must be restored:
* Match the visual layout and page-based listing/detail patterns of the restored customer and repair screens (instead of inline tab modals).

### Estimated Effort:
* **Frontend**: 2 days.

### Dependencies:
* None.

---

## 8. Reports (Priority 9)

### What must be restored:
* Restore GSTR-1 and GSTR-3B tax report views and Excel download functionality.

### Estimated Effort:
* **Frontend**: 1 day.
* **Backend APIs**: 1 day.

### Dependencies:
* None.

---

## 9. Administration / Settings / Users (Priority 10)

### What must be restored:
* Restoring EJS Settings structure inside the React `SettingsPage`.

### Estimated Effort:
* **Frontend**: 1 day.

### Dependencies:
* Settings API (completed).
