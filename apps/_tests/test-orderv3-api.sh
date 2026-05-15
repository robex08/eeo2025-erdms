#!/bin/bash
# Test Order V3 API endpoint

echo "🧪 Testing Order V3 API refactored version..."

# Test 1: Basic list endpoint
echo ""
echo "📋 Test 1: Basic list (first page)"
curl -X POST http://localhost/api.eeo/order-v3/list \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test_token_placeholder",
    "username": "test@example.com",
    "page": 1,
    "per_page": 5,
    "period": "all"
  }' \
  -s -o /tmp/orderv3_test1.json

if [ $? -eq 0 ]; then
  echo "✅ API call successful"
  echo "Response preview:"
  jq '.status, .data.pagination, .data.orders | length' /tmp/orderv3_test1.json 2>/dev/null || cat /tmp/orderv3_test1.json
else
  echo "❌ API call failed"
fi

echo ""
echo "🔍 Check PHP error log for issues:"
tail -20 /var/www/erdms-dev/logs/php-error.log | grep -i "OrderV3\|Fatal\|Parse error"
