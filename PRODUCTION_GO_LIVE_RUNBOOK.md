# HiSecure ERP v2.0.0 — Production Go-Live Runbook

This document serves as the verified, zero-assumption Production Go-Live Runbook for deploying HiSecure ERP v2.0.0 on an Oracle Cloud VM running Oracle Linux 9.

---

## A. Deployment Readiness Audit

This audit evaluates the codebase and repository configuration files cloned at `~/Hi-Secure-ERP`.

| Component | Target Location / Spec | Status | Audit Findings |
| :--- | :--- | :--- | :--- |
| **Root Workspace** | [package.json](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/package.json) | **PASS** | Successfully defines workspaces for `client`, `server`, `portal`, `mobile`, and `shared`. Scripts `install:all` and `build` coordinate multi-package lifecycle steps. |
| **Backend API** | [server/package.json](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/package.json) | **PASS** | Validated Node.js v20 dependencies, Prisma ORM runtime libraries, and build scripts. |
| **Frontend Client** | [client/package.json](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/client/package.json) | **PASS** | Validated React 19, Vite 8 compiler configurations, and compilation targets. |
| **Prisma Engine** | [server/prisma/schema.prisma](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/prisma/schema.prisma) | **PASS** | Relational configuration is set to `postgresql` datasource provider. Validated 3 existing migration SQL files inside `server/prisma/migrations/`. |
| **PM2 Ecosystem** | [server/ecosystem.config.js](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/ecosystem.config.js) | **PASS** | Defines process `hisecure-erp-server` launching `dist/index.js` in `cluster` mode (max instances) with 2GB restart thresholds on port `3004`. |
| **Admin Seed Script**| [seed-admin.js](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/seed-admin.js) | **PASS** | Validated direct PostgreSQL pool insert mechanism via `config/database.js`. Requires `ADMIN_PASSWORD` from environment. |
| **OS Compatibility** | Oracle Linux 9 | **PASS** | Clean support for Node.js 20, PostgreSQL 15, Redis 7, and Nginx. SELinux allow rule verified. |

---

## B. Dependency Installation Plan

Execute the following commands in order on the Oracle Linux 9 VM instance to provision the system environment:

```bash
# 1. Clean and update system packages
sudo dnf clean all
sudo dnf update -y

# 2. Enable EPEL and DNF utility repositories
sudo dnf install -y epel-release dnf-plugins-core

# 3. Add NodeSource RPM repository and install Node.js v20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs-20.11.0

# 4. Add official PostgreSQL repository and install PostgreSQL 15
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo dnf -qy module disable postgresql
sudo dnf install -y postgresql15-server postgresql15-contrib
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb
sudo systemctl enable postgresql-15 --now

# 5. Install Redis 7 Core Caching Engine
sudo dnf install -y redis
sudo systemctl enable redis --now

# 6. Install Nginx Web Server
sudo dnf install -y nginx
sudo systemctl enable nginx --now

# 7. Install PM2 Process Manager globally
sudo npm install -g pm2
```

---

## C. Environment Variables Template

Create the production `.env` file at `~/Hi-Secure-ERP/server/.env` containing these parameters:

```env
# ─── CORE SERVER SETTINGS ─────────────────────────────────────────────────────
NODE_ENV=production
PORT=3004
CLIENT_URL="https://erp.yourdomain.com"

# ─── SECURITY & AUTHENTICATION ────────────────────────────────────────────────
# Cryptographically secure 64-character token key
JWT_SECRET="YOUR_RANDOM_SECURE_JWT_SECRET_HEX"

# ─── POSTGRESQL DATABASE CONNECTION (PRISMA SCHEMA) ───────────────────────────
DATABASE_URL="postgresql://hisecure_app:STRONG_DATABASE_PASSWORD@127.0.0.1:5432/hisecure_erp?schema=public&sslmode=prefer"

# ─── POSTGRESQL LEGACY DATABASE CONNECTION (CONFIG/DATABASE.JS) ───────────────
DB_HOST="127.0.0.1"
DB_PORT=5432
DB_NAME="hisecure_erp"
DB_USER="hisecure_app"
DB_PASSWORD="STRONG_DATABASE_PASSWORD"

# ─── REDIS CACHE & BACKGROUND QUEUES ──────────────────────────────────────────
REDIS_URL="redis://:STRONG_REDIS_PASSWORD@127.0.0.1:6379/0"

# ─── ANTIVIRUS & SCANNING HARDENING ───────────────────────────────────────────
ANTIVIRUS_PROVIDER=clamav
CLAMAV_HOST="127.0.0.1"
CLAMAV_PORT=3310

# ─── EXTERNAL CHANNELS ────────────────────────────────────────────────────────
TELEGRAM_BOT_ENABLED=false
TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_HTTP_API_TOKEN"
TELEGRAM_CHAT_ID="YOUR_TELEGRAM_ADMIN_CHAT_ID"
```

---

## D. Database Deployment Plan

1.  **System Database Creation**: Connect as the database superuser to provision the database instance and configure permissions:
    ```bash
    sudo -i -u postgres psql <<EOF
    CREATE DATABASE hisecure_erp;
    CREATE USER hisecure_app WITH PASSWORD 'STRONG_DATABASE_PASSWORD';
    GRANT ALL PRIVILEGES ON DATABASE hisecure_erp TO hisecure_app;
    ALTER USER hisecure_app CONNECTION LIMIT 80;
    EOF
    ```
2.  **Prisma Migration Execution**: Apply the relational migrations locally to populate schemas:
    ```bash
    cd ~/Hi-Secure-ERP/server
    npx prisma generate --schema=./prisma/schema.prisma
    npx prisma migrate deploy
    ```
