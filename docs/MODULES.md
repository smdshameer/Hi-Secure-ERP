# HiSecure ERP — Modules Documentation

This guide provides details on each functional module in HiSecure ERP v2.0.0.

---

## 1. CRM (Customer Relationship Management)

*   **Purpose**: Manages early-stage customer lifecycles, lead qualification, and pipeline opportunities.
*   **Key Features**:
    *   **Lead Capturing**: Records contact detail inputs (First Name, Last Name, Company, Email, Phone, Status).
    *   **Opportunities Tracker**: Tracks estimated deals, stage progress (`NEW`, `QUALIFIED`, `PROPOSED`, `WON`, `LOST`), and expected close dates.
    *   **Follow-up Alerts**: Automatically notifies sales agents of pending follow-ups.
*   **Data Models**: `Lead`, `Opportunity`, `CrmContact`.

---

## 2. Customer Management

*   **Purpose**: Serves as the central directory for active clients, contact logs, and transaction profiles.
*   **Key Features**:
    *   **Customer Directory**: Tracks codes, addresses, tax compliance indicators (GSTIN), and contact points.
    *   **Credit Limit Enforcement**: Restricts POS and credit invoice creations if a customer's unpaid balances exceed their predefined credit limit.
    *   **Asset Mappings**: Keeps a ledger of serial-numbered items deployed at the customer's locations.
*   **Data Models**: `Customer`.

---

## 3. Inventory & Warehouse Management

*   **Purpose**: Tracks product catalog items, multi-location stock balances, bin-level details, and stock transfers.
*   **Key Features**:
    *   **Barcode Scanning**: Provides lookup services using `@zxing/library` to match items during purchases and sales.
    *   **Bin Allocation**: Tracks Zone-Rack-Shelf-Bin coordinates using `WarehouseLocation` mappings to minimize pickup search times.
    *   **Stock Transfer Orders**: Tracks inventory movements between locations (DRAFT -> APPROVED -> IN_TRANSIT -> COMPLETED).
    *   **Cycle Counting**: Automates stock count verification to catch variance errors.
*   **Data Models**: `Parts`, `PartStock`, `WarehouseLocation`, `BinStock`, `StockMovement`, `StockTransfer`, `CycleCount`.

---

## 4. Sales & POS (Point of Sale)

*   **Purpose**: Processes over-the-counter checkouts, credit terms invoicing, and customer return operations.
*   **Key Features**:
    *   **POS Invoicing Sessions**: Registers opening cash, tracks payment methods (`CASH`, `UPI`, `CARD`), and validates totals.
    *   **Quotation Conversion**: Converts customer quotations into invoices with one click.
    *   **Immutable Ledgers**: Finished invoices generate lock flags that prevent modifications to the transaction lines.
*   **Data Models**: `SalesInvoice`, `SalesInvoiceItems`, `SalesReturn`, `PosSession`, `PosTransaction`, `Quotation`.

---

## 5. GST Billing Engine

*   **Purpose**: Calculates tax liabilities and outputs transaction records matching government formats.
*   **Key Features**:
    *   **Automated Tax Determination**: Distinguishes CGST/SGST (Intra-state sales) from IGST (Inter-state sales) based on the place of supply and company registration.
    *   **HSN Code Registry**: Stores 8-digit HSN codes and matching tax rates for all products.
    *   **Export Formats**: Provides spreadsheet templates for GSTR-1 and GSTR-3B filings.
*   **Data Models**: `SalesInvoiceItems`, `GstTransaction` (mapped via Journal Entry Lines).

---

## 6. Purchase & Procurement

*   **Purpose**: Manages vendor relationships, purchase requisitions, PO approval hierarchies, and Goods Receipt Notes (GRN).
*   **Key Features**:
    *   **Requisition Workflows**: Permits staff to submit purchase requests, route them through approval steps based on cost thresholds, and generate POs.
    *   **Goods Receipt Note (GRN)**: Tracks orders against actual deliveries, counting damaged, short, or excess items.
    *   **Weighted Average Cost (WAC)**: Recalculates cost basis values in real-time when new inventory is received.
*   **Data Models**: `Supplier`, `PurchaseRequisition`, `PurchaseOrder`, `GoodsReceiptNote`, `PartCostHistory`.

---

## 7. Service & Repair Management

*   **Purpose**: Coordinates repair shop ticketing, field service jobs, technician assignments, and repair updates.
*   **Key Features**:
    *   **Ticket Lifecycle**: Tracks status from `received` -> `diagnosed` -> `awaiting_parts` -> `in_repair` -> `ready_for_pickup` -> `completed`.
    *   **Parts Consumption**: Automatically deducts service parts from inventory when technician logs indicate they were used.
    *   **Customer Signatures**: Stores URLs of client sign-off signatures for completed jobs.
*   **Data Models**: `Repair`, `RepairParts`, `ServiceJob`, `TechnicianAssignment`, `ServiceVisit`, `ServiceResolution`.

---

## 8. AMC (Annual Maintenance Contracts)

*   **Purpose**: Manages recurring service contracts, device maintenance schedules, and SLA compliance.
*   **Key Features**:
    *   **Asset Coverage**: Links customer assets, warranty windows, and serial numbers to a contract.
    *   **Automatic Visit Scheduling**: Generates service visit logs at set intervals (e.g., quarterly or bi-annually).
    *   **Expiry Alerts**: Sends notifications to staff before contracts expire.
*   **Data Models**: `AmcContract`, `AmcAsset`, `AmcVisitSchedule`.

---

## 9. Complaints & Ticketing Portal

*   **Purpose**: Processes customer complaints, assigns support tickets, and monitors response times.
*   **Key Features**:
    *   **Portal Sync APIs**: Exposes APIs for external customer portal integrations.
    *   **SLA Clocks**: Tracks response times from when a ticket is opened to when a technician is assigned.
    *   **Technician Feed**: Pulls ticket updates in real-time onto technician mobile terminals.
*   **Data Models**: `ServiceJob`, `ServiceVisit`.

---

## 10. Asset Manager

*   **Purpose**: Tracks enterprise inventory, tools, and high-value customer equipment under maintenance.
*   **Key Features**:
    *   **Equipment Profiles**: Stores serial numbers, purchase dates, warranty codes, and location mappings.
    *   **Service History**: Links repair tickets and maintenance visits to the asset profile.
*   **Data Models**: `Parts`, `AmcAsset`.

---

## 11. Reports Engine

*   **Purpose**: Provides administrative reports on sales, inventory, and financials.
*   **Key Features**:
    *   **Financial Reports**: Generates ledgers, balance sheets, and trial balances.
    *   **Inventory Reports**: Lists low-stock alerts, valuation records, and inventory age metrics.
    *   **Format Exports**: Supports exporting reports as Excel spreadsheets (`.xlsx`) or printable PDFs (`pdfkit`).
*   **Data Models**: Reads data from `SalesInvoice`, `JournalEntryLine`, `PartStock`.

---

## 12. Auditor Dashboard

*   **Purpose**: Monitors system health and audits system changes.
*   **Key Features**:
    *   **System Health Monitor**: Monitors CPU usage, RAM allocation, DB latency, Redis status, and active background queues.
    *   **Security Logs**: Records logins, failed authentication attempts, permission changes, and catalog rollbacks.
    *   **Audit Detail Views**: Displays side-by-side JSON diffs comparing old and new values for changes.
*   **Data Models**: `AuditLog`, `SystemHealthLog`, `IntegrityAuditRun`.
