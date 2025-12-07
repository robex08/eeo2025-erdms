#!/bin/bash
# Test API endpointu pro odeslání emailu

echo "=== TEST API ENDPOINT /api/notify-email ==="
echo ""

# Získej token (předpokládáme, že máte přihlášení)
TOKEN="your-token-here"
USERNAME="your-username"

# Pokud nemáme token, zkus přečíst z localStorage (manuálně)
echo "POZNÁMKA: Musíte zadat svůj token a username"
echo ""
echo "Otevřete Developer Console v prohlížeči a spusťte:"
echo "  console.log(localStorage.getItem('token'))"
echo "  console.log(localStorage.getItem('username'))"
echo ""
echo "Pak spusťte:"
echo ""
echo "curl -X POST http://localhost/api/notify-email \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"token\": \"VÁŠ-TOKEN\","
echo "    \"username\": \"VAŠE-USERNAME\","
echo "    \"to\": \"robert.holovsky@zachranka.cz\","
echo "    \"subject\": \"Test z curl\","
echo "    \"body\": \"Test zpráva\","
echo "    \"from_email\": \"webmaster@zachranka.cz\","
echo "    \"html\": false"
echo "  }'"
echo ""
