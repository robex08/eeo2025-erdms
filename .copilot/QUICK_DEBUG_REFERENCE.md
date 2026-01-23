# 🔍 TROUBLESHOOTING - KAM HLEDAT LOGY

**Rychlá reference pro debugging DEV prostředí**

---

## 📋 PHP API LOGY (DEV)

### 1. Custom Debug Log (primární pro debugging)
```bash
tail -f /var/www/erdms-dev/logs/php-debug.log
```
**Obsahuje:**
- Všechny debug_log() volání
- SQL queries
- Exceptions s kontextem
- Start každého API requestu

### 2. PHP Error Log (automatické PHP chyby)
```bash
tail -f /var/www/erdms-dev/logs/php-error.log
```
**Obsahuje:**
- PHP Warnings, Notices
- Fatal errors
- Deprecated warnings
- Automatický error_log()

---

## 🌐 APACHE LOGY

### Access Log
```bash
tail -f /var/log/apache2/access.log
```

### Error Log
```bash
tail -f /var/log/apache2/error.log
```

---

## 🔧 PHP-FPM LOGY

### System Log
```bash
journalctl -u php8.4-fpm --no-pager -n 50 -f
```

### Nebo soubor
```bash
tail -f /var/log/php8.4-fpm.log
```

---

## 🚀 NEJČASTĚJŠÍ DEBUGGING POSTUPY

### API endpoint nefunguje:
```bash
# 1. Sleduj debug log real-time
tail -f /var/www/erdms-dev/logs/php-debug.log | grep -v maintenance

# 2. Sleduj PHP errory
tail -f /var/www/erdms-dev/logs/php-error.log
```

### SQL query problém:
```bash
# Debug log ukazuje všechny SQL queries s parametry
tail -f /var/www/erdms-dev/logs/php-debug.log | grep "SQL:"
```

### Token/Auth problém:
```bash
tail -f /var/www/erdms-dev/logs/php-debug.log | grep -E "Token|verify"
```

### PHP chyba/warning:
```bash
tail -f /var/www/erdms-dev/logs/php-error.log
```

---

## 💡 TIPY

### Vypni maintenance noise:
```bash
tail -f /var/www/erdms-dev/logs/php-debug.log | grep -v "maintenance-status"
```

### Jen ERROR zprávy:
```bash
tail -f /var/www/erdms-dev/logs/php-debug.log | grep "ERROR"
```

### Konkrétní endpoint:
```bash
tail -f /var/www/erdms-dev/logs/php-debug.log | grep "invoices"
```

### Vyčisti log (když je moc velký):
```bash
> /var/www/erdms-dev/logs/php-debug.log
```

---

## 📁 STRUKTURA LOGŮ

```
/var/www/erdms-dev/logs/
├── php-debug.log      ← Custom debug (debug_log())
└── php-error.log      ← PHP errory (error_log())

/var/log/apache2/
├── access.log         ← HTTP requesty
└── error.log          ← Apache errory

/var/log/
└── php8.4-fpm.log     ← PHP-FPM systém
```

---

## ⚡ RYCHLÉ PŘÍKAZY

```bash
# Vše najednou (multi-tail)
tail -f /var/www/erdms-dev/logs/php-debug.log \
        /var/www/erdms-dev/logs/php-error.log \
        /var/log/apache2/error.log

# Vyhledej text v logu
grep "text" /var/www/erdms-dev/logs/php-debug.log

# Posledních 100 řádků
tail -100 /var/www/erdms-dev/logs/php-debug.log

# Velikost logů
du -h /var/www/erdms-dev/logs/
```

---

## 🔴 POKUD LOGY NEFUNGUJÍ

```bash
# Zkontroluj PHP-FPM
systemctl status php8.4-fpm

# Restartuj
systemctl restart php8.4-fpm

# Oprávnění
ls -la /var/www/erdms-dev/logs/
chown www-data:www-data /var/www/erdms-dev/logs/
chmod 775 /var/www/erdms-dev/logs/
```

---

**Zapamatováno:** 23.1.2026 ✅
