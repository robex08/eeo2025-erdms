#!/bin/bash
# Start Development Environment

echo "🛑 Zastavuji produkční službu..."
systemctl stop eeo2025-api.service

echo ""
echo "✅ Produkční služba zastavena"
echo ""
echo "🚀 Spouštím development servery..."
echo ""

# Spusť server v novém terminalu
cd /var/www/eeo2025/server
echo "📦 Server: http://localhost:5000"
npm run dev &
SERVER_PID=$!

# Počkej chvíli než server nastartuje
sleep 3

# Spusť klienta v novém terminalu
cd /var/www/eeo2025/client
echo "🌐 Client: http://localhost:5173"
npm run dev &
CLIENT_PID=$!

echo ""
echo "════════════════════════════════════════════"
echo "✅ Development prostředí běží!"
echo "════════════════════════════════════════════"
echo "   Server: http://localhost:5000"
echo "   Client: http://localhost:5173"
echo ""
echo "Pro zastavení použij: ./dev-stop.sh"
echo "════════════════════════════════════════════"

# Ulož PID pro pozdější zastavení
echo $SERVER_PID > /tmp/eeo2025-server.pid
echo $CLIENT_PID > /tmp/eeo2025-client.pid
