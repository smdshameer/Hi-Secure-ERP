# HiSecure ERP v2.0.0 — Phase 9 PM2 Application Launch Report

**Date**: June 18, 2026  
**Host Environment**: Oracle Cloud VM (VM.Standard.A1.Flex)  
**Database**: PostgreSQL 15.18 on `127.0.0.1:5432`  
**Process Manager**: PM2 v7.0.1  
**Phase Status**: **PASS**

---

## A. Pre-Launch Validation Report

We performed checks on the compiled assets, database connectivity, and configurations.
1.  **Entrypoint Verification**: Verified that `server/dist/index.js` exists.
2.  **Environment Configuration**: Verified that `server/.env` and the root `.env` symlink exist.
3.  **PostgreSQL Daemon**: Verified PostgreSQL is active on port 5432 and accepting connections.
4.  **Redis Daemon**: Verified Redis is active on port 6379, requiring authentication.
5.  **Prisma Client Path Correction**: Copied the custom generated Prisma Client (`server/src/generated`) into the build output directory (`server/dist/generated`) to resolve relative client loader imports (`./generated/client`) inside the compiled backend JS code.

---

## B. Direct Startup Test Report

A direct startup verification command was executed with a 15-second timeout to capture initial logs and verify database/Redis hooks.

### 1. Direct Startup Command
```bash
cd ~/Hi-Secure-ERP/server
timeout 15s node dist/index.js
```

### 2. Boot Output Logs
```
◇ injected env (15) from .env
[JobQueue] Attempting connection to Redis...
[JobQueue] BullMQ initialized successfully with Redis.
[JobWorker] BullMQ worker initialized.
[Backup Check] Latest backup (hisecure_erp_email_2026-06-12_1781296991904.json) is 1.2 hours old.
[Attachment Check] Uploads write permission verified. Found 0 uploads, total size: 0.00 MB.
✅ CacheService connected to Redis
✅ Prisma connected to PostgreSQL
[AppMetadataService] Initialized: Version=2.0.0, Commit=43ca13d, BuildDate=2026-06-17T18:46:10.823Z
[CatalogParserService] Checking for stalled catalog import sessions...
[CatalogParserService] No stalled catalog import sessions found.
[JobScheduler] Initializing background task scheduler...
[JobScheduler] Executing system health snapshot logging...
[HealthHistoryService] Generating system health snapshot...
[Database Health Check] Connection Status: Checking...
[JobScheduler] Running periodic catalog session and reports cleanup...
🚀 HiSecure ERP API running on http://localhost:3004
[Database Health Check] Query Success. Latency: 2ms
[HealthHistoryService] Database check successful
[HealthHistoryService] Logged hourly health snapshot. Database status: healthy
[TelegramBotWorker] TELEGRAM_DISABLED: TELEGRAM_BOT_ENABLED is false

[Server] Received SIGTERM. Initializing graceful shutdown sequence...
[JobScheduler] Stopped background task scheduler.
[JobWorker] Shutting down job worker...
[Server] HTTP server closed.
[JobQueue] Shutting down job queue...
[CacheService] Disconnecting Redis...
[Server] Cleaned up workers and cached services.
[Server] Database connection disconnected.
[Server] Graceful shutdown completed. Exiting process.
```

---

## C. PM2 Launch Report

The clustered deployment was launched successfully using the production ecosystem target.

### 1. Launch Command
```bash
cd ~/Hi-Secure-ERP/server
pm2 start ecosystem.config.js --env production
```

### 2. Startup Outputs
```
[PM2][WARN] Applications hisecure-erp-server not running, starting...
[PM2] Creating folder: /home/opc/Hi-Secure-ERP/server/logs
[PM2] App [hisecure-erp-server] launched (4 instances)
```

---

## D. Process Health Report

We inspected the active process table after launching the cluster.

### 1. PM2 Clustered Process Status
```bash
$ pm2 status
```
**Output Details:**
```
┌────┬────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name                   │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ hisecure-erp-server    │ default     │ 2.0.0   │ cluster │ 87324    │ 16s    │ 0    │ online    │ 0%       │ 192.0mb  │ opc      │ disabled │
│ 1  │ hisecure-erp-server    │ default     │ 2.0.0   │ cluster │ 87331    │ 16s    │ 0    │ online    │ 0%       │ 192.8mb  │ opc      │ disabled │
│ 2  │ hisecure-erp-server    │ default     │ 2.0.0   │ cluster │ 87338    │ 16s    │ 0    │ online    │ 0%       │ 217.7mb  │ opc      │ disabled │
│ 3  │ hisecure-erp-server    │ default     │ 2.0.0   │ cluster │ 87349    │ 16s    │ 0    │ online    │ 0%       │ 225.6mb  │ opc      │ disabled │
└────┴────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```
*   **Process Online**: Yes, 4 instances active.
*   **Restart Count**: **0** (stable startup, no crash loops).
*   **Uptime**: Active and stable.
*   **Saved State**: PM2 configuration list saved successfully via `pm2 save`.

---

## E. Port Verification Report

We queried socket listeners to confirm the application port binding.

### 1. Socket Query
```bash
sudo ss -tulpn | grep 3004
```

### 2. Output Details
```
tcp   LISTEN 0      511                *:3004             *:*    users:(("PM2 v7.0.1: God",pid=78427,fd=3))
```
*   **Port 3004**: Binding confirmed. The socket is listening and managed by the PM2 supervisor process.

---

## F. PASS / FAIL Status

**Final Status**: **PASS**  

Clustered production servers launched, connected, and validated under PM2. Nginx routing and SSL blocks remain unconfigured in this phase.
