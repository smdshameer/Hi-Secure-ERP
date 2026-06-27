#!/bin/bash
# ==============================================================================
# HISECURE ERP v2.0.0 — ORACLE LINUX 9 PRODUCTION DEPLOYMENT SCRIPT
# ==============================================================================
# Description: Automated deployment script for Oracle Linux 9.
# Run instructions: chmod +x deploy.sh && ./deploy.sh
# ==============================================================================

set -euo pipefail

# --- CONFIGURATION ---
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${APP_DIR}/server/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PRE_DEPLOY_BACKUP="${BACKUP_DIR}/pre_deploy_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${APP_DIR}/logs/deployment_${TIMESTAMP}.log"

mkdir -p "${APP_DIR}/logs"
mkdir -p "${BACKUP_DIR}"

exec 3>&1 4>&2
exec &> >(tee -a "$LOG_FILE")

log() {
  echo -e "\e[32m[$(date +'%Y-%m-%d %H:%M:%S')] $1\e[0m" >&3
}

error_log() {
  echo -e "\e[31m[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1\e[0m" >&4
}

# --- PREREQUISITE CHECKS ---
log "Starting pre-deployment dependency checks..."

# Check Node.js
if ! command -v node &> /dev/null; then
  error_log "Node.js is not installed. Please install Node.js v20."
  exit 1
fi
log "Found Node.js version: $(node -v)"

# Check PM2
if ! command -v pm2 &> /dev/null; then
  error_log "PM2 is not installed. Run 'sudo npm install -g pm2'."
  exit 1
fi
log "Found PM2 version: $(pm2 -v)"

# Check PostgreSQL (pg_dump & psql)
if ! command -v pg_dump &> /dev/null || ! command -v psql &> /dev/null; then
  error_log "PostgreSQL client tools (pg_dump/psql) not found."
  exit 1
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
  error_log "Redis client (redis-cli) not found."
  exit 1
fi

# Check .env existence
if [ ! -f "${APP_DIR}/server/.env" ]; then
  error_log "Production environment file ${APP_DIR}/server/.env is missing."
  exit 1
fi

# Load variables
export $(grep -v '^#' "${APP_DIR}/server/.env" | xargs)

# --- PRE-DEPLOYMENT BACKUP ---
log "Executing pre-deployment database backup..."
if [ -n "${DATABASE_URL:-}" ]; then
  CLEAN_DB_URL=$(echo "$DATABASE_URL" | sed 's/\?.*//')
  pg_dump "$CLEAN_DB_URL" | gzip > "$PRE_DEPLOY_BACKUP"
else
  error_log "DATABASE_URL is not set in environment."
  exit 1
fi
log "Database backed up successfully to: ${PRE_DEPLOY_BACKUP}"

# --- DEPENDENCY INSTALLATION & BUILD ---
log "Installing dependencies and compiling workspace..."
cd "$APP_DIR"

# Install dependencies including devDependencies for compilation
npm install --include=dev
npm install --include=dev --prefix client
npm install --include=dev --prefix server

# Build static frontend and backend packages
npm run build

# --- DATABASE MIGRATIONS ---
log "Running database schema migrations..."
cd "${APP_DIR}/server"
npx prisma generate
npx prisma migrate deploy

# Seed settings and administrators
log "Seeding database configuration..."
node "${APP_DIR}/seed-admin.js"

# --- START SERVICES WITH PM2 ---
log "Starting Express backend via PM2..."
# If process already exists, reload it to avoid downtime. Otherwise start it.
if pm2 show hisecure-erp-server &> /dev/null; then
  log "Process found. Performing zero-downtime reload..."
  pm2 reload ecosystem.config.js --env production
else
  log "Process not found. Starting new PM2 instance..."
  pm2 start ecosystem.config.js --env production
fi

pm2 save

log "=============================================================================="
log "HISECURE ERP DEPLOYMENT COMPLETED SUCCESSFULLY!"
log "Deployment logs saved to: ${LOG_FILE}"
log "=============================================================================="
