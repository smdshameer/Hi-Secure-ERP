#!/bin/sh
# HiSecure ERP Database Backup Script
set -e

BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="hisecure_backup_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "Starting database backup at $(date)..."

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Run pg_dump (assumes run inside docker or pg environment with PG* env vars)
# If docker compose is used: docker exec hisecure-postgres pg_dump ...
if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" | gzip > "$FILEPATH"
else
  # Fallback using default postgres credentials
  PGPASSWORD=hisecure_secure_db_pass_2026 pg_dump -h localhost -U postgres -d hisecure_db | gzip > "$FILEPATH"
fi

echo "Backup completed successfully: ${FILEPATH}"

# Keep only the last 7 days of backups
echo "Cleaning up backups older than 7 days..."
find "${BACKUP_DIR}" -name "hisecure_backup_*.sql.gz" -mtime +7 -delete

echo "Backup rotation complete."
