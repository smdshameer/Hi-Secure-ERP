# HiSecure ERP — Architecture Audit Matrix

**Date:** 2026-06-04
**Purpose:** Every existing module, its Express coverage, Fastify coverage, React UI coverage, and database tables used.

---

## Matrix

| # | Module | DB Tables | Express Routes | Express Endpoints | Fastify API? | React UI? | Accessible from React? |
|---|--------|-----------|---------------|-------------------|--------------|-----------|------------------------|
| 1 | Customers | customers | `/customers` | 11 | ❌ No | ✅ customers-page.tsx | ❌ Cannot fetch data |
| 2 | Products | brands, parts | `/parts` | 11 | ❌ No | ✅ products-page.tsx | ❌ Cannot fetch data |
| 3 | Inventory | parts, stores, store_transfers | `/parts`, `/stores` | 18 | ❌ No | ❌ No page | ❌ No |
| 4 | Sales Invoices | sales_invoices, sales_invoice_items, payments | `/sales`, `/invoices` | 16 | ❌ No | ✅ sales-page.tsx | ❌ Read-only stub |
| 5 | Purchase Orders | purchase_orders, po_items | `/purchases` | 6 | ❌ No | ❌ No page | ❌ No |
| 6 | Quotations | quotations, quotation_items | `/quotations` | 9 | ❌ No | ❌ No page | ❌ No |
| 7 | Delivery Challans | delivery_challans, dc_items, dc_returns | `/deliveryChallans` | 8 | ❌ No | ❌ No page | ❌ No |
| 8 | Repairs Workshop | repairs, repair_parts, repair_payments | `/repairs` | 13 | ❌ No | ❌ No page | ❌ No |
| 9 | Customer Assets | customer_assets, asset_photos | None registered* | 0 | ✅ 8 endpoints | ✅ customer-assets-page.tsx | ✅ Yes |
| 10 | Complaints | complaints, complaint_updates | None registered* | 0 | ✅ 10 endpoints | ✅ complaints-page.tsx | ✅ Yes |
| 11 | Service Tickets | service_tickets, st_parts, st_activities | None registered* | 0 | ✅ 17 endpoints | ✅ service-tickets-page.tsx | ✅ Yes |
| 12 | AMC | amc_contracts, amc_assets, amc_visits | None registered* | 0 | ✅ 14 endpoints | ✅ amc-page.tsx | ✅ Yes |
| 13 | Technician Scheduling | technicians, tech_availability, tech_skills | `/technicians` | 17 | ✅ 17 endpoints | ✅ technicians-page.tsx | ✅ Yes |
| 14 | AI Assistant | ai_conversations, ai_agents, ai_actions, ai_memory, ai_tool_logs | `/ai` | 13 | ❌ No | ✅ ai-assistant-page.tsx | ❌ Cannot fetch data |
| 15 | Users Management | users, roles, permissions | `/users` | 6 | ❌ No | ❌ No page | ❌ No |
| 16 | Dashboard | — | `/` + `/dashboard` | 2 web renders | ✅ 1 endpoint | ✅ dashboard-page.tsx | ✅ Partial |
| 17 | Reports | — (aggregates) | `/reports` | 2 web renders | ❌ No API | ❌ No dedicated page | ❌ No |
| 18 | Accounting | accounts, chart_of_accounts, vouchers, voucher_entries | `/accounting` | 10 | ❌ No | ❌ No page | ❌ No |
| 19 | Banking | bank_accounts, bank_transactions, reconciliations | `/banking` | 10 | ❌ No | ❌ No page | ❌ No |
| 20 | Payroll | employees, salary_structures, attendance, payroll_runs | `/payroll` | 14 | ❌ No | ❌ No page | ❌ No |
| 21 | CRM | crm_leads, interactions, follow_ups | `/crm` | 12 | ❌ No | ❌ No page | ❌ No |
| 22 | Stores | stores, store_transfers | `/stores` | 7 | ❌ No | ❌ No page | ❌ No |
| 23 | Suppliers | suppliers | `/suppliers` | 6 | ❌ No | ❌ No page | ❌ No |
| 24 | Locations | locations | `/locations` | 7 | ❌ No | ❌ No page | ❌ No |
| 25 | GST / India | sales_invoices, e_invoice_logs, eway_bill_logs | `/india` | 20 | ❌ No | ❌ No page | ❌ No |
| 26 | POS | pos_sessions, pos_sales, pos_items | `/pos` | 7 | ❌ No | ❌ No page | ❌ No |
| 27 | Companies | companies | `/companies` | 7 | ❌ No | ❌ No page | ❌ No |
| 28 | Settings | settings | `/settings` | 3 | ❌ No | ❌ No page | ❌ No |
| 29 | Search | (cross-table search) | `/search` | 1 | ❌ No | ❌ No page | ❌ No |
| 30 | Audit Logs | audit_logs | `/audit` | — | ❌ No | ❌ No page | ❌ No |

\* These have Express route files (`routes/customer-assets.js`, `routes/complaints.js`, `routes/service-tickets.js`) but they are **NOT registered** in `routes/index.js`. They only have Fastify route wrappers.

---

## Key Findings

### Backend modules inaccessible from React: 25 out of 30

Only 5 modules (Technician Scheduling, AMC, Service Tickets, Customer Assets, Complaints) have both Fastify APIs AND React pages that can consume them.

### Modules with backend but no React page at all: 22

Every module except Dashboard, Login, and the 5 Fastify-backed ones has no React page.

### Express modules that cannot be reached by React: 25

Express renders EJS templates server-side. The React SPA fetches JSON from Fastify `/api/*` endpoints. Express routes like `/customers`, `/repairs`, `/purchases` serve HTML pages, not JSON APIs. The React frontend cannot consume them.

### Tables used across modules

| Table | Used By |
|-------|---------|
| customers | Customers, Sales, Repairs, Service Tickets, Complaints, CRM, User Management, Delivery Challans, India |
| parts | Inventory, Sales, Purchases, Repairs, Service Tickets, POS, India, Reports |
| repairs | Repairs, Parts, Customers |
| sales_invoices | Sales, Purchases, Reports, India, POS, Delivery Challans |
| invoices | Sales, Purchases |
| users | Auth, RBAC, User Management, Reports, India, Audit |
| service_tickets | Service Tickets, Technicians, AMC |
| amc_contracts | AMC, Technicians |
| customer_assets | Customer Assets, AMC, Service Tickets |
| complaints | Complaints, Technicians, Customers |
| technicians | Technicians, Repairs, Service Tickets, AMC, Complaints |
| quotations | Quotations, Sales, Customers |
| purchase_orders | Purchases, Suppliers, Parts |
| delivery_challans | Delivery Challans, Customers, Parts |
| locations | Locations, Users, Stores, Delivery Challans |
| stores | Stores, Inventory, Parts, Delivery Challans |
| suppliers | Suppliers, Purchases |
| accounts, vouchers, voucher_entries | Accounting |
| bank_accounts, bank_transactions | Banking |
| employees, salary_structures, attendance, payroll_runs | Payroll |
| crm_leads, interactions, follow_ups | CRM |
| companies | Companies, Settings |
| settings | Settings (used by every module) |
| audit_logs | Audit module |
| ai_conversations, ai_agents, ai_actions, ai_memory | AI Assistant |
