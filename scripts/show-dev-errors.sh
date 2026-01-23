#!/bin/bash
# Zobrazení posledních errorů z DEV logů

LINES=${1:-50}

echo "=== Poslední $LINES řádků z DEV PHP Error Logu ==="
tail -n $LINES /var/log/apache2/erdms-dev-php-error.log 2>/dev/null || echo "Log neexistuje nebo nemáte přístup"
echo ""
echo "=== Poslední $LINES řádků z DEV Apache Debug Logu ==="
tail -n $LINES /var/log/apache2/erdms-dev-debug.log 2>/dev/null || echo "Log neexistuje nebo nemáte přístup"
