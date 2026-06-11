# HiSecure ERP — API Migration Roadmap

**Goal:** Expose 100% of existing ERP functionality through Fastify `/api/*` routes so the React SPA can fully replace the legacy EJS interface.

**Principle:** Zero business logic duplication. All Fastify route handlers import existing model functions from `models/` and return `{ok, data}` JSON. No SQL in route files.

---

## Migration Pattern

Every Express route file follows this pattern:
```
Express middleware → model function → res.render(EJS) or res.json()
```

Every Fastify route wrapper follows this pattern:
```
requireAuth + authorizeModule('x') → model function → reply.send({ok:true, data})
```

### Template for a new Fastify route file

```javascript
const { requireAuth } = require('../middleware/fastify-auth');
const { authorizeModule } = require('../middleware/fastify-rbac');
const mod = require('../models/module-name');

function register(fastify) {
  // LIST
  fastify.get('/api/module', {
    preHandler: [requireAuth, authorizeModule('module')]
  }, async (req) => {
    const data = await mod.listFunction(req.query);
    return { ok: true, data };
  });

  // GET ONE
  fastify.get('/api/module/:id', {
    preHandler: [requireAuth, authorizeModule('module')]
  }, async (req) => {
    const item = await mod.getByIdFunction(req.params.id);
    if (!item) return { ok: false, error: 'Not found' };
    return { ok: true, data: item };
  });

  // CREATE
  fastify.post('/api/module', {
    preHandler: [requireAuth, authorizeModule('module')]
  }, async (req) => {
    const result = await mod.createFunction(req.body);
    return { ok: true, data: result };
  });

  // UPDATE
  fastify.put('/api/module/:id', {
    preHandler: [requireAuth, authorizeModule('module')]
  }, async (req) => {
    const result = await mod.updateFunction(req.params.id, req.body);
    return { ok: true, data: result };
  });

  // DELETE
  fastify.delete('/api/module/:id', {
    preHandler: [requireAuth, authorizeModule('module')]
  }, async (req) => {
    await mod.deleteFunction(req.params.id);
    return { ok: true };
  });
}

module.exports = register;
```

---

## Phase 1 — Core Business (P0)

These are the 7 modules the user specified. They generate revenue or are operationally critical.

### 1.1 Repairs Workshop → `routes/fastify-repairs.js`

**Express source:** `routes/repairs.js` (13 endpoints), `models/repairs.js` (31 functions)

| Express Route | HTTP | Model Function | Fastify Route |
|--------------|------|----------------|--------------|
| GET /repairs | GET | `getActiveRepairs()` | `GET /api/repairs?status=&date_from=&date_to=` |
| GET /repairs/recent | GET | `getRecentRepairs()` | `GET /api/repairs/recent` |
| GET /repairs/by-status/:status | GET | `getRepairsByStatus()` | `GET /api/repairs/by-status/:status` |
| GET /repairs/brands | GET | `getBrands()` | `GET /api/repairs/brands` |
| GET /repairs/technicians | GET | `getActiveTechnicians()` | `GET /api/repairs/technicians` |
| GET /repairs/:id | GET | `getRepairById()` | `GET /api/repairs/:id` |
| GET /repairs/:id/parts | GET | `getRepairParts()` | `GET /api/repairs/:id/parts` |
| GET /repairs/:id/payments | GET | `getRepairPayments()` | `GET /api/repairs/:id/payments` |
| POST /repairs | POST | `createRepair()` | `POST /api/repairs` |
| PUT /repairs/:id | PUT | `updateRepair()` | `PUT /api/repairs/:id` |
| PUT /repairs/:id/status | PUT | `updateRepairStatus()` | `PUT /api/repairs/:id/status` |
| POST /repairs/:id/parts | POST | `addPartToRepair()` | `POST /api/repairs/:id/parts` |
| POST /repairs/:id/payments | POST | `addPaymentToRepair()` | `POST /api/repairs/:id/payments` |
| DELETE /repairs/:id | DELETE | `deleteRepair()` | `DELETE /api/repairs/:id` |

**New endpoints for React UI (not in Express):**
- `PUT /api/repairs/:id/assign-tech` — assign technician to repair
- `GET /api/repairs/stats` — repair stats (uses DB aggregate)

