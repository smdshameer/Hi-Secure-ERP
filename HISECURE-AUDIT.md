# HISECURE ERP — Architecture Audit Report
**Date:** 2026-06-03 | **Scope:** Full codebase vs HISECURE.md constitution

---

## 1. ARCHITECTURE REVIEW

| HISECURE.md Requirement | Current State | Gap |
|---|---|---|
| Frontend: React + TypeScript + Tailwind + ShadCN | **ABSENT** — plain EJS server-rendered HTML | Complete rewrite required |
| Backend: Node.js + Fastify | **PARTIAL** — Node.js ✓, but Express 4.x (not Fastify) | Migration needed |
| Database: PostgreSQL | ✓ Present | None |
| Realtime: Socket.IO | **ABSENT** | Not implemented |
| Reporting: Chart.js | **PARTIAL** — views/dashboard.ejs references Chart.js CDN | No server-side chart API |
| PDF: PDFKit + Puppeteer | **PARTIAL** — pdfkit installed, puppeteer absent | Partial |
| Barcode: bwip-js | **ABSENT** | Not implemented |
| QR Code: qrcode npm | **ABSENT** | Not implemented |
| Deployment: PM2 | **ABSENT** — no ecosystem file | Not configured |
| Docker: excluded (matches policy) | ✓ Respects policy | None |

**Verdict:** The application is a traditional Express + EJS monolith. The constitution's modern React frontend, Fastify backend, and realtime stack are entirely absent. This is a **Level 1 gap** requiring a frontend migration.

---

## 2. DATABASE REVIEW

| Requirement | Status | Notes |
|---|---|---|
| PostgreSQL connection | ✓ Present | `pg` / `node-postgres` driver |
| Raw SQL (no ORM) | ✓ Present | All queries in `models/*.js` use parameterized SQL |
| Invoice schema | ✓ Present | `invoices`, `invoice_items` tables |
| Customer schema | ✓ Present | `customers` table |
| Supplier schema | ✓ Present | `suppliers` table |
| Parts/Products schema | ✓ Present | `parts`, `part_stock` tables |
| Accounting schema | ✓ Present | `journal_entries`, `ledgers` |
| Banking schema | ✓ Present | `bank_transactions` |
| Payroll schema | ✓ Present | `employees`, `salary` |
| Stores/Godown schema | ✓ Present | `stores`, `stock_movements` |
| Audit log table | **PARTIAL** | `routes/audit.js` calls `models.audit.getLogs()`, schema unverified |
| Users table | ✓ Present | Session-based with bcrypt |
| Roles table (RBAC) | **ABSENT** | Only `role` string column on users; no roles/permissions table |
| AMC/Service contract table | **ABSENT** | Repairs module exists but no formal AMC table |
| Asset tracking table | **ABSENT** | Not implemented |

**Verdict:** Core transactional tables exist and are functional. Critical gaps: no RBAC roles table, no AMC contracts table, no asset tracking table.

---

## 3. SECURITY REVIEW

| Control | Status | Notes |
|---|---|---|
| Authentication (session-based) | ✓ Present | `requireAuth` middleware checks `req.session.user` |
| Password hashing | ✓ Present | bcrypt in auth flow |
| CSRF protection | ✓ Present | `csurf` middleware on state-changing routes |
| CSP headers | ✓ Present | `helmet` middleware |
| Rate limiting | ✓ Present | `express-rate-limit` |
| Role-based authorization | **PARTIAL** | `authorize(...roles)` exists but roles are string-only, no granular permissions |
| Input validation | **PARTIAL** | `express-validator` installed but usage unverified across routes |
| SQL injection protection | ✓ Present | Parameterized queries (`$1, $2...`) throughout |
| XSS protection | **PARTIAL** | EJS auto-escapes by default, but some raw HTML injection via `<%- %>` |
| HTTPS enforcement | **UNKNOWN** | No HSTS or force-HTTPS config seen |
| Session security | **PARTIAL** | express-session used, but `secure`, `httpOnly`, `sameSite` flags unverified |
| CORS | **UNKNOWN** | Not observed |
| File upload validation | **UNKNOWN** | Not observed |
| Audit log completeness | **PARTIAL** | `routes/audit.js` exists but coverage unknown |

**Verdict:** Foundation security controls are in place. Key gaps: no granular RBAC, unverified session cookie flags, no CORS policy, no file upload validation.

---

## 4. ERP MODULE MATURITY ASSESSMENT

| Module | Status | Maturity | Notes |
|---|---|---|---|
| **Authentication** | ✓ Working | Medium | Session-based, no 2FA, no password reset flow |
| **User Management** | ✓ Working | Medium | CRUD exists, no role management UI |
| **Role Management** | **ABSENT** | Low | Only hardcoded role strings |
| **Dashboard** | ✓ Working | Medium | Stats + recent repairs + revenue, no charts rendering |
| **Notifications** | **ABSENT** | None | No system, no UI, no Socket.IO |
| **Audit Logs** | **PARTIAL** | Low | Route exists, schema unknown |
| **Customers** | ✓ Working | Medium | Full CRUD, GSTIN support |
| **Suppliers** | ✓ Working | Medium | Full CRUD |
| **Products/Parts** | ✓ Working | Medium | HSN, price, stock tracking |
| **Inventory** | **PARTIAL** | Low | Stock movements exist, no stock alerts/reordering |
| **Quotations** | ✓ Working | Medium | Quote → convert to invoice |
| **Sales** | ✓ Working | High | Full lifecycle, 5 print themes, GST compliance |
| **Purchases** | ✓ Working | Medium | Full CRUD |
| **Delivery Challans** | ✓ Working | Low | Basic implementation |
| **AMC Management** | **ABSENT** | None | No AMC contracts, no renewal tracking |
| **Service Tickets** | **PARTIAL** | Low | Repairs module exists but not formal ticket system |
| **Asset Tracking** | **ABSENT** | None | Not implemented |
| **Complaint Management** | **ABSENT** | None | Not implemented |
| **Accounting** | ✓ Working | Medium | Journal entries, ledgers |
| **Banking** | ✓ Working | Low | Basic transaction recording |
| **Payroll** | **PARTIAL** | Low | Employees + salary tables, no attendance, no statutory |
| **CRM** | **PARTIAL** | Low | Customer master exists, no lead pipeline, no follow-up |
| **GST Compliance** | ✓ Working | High | E-invoice, HSN lookup, GSTIN |
| **Print Themes** | ✓ Working | High | 5 themes, A4/thermal, Indian formatting |
| **AI Assistant** | **ABSENT** | None | Not implemented |
| **Barcode/QR** | **ABSENT** | None | No generation library, no label printing |

