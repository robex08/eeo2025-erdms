# 📋 DEPLOYMENT SUMMARY - Duben 2026
**Datum:** 18. dubna 2026  
**Prostředí:** DEV → PROD  
**Čas nasazení:** ~50 minut

---

## 🎯 CO NASAZUJEME (SHRNUTÍ)

### 1. **Entra ID / Microsoft 365 Autentizace** 🔐
- ✅ Kompletní integrace s Azure AD
- ✅ SSO (Single Sign-On) přes Microsoft účty
- ✅ Auto-provisioning uživatelů z AD skupin
- ✅ Info panel na login stránce pro uživatele
- ✅ Fallback na lokální přihlášení

### 2. **Faktury - Rozšíření funkcí** 📄
- ✅ Věcná správnost per faktura (potvrzení + poznámky)
- ✅ Systém příloh faktur
- ✅ Rozšířené filtrování a vyhledávání
- ✅ Dashboard refresh control

### 3. **Dashboard - Aktivní uživatelé** 👥
- ✅ Admin widget pro sledování aktivních uživatelů
- ✅ Zobrazení poslední aktivity
- ✅ Oprávnění DASHBOARD_ACTIVE_USERS
- ✅ Auto refresh každých 30s

### 4. **Komentáře objednávek** 💬
- ✅ Editace komentářů
- ✅ Notifikace při odpovědi na komentář
- ✅ Event types: ORDER_COMMENT_ADDED, COMMENT_REPLY
- ✅ Šablony notifikací

### 5. **UI/UX Vylepšení** ✨
- ✅ Dashboard refresh control
- ✅ Invoice list improvements
- ✅ Better error handling

---

## 📊 STATISTIKY ZMĚN

| Kategorie | Počet souborů | Důležitost |
|-----------|---------------|------------|
| **Backend PHP** | 12 souborů | 🔴 KRITICKÁ |
| **Frontend React** | 5 souborů | 🟡 VYSOKÁ |
| **DB Migrace** | 4 skripty | 🔴 KRITICKÁ |
| **ENV Config** | 2 soubory | 🟡 VYSOKÁ |

---

## 🗄️ DATABÁZOVÉ ZMĚNY

### Nové sloupce:
- `25a_objednavky_komentare.dt_aktualizace` (DATETIME)
- `25a_faktury_objednavek.potvrzeni_vecne_spravnosti` (ENUM)
- `25a_faktury_objednavek.potvrzeno_uzivatel_id` (INT)
- `25a_faktury_objednavek.potvrzeno_datum` (DATETIME)
- `25a_faktury_objednavek.vecna_spravnost_umisteni_majetku` (TEXT)
- `25a_faktury_objednavek.vecna_spravnost_poznamka` (TEXT)

### Nová práva:
- `DASHBOARD_ACTIVE_USERS` - Dashboard aktivních uživatelů

### Nové event types:
- `ORDER_COMMENT_ADDED` - Přidání komentáře k objednávce
- `COMMENT_REPLY` - Odpověď na komentář

### Nové šablony notifikací:
- Template: `ORDER_COMMENT_ADDED`
- Template: `COMMENT_REPLY`

---

## 📦 BACKEND API ZMĚNY

### Nové soubory:
```
api-legacy/api.eeo/v2025.03_25/lib/
└── entraAuthHandlers.php           🆕 NOVÝ - Entra ID autentizace
```

### Upravené soubory:
```
api-legacy/api.eeo/v2025.03_25/lib/
├── systemAuthHandlers.php          ✏️  Auth config endpoint
├── globalSettingsHandlers.php      ✏️  Entra nastavení
├── dashboardHandlers.php           ✏️  Active users endpoint
├── userDetailHandlers.php          ✏️  Extended user detail
├── invoiceHandlers.php             ✏️  Věcná správnost
├── orderV2InvoiceHandlers.php      ✏️  Invoice attachments
├── orderV3Handlers.php             ✏️  Komentáře s editací
├── handlers.php                    ✏️  General fixes
└── queries.php                     ✏️  SQL queries update
```

### Nové endpointy:
```
POST /api.eeo/v2.0/auth/entra-callback          # Entra callback handler
POST /api.eeo/v2.0/system/auth-config           # Auth konfigurace
POST /api.eeo/v2.0/dashboard/active-users       # Admin dashboard
```

---

## 🎨 FRONTEND ZMĚNY

### Upravené komponenty:
```
client/src/
├── pages/
│   ├── DashboardPage.js                ✏️  Refresh + active users widget
│   ├── Invoices25List.js               ✏️  Přílohy, refresh, UI
│   └── Login.js                        ✏️  Info panel pro M365
└── utils/
    └── dashboardRefresh.js             🆕 NOVÝ - Refresh helper
```

