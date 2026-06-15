# HiSecure ERP — Complete Architecture Specification

This document details the complete systems architecture, codebase design patterns, technology stack, relational schema models, security layers, and data workflows of the HiSecure ERP software.

---

## 1. System Topology & Data Flow

HiSecure ERP runs as a fully decoupled client-server architecture serving client static assets under wildcard routes in production:

```mermaid
graph TD
    subgraph SPA [React Client Application - Port 3009]
        Vite["Vite Build / Engine"]
        ReactRouter["React Router v7 (Client SPA Routes)"]
        Components["React UI Elements (Tailwind CSS v4)"]
        Axios["Axios API Client (Credentials + Cookies)"]
        
        Components --> ReactRouter
        ReactRouter --> Axios
    end

    subgraph API [Express Backend Application - Port 3009]
        ExpressCore["Express Server Core"]
        AuthMiddleware["JWT & DB-Driven RBAC Auth Middleware"]
        RouteControllers["REST Route Handlers (routes/*)"]
        Services["Business Services Layer (services/*)"]
        Repositories["Prisma Repositories Layer (repositories/*)"]
        Prisma["Prisma Client v6 (ORM)"]
        
        ExpressCore --> AuthMiddleware
        AuthMiddleware --> RouteControllers
        RouteControllers --> Services
        Services --> Repositories
        Repositories --> Prisma
    end

    subgraph Data [Data Layer]
        PGSQL[(PostgreSQL Database)]
        Prisma --> PGSQL
    end

    Axios -- HTTP JSON Requests (Token Cookies) --> ExpressCore
```

---

## 2. Directory Layout & Module Structure

The project directory represents a React + Express TypeScript workspace:

```
erp-app/
├── client/                     # Frontend SPA (Vite + TS)
│   ├── dist/                   # Compiled static HTML/JS/CSS assets served in production
│   ├── src/
│   │   ├── main.tsx            # SPA Client bootstrap entry point
│   │   ├── App.tsx             # Root router, layouts, context providers
│   │   ├── pages/              # Module screens & dashboard panels
│   │   │   ├── Approvals.tsx   # Dashboard to approve/reject PO transactions
│   │   │   ├── ProductDetail.ts# Detail view showing multi-location stock & transfers card
│   │   │   └── Settings.tsx    # Tabbed control panel containing Advanced Audit Log panel
│   │   ├── components/         # Reusable form elements, lists, modals (SInput, FieldRow)
│   │   ├── services/           # Axios config (interceptor handles error codes)
│   │   └── types/              # Frontend TypeScript types (Product, Invoice, etc.)
│   ├── vite.config.ts          # Vite bundler options
│   └── package.json            # Client dependencies (React 19, Tailwind v4, Lucide)
│
├── server/                     # Backend Web API (Node + Express + TS)
│   ├── dist/                   # Transpiled server JS files executed in production
│   ├── src/
│   │   ├── index.ts            # Bootstraps Express, connects Prisma, sets up routing
│   │   ├── middleware/         # Security checks (rate-limit, cors, helmet, RBAC)
│   │   ├── routes/             # Controller layer (routes/invoices.ts, routes/pos.ts)
│   │   ├── services/           # Business logic layer (handles validation & transactions)
│   │   └── repositories/       # ORM data-access wrappers
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema defining the database entities
│   │   └── migrations/         # PostgreSQL schema migration histories
│   ├── package.json            # Server dependencies (Express, Prisma, helmet, jwt)
│   └── tsconfig.json           # Server TypeScript build compiler options
│
├── start-production.bat        # Windows Batch startup script (serves on port 3009)
├── start-production.ps1        # Windows PowerShell startup script (serves on port 3009)
└── ecosystem.config.js         # PM2 configuration setting environment ports to 3009
```

---

## 3. Database Schema Blueprint

HiSecure ERP houses 17 relational database tables mapped through Prisma to PostgreSQL. Here is the full entity structure:

### 3.1 Core Identity & Organization
* **`users`**: ERP operator login credentials and main roles.
  - `user_id` (PK), `username` (Unique), `email` (Unique), `password_hash`, `full_name`, `role`, `phone`, `is_active`, `last_login`, `created_at`, `updated_at`
* **`brands`**: Brands/manufacturers associated with inventory parts and repairs.
  - `brand_id` (PK), `name` (Unique), `created_at`
* **`suppliers`**: Procurement vendor profile.
  - `supplier_id` (PK), `supplier_code` (Unique), `name`, `contact_person`, `phone`, `email`, `gstin`, `pan`, `address`, `city`, `state`, `pincode`, `is_active`
* **`customers`**: Customer accounting/contact details.
  - `customer_id` (PK), `customer_code` (Unique), `name`, `phone` (Unique), `contact_person`, `email`, `address`, `city`, `state`, `pincode`, `gstin`, `customer_type` ("retail" / "corporate"), `credit_limit`
