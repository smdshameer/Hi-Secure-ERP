# HiSecure ERP v2.0.0

HiSecure ERP is a production-hardened, high-compliance enterprise resource planning (ERP) system designed for small-to-medium enterprises requiring strict security auditing, immutable double-entry accounting, catalog governance, and field service management.

Built using a modern TypeScript stack, the application splits into a high-performance **React (Vite) Frontend** and a robust **Node/Express Backend** backed by a **PostgreSQL Database** and **Prisma ORM**.

---

## 🚀 Key Features

*   **Immutable Double-Entry Ledger**: Rigid financial transactions posting with database-enforced blockages against record updates/deletions.
*   **Security Auditing Dashboard**: Live compliance logs tracking failed logins, permission denies, manual journals, rollbacks, and catalog overrides.
*   **System Health Monitoring**: Real-time service status widgets displaying CPU/Memory metrics, PostgreSQL latencies, Redis status, and active job queues.
*   **Disaster Recovery Verification**: Automated pre-production test suites validating database schema consistency, double-entry balances, and backup integrity.
*   **Graceful Degraded Operations**: Non-blocking Telegram and WhatsApp integrations ensuring API connection drops never halt main Express threads.

---

## 📂 Project Documentation

Detailed guides and manuals are organized in the `/docs` directory:

1.  **[Project Overview](docs/PROJECT_OVERVIEW.md)**: Purposing, modules overview, and real-world business use cases.
2.  **[System Architecture](docs/ARCHITECTURE.md)**: Technical stacks, database design, routing mechanisms, and OCI deployment shapes.
3.  **[Installation Manual](docs/INSTALLATION.md)**: Windows, Linux, Docker, Coolify, and local development setup.
4.  **[Build & Deployment](docs/DEPLOYMENT.md)**: Compiling client/server packages, Vercel edge deployment, and production scripts.
5.  **[Database Schema & Backups](docs/DATABASE.md)**: 93 Prisma tables, automated pg_dump scripts, and restore mechanisms.
6.  **[API Endpoints](docs/API.md)**: Router layout, JWT validations, JTI claims checks, and RBAC permission caching.
7.  **[Modules Guide](docs/MODULES.md)**: Breakdown of CRM, Inventory, POS, Service Management, AMC, and reporting engines.
8.  **[Troubleshooting Manual](docs/TROUBLESHOOTING.md)**: Core installation, connection timeout, and memory OOM remedies.
9.  **[Changelog](docs/CHANGELOG.md)**: Version history, bug audits, and recent pre-production hardening releases.

---

## ⚡ Quick Start (Local Development)

### Prerequisites
*   Node.js v20 LTS
*   PostgreSQL 15+
*   Redis 7+

### Backend Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Copy the environment template:
   ```bash
   cp production.env.example .env
   ```
3. Install dependencies and apply migrations:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the client folder:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```

---

## 🛡️ License

Distributed under the **MIT License**. See `LICENSE` for details.
