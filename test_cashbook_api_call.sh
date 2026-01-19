#!/bin/bash

# Test API call pro user 53 (u06818)
# Nejdřív získáme token (simulujeme login)

echo "Testing cashbook API for user 53 (u06818)..."
echo ""

# Získat token - potřebujeme username a heslo
# Pro test použijeme curl na cashbook-list endpoint

TOKEN_FILE="/tmp/u06818_token.txt"

# Pokud máme uložený token, použijeme ho
if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE")
    echo "Using cached token: $TOKEN"
else
    echo "❌ Token file not found. Please login first or provide token manually."
    exit 1
fi

echo ""
echo "1️⃣ Testing cashbook-list endpoint..."
curl -X POST http://localhost:3000/api.eeo/cashbook-list \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"u06818\",\"token\":\"$TOKEN\"}" \
  2>/dev/null | jq '.' || echo "Failed or no jq"

echo ""
echo ""
echo "2️⃣ Testing cashbook-get endpoint for book_id=3..."
curl -X POST http://localhost:3000/api.eeo/cashbook-get \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"u06818\",\"token\":\"$TOKEN\",\"book_id\":3}" \
  2>/dev/null | jq '.' || echo "Failed or no jq"

