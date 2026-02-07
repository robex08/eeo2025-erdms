#!/bin/bash
# Test script pro Orders V3 API
# Testuje parsování financování a stav_workflow_kod

# Přidej sem validní token a username
TOKEN="validni_token_zde"
USERNAME="validni_username_zde"

echo "================================================"
echo "Test Orders V3 API - Parsování dat"
echo "================================================"
echo ""

# Test 1: List orders
echo "1. Testing /order-v3/list endpoint..."
curl -X POST "http://localhost/api.eeo/order-v3/list" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"username\": \"$USERNAME\",
    \"page\": 1,
    \"per_page\": 5,
    \"year\": 2025
  }" \
  -s | jq '.' > /tmp/orders_v3_test.json

echo "Response saved to /tmp/orders_v3_test.json"
echo ""

# Kontrola struktury financování
echo "2. Checking financovani structure (should be object, not string)..."
FINANCOVANI_TYPE=$(jq -r '.data.orders[0].financovani | type' /tmp/orders_v3_test.json 2>/dev/null)
echo "   financovani type: $FINANCOVANI_TYPE"

if [ "$FINANCOVANI_TYPE" == "object" ] || [ "$FINANCOVANI_TYPE" == "null" ]; then
  echo "   ✅ OK - financovani is object or null"
else
  echo "   ❌ ERROR - financovani should be object, got: $FINANCOVANI_TYPE"
fi
echo ""

# Kontrola struktury stav_workflow_kod
echo "3. Checking stav_workflow_kod structure (should be array, not string)..."
STAV_TYPE=$(jq -r '.data.orders[0].stav_workflow_kod | type' /tmp/orders_v3_test.json 2>/dev/null)
echo "   stav_workflow_kod type: $STAV_TYPE"

if [ "$STAV_TYPE" == "array" ] || [ "$STAV_TYPE" == "null" ]; then
  echo "   ✅ OK - stav_workflow_kod is array or null"
else
  echo "   ❌ ERROR - stav_workflow_kod should be array, got: $STAV_TYPE"
fi
echo ""

# Ukázat první objednávku
echo "4. First order sample:"
jq '.data.orders[0] | {
  id, 
  cislo_objednavky, 
  financovani, 
  stav_workflow_kod,
  objednatel_jmeno,
  garant_jmeno
}' /tmp/orders_v3_test.json
echo ""

echo "================================================"
echo "Test complete. Full response in /tmp/orders_v3_test.json"
echo "================================================"
