# HiSecure ERP — Troubleshooting Guide

This guide details common issues, error codes, and recovery procedures for HiSecure ERP v2.0.0.

---

## 1. Common Installation Issues

### 1.1 `bcrypt` Compilation Fails
*   **Problem**: Installing backend dependencies fails when compiling the native `bcrypt` package.
*   **Error Message**: `node-gyp rebuild failed` or similar build errors.
*   **Cause**: Missing C++ compilation tools on the host system.
*   **Solution**:
    *   **Windows**: Run `npm install --global windows-build-tools` from an elevated PowerShell prompt or install Visual Studio Build Tools.
    *   **Linux**: Run `sudo apt install build-essential python3`.
    *   **Alternative**: Use `bcryptjs` (which does not require native compilation), though `bcrypt` is preferred for performance in production.

### 1.2 `node_modules` Version Conflicts
*   **Problem**: Application crashes on startup with type mismatches or load errors.
*   **Error Message**: `Cannot find module '...'` or TypeScript compiler errors during build.
*   **Cause**: Corrupted dependency tree or incompatible dependency versions.
*   **Solution**:
   Clean and reinstall all dependencies:
   ```bash
   # Remove dependency folders
   rm -rf node_modules client/node_modules server/node_modules
   rm package-lock.json client/package-lock.json server/package-lock.json
   
   # Re-run installation
   npm run install:all
   ```

---

## 2. Database Issues

### 2.1 Connection Timeouts
*   **Problem**: Express backend fails to connect to the database and crashes during startup.
*   **Error Message**: `PrismaClientInitializationError: Can't reach database server at ...`
*   **Cause**: The database service is not running, or network access is blocked by host firewalls.
*   **Solution**:
    1. Check if the database service is running:
       *   **Linux**: `sudo systemctl status postgresql`
       *   **Windows**: Check the Services manager for the PostgreSQL service.
    2. Test connection parameters:
       Verify that the credentials in `server/.env` match your database settings.
    3. Test port accessibility:
       Run `telnet <db-host> 5432` to confirm the port is accessible.

### 2.2 Prisma Client Out of Sync
*   **Problem**: Database queries crash with errors stating a table or column does not exist.
*   **Error Message**: `PrismaClientKnownRequestError: The table public.tableName does not exist...`
*   **Cause**: Local Prisma client files do not match the database schema.
*   **Solution**:
   Re-generate the client files and sync the schema:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```

### 2.3 Database Max Connection Limit Exceeded
*   **Problem**: Requests fail intermittently with database connection errors.
*   **Error Message**: `FATAL: remaining connection slots are reserved for non-replication superuser connections`
*   **Cause**: Too many active connections, often caused by creating multiple `PrismaClient` instances.
*   **Solution**:
    *   Ensure the application uses a single, shared `PrismaClient` instance (defined in `server/src/index.ts`).
    *   Increase the connection pool limit in PostgreSQL by updating `max_connections` in `postgresql.conf`.
    *   Add connection pooling (e.g., using PgBouncer) if dealing with high request volumes.

---

## 3. Deployment & Worker Issues

### 3.1 Background Workers Do Not Run
*   **Problem**: Uploaded catalogs are not processed, or Telegram alerts are not sent.
*   **Error Message**: `Queue connection failed` or `BullMQ: redis connection refused`.
*   **Cause**: The Redis service is not running or the server cannot connect to it.
*   **Solution**:
    1. Verify Redis is running:
       `redis-cli ping` (should return `PONG`).
    2. Check the `REDIS_URL` value in `server/.env`.
    3. Check the application logs for connection errors.

### 3.2 Out of Memory (OOM) Crashes during Catalog Upload
*   **Problem**: The application crashes when uploading large PDF or ZIP catalogs.
*   **Error Message**: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.
*   **Cause**: The catalog parsing script exceeded Node's default memory limit (typically 512MB-1.4GB depending on the platform).
*   **Solution**:
    1. Allocate more memory to the Node process:
       ```bash
       node --max-old-space-size=4096 dist/index.js
       ```
    2. Split large catalogs into smaller files (e.g., fewer than 50 pages per PDF) before uploading.

### 3.3 EADDRINUSE Port Collision
*   **Problem**: Backend server fails to start.
*   **Error Message**: `Error: listen EADDRINUSE: address already in use :::3004`
*   **Cause**: Another process is already using port `3004`.
*   **Solution**:
    *   **Linux**: Run `sudo lsof -i :3004` to identify the process, then run `kill -9 <PID>` to stop it.
    *   **Windows**: Run `netstat -ano | findstr 3004` in CMD to find the PID, then run `taskkill /F /PID <PID>` to terminate it.
    *   Alternatively, edit `server/.env` and change the `PORT` variable to a different value.
