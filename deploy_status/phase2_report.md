# HiSecure ERP — Phase 2 Deployment Report (PostgreSQL Deployment)

**Date**: June 17, 2026  
**Host Environment**: Oracle Cloud VM (VM.Standard.A1.Flex)  
**Database Service**: PostgreSQL v15.18  
**Phase Status**: **PASS**

---

## A. PostgreSQL Installation Report

PostgreSQL 15 and its utility plugins have been successfully installed on the Oracle Linux 9 system via the official PGDG repository.

```bash
$ psql --version
psql (PostgreSQL) 15.18
```

### System Daemon Status
```
● postgresql-15.service - PostgreSQL 15 database server
     Loaded: loaded (/usr/lib/systemd/system/postgresql-15.service; enabled; preset: disabled)
     Active: active (running) since Wed 2026-06-17 18:07:09 GMT
```
*Verification: `/usr/pgsql-15/bin/pg_isready` reports: `/run/postgresql:5432 - accepting connections`.*

---

## B. Database Configuration Report

*   **Database Name**: `hisecure_erp`
*   **Database Owner**: `hisecure_app`
*   **Default Connection Limit**: `80` (enforced via database role parameters)
*   **Authentication Method**: Password-based (`scram-sha-256` encryption)

---

## C. Connectivity Verification Report

Tested connecting to the database through the local loopback interface (`127.0.0.1`) using the configured credentials:

```bash
$ PGPASSWORD=HiSecure_DB_Pass_2026_Prod psql -U hisecure_app -d hisecure_erp -h 127.0.0.1 -c 'SELECT 1 as connection_test;'
 connection_test 
-----------------
               1
(1 row)
```
*Result: **SUCCESSFUL**. The database is fully accessible to the application role locally.*

---

## D. Security Review

1.  **Non-Superuser Execution**: Enforced. The backend application connects using the custom role `hisecure_app`, which does not have administrative (superuser) privileges.
2.  **Network Isolation**: Confirmed. PostgreSQL listens on the local loopback interface and is blocked from public internet traffic by `firewalld` configurations.
3.  **Connection Throttling**: Connection limits are locked to `80` to prevent Denial of Service (DoS) memory exhaustion.

---

## E. PASS / FAIL Status

**Final Status**: **PASS**  
**Recommended Next Action**: Proceed to **PHASE 3 — Redis Deployment**.
