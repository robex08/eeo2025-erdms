# Inventík - Deployment Guide

## 📋 Přehled

Aplikace Inventík je dostupná na:
- **Production:** https://erdms.zachranka.cz/inventik/
- **Development:** http://erdms.zachranka.cz/dev/inventik/ (React dev server na portu 3002)

## 🚀 Deployment krok za krokem

### 1. Příprava databáze

```bash
# Připojit se k DB serveru
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W'

# Vytvořit databázi a uživatele (spustí setup_database_user.sql)
SOURCE /var/www/erdms-dev/apps/inventik/api/setup_database_user.sql;

# NEBO z příkazové řádky:
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' < /var/www/erdms-dev/apps/inventik/api/setup_database_user.sql

# Ověřit
mysql -h 10.3.172.11 -u inventik -p'Inv3nt1k2026!' inventik-dev -e "SHOW TABLES;"
# Mělo by být prázdné (databázová struktura bude definována později)
```

### 2. Nastavení backendu (API)

```bash
cd /var/www/erdms-dev/apps/inventik/api

# Vytvořit .env soubor
cp .env.example .env

# Upravit .env pokud je potřeba (již má správné hodnoty)
nano .env

# Vytvořit logs složku
mkdir -p logs
chmod 755 logs
```

### 3. Nastavení frontendu

```bash
cd /var/www/erdms-dev/apps/inventik

# Vytvořit .env soubor
cp .env.example .env

# Zkontrolovat nastavení
cat .env
```

### 4. Instalace závislostí a build

```bash
cd /var/www/erdms-dev/apps/inventik

# Instalace NPM balíčků
npm install

# Build pro produkci
npm run build

# NEBO použít build script
chmod +x build.sh
./build.sh
```

### 5. Konfigurace Apache

```bash
# Zkopírovat config do hlavního Apache configu
# Obsah apache-config.conf přidat do /etc/apache2/sites-available/erdms.conf

sudo nano /etc/apache2/sites-available/erdms.conf

# Test konfigurace
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

### 6. Test aplikace

```bash
# Test API
curl http://erdms.zachranka.cz/inventik/api/api.php

# Mělo by vrátit JSON s verzí a statusem
```

**Otevřít v prohlížeči:**
- https://erdms.zachranka.cz/inventik/

## 🛠️ Development mode

Pro vývoj použij React dev server:

```bash
cd /var/www/erdms-dev/apps/inventik

# Spustit na portu 3002 (aby nekolidoval s EEO na 3000)
PORT=3002 npm start

# Aplikace běží na http://localhost:3002
# Apache proxy na http://erdms.zachranka.cz/dev/inventik/
```

## 📝 Checklist před deploymentem

- [ ] Databáze `inventik-dev` vytvořena
- [ ] API `.env` soubor nastaven
- [ ] Frontend `.env` soubor nastaven
- [ ] `npm install` dokončen
- [ ] `npm run build` úspěšný
- [ ] Apache config přidán do hlavního configu
- [ ] Apache restart bez chyb
- [ ] API endpoint funguje (curl test)
- [ ] Frontend se načte v prohlížeči
- [ ] Logs složka má správná oprávnění

## 🐛 Troubleshooting

### API vrací 500 Error
```bash
# Zkontrolovat PHP logy
tail -f /var/www/erdms-dev/apps/inventik/api/logs/php_errors.log

# Zkontrolovat Apache error log
sudo tail -f /var/log/apache2/error.log
```

### Frontend se nenačte
```bash
# Zkontrolovat build složku
ls -la /var/www/erdms-dev/apps/inventik/build/

# Zkontrolovat Apache config
sudo apache2ctl -S | grep inventik
```

### Databáze nefunguje
```bash
# Test připojení
mysql -h 10.3.172.11 -u inventik -p'Inv3nt1k2026!' inventik-dev -e "SELECT 1;"
```

---

**Aktualizováno:** 22. dubna 2026  
**Kontakt:** ERDMS Team
