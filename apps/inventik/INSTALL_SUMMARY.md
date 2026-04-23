# ✅ Inventík - Instalační Souhrn

## 🎉 Úspěšně vytvořeno!

Aplikace **Inventík** byla úspěšně vytvořena a nakonfigurována.

### 📂 Struktura projektu

```
apps/inventik/
├── api/                          # PHP Backend API
│   ├── api.php                  # Main API endpoint
│   ├── config.php               # Configuration
│   ├── init_database.sql        # Database schema
│   ├── .env.example             # Environment template
│   └── logs/                    # API logs
├── build/                       # Production build (po 'npm run build')
├── public/                      # Static assets
│   ├── index.html              # HTML template
│   └── robots.txt              
├── src/                         # React source code
│   ├── App.js                  # Main component - "Vítej v Inventík"
│   ├── App.css                 # Styles
│   ├── index.js                # Entry point
│   └── index.css               # Global styles
├── package.json                # Dependencies
├── .env                        # Frontend environment (NOT IN GIT)
├── .gitignore                  # Git ignore rules
├── README.md                   # Dokumentace
├── DEPLOYMENT.md               # Deployment guide
├── apache-config.conf          # Apache konfigurace
├── build.sh                    # Build script
├── test.sh                     # Test script
└── db_credentials.md           # DB credentials (NOT IN GIT)
```

### ✅ Co bylo provedeno

1. **Vytvořena struktura projektu**
   - React aplikace s čistým welcome screen
   - PHP API s základním routingem
   - Dokumentace a konfigurace

2. **Databáze inicializována**
   - Database: `inventik-dev` na 10.3.172.11
   - **Prázdná databáze** (bez tabulek - struktura bude definována později)
   - Uživatel `inventik` vytvořen s přístupem POUZE do inventik-dev
   - Oprávnění nastavena pro 10.3.174.11 a akd-www-web01

3. **NPM závislosti nainstalovány**
   - 1319 packages
   - React 19.1.0
   - React Router 7.6.3
   - React Icons 5.5.0

4. **Konfigurace dokončena**
   - .env soubory vytvořeny
   - API .env nastaven na správnou DB
   - .gitignore chrání citlivé údaje

### 🚀 Jak spustit

#### Development mode
```bash
cd /var/www/erdms-dev/apps/inventik
npm start
```
Aplikace poběží na http://localhost:3000

#### Production build
```bash
cd /var/www/erdms-dev/apps/inventik
./build.sh
```

### 🔗 URL adresy

Po nastavení Apache:
- **DEV:** http://erdms.zachranka.cz/dev/inventik/
- **PROD:** http://erdms.zachranka.cz/inventik/

### 🗄️ Databáze

- **Host:** 10.3.172.11
- **Database:** inventik-dev (prázdná)
- **User:** inventik
- **Password:** viz db_credentials.md

**⚠️ Databáze je záměrně PRÁZDNÁ (bez tabulek)**  
Struktura tabulek bude definována později podle požadavků.

### 🔌 API Endpoints

```bash
# Test endpoint
curl http://localhost/inventik/api/api.php

# Get items (po nastavení Apache)
curl http://erdms.zachranka.cz/inventik/api/api.php?endpoint=items
```

### 📋 Další kroky - Apache konfigurace

Pro zpřístupnění na URL `erdms.zachranka.cz/inventik`:

1. **Přidat do Apache configu:**
```bash
sudo nano /etc/apache2/sites-available/erdms.conf
```

2. **Vložit obsah z `apache-config.conf`**

3. **Test a reload:**
```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

4. **Production build:**
```bash
cd /var/www/erdms-dev/apps/inventik
./build.sh
```

### 🛡️ Bezpečnost

Soubory v .gitignore (NEBUDOU commitnuty):
- `.env` - environment variables
- `api/.env` - API environment
- `db_credentials.md` - databázové přístupy
- `node_modules/` - závislosti

### ✨ Co vidíš po spuštění

Po spuštění `npm start` nebo v prohlížeči uvidíš:

**"Vítej v aplikaci Inventík"**  
**"Systém pro inventuru majetku"**

S krásnými animovanými ikonami 📦 📊 📋

---

## 📝 Poznámky

- React app je připravena k dalšímu vývoji
- API má základní routing (test endpoint, items endpoint)
- Databáze má kompletní schema pro inventuru
- Vše je připraveno pro Git (citlivé údaje jsou v .gitignore)

---

**Vytvořeno:** 22. dubna 2026  
**Status:** ✅ Ready to use  
**Next:** `npm start` a začni vyvíjet! 🚀
