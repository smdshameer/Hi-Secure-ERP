# HiSecure ERP v2.0.0 — Production Post-Deployment Validation Checklist

Execute this checklist immediately following execution of the production deployment script.

---

## 1. Network & Daemon Verification

- `[ ]` **PostgreSQL Reachability**: Run `pg_isready -h 127.0.0.1 -p 5432` to confirm active database listening.
- `[ ]` **Redis Connectivity**: Run `redis-cli -p 6379 -a YOUR_REDIS_PASSWORD ping` and confirm it returns `PONG`.
- `[ ]` **ClamAV Listening**: Run `nc -z -w3 127.0.0.1 3310` to confirm the antivirus daemon port is active.
- `[ ]` **PM2 Status**: Run `pm2 status` and confirm `hisecure-erp-server` is in the `online` state.
- `[ ]` **Port Protection**: Run `nmap -p 3004,5432,6379 localhost` from a remote network and verify all three ports show as `Filtered` or `Closed` (they must not be open to the public).

---

## 2. API Endpoint Verification

- `[ ]` **Service Health JSON**: Run `curl -s http://localhost:3004/api/health` and verify:
  *   Response HTTP Status is `200`.
  *   Payload reports `"database":"connected"` and `"redis":"connected"`.
- `[ ]` **Registration Blockage**: Run:
  ```bash
  curl -i -X POST -H "Content-Type: application/json" -d '{"username":"attacker","password":"password"}' http://localhost:3004/api/auth/register
  ```
  *Verify that the response returns `401 Unauthorized` or `403 Forbidden`.*
- `[ ]` **Static Assets served**: Load your domain index in a browser and verify page headers confirm files are served by `Nginx` and not proxied to the Node application runtime.

---

## 3. Business Logic Validation

- `[ ]` **Double-Entry Trail**: Log in to the administrative panel, access **Accounting -> Trial Balance**, and verify the total differences column displays exactly `0.00`.
- `[ ]` **PDF Invoice Print**: Access **Sales**, select an invoice, and click **Print PDF**. Verify that the document compiles and downloads without server exceptions.
