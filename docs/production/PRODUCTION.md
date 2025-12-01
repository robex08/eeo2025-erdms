# 🚀 Spuštění ERDMS z produkční složky

## 📁 Build Struktura

```
/var/www/erdms/
├── index.html              # React aplikace (entry point)
├── assets/
│   ├── index-*.js         # JavaScript bundle (474 KB)
│   └── index-*.css        # CSS bundle (5 KB)
├── vite.svg
└── api/
    └── v1.0/
        ├── src/           # Server kód
        ├── node_modules/  # Dependencies
        ├── package.json
        └── .env           # Konfigurace (DUMMY hodnoty!)
```

## ⚠️ Důležité: Dummy konfigurace

**Aktuálně máš TESTOVACÍ hodnoty!**

Obě `.env` obsahují placeholder:
```
Client ID: 00000000-0000-0000-0000-000000000000
Tenant ID: 00000000-0000-0000-0000-000000000000
```

Po získání skutečných hodnot od kolegy:
```bash
# Aktualizuj v development:
nano /var/www/eeo2025/client/.env
nano /var/www/eeo2025/server/.env

# Rebuild a deploy:
cd /var/www/eeo2025/client && npm run build && cp -r dist/* /var/www/erdms/
cp /var/www/eeo2025/server/.env /var/www/erdms/api/v1.0/
```

---

## 🚀 Spuštění API serveru

### Development režim (z eeo2025):
```bash
cd /var/www/eeo2025/server
npm run dev
```

### Production režim (z erdms):
```bash
cd /var/www/erdms/api/v1.0
source ~/.nvm/nvm.sh
NODE_ENV=production node src/index.js
```

### Jako služba na pozadí:
```bash
cd /var/www/erdms/api/v1.0
source ~/.nvm/nvm.sh
nohup node src/index.js > /var/log/erdms-api.log 2>&1 &
echo $! > /var/run/erdms-api.pid
```

### Kontrola běžícího serveru:
```bash
# Je server online?
curl http://localhost:5000/api/health

# Odpověď:
{
  "status": "ok",
  "timestamp": "2025-12-01T22:11:38.021Z",
  "environment": "production"
}
```

### Zastavení serveru:
```bash
# Najdi PID
ps aux | grep "node src/index.js"

# Zastav
kill <PID>

# Nebo pokud máš .pid soubor:
kill $(cat /var/run/erdms-api.pid)
```

---

## 🌐 Spuštění Client (frontend)

### Development server (z eeo2025):
```bash
cd /var/www/eeo2025/client
npm run dev
# Běží na: http://localhost:3000
```

### Production (z erdms):

**Potřebuješ webserver!** (nginx, Apache, nebo jednoduchý HTTP server)

#### Varianta A: Python HTTP server (pro test)
```bash
cd /var/www/erdms
python3 -m http.server 8080
# Otevři: http://localhost:8080
```

#### Varianta B: npx serve
```bash
cd /var/www/erdms
npx serve -s . -p 8080
# Otevři: http://localhost:8080
```

#### Varianta C: nginx (doporučeno pro produkci)
```nginx
# /etc/nginx/sites-available/erdms
server {
    listen 80;
    server_name erdms.zachranka.cz;
    root /var/www/erdms;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 Testování buildu (bez EntraID)

### 1. Spusť API server:
```bash
cd /var/www/erdms/api/v1.0
source ~/.nvm/nvm.sh
node src/index.js
```

### 2. Spusť HTTP server pro client:
```bash
cd /var/www/erdms
python3 -m http.server 8080
```

### 3. Otevři prohlížeč:
```
http://localhost:8080
```

### Co uvidíš:
- ✅ Přihlašovací obrazovku
- ⚠️ Při kliknutí na "Přihlásit" - **CHYBA** (normální - dummy EntraID)
- Chyba v console: "Invalid client_id" nebo podobná

### To je OK! Očekává se, protože:
- Nemáš skutečné EntraID hodnoty
- Microsoft nerozpozná dummy Client ID
- Aplikace je připravená, jen čeká na konfiguraci

---

## 📊 Co funguje NYNÍ (před EntraID):

✅ **API Server:**
- Spustí se bez chyb
- Health check: `GET /api/health` → 200 OK
- Všechny endpointy jsou připravené

✅ **Client Build:**
- HTML se načte
- Přihlašovací UI se zobrazí
- JavaScript bundle funguje

❌ **Co nefunguje (čeká na EntraID):**
- Přihlášení přes Microsoft
- SSO
- Získání user údajů
- API volání s Bearer tokenem

---

## 🔐 Po získání EntraID hodnot:

### 1. Aktualizuj config v development:
```bash
# Client
cd /var/www/eeo2025/client
nano .env
# Vyplň skutečné: VITE_AZURE_CLIENT_ID, VITE_AZURE_TENANT_ID

# Server
cd /var/www/eeo2025/server
nano .env
# Vyplň skutečné: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET
```

### 2. Rebuild a deploy:
```bash
# Client rebuild
cd /var/www/eeo2025/client
npm run build
rm -rf /var/www/erdms/assets /var/www/erdms/index.html
cp -r dist/* /var/www/erdms/

# Server update
cp /var/www/eeo2025/server/.env /var/www/erdms/api/v1.0/
```

### 3. Restart serveru:
```bash
# Zastav starý
pkill -f "node src/index.js"

# Spusť nový
cd /var/www/erdms/api/v1.0
source ~/.nvm/nvm.sh
node src/index.js
```

### 4. Testuj:
```
http://localhost:8080
```
Nyní by mělo přihlášení fungovat! 🎉

---

## 📝 Build skripty (pro automatizaci)

Vytvoř v `/var/www/eeo2025/`:

**build-and-deploy.sh:**
```bash
#!/bin/bash
set -e

echo "🔨 Building client..."
cd /var/www/eeo2025/client
npm run build

echo "📦 Deploying client to erdms..."
rm -rf /var/www/erdms/assets /var/www/erdms/index.html /var/www/erdms/vite.svg
cp -r dist/* /var/www/erdms/

echo "📦 Deploying server to erdms..."
cp -r /var/www/eeo2025/server/src /var/www/erdms/api/v1.0/
cp /var/www/eeo2025/server/.env /var/www/erdms/api/v1.0/

echo "♻️  Restarting API server..."
pkill -f "node src/index.js" || true
cd /var/www/erdms/api/v1.0
source ~/.nvm/nvm.sh
nohup node src/index.js > /var/log/erdms-api.log 2>&1 &
echo $! > /var/run/erdms-api.pid

echo "✅ Build and deploy complete!"
echo "API: http://localhost:5000/api/health"
echo "Client: http://localhost:8080 (pokud běží HTTP server)"
```

**Použití:**
```bash
chmod +x /var/www/eeo2025/build-and-deploy.sh
/var/www/eeo2025/build-and-deploy.sh
```

---

## 🎯 Shrnutí

| Co | Status | Poznámka |
|----|--------|----------|
| **Build Client** | ✅ Hotovo | V `/var/www/erdms/` |
| **Deploy Server** | ✅ Hotovo | V `/var/www/erdms/api/v1.0/` |
| **Dependencies** | ✅ Nainstalované | 118 balíčků |
| **API běží** | ✅ Testováno | Health check OK |
| **Client HTML** | ✅ Načítá se | UI viditelné |
| **Přihlášení** | ⏳ Čeká na EntraID | Dummy hodnoty |

---

**Datum:** 1. prosince 2025  
**Status:** ✅ BUILD HOTOVÝ - čeká na EntraID konfiguraci