**DB Tables:** repairs, repair_parts, repair_payments, customers, parts, technicians
**RBAC:** `technician, admin` (techs see own, admin sees all)
**Model:** `models/repairs.js` — all functions ready to import
**Estimated effort:** 1 day (copy-paste from Express, change res->reply)

---

### 1.2 Parts / Inventory → `routes/fastify-parts.js`

**Express source:** `routes/parts.js` (11 endpoints), `models/parts.js` (11 functions)

| Express Route | HTTP | Model Function | Fastify Route |
|--------------|------|----------------|--------------|
| GET /parts | GET | `getAllParts()` | `GET /api/parts?brand=&category=&low_stock=` |
| GET /parts/stats | GET | `getPartsStats()` | `GET /api/parts/stats` |
| GET /parts/brands | GET | `getBrands()` | `GET /api/parts/brands` |
| GET /parts/:id | GET | `getPartById()` | `GET /api/parts/:id` |
| POST /parts | POST | `createPart()` | `POST /api/parts` |
| PUT /parts/:id | PUT | `updatePart()` | `PUT /api/parts/:id` |
| DELETE /parts/:id | DELETE | `deletePart()` | `DELETE /api/parts/:id` |
| POST /parts/bulk-delete | POST | `bulkDeleteParts()` | `POST /api/parts/bulk-delete` |
| GET /parts/:id/repairs | GET | `getPartRepairs()` | `GET /api/parts/:id/repairs` |
| GET /parts/:id/delivery-challans | GET | `getPartDeliveryChallans()` | `GET /api/parts/:id/delivery-challans` |
| PUT /parts/:id/stock | PUT | `updateStock()` | `PUT /api/parts/:id/stock` |

**New endpoints:**
- `GET /api/parts?low_stock=true` — filter for reorder alerts
- `PUT /api/parts/:id/price` — update cost/selling price separately

**DB Tables:** parts, brands, repair_parts, po_items, dc_items
**RBAC:** `inventory_manager, admin`
**Model:** `models/parts.js`
**Estimated effort:** 1 day

---

### 1.3 Quotations → `routes/fastify-quotations.js`

**Express source:** `routes/quotations.js` (9 endpoints), `models/quotations.js` (8 functions)

| Express Route | HTTP | Model Function | Fastify Route |
|--------------|------|----------------|--------------|
| GET /quotations | GET | `getQuotations()` | `GET /api/quotations?status=&customer_id=` |
| GET /quotations/:id | GET | `getQuotationById()` | `GET /api/quotations/:id` |
| GET /quotations/active-customers | GET | `getActiveCustomersForQuotation()` | `GET /api/quotations/active-customers` |
| GET /quotations/parts | GET | `getPartsForQuotation()` | `GET /api/quotations/parts` |
| GET /quotations/next-number | GET | (inline) | `GET /api/quotations/next-number` |
| POST /quotations | POST | `createQuotation()` | `POST /api/quotations` |
| PUT /quotations/:id | PUT | `updateQuotation()` | `PUT /api/quotations/:id` |
| PUT /quotations/:id/status | PUT | `updateQuotationStatus()` | `PUT /api/quotations/:id/status` |
| POST /quotations/:id/convert | POST | `convertQuotationToInvoice()` | `POST /api/quotations/:id/convert` |

**DB Tables:** quotations, quotation_items, customers, parts
**RBAC:** `sales, admin`
**Model:** `models/quotations.js`
**Estimated effort:** 0.5 day

---

### 1.4 Purchase Orders → `routes/fastify-purchases.js`

**Express source:** `routes/purchases.js` (6 endpoints), `models/purchases.js` (7 functions)

| Express Route | HTTP | Model Function | Fastify Route |
|--------------|------|----------------|--------------|
| GET /purchases | GET | `getPurchaseOrders()` | `GET /api/purchases?status=&supplier_id=` |
| GET /purchases/:id | GET | `getPurchaseOrderById()` | `GET /api/purchases/:id` |
| GET /purchases/active-suppliers | GET | `getActiveSuppliers()` | `GET /api/purchases/suppliers` |
| GET /purchases/active-parts | GET | `getActivePartsForPurchase()` | `GET /api/purchases/parts` |
| GET /purchases/next-number | GET | (inline) | `GET /api/purchases/next-number` |
| POST /purchases | POST | `createPurchaseOrder()` | `POST /api/purchases` |
| PUT /purchases/:id/status | PUT | (inline markOrdered) | `PUT /api/purchases/:id/status` |

