#!/bin/bash
# ==============================================================================
# HISECURE ERP v2.0.0 — OPERATIONAL HEALTH CHECK DIAGNOSTICS
# ==============================================================================
# Description: Validates system ports, daemon state, and REST health API.
# Run instructions: chmod +x health_check.sh && ./health_check.sh
# ==============================================================================

set -uo pipefail

log_success() {
  echo -e "\e[32m[PASS]\e[0m $1"
}

log_fail() {
  echo -e "\e[31m[FAIL]\e[0m $1"
}

log_warn() {
  echo -e "\e[33m[WARN]\e[0m $1"
}

echo "=============================================================================="
echo "HISECURE ERP SYSTEM DIAGNOSTICS"
echo "=============================================================================="

# 1. Check PostgreSQL Database Port
if command -v pg_isready &> /dev/null; then
  if pg_isready -h localhost -p 5432 &> /dev/null; then
    log_success "PostgreSQL server is responsive on port 5432."
  else
    log_fail "PostgreSQL server is unreachable on port 5432."
  fi
else
  # Fallback to NC port check
  if nc -z localhost 5432 &> /dev/null; then
    log_success "PostgreSQL port 5432 is open."
  else
    log_fail "PostgreSQL port 5432 is closed."
  fi
fi

# 2. Check Redis Cache
if command -v redis-cli &> /dev/null; then
  REDIS_PING=$(redis-cli -p 6379 ping 2>/dev/null || true)
  # If password is set, check auth
  if [ "$REDIS_PING" = "PONG" ]; then
    log_success "Redis cache responds to PING."
  else
    # Try with password if REDIS_URL is in env
    if [ -f "server/.env" ]; then
      REDIS_PASS=$(grep '^REDIS_URL=' server/.env | sed -e 's/.*:\(.*\)@.*/\1/' || true)
      if [ -n "$REDIS_PASS" ] && [ "$(redis-cli -a "$REDIS_PASS" ping 2>/dev/null)" = "PONG" ]; then
        log_success "Redis cache authenticated and active on port 6379."
      else
        log_fail "Redis port is open but authentication failed."
      fi
    else
      log_fail "Redis cache is unreachable on port 6379."
    fi
  fi
else
  if nc -z localhost 6379 &> /dev/null; then
    log_success "Redis port 6379 is open."
  else
    log_fail "Redis port 6379 is closed."
  fi
fi

# 3. Check ClamAV Daemon Port
if nc -z localhost 3310 &> /dev/null; then
  log_success "ClamAV daemon is listening on port 3310."
else
  log_warn "ClamAV daemon port 3310 is closed. File attachments scanning will fail in strict mode."
fi

# 4. Check PM2 Node Service
if command -v pm2 &> /dev/null; then
  if pm2 show hisecure-erp-server &> /dev/null; then
    STATUS=$(pm2 jlist | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4 || true)
    if [ "$STATUS" = "online" ]; then
      log_success "PM2 process 'hisecure-erp-server' is online."
    else
      log_fail "PM2 process 'hisecure-erp-server' status is: ${STATUS:-unknown}."
    fi
  else
    log_fail "PM2 does not manage a process named 'hisecure-erp-server'."
  fi
else
  log_fail "PM2 is not installed."
fi

# 5. REST API Health Endpoint Query
if command -v curl &> /dev/null; then
  API_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3004/api/health || true)
  HTTP_STATUS="${API_RESPONSE: -3}"
  BODY="${API_RESPONSE:0:${#API_RESPONSE}-3}"

  if [ "$HTTP_STATUS" = "200" ]; then
    log_success "REST API health endpoint responds with HTTP 200."
    if echo "$BODY" | grep -q '"database":"connected"' && echo "$BODY" | grep -q '"redis":"connected"'; then
      log_success "REST API confirms internal Database and Redis connections are online."
    else
      log_fail "REST API reports degraded internal dependencies: ${BODY}"
    fi
  else
    log_fail "REST API health endpoint failed with status code: ${HTTP_STATUS}."
  fi
else
  log_warn "curl is not installed. Skipping REST API endpoint query."
fi

echo "=============================================================================="
echo "Diagnostics scan complete."
echo "=============================================================================="
