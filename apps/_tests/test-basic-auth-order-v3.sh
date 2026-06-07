#!/bin/bash
# Test Basic Auth pro Order V3 endpoint
# Použití: ./test-basic-auth-order-v3.sh

echo "🧪 Test Basic Auth pro /order-v3/list endpoint"
echo "============================================="
echo ""

# Konfigurace
API_URL="https://erdms.zachranka.cz/dev/api.eeo/order-v3/list"
USERNAME="alice"  # Změň na skutečné uživatelské jméno
PASSWORD="your_password"  # Změň na skutečné heslo

echo "📡 Volám: $API_URL"
echo "👤 Username: $USERNAME"
echo ""

# Test 1: Basic Auth v header
echo "TEST 1: Basic Auth v Authorization header"
echo "-----------------------------------------"
curl -s -X POST \
  -u "$USERNAME:$PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$API_URL" | jq '.'

echo ""
echo ""

# Test 2: Bearer Token v header (pokud máš existující token)
# echo "TEST 2: Bearer Token v Authorization header"
# echo "--------------------------------------------"
# BEARER_TOKEN="your_existing_token_here"  # Zadej existující token
# curl -s -X POST \
#   -H "Authorization: Bearer $BEARER_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{"username":"alice"}' \
#   "$API_URL" | jq '.'

echo ""
echo "✅ Test dokončen"
echo ""
echo "📋 Pro kontrolu logů:"
echo "tail -50 /var/www/erdms-dev/logs/php-error.log | grep -E 'Auth|verify_basic_auth|extract_auth'"