**New endpoints:**
- `PUT /api/purchases/:id/receive` — mark items as received (good receipt)
- `POST /api/purchases/:id/convert-to-invoice` — convert PO to vendor invoice

**DB Tables:** purchase_orders, po_items, suppliers, parts, stores
**RBAC:** `inventory_manager, admin`
**Model:** `models/purchases.js`
**Estimated effort:** 0.5 day

---

### 1.5 Delivery Challans → `routes/fastify-deliveryChallans.js`

**Express source:** `routes/deliveryChallans.js` (8 endpoints), `models/deliveryChallans.js` (5 functions)

| Express Route | HTTP | Model Function | Fastify Route |
|--------------|------|----------------|--------------|
| GET /delivery-challans | GET | `getDeliveryChallans()` | `GET /api/delivery-challans` |
| GET /delivery-challans/:id | GET | `getDeliveryChallanById()` | `GET /api/delivery-challans/:id` |
| GET /delivery-challans/next-number | GET | (inline) | `GET /api/delivery-challans/next-number` |
| POST /delivery-challans | POST | `createDeliveryChallan()` | `POST /api/delivery-challans` |
| PUT /delivery-challans/:id/status | PUT | `updateDeliveryChallanStatus()` | `PUT /api/delivery-challans/:id/status` |
| POST /delivery-challans/:id/return | POST | `addReturn()` | `POST /api/delivery-challans/:id/return` |

**DB Tables:** delivery_challans, dc_items, dc_returns, customers, locations, parts
**RBAC:** `inventory_manager, sales, admin`
**Model:** `models/deliveryChallans.js`
**Estimated effort:** 0.5 day

---

### 1.6 User Management → `routes/fastify-users.js`

**Express source:** `routes/users.js` (6 endpoints), `models/users.js` (9 functions)

| Express Route | HTTP | Model Function | Fastify Route |
|--------------|------|----------------|--------------|
| GET /users | GET | `getUsers()` | `GET /api/users?role=&active=` |
| GET /users/:id | GET | `getUserById()` | `GET /api/users/:id` |
| GET /users/username/:un | GET | `getUserByUsername()` | `GET /api/users/username/:un` |
| POST /users | POST | `createUser()` | `POST /api/users` |
| PUT /users/:id | PUT | `updateUser()` | `PUT /api/users/:id` |
| DELETE /users/:id | DELETE | `deactivateUser()` | `DELETE /api/users/:id` |

**New endpoints:**
- `PUT /api/users/:id/password` — change password
- `GET /api/users/roles` — list available roles + permissions

**DB Tables:** users, roles, permissions
**RBAC:** `admin` only
**Model:** `models/users.js`
**Estimated effort:** 0.5 day

---

### 1.7 Reports → `routes/fastify-reports.js`

**Express source:** `routes/reports.js` (2 endpoints), `models/reports.js` (14 functions)

| Express Route | HTTP | Model Function | Fastify Route |
|--------------|------|----------------|--------------|
| GET /reports | GET | `getMonthlyRevenue()` | `GET /api/reports/revenue/monthly` |
| GET /reports/stats | GET | `getStats()` | `GET /api/reports/stats` |
| (new) | GET | `getTopTechnicians()` | `GET /api/reports/top-technicians` |
| (new) | GET | `getTopParts()` | `GET /api/reports/top-parts` |
| (new) | GET | `getGSTR1Data()` | `GET /api/reports/gstr1/:month` |
| (new) | GET | `getGSTR3BData()` | `GET /api/reports/gstr3b/:month` |
| (new) | GET | `getPendingInvoices()` | `GET /api/reports/pending-invoices` |
| (new) | GET | `getSalesRevenue()` | `GET /api/reports/sales-revenue` |
| (new) | GET | `getTopCustomers()` | `GET /api/reports/top-customers` |
| (new) | GET | `getLowStockParts()` | `GET /api/reports/low-stock` |
| (new) | GET | `getCompletedRepairsThisMonth()` | `GET /api/reports/completed-repairs` |

