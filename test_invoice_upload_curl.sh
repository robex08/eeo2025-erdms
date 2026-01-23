#!/bin/bash
# Test invoice attachment upload endpoint

echo "=== TEST INVOICE ATTACHMENT UPLOAD ==="
echo ""

# Get token first (you'll need to provide valid credentials)
TOKEN="test_token_from_login"
USERNAME="admin"
INVOICE_ID=78

# Create a test file
echo "Test file content" > /tmp/test_upload.txt

# Try to upload
echo "Attempting to upload to: http://localhost:3001/api.eeo/order-v2/invoices/${INVOICE_ID}/attachments/upload"
echo ""

curl -X POST \
  "http://localhost:3001/api.eeo/order-v2/invoices/${INVOICE_ID}/attachments/upload" \
  -F "file=@/tmp/test_upload.txt" \
  -F "token=${TOKEN}" \
  -F "username=${USERNAME}" \
  -v

echo ""
echo "=== END TEST ==="
