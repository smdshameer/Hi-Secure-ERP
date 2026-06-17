# HiSecure ERP — Phase 4 Deployment Report (Environment Configuration)

**Date**: June 17, 2026  
**Host Environment**: Oracle Cloud VM (VM.Standard.A1.Flex)  
**Phase Status**: **PASS**

---

## A. Environment Variable Audit

We scanned the cloned codebase at `~/Hi-Secure-ERP` and identified every environment variable read by the workspace services:

### 1. Unified Core Runtime (Express API)
*   `NODE_ENV`: String. Set to `production` to trigger strict environment checks and production routing.
*   `PORT`: Integer. Backend listening port. Matches PM2 target `3004`.
*   `CLIENT_URL`: String. Administrative frontend SPA URL, utilized for CORS checks.
*   `JWT_SECRET`: Cryptographically random string. Cryptographic token hashing signature key.

### 2. Relational Database Services
*   `DATABASE_URL`: Connection URI. Used by Prisma Client to sync schemas and perform ORM operations.
    *   *Format*: `postgresql://hisecure_app:<password>@127.0.0.1:5432/hisecure_erp?schema=public`
*   `DB_HOST`: Host address. Used by `config/database.js` pool queries. (Default: `localhost`)
*   `DB_PORT`: Port integer. Used by `config/database.js` pool queries. (Default: `5432`)
*   `DB_NAME`: Database name. Used by `config/database.js` pool queries. (Default: `hisecure_erp`)
*   `DB_USER`: User role. Used by `config/database.js` pool queries. (Default: `postgres`)
*   `DB_PASSWORD`: Password string. Used by `config/database.js` pool queries.

### 3. Caching & Background Queues
*   `REDIS_URL`: Connection URI. Utilized by BullMQ and ioredis caching services.
    *   *Format*: `redis://:password@127.0.0.1:6379/0`

### 4. Seed Administration
*   `ADMIN_PASSWORD`: String (min 8 characters). Expected by `seed-admin.js` to create the default admin account.

### 5. Fallback Notifications & Integrations
*   `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE`: Outbound email SMTP gateway.
*   `TELEGRAM_BOT_ENABLED` / `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`: Operations alert worker.
*   `WHATSAPP_ENABLED` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID`: Customer WhatsApp notifications gateway.
*   `ANTIVIRUS_PROVIDER` / `CLAMAV_HOST` / `CLAMAV_PORT`: Attachment scanning configurations.

---

## B. Production `.env` Template

Save this template configuration file at `~/Hi-Secure-ERP/server/.env`:

```env
# ─── CORE SERVER SETTINGS ─────────────────────────────────────────────────────
NODE_ENV=production
PORT=3004
CLIENT_URL="https://erp.yourdomain.com"

# ─── SECURITY & AUTHENTICATION ────────────────────────────────────────────────
# Generate a secure 64-character token key: openssl rand -hex 64
JWT_SECRET="CHANGE_TO_64_CHAR_HEX_KEY"

# ─── POSTGRESQL DATABASE CONNECTION (PRISMA SCHEMA) ───────────────────────────
DATABASE_URL="postgresql://hisecure_app:HiSecure_DB_Pass_2026_Prod@127.0.0.1:5432/hisecure_erp?schema=public&sslmode=prefer"

# ─── POSTGRESQL LEGACY DATABASE CONNECTION (CONFIG/DATABASE.JS) ───────────────
DB_HOST="127.0.0.1"
DB_PORT=5432
DB_NAME="hisecure_erp"
DB_USER="hisecure_app"
DB_PASSWORD="HiSecure_DB_Pass_2026_Prod"

# ─── REDIS CACHE & BACKGROUND QUEUES ──────────────────────────────────────────
REDIS_URL="redis://:HiSecure_Redis_Pass_2026_Prod@127.0.0.1:6379/0"

# ─── ANTIVIRUS & SCANNING HARDENING ───────────────────────────────────────────
ANTIVIRUS_PROVIDER=clamav
CLAMAV_HOST="127.0.0.1"
CLAMAV_PORT=3310

# ─── EXTERNAL CHANNELS ────────────────────────────────────────────────────────
TELEGRAM_BOT_ENABLED=false
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
```

---

## C. Missing Variable Report

*   **Audit**: Checked all source codes.
*   **Result**: No missing variables. The `production.env.example` file in `/server` maps all mandatory environment properties. We resolved the dual database config requirements (Prisma `DATABASE_URL` vs legacy pg `DB_` properties) by defining both in our templates.

---

## D. Prisma Compatibility Report

*   **Engine Target**: Prisma Client v6.0.0.
*   **Connector Type**: `postgresql`.
*   **Audit Verdict**: **FULLY COMPATIBLE**. PostgreSQL 15.18 conforms to Prisma v6 targets. The connection URL format mapped to the loopback address `/127.0.0.1` matches Prisma schema rules.

---

## E. Seed Compatibility Report

*   **Script Target**: `seed-admin.js`.
*   **Dependencies**: Requires `config/database.js` pool connectivity.
*   **Validation Check**: The database credential properties (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) must be fully defined in the `.env` file for the seed script to succeed.
*   **Input parameters**: Requires `ADMIN_PASSWORD` in the execution environment (e.g. `ADMIN_PASSWORD=your_password node seed-admin.js`).

---

## F. PASS / FAIL Status

**Final Status**: **PASS**  
**Recommended Next Action**: Proceed to **PHASE 5 — Dependency Installation**.
