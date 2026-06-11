#!/bin/bash
cd "$(dirname "$0")"
PORT=${1:-3010}
echo "Starting HiSecure ERP on port $PORT..."
PORT=$PORT node server-fastify.js &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 5
# Health check
curl -s http://localhost:$PORT/api/health
echo ""
# Auth + test endpoints
COOKIE=$(mktemp)
curl -s -c "$COOKIE" -X POST http://localhost:$PORT/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
echo ""
echo "=== Session ==="
curl -s -b "$COOKIE" http://localhost:$PORT/api/auth/session
echo ""
echo "=== Ticket Stats ==="
curl -s -b "$COOKIE" http://localhost:$PORT/api/tickets/stats
echo ""
echo "=== Tickets (limit 3) ==="
curl -s -b "$COOKIE" "http://localhost:$PORT/api/tickets?limit=3"
echo ""
echo "=== AMC Stats ==="
curl -s -b "$COOKIE" http://localhost:$PORT/api/amc/stats
echo ""
echo "Server running on http://localhost:$PORT (PID $SERVER_PID)"
