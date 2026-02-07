#!/bin/bash
# Stop Development Environment and Start Production

echo "🛑 Zastavuji development servery..."

# Zabij všechny node/npm procesy související s projektem
pkill -f "nodemon.*eeo2025"
pkill -f "vite.*development"

# Cleanup PID files
rm -f /tmp/eeo2025-server.pid
rm -f /tmp/eeo2025-client.pid

echo "✅ Development servery zastaveny"
echo ""
echo "🚀 Spouštím produkční službu..."
systemctl start eeo2025-api.service

sleep 2

# Zkontroluj status
echo ""
systemctl status eeo2025-api.service --no-pager -l

echo ""
echo "════════════════════════════════════════════"
echo "✅ Produkční služba běží!"
echo "════════════════════════════════════════════"