### ENV Variables:
**Frontend:** `.env.production`
```env
REACT_APP_API_BASE_URL=/api
REACT_APP_API2_BASE_URL=/api.eeo/
REACT_APP_VERSION=2.40-PROD
APP_ENV=production
```

**Backend:** `api.eeo/.env.production`
```env
DB_HOST=10.3.172.11
DB_NAME=eeo2025
UPLOAD_ROOT_PATH=/var/www/erdms-data/
APP_ENV=production
```

---

## ⚡ QUICK START GUIDE

### 1️⃣ BACKUP (10 min)
```bash
mkdir -p /var/www/__BCK_PRODUKCE/deploy-2026-04-18
mysqldump -h 10.3.172.11 -u erdms_user -p eeo2025 | gzip > \
  /var/www/__BCK_PRODUKCE/deploy-2026-04-18/db-eeo2025-$(date +%Y%m%d-%H%M%S).sql.gz

rsync -av /var/www/erdms-platform/apps/eeo-v2/ \
  /var/www/__BCK_PRODUKCE/deploy-2026-04-18/eeo-v2-backup/
```

### 2️⃣ DB MIGRACE (5 min)
```bash
cd /var/www/erdms-dev/apps/eeo-v2

# Ověření před migrací
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < VERIFY_DB_MIGRATIONS.sql

# Spuštění migrací
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < SQL_MIGRATION_COMMENTS_NOTIFICATIONS.sql
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < \
  api-legacy/api.eeo/migrations/2026-04-13_dashboard_active_users_permission.sql
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < \
  client/sql/migration_faktury_vecna_spravnost.sql
```

### 3️⃣ FRONTEND DEPLOY (10 min)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod

rsync -av build/ /var/www/erdms-platform/apps/eeo-v2/ \
  --exclude 'api/' --exclude 'api-legacy/' --exclude 'node_modules'
```

### 4️⃣ BACKEND DEPLOY (5 min)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy
rsync -av api.eeo/ /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/ \
  --exclude '.env*' --exclude 'test-*.php' --exclude 'migrations/' --exclude 'vendor/'
```

### 5️⃣ RESTART (2 min)
```bash
chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/
systemctl reload apache2
```

### 6️⃣ TESTING (20 min)
```bash
# Homepage
curl -I https://erdms.zachranka.cz/

# API Health
curl https://erdms.zachranka.cz/api.eeo/v2.0/system/health

# Auth Config
curl -X POST https://erdms.zachranka.cz/api.eeo/v2.0/system/auth-config

# Browser tests:
# - Dashboard načítání
# - Invoice list
# - Komentáře objednávek
# - Věcná správnost faktur
```

---

## 🚨 KRITICKÁ UPOZORNĚNÍ

### ⛔ NIKDY:
1. ❌ Nepoužívat `rsync --delete` (smaže API složky!)
2. ❌ Nepřepisovat PROD `.env` soubory
3. ❌ Neměnit PROD DB bez backupu
4. ❌ Nehardcodovat URL, cesty, DB názvy

### ⚠️ POZOR:
1. 🔴 Ověř backupy PŘED začátkem
2. 🔴 Zkontroluj DB migrace pomocí `VERIFY_DB_MIGRATIONS.sql`
3. 🔴 Ověř, že API složky NEJSOU smazané po frontend deployi
4. 🔴 Sleduj error logy prvních 30 minut

### ✅ DOPORUČENÍ:
1. ✅ Deploy v době nízkého provozu (večer/víkend)
2. ✅ Informuj uživatele předem
3. ✅ Měj připravený rollback plán
4. ✅ Sleduj PHP error log v reálném čase

---

## 🔧 ENTRA ID KONFIGURACE (VOLITELNÉ)

### Pokud chceš AKTIVOVAT Entra ID login:

**1. Ověř Auth API:**
```bash
curl -I https://eeo-auth.zachranka.cz/health
# Mělo by vrátit 200 OK
```

**2. Aktivuj v DB:**
```sql
UPDATE 25a_nastaveni_globalni SET hodnota = '1' WHERE klic = 'entra_enabled';
UPDATE 25a_nastaveni_globalni SET hodnota = 'entra_admin_local' WHERE klic = 'auth_mode';
```

**3. Test:**
- Otevři: https://erdms.zachranka.cz/login
- Mělo by se zobrazit:
  - Info panel o možnosti přihlášení přes M365
  - Tlačítko "Přihlášení přes M365"

