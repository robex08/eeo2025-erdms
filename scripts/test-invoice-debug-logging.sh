#!/bin/bash
# Test DEBUG logování v modulu Faktur
# Spusť tento skript a pak otevři modul Faktur v browseru

echo "╔═══════════════════════════════════════════════════════════════════"
echo "║ 🧪 TEST DEBUG LOGOVÁNÍ - MODUL FAKTUR"
echo "╚═══════════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  Otevři v browseru:"
echo "   https://erdms.zachranka.cz/dev/eeo-v2/"
echo ""
echo "2️⃣  Přepni se do modulu FAKTURY"
echo ""
echo "3️⃣  Sleduj log v reálném čase:"
echo ""
echo "================================ LOG START ================================"
echo ""

tail -f /var/log/apache2/erdms-dev-php-error.log