**DB Tables:** sales_invoices, parts, repairs, technicians, audit_logs, users
**RBAC:** `all roles` (reports accessible to everyone)
**Model:** `models/reports.js`
**Estimated effort:** 1 day

---

## Phase 2 — High-Value Business (P1)

These modules are needed for full ERP parity.

### 2.1 Customers → `routes/fastify-customers.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getAllCustomers()` | `GET /api/customers` |
| `getCustomerById()` | `GET /api/customers/:id` |
| `getCustomerByPhone()` | `GET /api/customers/phone/:phone` |
| `createCustomer()` | `POST /api/customers` |
| `updateCustomer()` | `PUT /api/customers/:id` |
| `deleteCustomer()` | `DELETE /api/customers/:id` |
| `bulkDeleteCustomers()` | `POST /api/customers/bulk-delete` |
| `getCustomerRepairs()` | `GET /api/customers/:id/repairs` |
| `getCustomerInvoices()` | `GET /api/customers/:id/invoices` |
| `getCustomerQuotations()` | `GET /api/customers/:id/quotations` |
| `quickCreateCustomer()` | `POST /api/customers/quick` |
| `exportCustomersCSV()` | `GET /api/customers/export/csv` |

**New:**
- `GET /api/customers/search?q=term` — autocomplete for forms

**DB Tables:** customers
**RBAC:** `sales, admin`
**Model:** `models/customers.js`
**Estimated effort:** 1 day

---

### 2.2 Sales / Invoices → `routes/fastify-invoices.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getSalesInvoices()` | `GET /api/invoices?payment_status=` |
| `getInvoiceById()` | `GET /api/invoices/:id` |
| `createInvoice()` | `POST /api/invoices` |
| `updateInvoice()` | `PUT /api/invoices/:id` |
| `updateInvoiceStatus()` | `PUT /api/invoices/:id/status` |
| `updateInvoicePaymentStatus()` | `PUT /api/invoices/:id/payment` |
| `issueInvoice()` | `POST /api/invoices/:id/issue` |
| `getActiveCustomers()` | `GET /api/invoices/active-customers` |
| `getActiveParts()` | `GET /api/invoices/parts` |

Plus same endpoints from `models/sales.js`.
**New:**
- `POST /api/invoices/:id/return` — create sales return
- `GET /api/invoices/:id/pdf` — generate invoice PDF

**DB Tables:** sales_invoices, sales_invoice_items, payments, customers, parts
**RBAC:** `sales, admin`
**Model:** `models/invoices.js` + `models/sales.js`
**Estimated effort:** 2 days

---

### 2.3 Service Tickets → `routes/fastify-service-tickets.js`

**Express source uses model from registers but no Express routes. Fastify already has 17 endpoints.**

| Model Function | Status |
|---------------|--------|
| `logTicketActivity()` | ❌ No Fastify wrapper |
| `getTickets()` | ✅ GET /api/service-tickets |
| `getTicketById()` | ✅ |
| `getTicketByNumber()` | ✅ |
| `createTicket()` | ✅ |
| `updateTicket()` | ✅ |
| `deleteTicket()` | ✅ |
| `getTicketParts()` | ❌ No Fastify wrapper |
| `addTicketPart()` | ✅ |
| `deleteTicketPart()` | ❌ No Fastify wrapper |
| `getTicketStats()` | ✅ |
| `getActiveTechnicians()` | ✅ |
| `getRecentTickets()` | ❌ No Fastify wrapper |

**Gaps to fill:** 5 endpoint gaps (logTicketActivity, getTicketParts, deleteTicketPart, getRecentTickets)
**Estimated effort:** 0.5 day

---

### 2.4 Customer Assets → `routes/fastify-customer-assets.js`

**Fastify exists with 8 endpoints. Express route NOT registered.**

| Model Function | Status |
|---------------|--------|
| `getAssets()` | ✅ |
| `getAssetById()` | ✅ |
| `getAssetBySerial()` | ✅ |
| `getAssetsByCustomer()` | ❌ No Fastify wrapper |
| `getAssetStats()` | ✅ |
| `getAssetStatsByCustomer()` | ❌ No Fastify wrapper |
| `getAssetTypes()` | ✅ |
| `createAsset()` | ✅ |
| `updateAsset()` | ✅ |
| `setAssetStatus()` | ❌ No Fastify wrapper |
| `deleteAsset()` | ✅ |
| `searchAssets()` | ❌ No Fastify wrapper |

