# DEBUG Logování pro DEV prostředí - Kompletní analýza a setup

**Datum:** 23. ledna 2026  
**Účel:** Nastavit podrobné DEBUG logování v Apache a PHP pro detekci chyb (pouze DEV)

---

## 📊 SOUČASNÝ STAV - Analýza

### Apache Konfigurace
✅ **Aktivní config:** `/etc/apache2/sites-enabled/erdms.zachranka.cz.conf`
- ErrorLog: `${APACHE_LOG_DIR}/erdms-80-error.log`
- CustomLog: `${APACHE_LOG_DIR}/erdms-80-access.log combined`
- LogLevel: **NENÍ NASTAVEN** (výchozí = `warn`)

### PHP 8.4 FPM Konfigurace
✅ **Config soubor:** `/etc/php/8.4/fpm/php.ini`
```ini
error_reporting = E_ALL & ~E_DEPRECATED
display_errors = Off              # ✅ Správně OFF pro production
log_errors = On                   # ✅ Logování zapnuto
error_log = no value              # ❌ CHYBÍ - defaultuje do FPM logu
```

### Současné problémy
❌ **Žádné podrobné PHP error logování** - chyby jdou jen do FPM logu
❌ **Apache LogLevel = warn** - nevidíme detaily PHP errorů
❌ **Chybí separátní DEV error log** pro snadné sledování
❌ **PHP error_log není nastavena** konkrétní cesta

---

## 🎯 CO CHCEME DOSÁHNOUT

1. **Separátní DEBUG logy pro DEV API** (`/dev/api.eeo/`)
2. **Podrobné PHP error logování** (všechny warnings, notices, deprecated)
3. **Apache DEBUG režim** pro DEV endpointy
4. **Snadno sledovatelné chyby** v jednom souboru

---

## 🔧 IMPLEMENTACE - Krok za krokem

### 1️⃣ Vytvořit separátní log soubory pro DEV

```bash
# Vytvořit log soubory s správnými právy
sudo touch /var/log/apache2/erdms-dev-php-error.log
sudo chown www-data:adm /var/log/apache2/erdms-dev-php-error.log
sudo chmod 640 /var/log/apache2/erdms-dev-php-error.log

sudo touch /var/log/apache2/erdms-dev-debug.log
sudo chown www-data:adm /var/log/apache2/erdms-dev-debug.log
sudo chmod 640 /var/log/apache2/erdms-dev-debug.log
```

---

### 2️⃣ Upravit Apache config pro DEV sekci

**Soubor:** `/etc/apache2/sites-enabled/erdms.zachranka.cz.conf`

**V sekci DEV EEO LEGACY PHP API přidat:**

```apacheconf
# ============================================
# DEV EEO LEGACY PHP API (/dev/api.eeo/)
# ============================================
Alias /dev/api.eeo /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo

<Directory /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo>
    Options +ExecCGI -Indexes
    AllowOverride All
    Require all granted
    
    # 🔧 DEV Environment Variables
    SetEnv DB_HOST "10.3.172.11"
    SetEnv DB_PORT "3306"
    SetEnv DB_NAME "eeo2025-dev"
    SetEnv DB_USER "erdms_user"
    SetEnv DB_PASSWORD "AhchohTahnoh7eim"
    SetEnv APP_ENV "development"
    SetEnv UPLOAD_ROOT_PATH "/var/www/erdms-dev/data/eeo-v2/prilohy/"
    SetEnv DOCX_TEMPLATES_PATH "/var/www/erdms-dev/data/eeo-v2/sablony/"
    SetEnv MANUALS_PATH "/var/www/erdms-dev/data/eeo-v2/manualy/"
    
    # 🐛 DEBUG LOGGING (pouze pro DEV!)
    # Detailní PHP error log
    php_admin_flag log_errors On
    php_admin_value error_log "/var/log/apache2/erdms-dev-php-error.log"
    php_admin_value error_reporting 32767
    # 32767 = E_ALL (zobrazí všechny chyby včetně notices, warnings, deprecated)
    
    # Display errors OFF (bezpečnost - errory jen do logu)
    php_admin_flag display_errors Off
    php_admin_flag display_startup_errors Off
    
    # Longer script timeout pro debugging
    php_admin_value max_execution_time 300
    php_admin_value memory_limit "256M"
    
    # PHP-FPM Handler
    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost"
    </FilesMatch>
    
    # Allow .htaccess overrides
    DirectoryIndex api.php
</Directory>

# 🐛 Separátní DEBUG log pro DEV API
<Location /dev/api.eeo>
    # DEBUG level pro detailní logování
    LogLevel debug
    ErrorLog /var/log/apache2/erdms-dev-debug.log
</Location>
```