* **`locations`**: Physical branches, warehouses, or service centers.
  - `location_id` (PK), `location_code` (Unique), `name`, `address`, `phone`, `email`, `gstin`, `is_main`, `is_active`
* **`technicians`**: Technical staff assigned to repair tickets.
  - `technician_id` (PK), `name`, `phone`, `specialization`, `is_active`

### 3.2 Inventory & Stock Management
* **`parts`**: Products master catalog containing tax codes, pricing, and references.
  - `part_id` (PK), `part_number` (Unique), `name`, `description`, `brand_id` (FK), `hsn_code`, `cost_price`, `selling_price`, `tax_rate`, `reorder_level`, `is_active`
* **`part_stocks`**: Multi-location inventory quantities mapping stock levels to warehouses.
  - `part_id` (PK/FK), `location_id` (PK/FK), `quantity` (Current count)
* **`stock_movements`**: Transaction audit trail tracking all stock increments/decrements.
  - `id` (PK), `part_id` (FK), `location_id` (FK), `movement_type` (`IN`, `OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, etc.), `quantity`, `reference_type` (`Invoice`, `PurchaseOrder`, `Repair`, `Transfer`), `reference_id`, `created_at`

### 3.3 Sales & Billing (Sales Invoices)
* **`sales_invoices`**: Tax invoice headers including CGST/SGST/IGST calculations and place of supply.
  - `invoice_id` (PK), `invoice_number` (Unique), `customer_id` (FK), `invoice_date`, `due_date`, `place_of_supply`, `total_amount`, `tax_amount`, `grand_total`, `tax_type`, `cgst_amount`, `sgst_amount`, `igst_amount`, `status` (`draft`, `issued`, `paid`, `cancelled`), `notes`, `created_by` (FK)
* **`sales_invoice_items`**: Line items inside a sales invoice.
  - `item_id` (PK), `invoice_id` (FK), `part_id` (FK), `quantity`, `unit_price`, `tax_rate`, `tax_amount`, `total_amount`, `batch_number`, `serial_numbers` (Array)

### 3.4 Repairs Module
* **`repairs`**: Job cards tracking diagnostic stages, technicians, and repair costs.
  - `repair_id` (PK), `ticket_number` (Unique), `customer_id` (FK), `brand_id` (FK), `product_type`, `serial_number`, `model_number`, `problem_description`, `repair_status` (`received`, `diagnosed`, `awaiting_parts`, `in_repair`, `ready_for_pickup`, `completed`, `cancelled`), `estimated_cost`, `actual_cost`, `assigned_technician_id` (FK), `received_date`, `diagnosed_date`, `repair_start_date`, `completion_date`, `pickup_date`, `warranty_status`, `warranty_expiry`, `notes`
* **`repair_parts`**: Inventory items consumed during a product repair.
  - `repair_part_id` (PK), `repair_id` (FK), `part_id` (FK), `quantity`, `price_charged`, `notes`
* **`payments`**: Records of payments collected against repair jobs.
  - `payment_id` (PK), `repair_id` (FK), `amount`, `payment_method`, `payment_date`, `status`, `notes`

### 3.5 Procurement & Approval Workflows
* **`purchase_orders`**: Procurement records mapping inventory purchase requirements to suppliers.
  - `po_id` (PK), `po_number` (Unique), `supplier_id` (FK), `order_date`, `expected_delivery`, `total_amount`, `status` (`draft`, `pending_approval`, `approved`, `received`, `cancelled`), `notes`, `created_by` (FK)
* **`purchase_order_items`**: Line items containing unit pricing and quantity.
  - `po_item_id` (PK), `po_id` (FK), `part_id` (FK), `quantity`, `unit_price`, `total_amount`, `batch_number`, `expiration_date`
* **`approval_workflows`**: Configuration of workflows per entity type (e.g. `PurchaseOrder`) with threshold constraints.
  - `workflow_id` (PK), `entity_type` (Unique), `threshold` (Amount exceeding this triggers approval), `created_at`, `updated_at`
* **`approval_steps`**: Steps defining which security role must approve a specific step in the sequence.
  - `step_id` (PK), `workflow_id` (FK), `role_id` (FK), `step_number` (Sequence index)
* **`approval_histories`**: Logs documenting every approval step transition (decisions and review comments).
  - `history_id` (PK), `record_id` (Target PO ID), `step_id` (FK), `user_id` (FK), `status` (`approved`, `rejected`), `notes`, `created_at`

### 3.6 Financial Double-Entry Accounting
* **`accounts`**: Chart of Accounts mapping ledger codes.
  - `account_id` (PK), `account_code` (Unique), `account_name`, `account_type` (`asset`, `liability`, `equity`, `revenue`, `expense`), `is_active`
* **`journal_entries`**: Double-entry accounting transaction header.
  - `entry_id` (PK), `entry_date`, `description`, `reference_type` (`Invoice`, `PurchaseOrder`, `POS`, `Payment`), `reference_id`
* **`journal_entry_lines`**: Individual debit or credit ledger lines.
  - `line_id` (PK), `entry_id` (FK), `account_id` (FK), `amount` (Decimal), `entry_type` (`debit`, `credit`)

### 3.7 Security RBAC (Role-Based Access Control)
* **`roles`**: Security user roles (`admin`, `sales`, `technician`, `accountant`, `inventory_manager`).
  - `role_id` (PK), `name` (Unique), `description`
* **`permissions`**: Fine-grained access privileges (e.g. `invoice:create`, `ledger:view`).
  - `permission_id` (PK), `name` (Unique), `description`
* **`role_permissions`**: Joins roles to permissions.
  - `role_id` (FK), `permission_id` (FK) -> Composite PK
* **`user_roles`**: Joins users to their active security roles.
  - `user_id` (FK), `role_id` (FK) -> Composite PK

### 3.8 Audits & Settings
* **`audit_logs`**: Tracks JSON changes (state differences) for parts, invoices, POs, and transfers.
  - `log_id` (PK), `user_id` (FK), `username`, `action` (`CREATE`, `UPDATE`, `DELETE`, `TRANSFER`), `entity_type` ("Parts", "Invoice", etc.), `entity_id`, `old_value` (JSONB state before), `new_value` (JSONB state after), `details` (computed state diffs), `ip_address`, `created_at`
* **`settings`**: Dynamic key-value configuration block using JSONB value storage.
  - `setting_id` (PK), `key` (Unique), `value` (JSONB configuration settings), `updated_at`

---

## 4. Architectural Design Patterns

### 4.1 Service-Repository Layering
Separates Express controllers from Prisma ORM execution to enable mock testing and re-usability:
* **Controller Layer (`server/src/routes/*`)**: Receives JSON request payloads, validates input data format, reads session identity cookies, and delegates call execution directly to the Service Layer.
* **Service Layer (`server/src/services/*`)**: Houses the application's business rules, validates permissions, coordinates multi-row updates, and wraps operations in atomic transactions.
* **Repository Layer (`server/src/repositories/*`)**: Contains database data access commands (Prisma queries) isolated from the controllers.

### 4.2 Transaction Safety & Double-Entry Integration
Every inventory and revenue changing operation runs inside an atomic transaction:

```
                            ┌──────────────────────┐
                            │  Trigger Operations  │
                            │ (Sales / PO / POS)   │
                            └──────────┬───────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │   prisma.$transaction()   │
                         └─────────────┬─────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     ┌─────────────────────┐                       ┌─────────────────────┐
     │  Adjust Stock Level │                       │  Balanced Journal   │
     │   (PartStock)       │                       │  (Dr/Cr Ledger)     │
     └──────────┬──────────┘                       └──────────┬──────────┘
                │                                             │
                ▼                                             ▼
     ┌─────────────────────┐                       ┌─────────────────────┐
     │  StockMovement Log  │                       │   AuditLog Entry    │
     │                     │                       │   (JSON Diff)       │
     └─────────────────────┘                       └─────────────────────┘
```

* **Invoice / POS Checkout**: Atomically decrements the stock from the specified warehouse (`PartStock`), writes a `StockMovement` row, writes a Sales `Invoice`, and posts balanced double-entry accounting records (Debit Cash `101000` or Accounts Receivable `104000`, Credit Sales Revenue `401000`).
* **Self-Correcting Rollbacks**: If a transaction is modified, voided, or deleted, the system uses the inverse operations to rollback the exact inventory counts and post balancing journal reversals.

### 4.3 Computed Audit Diffing
When updates occur in the system, `AuditService` compares the properties of the `oldValue` and `newValue` objects. Any discrepancies are identified, and the modifications are written to the `details` column of the `AuditLog` table using the following schema:
```json
{
  "status": {
    "from": "approved",
    "to": "received"
  },
  "total_amount": {
    "from": 45000.00,
    "to": 55000.00
  }
}
```
In the frontend settings pane, the **Audit Trail** tab compares these values dynamically, displaying a side-by-side color-coded table (Original vs New Values) for enhanced accountability.

---

## 5. Security & Request Verification Pipeline

All routes pass through a pipeline of middleware:

1. **Helmet & Security Headers**: Injects security headers, sets strict Content Security Policy (CSP), and handles cookie protections.
2. **Rate Limiting**: Throttles route calls exceeding 1,000 requests per 15 minutes to defend against basic DDoS/brute-force attacks.
3. **Authentication Guard (`authMiddleware`)**: Reads signed JWT session cookies, decodes signature keys, and sets `req.user` details.
4. **RBAC Permission Guard (`requirePermission(permission)`)**: Looks up user roles from `user_roles` and matches permissions inside `role_permissions`. If unauthorized, throws an HTTP `403 Forbidden` response.
5. **Business Service Layer**: Exposes business constraints and logs audited database states.