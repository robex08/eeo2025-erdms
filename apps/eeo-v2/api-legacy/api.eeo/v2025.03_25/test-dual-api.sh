#!/bin/bash
# Test skript pro dual-template notifikace

echo "🧪 TEST: Dual-template notifikační API"
echo "========================================"
echo ""

# Token (nahraď svým platným tokenem z frontendu)
TOKEN="replace_with_your_token"

# Testovací data
curl -X POST "http://localhost/api.eeo/api.php?action=notifications/send-dual" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'$TOKEN'",
    "username": "robert.holovsky",
    "notification_type": "order_status_ke_schvaleni",
    "order_id": 12345,
    "recipients": [
      {
        "user_id": 25,
        "type": "APPROVER",
        "email": "prikazce@zachranka.cz"
      },
      {
        "user_id": 10,
        "type": "SUBMITTER",
        "email": "garant@zachranka.cz"
      }
    ],
    "placeholders": {
      "order_id": "12345",
      "order_number": "O-0001/75030926/2025/PTN",
      "predmet": "SENESI - Mapei MAPESIL AC 150 ŽLUTÁ 310 ml",
      "user_name": "Jan Novák",
      "approver_name": "Petra Svobodová",
      "dodavatel_nazev": "SENESI, SE",
      "financovani": "LPIT1 - Spotřeba materiálu",
      "amount": "15 000,50 Kč",
      "date": "07.12.2025"
    }
  }' | jq '.'

echo ""
echo "✅ Test dokončen!"
echo ""
echo "📝 Zkontrolujte:"
echo "   1. PHP error log: tail -f /var/log/apache2/error.log"
echo "   2. Emailové schránky příjemců"
echo "   3. /tmp/email_*.html preview soubory"