**Gaps to fill:** 5 endpoint gaps
**Estimated effort:** 0.5 day

---

## Phase 3 — Supporting Modules (P2)

### 3.1 Accounting → `routes/fastify-accounting.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getCOA()` | `GET /api/accounting/coa` |
| `getAccountById()` | `GET /api/accounting/accounts/:id` |
| `getAccountByCode()` | `GET /api/accounting/accounts/code/:code` |
| `createAccount()` | `POST /api/accounting/accounts` |
| `updateAccount()` | `PUT /api/accounting/accounts/:id` |
| `deleteAccount()` | `DELETE /api/accounting/accounts/:id` |
| `getVouchers()` | `GET /api/accounting/vouchers` |
| `getVoucherById()` | `GET /api/accounting/vouchers/:id` |
| `createVoucher()` | `POST /api/accounting/vouchers` |
| `getLedger()` | `GET /api/accounting/ledger/:account_id` |
| `getTrialBalance()` | `GET /api/accounting/trial-balance` |
| `getPnL()` | `GET /api/accounting/reports/pnl` |
| `getBalanceSheet()` | `GET /api/accounting/reports/balance-sheet` |

**DB Tables:** accounts, chart_of_accounts, vouchers, voucher_entries
**RBAC:** `accountant, admin`
**Model:** `models/accounting.js`
**Estimated effort:** 1 day

---

### 3.2 Banking → `routes/fastify-banking.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getBankAccounts()` | `GET /api/banking/accounts` |
| `getBankAccountById()` | `GET /api/banking/accounts/:id` |
| `createBankAccount()` | `POST /api/banking/accounts` |
| `updateBankAccount()` | `PUT /api/banking/accounts/:id` |
| `getTransactions()` | `GET /api/banking/transactions` |
| `getTransactionById()` | `GET /api/banking/transactions/:id` |
| `createTransaction()` | `POST /api/banking/transactions` |
| `updateTransaction()` | `PUT /api/banking/transactions/:id` |
| `getReconciliationStats()` | `GET /api/banking/reconciliation` |
| `importBankStatement()` | `POST /api/banking/import-statement` |

**DB Tables:** bank_accounts, bank_transactions, reconciliations
**RBAC:** `accountant, admin`
**Model:** `models/banking.js`
**Estimated effort:** 1 day

---

### 3.3 Payroll → `routes/fastify-payroll.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `listEmployees()` | `GET /api/payroll/employees` |
| `getEmployeeById()` | `GET /api/payroll/employees/:id` |
| `createEmployee()` | `POST /api/payroll/employees` |
| `updateEmployee()` | `PUT /api/payroll/employees/:id` |
| `deleteEmployee()` | `DELETE /api/payroll/employees/:id` |
| `getSalaryStructure()` | `GET /api/payroll/salary-structure/:id` |
| `listSalaryStructures()` | `GET /api/payroll/salary-structures` |
| `upsertSalaryStructure()` | `POST /api/payroll/salary-structures` |
| `listAttendance()` | `GET /api/payroll/attendance` |
| `upsertAttendance()` | `POST /api/payroll/attendance` |
| `createPayrollRun()` | `POST /api/payroll/run` |
| `getPayrollRunById()` | `GET /api/payroll/runs/:id` |
| `listPayrollRuns()` | `GET /api/payroll/runs` |
| `updatePayrollRun()` | `PUT /api/payroll/runs/:id` |

**DB Tables:** employees, salary_structures, attendance, payroll_runs
**RBAC:** `admin, accountant`
**Model:** `models/payroll.js`
**Estimated effort:** 1.5 days

---

### 3.4 CRM → `routes/fastify-crm.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getLeads()` | `GET /api/crm/leads` |
| `getLeadById()` | `GET /api/crm/leads/:id` |
| `createLead()` | `POST /api/crm/leads` |
| `updateLead()` | `PUT /api/crm/leads/:id` |
| `convertLeadToCustomer()` | `POST /api/crm/leads/:id/convert` |
| `getInteractions()` | `GET /api/crm/leads/:id/interactions` |
| `addInteraction()` | `POST /api/crm/interactions` |
| `getFollowUps()` | `GET /api/crm/followups` |
| `createFollowUp()` | `POST /api/crm/followups` |
| `completeFollowUp()` | `PUT /api/crm/followups/:id/complete` |
| `getCRMStats()` | `GET /api/crm/stats` |
| `getPipelineData()` | `GET /api/crm/pipeline` |
| `getActiveUsers()` | `GET /api/crm/users` |
| `getActiveCustomers()` | `GET /api/crm/customers` |

