#!/bin/bash
# Test API endpoint přímo

# POZNÁMKA: Nahraďte TOKEN a USERNAME skutečnými hodnotami
# Můžete je získat z browser console: localStorage.getItem('token')

TOKEN="test-token-replace-me"
USERNAME="test-user"

curl -X POST "http://localhost/api/notify/email" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'$TOKEN'",
    "username": "'$USERNAME'",
    "to": "robert.holovsky@zachranka.cz",
    "subject": "Test z curl API",
    "body": "Toto je testovací email odeslaný přímo přes API",
    "from_email": "webmaster@zachranka.cz",
    "html": false
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s
