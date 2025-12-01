# ✅ ERDMS - Produkční nasazení dokončeno

## 🎯 Co je hotové:

### 1. **Client Build** → `/var/www/erdms/`
- ✅ React aplikace zbuildována
- ✅ Statické soubory připraveny
- ✅ Apache VirtualHost nakonfigurován

### 2. **API Server** → `/var/www/erdms/api/v1.0/`
- ✅ Express API nasazeno
- ✅ Dependencies nainstalovány
- ✅ Server běží na portu 5000

### 3. **Apache konfigurace**
- ✅ VirtualHost: `erdms.zachranka.cz`
- ✅ DocumentRoot: `/var/www/erdms/`
- ✅ API proxy: `/api → localhost:5000/api`
- ✅ SSL certifikát: Aktivní
- ✅ SPA routing: Funguje (FallbackResource)

---

## 🌐 Přístup k aplikaci:

### Produkční URL:
```
https://erdms.zachranka.cz
```

### Co uvidíš:
- Přihlašovací obrazovku ERDMS
- Tlačítko "Přihlásit se přes Microsoft"

### Co zatím nefunguje:
⚠️ **Přihlášení vrátí chybu** - normální, protože:
- Dummy EntraID hodnoty (00000000-0000-0000...)
- Microsoft nerozpozná Client ID
- Čeká na skutečné hodnoty od kolegy

---

## 🔧 Kontrola běžících služeb:

### Apache:
```bash
systemctl status apache2
```
**Status:** ✅ Aktivní

### API Server:
```bash
curl http://localhost:5000/api/health
```
**Odpověď:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T22:19:34.758Z",
  "environment": "development"
}
```
**Status:** ✅ Běží (PID: 354121)

### Restart API:
```bash
# Zastav
kill $(cat /var/run/erdms-api.pid)

# Spusť
cd /var/www/erdms/api/v1.0
source ~/.nvm/nvm.sh
nohup node src/index.js > /var/log/erdms-api.log 2>&1 &
echo $! > /var/run/erdms-api.pid
```

### Logy:
```bash
# Apache logy
tail -f /var/log/apache2/erdms-443-ssl-access.log
tail -f /var/log/apache2/erdms-443-ssl-error.log

# API logy
tail -f /var/log/erdms-api.log
```

---

## 🔄 Rebuild po změnách:

Když dostaneš EntraID hodnoty nebo změníš kód:

```bash
# 1. Aktualizuj .env v development
nano /var/www/eeo2025/client/.env
nano /var/www/eeo2025/server/.env

# 2. Rebuild client
cd /var/www/eeo2025/client
npm run build

# 3. Deploy
rm -rf /var/www/erdms/assets /var/www/erdms/index.html
cp -r dist/* /var/www/erdms/

# 4. Update server config
cp /var/www/eeo2025/server/.env /var/www/erdms/api/v1.0/

# 5. Restart API
kill $(cat /var/run/erdms-api.pid)
cd /var/www/erdms/api/v1.0
source ~/.nvm/nvm.sh
nohup node src/index.js > /var/log/erdms-api.log 2>&1 &
echo $! > /var/run/erdms-api.pid

# 6. Clear browser cache a refresh
```

---

## 📁 Soubory:

### Apache konfigurace:
- `/etc/apache2/sites-available/001-erdms.zachranka.cz.conf` - VirtualHost
- `/etc/apache2/sites-available/erdms-proxy-production.inc` - Produkční nastavení
- `/etc/apache2/sites-available/erdms-proxy.inc.backup` - Záloha původní konfigurace

### Build:
- `/var/www/erdms/index.html` - HTML entry point
- `/var/www/erdms/assets/` - JS a CSS bundly

### API:
- `/var/www/erdms/api/v1.0/src/` - Server kód
- `/var/www/erdms/api/v1.0/.env` - Konfigurace (DUMMY hodnoty)
- `/var/run/erdms-api.pid` - Process ID běžícího serveru
- `/var/log/erdms-api.log` - API logy

---

## ✅ Shrnutí:

| Služba | Status | URL |
|--------|--------|-----|
| **Apache** | ✅ Běží | https://erdms.zachranka.cz |
| **Client** | ✅ Nasazeno | https://erdms.zachranka.cz |
| **API** | ✅ Běží | http://localhost:5000 |
| **SSL** | ✅ Aktivní | Let's Encrypt |
| **EntraID** | ⏳ Čeká | Dummy hodnoty |

---

## 🎉 Můžeš otevřít:

```
https://erdms.zachranka.cz
```

Aplikace se načte, ale přihlášení nebude fungovat dokud nezískáš skutečné EntraID údaje od kolegy.

**To je normální a očekávané!** ✅

---

**Datum nasazení:** 1. prosince 2025  
**Status:** ✅ PRODUKČNÍ BUILD AKTIVNÍ
