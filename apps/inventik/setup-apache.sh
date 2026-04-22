#!/bin/bash

# ============================================
# INVENTIK - Apache Setup Helper
# ============================================

echo "======================================"
echo "INVENTIK - Apache Configuration Helper"
echo "======================================"
echo ""

echo "📋 Instructions to add Inventik to Apache:"
echo ""
echo "1. Edit the main Apache config:"
echo "   sudo nano /etc/apache2/sites-available/erdms.conf"
echo ""
echo "2. Add the content from apache-config.conf"
echo "   Location in VirtualHost *:443 section (before DocumentRoot)"
echo ""
echo "3. Test Apache config:"
echo "   sudo apache2ctl configtest"
echo ""
echo "4. If OK, reload Apache:"
echo "   sudo systemctl reload apache2"
echo ""
echo "5. Build the app for production:"
echo "   cd /var/www/erdms-dev/apps/inventik"
echo "   ./build.sh"
echo ""
echo "6. Access the app:"
echo "   https://erdms.zachranka.cz/inventik/"
echo ""
echo "======================================"
echo ""
echo "📄 Apache config content:"
echo ""
cat apache-config.conf