**DB Tables:** crm_leads, interactions, follow_ups, customers, users
**RBAC:** `sales, admin`
**Model:** `models/crm.js`
**Estimated effort:** 1 day

---

### 3.5 Stores → `routes/fastify-stores.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `listStores()` | `GET /api/stores` |
| `getStoreById()` | `GET /api/stores/:id` |
| `getActiveStores()` | `GET /api/stores/active` |
| `createStore()` | `POST /api/stores` |
| `updateStore()` | `PUT /api/stores/:id` |
| `deleteStore()` | `DELETE /api/stores/:id` |

**DB Tables:** stores, store_transfers, parts
**RBAC:** `inventory_manager, admin`
**Model:** `models/stores.js`
**Estimated effort:** 0.5 day

---

### 3.6 Suppliers → `routes/fastify-suppliers.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getSuppliers()` | `GET /api/suppliers` |
| `getSupplierById()` | `GET /api/suppliers/:id` |
| `createSupplier()` | `POST /api/suppliers` |
| `updateSupplier()` | `PUT /api/suppliers/:id` |
| `deactivateSupplier()` | `DELETE /api/suppliers/:id` |
| `getSupplierDeliveryChallans()` | `GET /api/suppliers/:id/delivery-challans` |

**DB Tables:** suppliers
**RBAC:** `inventory_manager, admin`
**Model:** `models/suppliers.js`
**Estimated effort:** 0.5 day

---

### 3.7 Locations → `routes/fastify-locations.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getLocations()` | `GET /api/locations` |
| `getLocationById()` | `GET /api/locations/:id` |
| `createLocation()` | `POST /api/locations` |
| `updateLocation()` | `PUT /api/locations/:id` |
| `deactivateLocation()` | `DELETE /api/locations/:id` |
| `getLocationStats()` | `GET /api/locations/:id/stats` |

**DB Tables:** locations
**RBAC:** `admin, inventory_manager`
**Model:** `models/locations.js`
**Estimated effort:** 0.5 day

---

### 3.8 GST / India → `routes/fastify-india.js`

| Model Function | Fastify Route |
|---------------|--------------|
| (inline GST logic from Express) | `GET /api/india/gstr1/:month` |
| (inline GST logic from Express) | `GET /api/india/gstr3b/:month` |
| issueInvoice with IRN | `POST /api/invoices/:id/einvoice` |
| eway_bill logic | `POST /api/invoices/:id/eway-bill` |

**DB Tables:** sales_invoices, e_invoice_logs, eway_bill_logs, audit_logs
**RBAC:** `accountant, admin`
**Model:** `models/invoices.js` + inline GST logic
**Estimated effort:** 1.5 days

---

### 3.9 POS → `routes/fastify-pos.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getActiveParts()` | `GET /api/pos/parts` |
| `getActiveCustomers()` | `GET /api/pos/customers` |
| `getPartStock()` | `GET /api/pos/parts/:id/stock` |
| `deductStock()` | `POST /api/pos/checkout` |
| `createInvoice()` via sales model | POST (internal) |

**DB Tables:** sales_invoices, parts, customers, pos_sessions, pos_sales
**RBAC:** `sales, admin`
**Model:** `models/pos.js` + `models/sales.js`
**Estimated effort:** 1 day

---

### 3.10 Companies → `routes/fastify-companies.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `listCompanies()` | `GET /api/companies` |
| `getCompanyById()` | `GET /api/companies/:id` |
| `getActiveCompany()` | `GET /api/companies/active` |
| `createCompany()` | `POST /api/companies` |
| `updateCompany()` | `PUT /api/companies/:id` |
| `deleteCompany()` | `DELETE /api/companies/:id` |

**DB Tables:** companies, users, settings
**RBAC:** `admin` only
**Model:** `models/companies.js`
**Estimated effort:** 0.5 day

