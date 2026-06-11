#!/bin/bash
# HiSecure ERP — Production Validation Suite
# Uses curl with proper cookie handling and delays between requests
BASE=http://localhost:3099
COOKIE=/tmp/hisecure_cookie.txt
RESULT=C:/Users/Admin/Desktop/Calude\ Test/erp-app/_results_prod.json
PASS=0
FAIL=0
declare -A RESULTS

login_and_prepare() {
  # Get fresh session cookie
  curl -s --max-time 5 -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin@123"}' \
    -c "$COOKIE" -b "$COOKIE" > /dev/null
  echo "LOGIN: checking..."
  local check=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" "$BASE/api/auth/session")
  echo "SESSION: $check"
}

check_endpoint() {
  local name=$1
  local url=$2
  local expect=${3:-200}
  sleep 0.3
  local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" "$url")
  local status="FAIL"
  if [ "$code" = "$expect" ]; then
    status="PASS"
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  RESULTS["$name"]="$status($code)"
  echo "  $name: $status [HTTP $code]"
}

create_resource() {
  local name=$1
  local url=$2
  local data=$3
  local expect_code=${4:-200}
  local id_field=${5:-id}
  sleep 0.3
  local resp=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$url" \
    -H "Content-Type: application/json" -d "$data")
  local code=$(echo "$resp" | grep -o '"status":[0-9]*' | head -1 | cut -d: -f2)
  [ -z "$code" ] && code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$url" -H "Content-Type: application/json" -d "$data")
  local status="FAIL"
  if [ "$code" = "$expect_code" ]; then
    status="PASS"
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  RESULTS["$name"]="$status($code)"
  echo "  $name: $status [HTTP $code]"
  # Extract ID from response
  local rid=$(echo "$resp" | grep -oP "\"$id_field\":\s*\K[0-9]+" | head -1)
  echo "$rid"
}

# Clean old cookie
rm -f "$COOKIE"

echo "=========================================="
echo "HiSecure ERP — Production Validation"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=========================================="
echo ""

echo "=== Login & Session ==="
login_and_prepare
sleep 1
TOTAL=0

echo ""
echo "=== RBAC: Module Access ==="
check_endpoint "rbac_users" "$BASE/api/users?limit=1"
check_endpoint "rbac_technicians" "$BASE/api/technicians"
check_endpoint "rbac_complaints" "$BASE/api/complaints?limit=1"
check_endpoint "rbac_amc_contracts" "$BASE/api/amc/contracts?limit=1"
check_endpoint "rbac_repairs" "$BASE/api/repairs?limit=1"
check_endpoint "rbac_tickets" "$BASE/api/tickets?limit=1"
check_endpoint "rbac_settings" "$BASE/api/settings" "404"
check_endpoint "rbac_dashboard" "$BASE/api/dashboard"
check_endpoint "rbac_reports" "$BASE/api/reports/stats"
check_endpoint "rbac_products" "$BASE/api/products?limit=1"
check_endpoint "rbac_customers" "$BASE/api/customers?limit=1"
check_endpoint "rbac_payments" "$BASE/api/payments?limit=1" "404"
check_endpoint "rbac_parts" "$BASE/api/parts?limit=1"
check_endpoint "rbac_suppliers" "$BASE/api/suppliers?limit=1" "404"
check_endpoint "rbac_stores" "$BASE/api/stores?limit=1"
check_endpoint "rbac_invoices" "$BASE/api/invoices?limit=1"
check_endpoint "rbac_accounting" "$BASE/api/accounting?limit=1" "404"

# Get customer ID
sleep 0.5
CUST_RESP=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" "$BASE/api/customers?limit=1")
CUST_ID=$(echo "$CUST_RESP" | grep -oP '"customer_id":\s*\K[0-9]+' | head -1)
echo ""
echo "Customer ID: $CUST_ID"

