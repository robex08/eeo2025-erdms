#!/bin/bash
# Sledování DEV error logů v reálném čase

echo "=== Sledování DEV Error Logů ==="
echo "PHP Errors: /var/log/apache2/erdms-dev-php-error.log"
echo "Apache Debug: /var/log/apache2/erdms-dev-debug.log"
echo "---"
echo "Stiskni Ctrl+C pro ukončení"
echo ""

tail -f /var/log/apache2/erdms-dev-php-error.log \
        /var/log/apache2/erdms-dev-debug.log
