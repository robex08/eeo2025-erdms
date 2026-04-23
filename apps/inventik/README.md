# Inventík - Aplikace pro inventuru majetku

Webová aplikace pro správu a inventuru majetku v organizaci.

## 🚀 Struktura projektu

```
inventik/
├── api/                    # PHP Backend API
│   ├── api.php            # Main API endpoint
│   ├── config.php         # Configuration
│   ├── .env.example       # Environment template
│   └── logs/              # API logs
├── build/                 # Production build (generováno)
├── public/                # Static assets
├── src/                   # React source code
│   ├── App.js            # Main App component
│   ├── App.css           # Main styles
│   ├── index.js          # Entry point
│   └── index.css         # Global styles
├── package.json          # NPM dependencies
├── .env.example          # Frontend env template
└── db_credentials.md     # Database credentials (NOT IN GIT!)
```

## 📦 Instalace

### 1. Nainstalovat závislosti

```bash
cd /var/www/erdms-dev/apps/inventik
npm install
```

### 2. Vytvořit .env soubory

```bash
# Frontend
cp .env.example .env

# Backend
cp api/.env.example api/.env
```

### 3. Vytvořit databázi a uživatele

**POZOR:** Databázová struktura bude definována později!

```bash
# Vytvořit databázi a uživatele
mysql -h 10.3.172.11 -u phpmyadmin -p'7BI2X5DSzC1W' < api/setup_database_user.sql

# Ověřit
mysql -h 10.3.172.11 -u inventik -p'Inv3nt1k2026!' inventik-dev -e "SHOW TABLES;"
# Mělo by být prázdné (žádné tabulky)
```

## 🏃 Spuštění

### Development mode

```bash
npm start
```

Aplikace poběží na `http://localhost:3000`

### Production build

```bash
npm run build
```

Build se vytvoří ve složce `build/`

## 🌐 URL adresy

- **DEV:** http://erdms.zachranka.cz/dev/inventik/
- **PROD:** http://erdms.zachranka.cz/inventik/

## 📚 API Endpoints

### Test endpoint
```
GET /inventik/api/api.php?endpoint=test
```

### Položky inventáře
```
GET /inventik/api/api.php?endpoint=items
```

## 🗄️ Databáze

- **Host:** 10.3.172.11
- **Database:** inventik-dev
- **User:** inventik
- **Password:** viz `db_credentials.md`
- **Credentials:** Dedikovaný uživatel s přístupem pouze do inventik-dev

### ✅ Data importována (22.4.2026):
- **68 budov** - objekty/budovy organizace
- **89 inventárních úseků** - organizační jednotky
- **2,098 místností** - místnosti v budovách
- **17,100 položek majetku** - kompletní evidence

### Tabulky:
- `budovy` - číselník budov
- `inventarni_useky` - číselník org. jednotek
- `mistnosti` - číselník místností
- `majetek` - hlavní tabulka majetku (43 sloupců z CSV)
- `v_majetek_prehled` - VIEW s kompletními údaji

### Testovací dotazy:
```bash
# Připojení
mysql -h 10.3.172.11 -u inventik -p'Inv3nt1k2026!' inventik-dev

# Ukázka dat
SELECT * FROM v_majetek_prehled LIMIT 10;

# Více viz: podklady/TEST_QUERIES.sql
```

## 🔧 Apache konfigurace

Aplikace je zpřístupněna přes Apache na URL `/inventik`.  
Konfigurace je v `/etc/apache2/sites-available/erdms-inventik.conf`

## 📝 TODO

- [x] Vytvořit databázi a uživatele
- [x] Importovat CSV data (budovy, inv.úseky, místnosti, majetek)
- [x] Vytvořit databázové schéma (4 tabulky)
- [x] Vytvořit VIEW pro přehledy
- [ ] Implementovat API endpointy pro čtení dat
- [ ] Vytvořit React komponenty pro zobrazení
- [ ] Implementovat vyhledávání a filtrace
- [ ] Přidat export do Excel/PDF
- [ ] Vytvořit separátní tabulku pro editaci (budoucnost)

---

**Verze:** 1.0.0  
**Vytvořeno:** 22. dubna 2026  
**Tým:** ERDMS Development
