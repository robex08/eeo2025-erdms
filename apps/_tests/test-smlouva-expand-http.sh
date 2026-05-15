#!/bin/bash
# Test smlouva-expand endpoint přes HTTP
# Pro smlouvu S-253/75030926/2025 (id=57)

echo "=== SMLOUVA EXPAND HTTP TEST ==="
echo ""
echo "Testuji: POST /api.eeo/order-v3/smlouva-expand"
echo "Smlouva ID: 57 (S-253/75030926/2025)"
echo ""

# Získej token (z session nebo zadej ručně)
TOKEN="test-token-placeholder"
USERNAME="admin"
SMLOUVA_ID=57

# Zavolej endpoint
curl -X POST "http://localhost/dev/api.eeo/order-v3/smlouva-expand" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"username\": \"$USERNAME\",
    \"smlouva_id\": $SMLOUVA_ID
  }" \
  2>/dev/null | python3 -m json.tool 2>/dev/null || echo "❌ Chyba při parsování JSON"

echo ""
echo "✅ Test dokončen"
