# 🚀 DEPLOY DO PRODUKCE - PŘIPRAVENO 2026-06-21

## ✅ HOTOVO - Příprava

- [x] **Záloha DB eeo2025:** `/var/www/__BCK_PRODUKCE/2026-06-21/eeo2025_PROD_2026-06-21_v2.sql.gz` (11 MB)
- [x] **Záloha BE api-legacy:** `/var/www/__BCK_PRODUKCE/2026-06-21/BE_api-legacy_PROD_backup/`
- [x] **Záloha FE build:** `/var/www/__BCK_PRODUKCE/2026-06-21/FE_build_PROD_backup/`
- [x] **Verze změněna na 2.61** ve všech .env* souborech
- [x] **PROD build hotový:** `/var/www/erdms-dev/apps/eeo-v2/client/build-prod/`
  - Version: 2.61
  - Build hash: d50361fd4a7d
  - Build time: 2026-06-21T19:14:45Z
- [x] **DB změny zkontrolovány:** Klíčové tabulky existují v PROD (25a_audit_zmen, 25_moznosti_zastupovani)

---

## 🎯 DEPLOY PŘÍKAZY (⚠️ ČEKÁ NA POTVRZENÍ)

### 1️⃣ DEPLOY FRONTEND (FE)

```bash
# Přesun do client složky
cd /var/www/erdms-dev/apps/eeo-v2/client

# Deploy FE do produkce (ZACHOVÁ api a api-legacy!)
rsync -av --exclude='api' --exclude='api-legacy' \
  build-prod/ /var/www/erdms-platform/apps/eeo-v2/

# Ověření deploye
curl https://erdms.zachranka.cz/eeo-v2/version.json
# → Očekáváno: "version": "2.61", "buildHash": "d50361fd4a7d"

# Ověř že API-LEGACY stále funguje
ls -la /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/
# → MUSÍ obsahovat api.php a lib/ složku!
```

### 2️⃣ DEPLOY BACKEND (API-LEGACY)

```bash
# Deploy PHP API do produkce
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy

rsync -av --exclude='.git' --exclude='*.log' \
  api.eeo/ /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/

# ⚠️ KRITICKÉ: ZACHOVAT PRODUKČNÍ .ENV!
# Ověř že produkční .env nebyl přepsán:
grep "DB_NAME\|UPLOAD_ROOT_PATH\|API_BASE_URL" \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env

# Očekávané hodnoty v PROD .env:
# DB_NAME=eeo2025           (NE eeo2025-dev!)
# UPLOAD_ROOT_PATH=/var/www/erdms-data/
# API_BASE_URL=/api.eeo
```

### 3️⃣ RELOAD APACHE

```bash
systemctl reload apache2
echo "✅ Apache reloaded"
```

### 4️⃣ FINÁLNÍ OVĚŘENÍ

```bash
# Test FE verze
curl https://erdms.zachranka.cz/eeo-v2/version.json
# → "version": "2.61"

# Test API endpointu (Order V3)
curl -X POST https://erdms.zachranka.cz/api.eeo/orders-v3/list \
  -H "Content-Type: application/json" \
  -d '{"token":"TEST_TOKEN","username":"TEST_USER","limit":1}'
# → Mělo by vrátit JSON (i když s chybou autentizace = API funguje)

# Test system-info API
curl https://erdms.zachranka.cz/api.eeo/system-info
# → "database": {"display_name": "eeo2025"}

# Ověř že .env je správný v PROD
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep -E "DB_NAME|UPLOAD_ROOT_PATH"
# → DB_NAME=eeo2025 (ne eeo2025-dev!)
# → UPLOAD_ROOT_PATH=/var/www/erdms-data/
```

---

## 🔴 KRITICKÁ PRAVIDLA - PŘIPOMENUTÍ

### ❌ ZAKÁZÁNO:
- ❌ `--delete` flag při rsync FE (smaže api-legacy!)
- ❌ Přepsat produkční .env v api-legacy/api.eeo/
- ❌ Změnit DB_NAME na eeo2025-dev
- ❌ Změnit UPLOAD_ROOT_PATH nebo jiné cesty

### ✅ POVINNÉ:
- ✅ Zachovat produkční .env v `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env`
- ✅ Zkontrolovat version.json po deploy FE
- ✅ Ověřit že API funguje po deploy BE
- ✅ Reload Apache po deploy BE

---

## 📊 PŘEHLED STRUKTUR

### DEV struktura:
```
/var/www/erdms-dev/apps/eeo-v2/
├── client/
│   ├── build/           # DEV build
│   └── build-prod/      # ✅ PROD build (připraven)
└── api-legacy/api.eeo/  # ✅ PHP API (připraven)
```

### PROD struktura:
```
/var/www/erdms-platform/apps/eeo-v2/
├── index.html           # FE přímo v root (ne client/)
├── static/              # FE assets
├── version.json         # FE verze
├── api/                 # Node.js API
└── api-legacy/api.eeo/  # ✅ PHP API (cíl deploye)
    └── .env             # 🔴 NESMÍ SE PŘEPSAT!
```

---

## 🚦 STATUS: PŘIPRAVENO K DEPLOYE

**Čeká na explicitní potvrzení pro spuštění deploy příkazů!**

---

## 📝 POST-DEPLOY TODO:

- [ ] Test přihlášení do aplikace
- [ ] Test vytvoření nové objednávky
- [ ] Test nahrání přílohy
- [ ] Test zobrazení faktur
- [ ] Zkontrolovat PHP error log: `/var/www/erdms-dev/logs/php-error.log`
- [ ] Monitoring prvních 30 minut po deploye

---

**Vytvořeno:** 2026-06-21 21:15  
**Build hash:** d50361fd4a7d  
**Verze:** 2.61