---

### 3.11 Settings → `routes/fastify-settings.js`

| Model Function | Fastify Route |
|---------------|--------------|
| `getSettings()` | `GET /api/settings` |
| `updateSetting()` | `PUT /api/settings/:key` |
| `getFeatureFlags()` | `GET /api/settings/features` |

**DB Tables:** settings
**RBAC:** `admin` only
**Model:** `models/settings.js`
**Estimated effort:** 0.5 day

---

### 3.12 Complaint module Fastify fix

`routes/complaints.js` has a Fastify route file with 10 endpoints. Verify it imports the correct model and has RBAC. The model functions in `models/complaints.js` are comprehensive (11 functions). Confirm all are exposed.

**Estimated effort:** 0.5 day

---

## Phase 3 — Backend-First Features (P3)

These require new model logic or complex business rules.

### 3.13 AMC enhancements

Current AMC Fastify covers CRUD on contracts, assets, visits. Missing:
- `GET /api/amc/expiring` — AMCs expiring in 30/60/90 days (for dashboard alerts)
- `POST /api/amc/renew` — renew an AMC contract (creates new contract, marks old as expired)

**Estimated effort:** 0.5 day

---

### 3.14 Global Search → `routes/fastify-search.js`

**Express:** `models/search.js` with `globalSearch()` only
**Fastify needed:** `GET /api/search?q=term` with unified search across customers, parts, repairs, quotations, service tickets, AMC.

**DB Tables:** All customer-visible tables
**RBAC:** `all roles`
**Estimated effort:** 1 day

---

## Registration in `server-fastify.js`

Each new route file needs ONE line added:

```javascript
// In server-fastify.js registerApiRoutes():
require('./routes/fastify-repairs')(fastify);
require('./routes/fastify-parts')(fastify);
require('./routes/fastify-quotations')(fastify);
require('./routes/fastify-purchases')(fastify);
require('./routes/fastify-deliveryChallans')(fastify);
require('./routes/fastify-users')(fastify);
require('./routes/fastify-reports')(fastify);
require('./routes/fastify-customers')(fastify);
require('./routes/fastify-invoices')(fastify);
require('./routes/fastify-service-tickets')(fastify);
require('./routes/fastify-customer-assets')(fastify);
require('./routes/fastify-accounting')(fastify);
require('./routes/fastify-banking')(fastify);
require('./routes/fastify-payroll')(fastify);
require('./routes/fastify-crm')(fastify);
require('./routes/fastify-stores')(fastify);
require('./routes/fastify-suppliers')(fastify);
require('./routes/fastify-locations')(fastify);
require('./routes/fastify-india')(fastify);
require('./routes/fastify-pos')(fastify);
require('./routes/fastify-companies')(fastify);
require('./routes/fastify-settings')(fastify);
require('./routes/fastify-complaints')(fastify);
require('./routes/fastify-search')(fastify);
```

---

## Summary Timeline

| Phase | Modules | Endpoints | Effort |
|-------|---------|-----------|--------|
| Phase 1 (P0) | Repairs, Parts, Quotations, POs, DC, Users, Reports | ~75 endpoints | 5 days |
| Phase 2 (P1) | Customers, Sales/Invoices, Service Tickets (gaps), Customer Assets (gaps) | ~55 endpoints | 5.5 days |
| Phase 3 (P2) | Accounting, Banking, Payroll, CRM, Stores, Suppliers, Locations, GST, POS, Companies, Settings, Complaints fix, Search | ~80 endpoints | 9 days |
| **Total** | **23 modules** | **~210 endpoints** | **~19.5 days** |

---

## Migration Execution Rules

1. **Create ONE route file per module** — no combining modules into one file
2. **Copy route patterns from Express** — preserve URL structure where possible (`/api/repairs` mirrors `/repairs`)
3. **Import existing model functions directly** — do NOT copy model code into route files
4. **Always use `authorizeModule(moduleName)`** — never hardcode role arrays in routes
5. **Return `{ok: true, data}`** on success, `{ok: false, error}` on failure
6. **Add route file** to `server-fastify.js` registration, **do NOT remove Express routes** yet
7. **Run tests after each module** — verify no existing functionality broken
8. **Only after all modules migrated** will Express routes be deprecated
