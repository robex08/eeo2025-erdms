#!/bin/bash
# Simulace frontend requestu - MUSÍTE ZADAT PLATNÝ TOKEN!

echo "=== TEST API ENDPOINT (simulace frontend) ==="
echo ""
echo "POZNÁMKA: Otevřete browser console a spusťte:"
echo "  localStorage.getItem('token')"
echo ""
read -p "Zadejte TOKEN: " TOKEN
read -p "Zadejte USERNAME: " USERNAME

echo ""
echo "Odesílám request..."
echo ""

curl -X POST "https://erdms.zachranka.cz/api.eeo/api.php?action=notify/email" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"username\": \"$USERNAME\",
    \"to\": \"robert.holovsky@zachranka.cz\",
    \"subject\": \"Test z curl (simulace frontend)\",
    \"body\": \"Toto je test email odeslaný curl requestem který simuluje frontend.\",
    \"from_email\": \"webmaster@zachranka.cz\",
    \"html\": false
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | tee /tmp/api-test-output.log

echo ""
echo "=== VÝSLEDEK ==="
cat /tmp/api-test-output.log | grep -E "HTTP|sent|err" | tail -5