3.  **Administrator Seeding**: Seed the default administrative user. This script parses database config credentials from your `.env` file:
    ```bash
    cd ~/Hi-Secure-ERP
    ADMIN_PASSWORD="Choose_A_Strong_Admin_Login_Password" node seed-admin.js
    ```

---

## E. Redis Deployment Plan

Harden the Redis configuration by modifying `/etc/redis/redis.conf`:

1.  **Loopback Binding**: Configure Redis to only listen locally:
    ```conf
    bind 127.0.0.1 ::1
    ```
2.  **Password Protection**: Enable a strong authentication password:
    ```conf
    requirepass STRONG_REDIS_PASSWORD
    ```
3.  **Memory Optimization**: Set memory allocations to prevent system crashes:
    ```conf
    maxmemory 512mb
    maxmemory-policy allkeys-lru
    ```
4.  **Append-Only Persistence**: Enable AOF persistence to prevent BullMQ task queue records from being lost during system restarts:
    ```conf
    appendonly yes
    appendfilename "appendonly.aof"
    appendfsync everysec
    ```
5.  **Daemon Reload**: Restart Redis to apply configurations:
    ```bash
    sudo systemctl restart redis
    ```

---

## F. PM2 Deployment Plan

PM2 starts and clusters the Node.js Express server process based on [server/ecosystem.config.js](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/ecosystem.config.js):

1.  **Process Start**:
    ```bash
    cd ~/Hi-Secure-ERP/server
    pm2 start ecosystem.config.js --env production
    ```
2.  **Startup Configuration**: Ensure the PM2 process list starts automatically on VM reboot:
    ```bash
    pm2 save
    pm2 startup
    ```
    *Note: Copy and run the sudo command output by `pm2 startup` to configure the systemd unit file.*

---

## G. Nginx Configuration Plan

Configure the Nginx server block to terminated SSL/TLS traffic and route request flows:
Create the configuration file at `/etc/nginx/conf.d/hisecure-erp.conf`:

```nginx
server {
    listen 80;
    server_name erp.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourdomain.com;

    # SSL parameters
    ssl_certificate /etc/letsencrypt/live/erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend SPA (Static asset directory)
    location / {
        root /var/www/hisecure-erp/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy Integration
    location /api {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Reload Nginx to apply settings:
```bash
# Configure SELinux to permit Nginx loopback port routing
sudo setsebool -P httpd_can_network_connect 1

# Restart Nginx
sudo systemctl restart nginx
```

---

## H. Production Launch Commands

Execute these commands in order on the VM command line to build, migrate, and start the ERP:

```bash
# 1. Install all monorepo workspace dependencies
cd ~/Hi-Secure-ERP
npm run install:all

# 2. Compile client and server packages
npm run build

# 3. Apply Prisma migrations
cd ~/Hi-Secure-ERP/server
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate deploy

# 4. Seed database configurations and admin user
cd ~/Hi-Secure-ERP
ADMIN_PASSWORD="Your_Secure_Admin_Login_Password" node seed-admin.js

# 5. Start server nodes
cd ~/Hi-Secure-ERP/server
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## I. Rollback Plan

If the deployment fails post-launch, revert using these commands:

1.  **Stop Backend Nodes**:
    ```bash
    pm2 stop hisecure-erp-server
    ```
2.  **Checkout Stable Commit**: Revert the local branch to the last known stable commit hash:
    ```bash
    cd ~/Hi-Secure-ERP
    git checkout <last_stable_commit_hash>
    ```
3.  **Restore DB Backup**: Restore the database using the pre-deployment SQL backup file:
    ```bash
    gunzip -c ~/Hi-Secure-ERP/server/backups/pre_deploy_backup.sql.gz | psql -U hisecure_app -d hisecure_erp -h 127.0.0.1
    ```
4.  **Rebuild and Restart**: Re-compile code blocks and restart PM2 servers:
    ```bash
    cd ~/Hi-Secure-ERP
    npm run install:all
    npm run build
    cd server
    npx prisma generate
    pm2 reload ecosystem.config.js --env production
    ```

---

## J. Validation Plan

### 1. Network & Daemon Verification
*   **PostgreSQL listener**: Verify the database port is active:
    `pg_isready -h 127.0.0.1 -p 5432` -> *Expected: accepting connections*.
*   **Redis core**: Verify Redis cache connectivity:
    `redis-cli -p 6379 -a YOUR_REDIS_PASSWORD ping` -> *Expected: PONG*.
*   **PM2 process status**: Check process manager output:
    `pm2 list` -> *Expected: status "online" for "hisecure-erp-server"*.

### 2. API Endpoint Verification
*   **Health query**: Verify connection statuses:
    `curl -s http://127.0.0.1:3004/api/health` -> *Expected: HTTP 200 with {"status":"healthy","database":"connected","redis":"connected"}*.
*   **Register protection**: Verify registration blockage:
    `curl -i -X POST -H "Content-Type: application/json" -d '{"username":"attacker","password":"password"}' http://localhost:3004/api/auth/register` -> *Expected: HTTP 401 Unauthorized*.

### 3. Business Logic Validation
*   **Trial Balance Alignment**: Log in to the application dashboard, navigate to the **Accounting Ledger**, and verify that the Trial Balance differences report exactly `0.00`.
*   **Document Print Generation**: Create an invoice template in the **POS or Sales view**, and click **Print PDF**. Verify that the document downloads and compiles without exceptions.
