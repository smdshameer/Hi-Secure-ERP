#!/bin/bash
COOKIE="C:/Users/Admin/Desktop/Calude Test/erp-app/.cookie.txt"
RESULT="C:/Users\Admin\Desktop\Calude Test\erp-app\_results_curl.json"
BASE="http://localhost:3099"
PASS=0
FAIL=0

# Re-login to get fresh session
curl -s --max-time 5 -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin@123"}' \
  -c "$COOKIE" > /dev/null

test_ep() {
  local name=$1
  local url=$2
  local method="${3:-GET}"
  local payload="${4:-}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" "$url")
  
  if [ "$code" = "200" ]; then
    echo "PASS|$name|$code"
  elif [ "$code" = "404" ]; then
    echo "FAIL|$name|Not Found (404)"
  else
    echo "FAIL|$name|HTTP $code"
  fi
  sleep 0.5
}

# RBAC module check
echo "=== RBAC ==="
while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "users" "$BASE/api/users?limit=1")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "technicians" "$BASE/api/technicians")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "complaints" "$BASE/api/complaints?limit=1")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "amc" "$BASE/api/amc/contracts?limit=1")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "repairs" "$BASE/api/repairs?limit=1")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "tickets" "$BASE/api/tickets?limit=1")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "settings" "$BASE/api/settings")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "dashboard" "$BASE/api/dashboard")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "reports" "$BASE/api/reports/stats")
sleep 1

while IFS='|' read -r status name code; do
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo "$name: $status ($code)"
done < <(test_ep "products" "$BASE/api/products?limit=1")
sleep 1

# Save summary
TOTAL=$((PASS + FAIL))
VERDICT="PASS"
[ "$FAIL" -gt 0 ] && VERDICT="FAIL"

echo ""
echo "=== SUMMARY ==="
echo "RBAC: $PASS/$TOTAL PASS, $FAIL FAIL"
echo "Verdict: $VERDICT"
