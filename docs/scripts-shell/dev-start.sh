#!/bin/bash
# ERDMS Development Start Script
echo "🚀 Spouštím ERDMS development servery..."
cd /var/www/erdms-dev
pkill -f "node.*auth-api" || true
pkill -f "vite.*dashboard" || true
sleep 2

# Auth API (port 3000)
cd /var/www/erdms-dev/auth-api
npm run dev > /tmp/erdms-auth-api.log 2>&1 &
echo "🔐 Auth API: http://localhost:3000 (PID: $!)"

# Dashboard (port 5173)
cd /var/www/erdms-dev/dashboard
npm run dev > /tmp/erdms-dashboard.log 2>&1 &
echo "🏠 Dashboard: http://localhost:5173 (PID: $!)"

sleep 3
echo "✅ Servery spuštěny! Logy: tail -f /tmp/erdms-*.log"
