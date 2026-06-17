# HiSecure ERP — Change Log

All notable changes to the HiSecure ERP project are documented in this file.

---

## [2.0.0] — 2026-06-17

This is a major architectural release migrating the platform from a monolithic EJS template engine to a decoupled, high-performance TypeScript stack featuring a React client, Express API gateway, and Prisma database schema.

### Added
*   **React + Vite Single Page Application (SPA)**: Modern user interface leveraging TailwindCSS v4 and Radix UI primitives.
*   **Prisma Client Integration**: Replaced legacy raw SQL queries with a type-safe database access layer containing 93 relational models.
*   **Security Auditing Dashboard**: Live administrator compliance feed logging failed logins, permission denials, manual journal postings, catalog overrides, and rollbacks.
*   **Background Jobs & Queues (BullMQ)**: Redis-backed queue processor managing OCR catalog imports, Telegram worker alerts, and automated notifications without blocking Express HTTP threads.
*   **System Health Monitoring widgets**: Real-time status widgets showing database latencies, Redis status, active job queues, CPU, memory, and disk usage.
*   **Anti-Virus Scanning Engine**: Integrated ClamAV daemon verification on multipart file attachments before saving them to disk.
*   **Disaster Recovery Verification tests**: Pre-production automated tests validating double-entry balance alignment and schema consistency.
*   **Correlation ID Logging**: Implemented `X-Request-ID` correlation identifiers for all request lifecycles to improve auditing.
*   **Pre-Production Hardening**:
    *   Disabled public self-registration (`/api/auth/register` restricted to SuperAdmin role).
    *   Strict production checks that fail startup if insecure secrets or default connection passwords are detected.
    *   Redis connection enforcement checks that block queue modules if Redis is unreachable in production.
    *   Backup health checks that issue critical alerts if the latest backup is older than 24 hours.

### Changed
*   **Role-Based Access Control (RBAC)**: Permission caching using Redis hashes to improve response latencies.
*   **Decoupled Frontend-Backend Routing**: Set up Nginx config parameters to proxy API queries to port `3004` and serve React static builds.

---

## [1.1.0] — 2026-04-12

This release focused on tax compliance, credit management, and settings configuration enhancements for the monolithic backend application.

### Added
*   **GSTR-1 Export**: Outward supplies report generation with CSV export capabilities (`/reports/gstr1`).
*   **GSTR-3B Draft**: Monthly tax summary dashboard grouped by rate (`/reports/gstr3b`).
*   **GST Format Validation**: Regex-based GSTIN syntax verification for customers and suppliers.
*   **Place of Supply Determination**: Logic to auto-assign CGST/SGST (intra-state) or IGST (inter-state) taxes based on customer location.
*   **Credit Limit Enforcement**: Automatic credit check barriers preventing invoice creation if client balances exceed credit terms.
*   **Auto-initialization**: Pre-configured defaults for company information, tax rates, and print templates on the first launch.

---

## [1.0.0] — 2026-01-15

Initial monolithic release of HiSecure ERP.

### Added
*   Core double-entry accounting ledger.
*   Basic POS interface with cash management.
*   Customer and Supplier directory records.
*   Service ticketing and repair tracking features.
*   Email notification alerts (SMTP).
