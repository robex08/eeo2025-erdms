# 🚀 ERDMS EEO v2 - DEV → PROD Migration Guide

## 📋 **SOUHRN ZMĚN**

✅ **DOKONČENO:** Eliminace všech hardcoded cest z PHP kódu  
✅ **DOKONČENO:** Centrální environment utility pro path management  
✅ **DOKONČENO:** Automatická detekce prostředí (APP_ENV + fallback)  
✅ **DOKONČENO:** Konzistentní .env konfigurace pro DEV i PROD  

---

## 🎯 **MIGRATION PROCES (DEV → PROD)**

### **Krok 1: Prepare PROD Environment**
```bash
# 1. Zkopíruj kód z DEV do PROD
rsync -av /var/www/erdms-dev/apps/eeo-v2/ /var/www/erdms-platform/apps/eeo-v2/

# 2. Vytvoř produkční .env z template
cp /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env.production.example \
   /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
```

### **Krok 2: PROD Environment Configuration**
```bash
# Edituj PROD .env soubor:
vim /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
```

**KRITICKÉ nastavení:**
```dotenv
# ⚠️ KRITICKÉ - Určuje PROD prostředí
APP_ENV=production

# ⚠️ KRITICKÉ - PROD data paths  
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/

# Database - PROD databáze
DB_NAME=eeo2025
DB_HOST=10.3.172.11
DB_USER=erdms_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD

# Application version
REACT_APP_VERSION=2.05
```

### **Krok 3: Verify Path Detection**
```bash
# Spusť test script v PROD prostředí
cd /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/
php test-environment-paths.php
```

**Očekávaný výstup:**
```
Type: PROD
Upload Root: /var/www/erdms-platform/data/eeo-v2/prilohy/
Templates:   /var/www/erdms-platform/data/eeo-v2/sablony/
Manuals:     /var/www/erdms-platform/data/eeo-v2/manualy/
```

### **Krok 4: Apache & Permissions**
```bash
# Reload Apache po změnách
systemctl reload apache2

# Ověř file permissions na PROD data
chown -R www-data:www-data /var/www/erdms-platform/data/eeo-v2/
chmod -R 755 /var/www/erdms-platform/data/eeo-v2/
```

---

## 🔧 **TECH IMPLEMENTACE**

### **Centrální Environment Utility**
📁 **Lokace:** `v2025.03_25/lib/environment-utils.php`

**Klíčové funkce:**
- `is_dev_environment()` - Detekce prostředí (APP_ENV → REQUEST_URI fallback)
- `get_env_path($var)` - Smart path resolution s fallbacky
- `get_upload_root_path()` - Upload cesty
- `get_manuals_path()` - Manuály cesty
- `debug_environment_paths()` - Debug info

### **Priorita detekce prostředí:**
1. **APP_ENV** environment variable (`development` | `production`)
2. **REQUEST_URI** fallback (hledá `/dev/` v URL)
3. **Hardcoded fallbacks** jako poslední možnost

### **Aktualizované soubory:**
- ✅ `api25-manuals.php` - Použití centrální utility
- ✅ `manualsHandlers.php` - Eliminace duplikace  
- ✅ `orderAttachmentHandlers.php` - Environment utility
- ✅ `orderV2AttachmentHandlers.php` - 3x aktualizace
- ✅ `invoiceAttachmentHandlers.php` - Legacy path handling
- ✅ `.env` + `.env.example` + `.env.production.example` - APP_ENV

---

## ⚠️ **CRITICAL CHECKLIST**

### **Pre-Migration (DEV):**
- [x] Všechny hardcoded cesty eliminovány
- [x] APP_ENV=development v DEV .env
- [x] Test script úspěšně prochází  
- [x] DEV data cesty: `/var/www/erdms-dev/data/eeo-v2/`

### **During Migration (PROD):**
- [ ] `.env.production.example` zkopírován do `.env`
- [ ] `APP_ENV=production` nastaven v PROD .env
- [ ] PROD data cesty: `/var/www/erdms-platform/data/eeo-v2/`
- [ ] Database connection = `eeo2025` (PROD DB)

### **Post-Migration (PROD):**
- [ ] Test script potvrzuje PROD environment
- [ ] Přílohy se načítají ze správných PROD cest
- [ ] Manuály fungují z PROD lokace
- [ ] Upload funguje do PROD adresářů

---

## 🎉 **VÝSLEDEK**

**BEZ změn kódu** se při migraci DEV → PROD automaticky:
- ✅ Přepnou všechny cesty na PROD adresáře  
- ✅ Načítají data z produkčních lokací
- ✅ Ukládají nové soubory do PROD struktur  
- ✅ Používají PROD databázi

**Migration je nyní 100% environment-aware! 🚀**