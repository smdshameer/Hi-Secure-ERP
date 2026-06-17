#!/bin/sh
# HiSecure ERP Database Restore Script
set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file does not exist: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: Restoring the database will overwrite all existing data."
echo "Are you sure you want to proceed? (yes/no)"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
  echo "Restore aborted by user."
  exit 0
fi

echo "Starting database restore from ${BACKUP_FILE} at $(date)..."

if [ -n "$DATABASE_URL" ]; then
  # Extract host, port, user, dbname from DATABASE_URL
  # Stream gunzipped backup to psql
  gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
  # Fallback using default postgres credentials
  gunzip -c "$BACKUP_FILE" | PGPASSWORD=hisecure_secure_db_pass_2026 psql -h localhost -U postgres -d hisecure_db
fi

echo "Database restore completed successfully."