---

### 3️⃣ Nastavit PHP-FPM pool pro lepší logování

**Soubor:** `/etc/php/8.4/fpm/pool.d/www.conf`

**Přidat nebo odkomentovat:**

```ini
; Zachytávat output z PHP skriptů (print, echo při chybách)
catch_workers_output = yes

; PHP error log pro pool
php_admin_value[error_log] = /var/log/php8.4-fpm.log
php_admin_flag[log_errors] = on
```

---

### 4️⃣ Logrotate nastavení (aby se logy nenafukovaly)

**Vytvořit:** `/etc/logrotate.d/erdms-dev-logs`

```
/var/log/apache2/erdms-dev-php-error.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        /usr/sbin/apachectl graceful > /dev/null 2>&1 || true
    endscript
}

/var/log/apache2/erdms-dev-debug.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        /usr/sbin/apachectl graceful > /dev/null 2>&1 || true
    endscript
}
```

---

### 5️⃣ Přidat pomocné monitoring skripty

#### a) Sledování DEV logu v reálném čase
**Vytvořit:** `/var/www/erdms-dev/scripts/watch-dev-errors.sh`

```bash
#!/bin/bash
# Sledování DEV error logů v reálném čase

echo "=== Sledování DEV Error Logů ==="
echo "PHP Errors: /var/log/apache2/erdms-dev-php-error.log"
echo "Apache Debug: /var/log/apache2/erdms-dev-debug.log"
echo "---"
echo "Stiskni Ctrl+C pro ukončení"
echo ""

tail -f /var/log/apache2/erdms-dev-php-error.log \
        /var/log/apache2/erdms-dev-debug.log
```

```bash
chmod +x /var/www/erdms-dev/scripts/watch-dev-errors.sh
```

#### b) Zobrazení posledních errorů
**Vytvořit:** `/var/www/erdms-dev/scripts/show-dev-errors.sh`

```bash
#!/bin/bash
# Zobrazení posledních 50 errorů z DEV logů

LINES=${1:-50}

echo "=== Poslední $LINES řádků z DEV PHP Error Logu ==="
tail -n $LINES /var/log/apache2/erdms-dev-php-error.log
echo ""
echo "=== Poslední $LINES řádků z DEV Apache Debug Logu ==="
tail -n $LINES /var/log/apache2/erdms-dev-debug.log
```

```bash
chmod +x /var/www/erdms-dev/scripts/show-dev-errors.sh
```

---

## 📝 IMPLEMENTAČNÍ PŘÍKAZY - Copy & Paste

### Krok 1: Vytvořit log soubory
```bash
cd /var/www/erdms-dev

# Vytvořit logy
sudo touch /var/log/apache2/erdms-dev-php-error.log
sudo touch /var/log/apache2/erdms-dev-debug.log

# Nastavit práva
sudo chown www-data:adm /var/log/apache2/erdms-dev-php-error.log
sudo chown www-data:adm /var/log/apache2/erdms-dev-debug.log
sudo chmod 640 /var/log/apache2/erdms-dev-php-error.log
sudo chmod 640 /var/log/apache2/erdms-dev-debug.log
```

### Krok 2: Backup Apache config
```bash
sudo cp /etc/apache2/sites-enabled/erdms.zachranka.cz.conf \
       /etc/apache2/sites-enabled/erdms.zachranka.cz.conf.backup-debug-$(date +%Y%m%d-%H%M%S)
```

### Krok 3: Upravit Apache config
> **⚠️ POZOR:** Manuálně editovat sekci `/dev/api.eeo/` v Apache configu podle bodu 2️⃣ výše

```bash
sudo nano /etc/apache2/sites-enabled/erdms.zachranka.cz.conf
```

### Krok 4: Upravit PHP-FPM pool
```bash
# Backup
sudo cp /etc/php/8.4/fpm/pool.d/www.conf \
       /etc/php/8.4/fpm/pool.d/www.conf.backup-$(date +%Y%m%d)

# Editovat
sudo nano /etc/php/8.4/fpm/pool.d/www.conf
# Přidat: catch_workers_output = yes
```

### Krok 5: Test konfigurace
```bash
# Test Apache syntaxe
sudo apachectl configtest

# Pokud je OK:
sudo systemctl reload apache2
sudo systemctl restart php8.4-fpm
```

### Krok 6: Vytvořit monitoring skripty
```bash
# Vytvořit adresář, pokud neexistuje
mkdir -p /var/www/erdms-dev/scripts

# Skripty budou vytvořeny pomocí create_file
```

---

## 🧪 TESTOVÁNÍ

