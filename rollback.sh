#!/bin/bash
# ==============================================================================
# HISECURE ERP v2.0.0 — EMERGENCY ROLLBACK SCRIPT
# ==============================================================================
# Description: Restores database backup and reverts codebase.
# Run instructions: chmod +x rollback.sh && ./rollback.sh [COMMIT_HASH]
# ==============================================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${APP_DIR}/server/backups"

log() {
  echo -e "\e[33m[$(date +'%Y-%m-%d %H:%M:%S')] $1\e[0m"
}

error_log() {
  echo -e "\e[31m[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1\e[0m"
}

# Ensure .env is present
if [ ! -f "${APP_DIR}/server/.env" ]; then
  error_log "Environment file (.env) is missing in ${APP_DIR}/server."
  exit 1
fi

export $(grep -v '^#' "${APP_DIR}/server/.env" | xargs)

# Confirm Rollback
echo "WARNING: Running this script will revert code and overwrite active database data."
read -p "Are you sure you want to proceed with the rollback? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  log "Rollback aborted by user."
  exit 0
fi

# Determine Commit to Revert to
TARGET_COMMIT="${1:-HEAD~1}"
log "Reverting codebase to commit: ${TARGET_COMMIT}"
git checkout "$TARGET_COMMIT"

# Find latest pre-deployment database backup
log "Locating latest pre-deployment database backup..."
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/pre_deploy_backup_*.sql.gz 2>/dev/null | head -n 1 || true)

if [ -z "$LATEST_BACKUP" ]; then
  error_log "No pre-deployment backups found in ${BACKUP_DIR}."
  read -p "Proceed with code revert only? (yes/no): " CODE_ONLY
  if [ "$CODE_ONLY" != "yes" ]; then
    exit 1
  fi
else
  log "Found target backup: ${LATEST_BACKUP}"
  log "Restoring database..."
  # Stream compressed SQL data to postgres
  gunzip -c "$LATEST_BACKUP" | psql "$DATABASE_URL"
  log "Database restored successfully."
fi

# Reinstall dependencies and rebuild assets
log "Rebuilding code modules for target commit..."
npm run install:all
npm run build

# Restart the application processes via PM2
log "Restarting PM2 backend services..."
cd "${APP_DIR}/server"
npx prisma generate
pm2 reload ecosystem.config.js --env production

log "=============================================================================="
log "ROLLBACK PROTOCOL COMPLETED SUCCESSFULLY!"
log "=============================================================================="
