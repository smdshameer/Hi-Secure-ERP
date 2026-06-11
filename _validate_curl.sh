#!/bin/bash
# Validation script using curl (bypasses Node.js connection pool bugs)
COOKIE="C:/Users/Admin/Desktop/Calude Test/erp-app/.cookie.txt"
RESULT="C:/Users/Admin/Desktop/Calude Test/erp-app/_results_curl.json"
BASE="http://localhost:3099"
PASS=0
FAIL=0
declare -A R

login() {
  local body=$(curl -s -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin@123"}')
  echo "$body"
}

check() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="${4:-}"
  local args=(-s -b "$COOKIE" -c "$COOKIE" -w "\n%{http_code}")
  if [ "$method" = "POST" ]; then
    args+=(-X POST -H "Content-Type: application/json" -d "$data")
  fi
  args+=("$url")
  local resp=$(curl "${args[@]}")
  local code=$(echo "$resp" | tail -1)
  local body=$(echo "$resp" | sed '$d')
  if [ "$code" = "200" ]; then
    R["$name"]="PASS"
    PASS=$((PASS+1))
  else
    R["$name"]="FAIL($code)"
    FAIL=$((FAIL+1))
  fi
  echo "  $name: ${R[$name]} (HTTP $code)"
}

# Login and capture result
LOGIN_RESP=$(login)
LOGIN_STATUS=$(echo "$LOGIN_RESP" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")
echo "LOGIN: $LOGIN_RESP"
echo ""

# Workflow 1: RBAC
echo "=== Workflow 1: RBAC ==="
check "rbac_users" "$BASE/api/users?limit=1"
check "rbac_technicians" "$BASE/api/technicians"
check "rbac_complaints" "$BASE/api/complaints?limit=1"
check "rbac_amc" "$BASE/api/amc/contracts?limit=1"
check "rbac_repairs" "$BASE/api/repairs?limit=1"
check "rbac_tickets" "$BASE/api/tickets?limit=1"
check "rbac_settings" "$BASE/api/settings"
check "rbac_dashboard" "$BASE/api/dashboard"
check "rbac_reports" "$BASE/api/reports/stats"
check "rbac_products" "$BASE/api/products?limit=1"
check "rbac_customers" "$BASE/api/customers?limit=1"
check "rbac_payments" "$BASE/api/payments?limit=1"
check "rbac_parts" "$BASE/api/parts?limit=1"
check "rbac_suppliers" "$BASE/api/suppliers?limit=1"
check "rbac_stores" "$BASE/api/stores?limit=1"
check "rbac_invoices" "$BASE/api/invoices?limit=1"
check "rbac_accounting" "$BASE/api/accounting?limit=1"

echo ""
TOTAL=$((PASS+FAIL))
echo "=== SUMMARY ==="
echo "RBAC: $PASS/$TOTAL PASS, $FAIL FAIL"
VERDICT="PASS"
[ "$FAIL" -gt 0 ] && VERDICT="FAIL"

python -c "
import json, sys
r = {
  'suite': 'RBAC',
  'timestamp': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
  'login': $LOGIN_STATUS,
  'results': {$(for k in "${!R[@]}"; do echo "'$k':'${R[$k]}',"; done)},
  'passCount': $PASS,
  'failCount': $FAIL,
  'total': $TOTAL,
  'verdict': '$VERDICT'
}
with open(sys.argv[1], 'w') as f: json.dump(r, f, indent=2)
print(json.dumps(r, indent=2))
" "$RESULT"
echo ""
echo "Results written to: $RESULT"
