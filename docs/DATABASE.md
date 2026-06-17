# HiSecure ERP — Database Documentation

HiSecure ERP v2.0.0 uses **PostgreSQL** as its core relational database management system, mediated by **Prisma ORM**.

---

## 1. Database Structure

The schema contains 93 distinct tables optimized for transactional consistency, financial audit trails, and inventory tracking.

### 1.1 Core Entities & Schema Map
The database structure is configured in [schema.prisma](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/prisma/schema.prisma):

```
+------------------+      +------------------+      +-------------------+
|      users       |      |      roles       |      |    permissions    |
| (user_id, role)  |----->| (role_id, name)  |----->| (permission_id)   |
+------------------+      +------------------+      +-------------------+
         |
         v
+------------------+      +------------------+      +-------------------+
|    customers     |      |      parts       |      |     suppliers     |
| (customer_code)  |      | (part_number)    |      | (supplier_code)   |
+------------------+      +------------------+      +-------------------+
         |                         |                          |
         +------------+------------+                          |
                      |                                       |
                      v                                       v
          +-----------------------+               +-----------------------+
          |    sales_invoices     |               |    purchase_orders    |
          | (invoice_number, GST) |               |  (po_number, status)  |
          +-----------------------+               +-----------------------+
```

### 1.2 Performance Indexing
Critical queries utilize database indexes to maintain sub-100ms response latencies:
*   **Search Engine optimization**: `@@index([barcode])` and `@@index([model_number])` on the `parts` table.
*   **Transactional Queries**: `@@index([customer_id])`, `@@index([invoice_date])`, and `@@index([status])` on `sales_invoices`.
*   **Audit Trail Logs**: `@@index([entity_type, entity_id])` on `audit_logs`.
*   **Worker Queues**: `@@index([user_id, read_status])` on `notifications`.

---

## 2. Migrations

Database schema changes are managed via Prisma Migrations to ensure zero-downtime structural upgrades.

### 2.1 Applying Existing Migrations
When deploying to a new node, sync your database schema to the latest configuration by running:
```bash
cd server
npx prisma generate
npx prisma db push
```
*(Alternatively, for strict SQL step validation):*
```bash
npx prisma migrate deploy
```

### 2.2 Generating New Migrations
If you must change `schema.prisma` (only when development freeze is lifted):
1.  Modify `server/prisma/schema.prisma`.
2.  Generate the migration SQL file:
    ```bash
    npx prisma migrate dev --name describe_your_change
    ```
3.  Prisma will create a new directory inside `/server/prisma/migrations/` containing the `migration.sql` scripts.

---

## 3. Backup Process

The backend contains built-in shell scripts and Node scripts designed to back up database data in two formats: raw SQL gzip dumps and JSON snapshots.

### 3.1 Automated SQL Backup (`backup.sh`)
The shell backup script is located at [server/backup.sh](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/backup.sh).

```bash
#!/bin/sh
# HiSecure ERP Database Backup Script
set -e

BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="hisecure_backup_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Run pg_dump (Stream compressed database data)
if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" | gzip > "$FILEPATH"
else
  PGPASSWORD=hisecure_secure_db_pass_2026 pg_dump -h localhost -U postgres -d hisecure_db | gzip > "$FILEPATH"
fi

# Keep only the last 7 days of backups
find "${BACKUP_DIR}" -name "hisecure_backup_*.sql.gz" -mtime +7 -delete
```

### 3.2 Backup Automation Configuration (Cron Job)
Configure a crontab entry to execute backups daily at 1:00 AM:
```bash
0 1 * * * /bin/sh /var/www/hisecure-erp/server/backup.sh >> /var/log/hisecure_backup.log 2>&1
```

---

## 4. Restore Process

Restoring a database will overwrite the existing schemas and records. Always verify the backup age and size before performing a rollback.

### 4.1 SQL Restore (`restore.sh`)
The shell recovery script is located at [server/restore.sh](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/restore.sh).

1. Execute the script by passing the target path to the compressed backup file:
   ```bash
   ./restore.sh /app/backups/hisecure_backup_20260617_224015.sql.gz
   ```
2. The script will request manual confirmation:
   ```
   WARNING: Restoring the database will overwrite all existing data.
   Are you sure you want to proceed? (yes/no)
   ```
3. Type `yes` to stream the gunzipped SQL commands back into PostgreSQL.

### 4.2 Programmatic Restore & Validation (`restore_safety.js`)
If you require granular validation or are recovering from a pre-hardening JSON snapshot:
1.  Configure the target file path in [server/restore_safety.js](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/restore_safety.js).
2.  Run the Node execution script:
    ```bash
    node restore_safety.js
    ```
3.  This script performs record insertions in a logical, dependency-first order:
    `Settings` -> `Brands` -> `Technicians` -> `Locations` -> `Users` -> `Roles` -> `Customers` -> `Suppliers` -> `Parts` -> `SalesInvoices` -> `JournalEntries`...
4.  Logs detail exactly which records succeeded and highlight any constraint conflicts.