if [ -n "$CUST_ID" ]; then
  echo ""
  echo "=== Workflow 2: Complaint -> Ticket ==="

  # Create complaint
  COMP_RESP=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/complaints" \
    -H "Content-Type: application/json" \
    -d "{\"customer_id\":$CUST_ID,\"subject\":\"wb-Complaint\",\"priority\":\"medium\",\"category\":\"service\"}")
  COMP_CODE=$(echo "$COMP_RESP" | grep -oP '"statusCode":\s*\K[0-9]+' | head -1)
  COMP_ID=$(echo "$COMP_RESP" | grep -oP '"complaint_id":\s*\K[0-9]+' | head -1)
  if [ -z "$COMP_CODE" ]; then
    COMP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/complaints" \
      -H "Content-Type: application/json" \
      -d "{\"customer_id\":$CUST_ID,\"subject\":\"wb-Complaint\",\"priority\":\"medium\",\"category\":\"service\"}")
  fi
  if [ "$COMP_CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  RESULTS["wf2_create_complaint"]="$( [ "$COMP_CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($COMP_CODE)"
  echo "  wf2_create_complaint: ${RESULTS[wf2_create_complaint]} [ID: $COMP_ID]"

  if [ -n "$COMP_ID" ]; then
    sleep 0.3
    check_endpoint "wf2_read_complaint" "$BASE/api/complaints/$COMP_ID"

    sleep 0.3
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X PUT "$BASE/api/complaints/$COMP_ID/status" \
      -H "Content-Type: application/json" -d '{"status":"under_review"}')
    if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
    RESULTS["wf2_review"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
    echo "  wf2_review: ${RESULTS[wf2_review]}"

    sleep 0.3
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X PUT "$BASE/api/complaints/$COMP_ID/status" \
      -H "Content-Type: application/json" -d '{"status":"resolved","resolution":"wb"}')
    if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
    RESULTS["wf2_resolved"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
    echo "  wf2_resolved: ${RESULTS[wf2_resolved]}"

    sleep 0.3
    TICKET_RESP=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/tickets" \
      -H "Content-Type: application/json" \
      -d "{\"customer_id\":$CUST_ID,\"subject\":\"wb-Ticket\",\"priority\":\"medium\",\"ticket_type\":\"service\",\"complaint_id\":$COMP_ID,\"description\":\"wb\"}")
    TICKET_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/tickets" \
      -H "Content-Type: application/json" \
      -d "{\"customer_id\":$CUST_ID,\"subject\":\"wb-Ticket\",\"priority\":\"medium\",\"ticket_type\":\"service\",\"complaint_id\":$COMP_ID,\"description\":\"wb\"}")
    TICKET_ID=$(echo "$TICKET_RESP" | grep -oP '"ticket_id":\s*\K[0-9]+' | head -1)
    if [ "$TICKET_CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
    RESULTS["wf2_ticket"]="$( [ "$TICKET_CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($TICKET_CODE)"
    echo "  wf2_ticket: ${RESULTS[wf2_ticket]} [ID: $TICKET_ID]"

    if [ -n "$TICKET_ID" ]; then
      sleep 0.3; check_endpoint "wf2_ticket_read" "$BASE/api/tickets/$TICKET_ID"

      sleep 0.3
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X PUT "$BASE/api/tickets/$TICKET_ID" \
        -H "Content-Type: application/json" -d '{"status":"assigned"}')
      if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
      RESULTS["wf2_assigned"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
      echo "  wf2_assigned: ${RESULTS[wf2_assigned]}"

      sleep 0.3
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X PUT "$BASE/api/tickets/$TICKET_ID" \
        -H "Content-Type: application/json" -d '{"status":"in_progress"}')
      if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
      RESULTS["wf2_in_progress"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
      echo "  wf2_in_progress: ${RESULTS[wf2_in_progress]}"

      sleep 0.3
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X PUT "$BASE/api/tickets/$TICKET_ID" \
        -H "Content-Type: application/json" -d '{"status":"closed"}')
      if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
      RESULTS["wf2_closed"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
      echo "  wf2_closed: ${RESULTS[wf2_closed]}"

      sleep 0.3
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" "$BASE/api/tickets?limit=5&status=closed")
      if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
      RESULTS["wf2_filter_closed"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
      echo "  wf2_filter_closed: ${RESULTS[wf2_filter_closed]}"
    fi
  fi

  echo ""
  echo "=== Workflow 3: AMC ==="

  sleep 0.3
  AMC_RESP=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/amc/contracts" \
    -H "Content-Type: application/json" \
    -d "{\"customer_id\":$CUST_ID,\"contract_type\":\"annual\",\"start_date\":\"2026-01-01\",\"end_date\":\"2027-01-01\",\"terms\":\"wb\"}")
  AMC_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/amc/contracts" \
    -H "Content-Type: application/json" \
    -d "{\"customer_id\":$CUST_ID,\"contract_type\":\"annual\",\"start_date\":\"2026-01-01\",\"end_date\":\"2027-01-01\",\"terms\":\"wb\"}")
  AMC_ID=$(echo "$AMC_RESP" | grep -oP '"amc_id":\s*\K[0-9]+' | head -1)
  if [ "$AMC_CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  RESULTS["wf3_amc"]="$( [ "$AMC_CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($AMC_CODE)"
  echo "  wf3_amc: ${RESULTS[wf3_amc]} [ID: $AMC_ID]"

  if [ -n "$AMC_ID" ]; then
    sleep 0.3; check_endpoint "wf3_amc_read" "$BASE/api/amc/contracts/$AMC_ID"

    sleep 0.3
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/amc/contracts/$AMC_ID/activate")
    if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
    RESULTS["wf3_activate"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
    echo "  wf3_activate: ${RESULTS[wf3_activate]}"

    sleep 0.3
    ASSET_RESP=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/amc/assets" \
      -H "Content-Type: application/json" \
      -d "{\"amc_id\":$AMC_ID,\"asset_type\":\"equipment\",\"serial_number\":\"wb-\",\"is_active\":true}")
    ASSET_RESP=$(curl -s --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/amc/assets" \
      -H "Content-Type: application/json" \
      -d "{\"amc_id\":$AMC_ID,\"asset_type\":\"equipment\",\"serial_number\":\"wb-$(date +%s)\",\"is_active\":true}")
    ASSET_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X POST "$BASE/api/amc/assets" \
      -H "Content-Type: application/json" \
      -d "{\"amc_id\":$AMC_ID,\"asset_type\":\"equipment\",\"serial_number\":\"wb-$(date +%s)\",\"is_active\":true}")
    ASSET_ID=$(echo "$ASSET_RESP" | grep -oP '"asset_id":\s*\K[0-9]+' | head -1)
    if [ "$ASSET_CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
    RESULTS["wf3_asset"]="$( [ "$ASSET_CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($ASSET_CODE)"
    echo "  wf3_asset: ${RESULTS[wf3_asset]} [ID: $ASSET_ID]"

    if [ -n "$ASSET_ID" ]; then
      sleep 0.3; check_endpoint "wf3_asset_read" "$BASE/api/amc/assets/$ASSET_ID"
      sleep 0.3; check_endpoint "wf3_asset_list" "$BASE/api/amc/assets?amc_id=$AMC_ID"
    fi

    sleep 0.3; check_endpoint "wf3_stats" "$BASE/api/amc/stats"

    sleep 0.3
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -b "$COOKIE" -c "$COOKIE" -X PUT "$BASE/api/amc/contracts/$AMC_ID" \
      -H "Content-Type: application/json" -d '{"terms":"wb-up"}')
    if [ "$CODE" = "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
    RESULTS["wf3_update"]="$( [ "$CODE" = "200" ] && echo 'PASS' || echo 'FAIL' )($CODE)"
    echo "  wf3_update: ${RESULTS[wf3_update]}"

    sleep 0.3; check_endpoint "wf3_filter" "$BASE/api/amc/contracts?customer_id=$CUST_ID"
  fi
else
  echo "SKIP WF2/WF3: no customer"
fi

TOTAL=$((PASS + FAIL))
VERDICT="PASS"
[ "$FAIL" -gt 0 ] && VERDICT="FAIL"

cat > "$RESULT" << JSONEOF
{
  "suite": "ProductionValidation",
  "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "server": "$BASE",
  "rbac_pass": $PASS,
  "rbac_fail": $FAIL,
  "rbac_total": $TOTAL,
  "verdict": "$VERDICT",
  "results": {
JSONEOF

# Append individual results
first=true
for key in "${!RESULTS[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$RESULT"
  fi
  echo "    \"$key\": \"${RESULTS[$key]}\"" >> "$RESULT"
done

cat >> "$RESULT" << JSONEOF
  }
}
JSONEOF

echo ""
echo "=========================================="
echo "RESULTS: $PASS/$TOTAL PASS, $FAIL FAIL"
echo "Verdict: $VERDICT"
echo "File: $RESULT"
echo "=========================================="
