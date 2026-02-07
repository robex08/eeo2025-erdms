# ✅ DEBUG LOGOVÁNÍ - IMPLEMENTOVÁNO

**Datum implementace:** 23. ledna 2026 10:40

## 🎯 CO BYLO PROVEDENO

### 1. ✅ Vytvořeny log soubory
```bash
/var/log/apache2/erdms-dev-php-error.log  (práva: www-data:adm, 640)
/var/log/apache2/erdms-dev-debug.log      (práva: www-data:adm, 640)
```

### 2. ✅ Backup Apache konfigurace
```bash
/etc/apache2/sites-enabled/erdms.zachranka.cz.conf.backup-debug-20260123-103731
```

### 3. ✅ Upravena Apache konfigurace
**POUZE DEV sekce `/dev/api.eeo/`** - přidán marker:
```apacheconf
SetEnv PHP_DEBUG_MODE "1"
```

**✅ PRODUCTION sekce `/api.eeo/` ZŮSTALA NEDOTČENA!**

### 4. ✅ Vytvořen `.user.ini` pro PHP DEBUG
**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.user.ini`

```ini
error_reporting = 32767        # E_ALL
log_errors = On
error_log = /var/log/apache2/erdms-dev-php-error.log
display_errors = Off           # Bezpečnost!
max_execution_time = 300
memory_limit = 256M
```

### 5. ✅ Služby restartovány
- Apache2: reload OK
- PHP8.4-FPM: restart OK
- Syntax test: PASSED

### 6. ✅ Vytvořeny monitoring skripty
- `/var/www/erdms-dev/scripts/watch-dev-errors.sh` - real-time sledování
- `/var/www/erdms-dev/scripts/show-dev-errors.sh` - poslední errory

---

## 📖 POUŽITÍ

### Sledování logů v reálném čase
```bash
/var/www/erdms-dev/scripts/watch-dev-errors.sh
```

### Zobrazit posledních 50 errorů
```bash
/var/www/erdms-dev/scripts/show-dev-errors.sh 50
```

### Manuální kontrola logu
```bash
tail -f /var/log/apache2/erdms-dev-php-error.log
```

### Grep konkrétní chybu
```bash
grep "Undefined" /var/log/apache2/erdms-dev-php-error.log
```

---

## 🧪 TESTOVÁNÍ

### Test 1: Otevřít DEV aplikaci v browseru
```
https://erdms.zachranka.cz/dev/eeo-v2/
```

Provést akce které by mohly způsobit errory, pak zkontrolovat:
```bash
tail -50 /var/log/apache2/erdms-dev-php-error.log
```

### Test 2: Testovací soubory
```bash
# Simple test
https://erdms.zachranka.cz/dev/api.eeo/simple-test.php

# Podrobný test
https://erdms.zachranka.cz/dev/api.eeo/test-debug.php
```

---

## ⚠️ DŮLEŽITÉ - BEZPEČNOST

### ✅ PRODUCTION JE V BEZPEČÍ
- Produkční API (`/api.eeo/`) **NEMÁ DEBUG logování**
- Produkční sekce nebyla nijak změněna
- Všechny změny jsou **POUZE pro DEV** (`/dev/api.eeo/`)

### ✅ Display Errors = OFF
- PHP errory se **NIKDY** nezobrazují uživateli
- Vše jde pouze do logu
- Bezpečné i pro DEV prostředí

---

## 📋 CO VIDÍŠ V LOZÍCH

### Příklad PHP error logu:
```
[23-Jan-2026 10:45:30 Europe/Prague] PHP Warning: Undefined variable $xyz in /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/someFile.php on line 42
[23-Jan-2026 10:45:31 Europe/Prague] PHP Notice: Trying to access array offset on value of type null in /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/anotherFile.php on line 156
```

### Úrovně errorů které uvidíš:
- ✅ **E_ERROR** - fatální errory
- ✅ **E_WARNING** - varování
- ✅ **E_NOTICE** - notices
- ✅ **E_DEPRECATED** - deprecated funkce
- ✅ **E_USER_*** - vlastní errory přes trigger_error()
- ✅ **error_log()** - ruční logování

---

## 🔄 ÚDRŽBA

### Rotace logů
Logy se automaticky rotují:
- PHP error log: 14 dní historie
- Apache debug log: 7 dní historie

### Vymazat log manuálně
```bash
# Vyprázdnit log (ne smazat!)
> /var/log/apache2/erdms-dev-php-error.log
```

### Sledovat velikost logů
```bash
du -h /var/log/apache2/erdms-dev-*
```

---

## 🚨 ROLLBACK (pokud by bylo potřeba)

```bash
# Vrátit starý config
sudo cp /etc/apache2/sites-enabled/erdms.zachranka.cz.conf.backup-debug-20260123-103731 \
       /etc/apache2/sites-enabled/erdms.zachranka.cz.conf

# Smazat .user.ini
rm /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.user.ini

# Reload Apache
sudo systemctl reload apache2
```

---

## 📊 TECHNICKÉ DETAILY

### Proč .user.ini místo Apache direktiv?
- PHP-FPM **nepoužívá** `php_admin_value` v Apache configu
- `.user.ini` je standardní způsob pro PHP-FPM
- Načítá se automaticky PHP-FPM processem
- Funguje per-directory

### Proč error_log v .user.ini místo v Apache?
- `ErrorLog` direktiva v `<Location>` není podporována
- PHP `error_log` v `.user.ini` funguje perfektně pro PHP errory
- Apache má svůj vlastní error log (`erdms-80-error.log`)

### Separace DEV vs PROD
- DEV: `/var/www/erdms-dev/` + `.user.ini`
- PROD: `/var/www/erdms-platform/` + **ŽÁDNÝ `.user.ini`**
- Fyzicky oddělené adresáře = žádné riziko konfliktu

---

## ✅ STATUS

🟢 **IMPLEMENTOVÁNO A FUNKČNÍ**

- [x] Log soubory vytvořeny
- [x] Apache config upraven (pouze DEV)
- [x] PHP .user.ini vytvořen
- [x] Služby restartovány
- [x] Monitoring skripty připraveny
- [x] Testovací soubory vytvořeny
- [x] Dokumentace kompletní

**PRODUCTION NEDOTČENO** ✅