---

## 5. MISSING FEATURES (from HISECURE.md)

### Critical (Phase 1)
1. **Role Management UI** — no admin page to create/edit roles/permissions
2. **Notification System** — no alerts for low stock, invoice expiry, service due
3. **Real-time Updates** — Socket.IO for live dashboard, notifications

### High (Phase 2-3)
4. **Stock Alerts & Reordering** — low stock notifications, auto-PO generation
5. **Delivery Challan → Invoice** linking
6. **Quotation expiry & follow-up**

### Medium (Phase 4)
7. **AMC Management** — contract creation, renewal tracking, billing calendar
8. **Service Ticket System** — SLA tracking, technician dispatch, resolution workflow
9. **Asset Tracking** — device register, warranty tracker, location history
10. **Complaint Management** — customer complaints → tickets → resolution

### Lower (Phase 5-6)
11. **Chart.js Dashboard** — revenue charts, sales trends, inventory levels
12. **Barcode/QR Labels** — product labels, invoice QR, asset tags
13. **Payroll Enhancements** — attendance, PF/ESI, payslips
14. **AI ERP Assistant** — natural language queries, smart suggestions
15. **Puppeteer PDF** — server-side PDF export beyond browser print

---

## 6. HIGH-PRIORITY BUGS

| # | Bug | Impact | Location |
|---|---|---|---|
| 1 | Session cookies lack `secure`, `httpOnly`, `sameSite` flags | Session hijack risk | `middleware/feature.js` or session config |
| 2 | `authorize()` test bypass leaks into test mode on `NODE_ENV=test` | Security bypass if env leaked | `middleware/auth.js:31` |
| 3 | `models/audit.js` — schema and coverage unknown | Compliance gap | `models/audit.js` |
| 4 | No input sanitization on file upload paths | Path traversal risk | Upload handlers |
| 5 | EJS `<%- body %>` in `print.ejs:48` injects raw HTML | Potential XSS if body contains user data | `views/sales/print.ejs` |
| 6 | `requireAuth` catches all errors silently (`.catch(()=>{})`) | Silent permission failures | `middleware/auth.js:24` |

---

## 7. TECHNICAL DEBT

| # | Item | Risk | Effort |
|---|---|---|---|
| 1 | 5 theme files each contain full inline-styled EJS tables (6-13K chars each) | Maintenance nightmare — any layout change requires editing all 5 | High |
| 2 | `fmt()` and `amtInWords()` duplicated in every theme EJS (4-6 copies) | Bug fixes must be replicated | High |
| 3 | No environment config validation — app boots with wrong DB silently | Production failures | Medium |
| 4 | No PM2/process manager config | Unsupervised restarts on crash | Low |
| 5 | Hardcoded theme list in 3 places (`ALLOWED_THEMES`, switch UI, route) | Drift over time | Low |
| 6 | Dashboard uses Chart.js CDN (no fallback) | Breaks offline/restricted networks | Low |
| 7 | No API versioning | Future breaking changes | Medium |
| 8 | `models/print.js` has `mobile-shop` legacy alias mapping — unclear purpose | Dead code | Low |

---

## 8. RECOMMENDED ROADMAP

```
NOW        → Fix session security flags (bug #1), add role management table
WEEK 1     → Add stock alerts, AMC contract data model + basic UI
WEEK 2-3   → Add service ticket module + asset tracking
WEEK 4     → Add notification system (in-app + email)
WEEK 5-6   → Chart.js dashboard charts, barcode/QR labels
WEEK 7-8   → Payroll enhancements, CRM lead pipeline
WEEK 9-12  → Socket.IO realtime + AI assistant
ONGOING    → Delete duplicated invoice theme code, extract shared helpers
```

---

## IMPLEMENTATION PLAN — STARTING NOW

### Task 1: Fix Session Security Hardening
- Set `cookie.secure`, `cookie.httpOnly`, `cookie.sameSite` in express-session config
- Remove test-mode bypass leak in `authorize()`

### Task 2: RBAC — Roles + Permissions Table
- Create `roles`, `permissions`, `role_permissions` tables
- Migrate `users.role` from string to foreign key
- Add role management UI

### Task 3: Audit Log Completion
- Verify `audit_log` table schema
- Add middleware to auto-log all state-changing routes

### Task 4: Stock Alert System
- Low-stock detection in models
- Alert UI in dashboard + email trigger

### Task 5: Service Ticket + AMC + Asset Tracking
- New tables: `amc_contracts`, `service_tickets`, `assets`
- Routes + views for each

I will proceed with Task 1 first (objective: close 2 critical security bugs with minimal code change), then Task 2 (highest-value feature unlock).