### Pokud Auth API NEBĚŽÍ:
```sql
-- Vypni Entra (fallback na lokální)
UPDATE 25a_nastaveni_globalni SET hodnota = '0' WHERE klic = 'entra_enabled';
```

---

## 📊 POST-DEPLOY MONITORING

### Prvních 24 hodin sleduj:

| Metrika | Nástroj | Threshold |
|---------|---------|-----------|
| PHP Errory | `/var/www/erdms-platform/logs/php/prod-error.log` | < 10/hod |
| API Response Time | Browser DevTools | < 2s |
| User Complaints | Email/Tickets | 0 kritických |
| Login úspěšnost | DB + logy | > 95% |

### Příkazy pro monitoring:
```bash
# Real-time PHP error log
tail -f /var/www/erdms-platform/logs/php/prod-error.log

# Hledání kritických chyb
grep -i "fatal\|critical" /var/www/erdms-platform/logs/php/prod-error.log | tail -20

# Kontrola Apache
systemctl status apache2
```

---

## 🚀 ROLLBACK PLÁN

### Pokud se objeví kritická chyba:

```bash
# OKAMŽITÝ ROLLBACK (< 5 min)
rsync -av --delete \
  /var/www/__BCK_PRODUKCE/deploy-2026-04-18/eeo-v2-backup/ \
  /var/www/erdms-platform/apps/eeo-v2/

systemctl reload apache2

# Pokud potřeba rollback DB:
cd /var/www/__BCK_PRODUKCE/deploy-2026-04-18
zcat db-eeo2025-*.sql.gz | mysql -h 10.3.172.11 -u erdms_user -p eeo2025
```

---

## ✅ FINÁLNÍ CHECKLIST

### Před deployem:
- [ ] Backup PROD DB vytvořen
- [ ] Backup PROD aplikace vytvořen
- [ ] DEV aplikace otestována
- [ ] Všechny změny commitnuté
- [ ] Uživatelé informováni

### Po deployi:
- [ ] Homepage funguje (200 OK)
- [ ] API Health endpoint funguje
- [ ] Dashboard se načítá
- [ ] Invoice list funguje
- [ ] Komentáře lze editovat
- [ ] Věcná správnost faktur funguje
- [ ] Login funguje (lokální + M365)
- [ ] Žádné critical errors v logu

### 24h po deployi:
- [ ] Žádné PHP kritické chyby
- [ ] API response time OK
- [ ] Uživatelé spokojení
- [ ] Všechny funkce fungují

---

## 📞 KONTAKTY

**Dev tým:**
- Robert Holovský - 731 137 077
- Klára Šulgánová
- Tereza Bezoušková

**V případě kritického problému:**
1. Zkontroluj error logy
2. Pokud nelze vyřešit do 10 min → ROLLBACK
3. Kontaktuj dev tým

---

## 📚 DETAILNÍ DOKUMENTACE

Pro detailní informace viz:
- **Deployment Plan:** `DEPLOYMENT_PLAN_2026-04-18.md`
- **Deployment Checklist:** `DEPLOYMENT_CHECKLIST_2026-04-18.md`
- **DB Verification:** `VERIFY_DB_MIGRATIONS.sql`
- **Build dokumentace:** `BUILD.md`

---

**Status:** ✅ PŘIPRAVENO K NASAZENÍ  
**Estimated time:** 50 minut  
**Risk level:** 🟡 STŘEDNÍ (s backupem: 🟢 NÍZKÉ)  
**Recommended time:** Večer 18-20h nebo víkend

---

## 🎉 CO PŘINÁŠÍ UŽIVATELŮM

### Pro všechny uživatele:
- ✨ Možnost přihlášení přes firemní Microsoft 365 účet
- ✨ Informační panel na login stránce
- ✨ Rychlejší dashboard (refresh control)
- ✨ Lepší práce s fakturami (přílohy, věcná správnost)
- ✨ Editace komentářů u objednávek
- ✨ Notifikace při odpovědích na komentáře

### Pro administrátory:
- 👥 Dashboard aktivních uživatelů
- 📊 Přehled poslední aktivity uživatelů
- 🔐 Centralizovaná správa autentizace

### Technické výhody:
- 🚀 Moderní OAuth 2.0 / OpenID Connect
- 🔒 Bezpečnější autentizace přes Azure AD
- 📱 Single Sign-On (SSO)
- ⚡ Lepší výkon dashboardu
- 🛡️ Fallback na lokální účty

---

**Připraveno k nasazení:** ✅  
**Poslední aktualizace:** 18. dubna 2026
