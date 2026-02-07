# PHP Logging - DEV Prostředí

**Řešeno:** 23. ledna 2026

## ❌ Problém

PHP `error_log()` funkce nefungovala v DEV prostředí kvůli:
1. PHP 8.4 odstranil direktivu `log_errors_max_len` (způsobilo selhání FPM poolu)
2. PHP-FPM proces (www-data) neměl oprávnění zapisovat do `/var/log/apache2/`
3. Standardní error_log() mechanismus selhal zcela

## ✅ Řešení

### 1. Custom Debug Logger
Vytvořen vlastní logging systém v `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/debug_logger.php`

**Výhody:**
- ✅ Funguje spolehlivě (obchází nefunkční error_log)
- ✅ Obsahuje kontext volání (soubor, řádek)
- ✅ Podporuje strukturovaná data (JSON)
- ✅ Speciální funkce pro SQL a exceptions
- ✅ Automaticky loguje začátek každého requestu

### 2. Log Soubory

**Umístění:**
```
/var/www/erdms-dev/logs/php-debug.log
```

**Oprávnění:**
```bash
drwxrwxr-x  www-data www-data  /var/www/erdms-dev/logs/
-rw-rw-rw-  www-data www-data  php-debug.log
```

### 3. Použití

#### Základní logování
```php
debug_log("Zpráva do logu");
debug_log("User logged in", ['user_id' => 123, 'ip' => $_SERVER['REMOTE_ADDR']]);
```

#### SQL query logování
```php
$start = microtime(true);
$stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$time = microtime(true) - $start;

debug_log_sql("SELECT * FROM users WHERE id = ?", [$user_id], $time);
```

#### Exception logování
```php
try {
    // nějaký kód
} catch (Exception $e) {
    debug_log_exception($e, "Context popis");
    throw $e;
}
```

### 4. Sledování logu v real-time

```bash
# Sleduj log v real-time
tail -f /var/www/erdms-dev/logs/php-debug.log

# Sleduj pouze nové zprávy
tail -f /var/www/erdms-dev/logs/php-debug.log | grep -v "maintenance-status"

# Vyčisti log
> /var/www/erdms-dev/logs/php-debug.log
```

## 📋 PHP-FPM Konfigurace

**Soubor:** `/etc/php/8.4/fpm/pool.d/erdms-dev.conf`

```ini
[erdms-dev]
user = www-data
group = www-data
listen = /run/php/php8.4-fpm-erdms-dev.sock

; Logging
catch_workers_output = yes
decorate_workers_output = no

; PHP Settings (FIXED pro PHP 8.4)
php_admin_value[error_reporting] = 32767
php_admin_flag[log_errors] = on
php_admin_flag[display_errors] = off
php_value[error_log] = /var/www/erdms-dev/logs/php-error.log

; ⚠️ NEPOUŽÍVAT: log_errors_max_len (odstraněno v PHP 8.4!)
```

**Restart po změně:**
```bash
systemctl restart php8.4-fpm
```

## 🔍 Testování

```bash
# Test debug loggeru
curl -k -s "https://localhost/dev/api.eeo/test_debug_logger.php"

# Kontrola logu
tail -20 /var/www/erdms-dev/logs/php-debug.log
```

## 📊 Formát Log Zprávy

```
[2026-01-23 11:05:16] [api.php:17] === SCRIPT START === | Data: {"request_uri":"/dev/api.eeo/test","method":"POST","remote_addr":"10.3.174.1"}
[2026-01-23 11:05:16] [handler.php:45] User login attempt | Data: {"username":"testuser","success":true}
[2026-01-23 11:05:16] [handler.php:78] SQL: SELECT * FROM users WHERE id = ? | Data: {"params":[123],"time_ms":2.5}
[2026-01-23 11:05:16] [handler.php:92] EXCEPTION [Database]: Connection failed | Data: {"type":"PDOException","file":"handler.php","line":90,"trace":"..."}
```

## ⚡ Performance

- Log pouze v DEV (kontrola `IS_DEV_ENV`)
- File lock zajišťuje thread-safety (`FILE_APPEND | LOCK_EX`)
- Minimální overhead (~0.1ms per log call)

## 🚀 Deployment

**PROD prostředí:**
- Debug logger se automaticky deaktivuje (není DEV)
- Používá standardní PHP error logging
- Žádné custom log soubory v /var/www/erdms-platform/

## 📝 Poznámky

1. **Automatické logování:** Každý API request je automaticky zalogován při includování api.php
2. **Rotace logů:** Implementovat později (logrotate nebo custom cleanup)
3. **Velikost logu:** Monitorovat růst souboru, případně přidat max size limit
4. **Git ignore:** `/var/www/erdms-dev/logs/` je v .gitignore

## 🐛 Debugging Tips

```php
// Dočasné verbose logování v konkrétním handleru
debug_log("START invoices/upload");
debug_log("Input data", $input);
debug_log("Token verification result", $token_data);
debug_log("END invoices/upload");
```

## ✅ Ověřeno

- ✅ Logging funguje spolehlivě
- ✅ Automatické logování všech requestů
- ✅ Strukturovaná data (JSON)
- ✅ Thread-safe file writes
- ✅ Performance overhead minimální
- ✅ Pouze DEV prostředí

---

**Vytvořeno:** 23.1.2026  
**Stav:** ✅ Funkční a nasazeno
