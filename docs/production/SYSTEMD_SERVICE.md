# EEO2025 API Server - Systemd Service

## 🎯 Popis

Systemd service pro automatické spuštění a správu EEO2025 API serveru.

## 📋 Ovládání Service

### Základní příkazy:

```bash
# Spustit server
systemctl start eeo2025-api

# Zastavit server
systemctl stop eeo2025-api

# Restartovat server
systemctl restart eeo2025-api

# Zobrazit stav
systemctl status eeo2025-api

# Zobrazit logy
journalctl -u eeo2025-api -f

# Zobrazit posledních 100 řádků logů
journalctl -u eeo2025-api -n 100
```

### Automatický start po restartu:

```bash
# Povolit automatický start
systemctl enable eeo2025-api

# Zakázat automatický start
systemctl disable eeo2025-api

# Zjistit, zda je povolen automatický start
systemctl is-enabled eeo2025-api
```

## 🚀 První spuštění

```bash
# 1. Zastavit ručně spuštěné procesy
pkill -f "node.*index.js"

# 2. Spustit přes systemd
systemctl start eeo2025-api

# 3. Zkontrolovat stav
systemctl status eeo2025-api

# 4. Povolit automatický start po restartu
systemctl enable eeo2025-api
```

## ✅ Výhody systemd service:

- ✅ **Automatický restart** - při pádu aplikace se automaticky restartuje (po 10 sekundách)
- ✅ **Start po restartu** - automaticky nabíhá po restartu serveru (pokud enabled)
- ✅ **Centrální logování** - logy v journald (systemctl logs)
- ✅ **Správa přes systemctl** - standardní Linux nástroj
- ✅ **Bezpečnost** - NoNewPrivileges, PrivateTmp

## 📊 Kontrola běhu:

```bash
# Je server zapnutý?
systemctl is-active eeo2025-api

# Detailní informace
systemctl show eeo2025-api

# Sledovat logy v reálném čase
journalctl -u eeo2025-api -f --since "5 minutes ago"
```

## 🔧 Konfigurace

**Soubor:** `/etc/systemd/system/eeo2025-api.service`

```ini
[Unit]
Description=EEO2025 API Server - Microsoft Entra ID Authentication
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/eeo2025/server
Environment="NODE_ENV=production"
ExecStart=/root/.nvm/versions/node/v20.19.6/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Po změně konfigurace:

```bash
# Znovu načíst konfiguraci
systemctl daemon-reload

# Restartovat service
systemctl restart eeo2025-api
```

## 🛑 Zastavení a vypnutí:

```bash
# Zastavit server
systemctl stop eeo2025-api

# Zakázat automatický start
systemctl disable eeo2025-api

# Obojí najednou
systemctl disable --now eeo2025-api
```

## 📝 Typické scénáře:

### Vývoj (lokální):
```bash
# Vypnout systemd service
systemctl stop eeo2025-api
systemctl disable eeo2025-api

# Spustit ručně
cd /var/www/eeo2025/server
npm run dev
```

### Produkce:
```bash
# Zapnout systemd service
systemctl enable eeo2025-api
systemctl start eeo2025-api

# Ověřit běh
systemctl status eeo2025-api
curl http://localhost:5000/api/health
```

### Po update kódu:
```bash
# Jednoduchý restart
systemctl restart eeo2025-api

# Nebo s kontrolou
systemctl stop eeo2025-api
# ... zkontrolovat/testovat ...
systemctl start eeo2025-api
```

## 🔍 Diagnostika problémů:

```bash
# Kompletní logy od posledního startu
journalctl -u eeo2025-api -b

# Chybové logy
journalctl -u eeo2025-api -p err

# Export logů do souboru
journalctl -u eeo2025-api > /tmp/eeo2025-logs.txt

# Sledovat v reálném čase
journalctl -u eeo2025-api -f
```

## 🎛️ Současný stav vs. Systemd:

### Před (nohup):
```bash
cd /var/www/erdms/api/v1.0
nohup node src/index.js > server.log 2>&1 & echo $! > server.pid
```
- ❌ Při restartu serveru se nezapne
- ❌ Při pádu aplikace se nerestartuje
- ❌ Komplikovaná správa
- ✅ Funguje i po zavření terminálu

### Po (systemd):
```bash
systemctl start eeo2025-api
```
- ✅ Automatický start po restartu (pokud enabled)
- ✅ Automatický restart při pádu
- ✅ Centrální správa a logování
- ✅ Standardní Linux nástroj

## 🔐 Doporučení:

### Pro produkci:
```bash
systemctl enable eeo2025-api  # Automatický start
systemctl start eeo2025-api   # Spustit
```

### Pro vývoj:
```bash
systemctl disable eeo2025-api  # Zakázat auto-start
systemctl stop eeo2025-api     # Zastavit
npm run dev                     # Spustit ručně
```