### 1. Test PHP erroru
Vytvořit testovací endpoint:
```bash
echo '<?php error_log("TEST DEBUG: tento log má být viditelný"); trigger_error("Test warning", E_USER_WARNING); echo json_encode(["status" => "ok"]); ?>' > /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/test-debug.php
```

### 2. Zavolat endpoint
```bash
curl http://erdms.zachranka.cz/dev/api.eeo/test-debug.php
```

### 3. Zkontrolovat log
```bash
tail -20 /var/log/apache2/erdms-dev-php-error.log
tail -20 /var/log/apache2/erdms-dev-debug.log
```

**Očekávaný výstup:**
- V `erdms-dev-php-error.log` by měl být "TEST DEBUG" a "Test warning"
- V `erdms-dev-debug.log` by měly být detaily HTTP requestu

---

## 📚 CO UVIDÍME V LOZÍCH

### erdms-dev-php-error.log
```
[23-Jan-2026 14:30:45 Europe/Prague] TEST DEBUG: tento log má být viditelný
[23-Jan-2026 14:30:45 Europe/Prague] PHP Warning: Test warning in /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/test-debug.php on line 1
[23-Jan-2026 14:30:50 Europe/Prague] PHP Notice: Undefined variable: xyz in /path/to/file.php on line 123
```

### erdms-dev-debug.log
```
[Thu Jan 23 14:30:45.123456 2026] [core:debug] [pid 12345] proxy_util.c(1234): [client 10.3.174.1:45678] AH00947: connected /run/php/php8.4-fpm.sock to Unix domain socket /run/php/php8.4-fpm.sock
```

---

## 🔒 BEZPEČNOSTNÍ POZNÁMKY

1. ✅ **Display errors = OFF** - errory se nezobrazují uživateli, jen do logu
2. ✅ **Pouze pro DEV** - production API nemá debug logování
3. ✅ **Logrotate** - automatická rotace logů, aby nezabíraly místo
4. ⚠️ **Pravidelně kontrolovat** - debug logy mohou rychle růst

---

## 🎯 VÝHODY TOHOTO SETUPU

✅ **Separátní logy** - snadno najdeš DEV errory bez proklikávání production logů
✅ **Detailní PHP chyby** - vidíš všechny warnings, notices, deprecated
✅ **Apache debug info** - backtrace pro routing problémy
✅ **Real-time monitoring** - jednoduché skripty pro sledování
✅ **Neovlivňuje PROD** - production API zůstává bez debug režimu

---

## 📖 POUŽITÍ

### Sledování logů v reálném čase
```bash
/var/www/erdms-dev/scripts/watch-dev-errors.sh
```

### Zobrazit posledních 100 errorů
```bash
/var/www/erdms-dev/scripts/show-dev-errors.sh 100
```

### Grep konkrétní chybu
```bash
grep "Undefined variable" /var/log/apache2/erdms-dev-php-error.log
```

### Statistika chyb za dnes
```bash
grep "$(date +%d-%b-%Y)" /var/log/apache2/erdms-dev-php-error.log | wc -l
```

---

## 🚨 ŘEŠENÍ PROBLÉMŮ

### Logy se nevytvářejí
```bash
# Zkontroluj práva
ls -la /var/log/apache2/erdms-dev-*

# Zkontroluj SELinux (pokud je zapnutý)
sudo setenforce 0

# Restart služeb
sudo systemctl restart apache2 php8.4-fpm
```

### "Permission denied" při čtení logů
```bash
# Přidat sebe do skupiny adm
sudo usermod -a -G adm $USER
# Pak se odhlásit a přihlásit
```

### PHP errory se stále nezobrazují
```bash
# Zkontroluj Apache config
sudo apachectl -S | grep dev/api.eeo

# Zkontroluj PHP-FPM status
sudo systemctl status php8.4-fpm

# Zkontroluj aktuální PHP nastavení
curl http://erdms.zachranka.cz/dev/api.eeo/info.php | grep error_log
```

---

## ✅ CHECKLIST IMPLEMENTACE

- [ ] Vytvořit log soubory s právy
- [ ] Zálohovat Apache config
- [ ] Upravit Apache config - sekce `/dev/api.eeo/`
- [ ] Upravit PHP-FPM pool.d/www.conf
- [ ] Test Apache konfigurace
- [ ] Reload Apache
- [ ] Restart PHP-FPM
- [ ] Vytvořit monitoring skripty
- [ ] Vytvořit logrotate config
- [ ] Test pomocí test-debug.php
- [ ] Ověřit logy fungují

---

**Status:** Připraveno k implementaci  
**Časová náročnost:** ~15 minut  
**Riziko:** Minimální (pouze DEV prostředí)
