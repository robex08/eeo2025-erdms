# 🛠️ ERDMS Log Management - Řešení problému s /tmp/

## 🚨 **Problém**
- PHP logy se ukládaly do `/tmp/` (5.9GB tmpfs)
- Hlavní problém: `/tmp/php_errors.log` (55MB)
- Při zaplnění `/tmp/` aplikace kolabuje

## ✅ **Implementované řešení**

### **1. Přesměrování PHP error logů**

**Před:**
```php
// PROD prostředí
ini_set('error_log', '/tmp/php_errors.log');           // ❌ Problem
ini_set('error_log', '/tmp/php_spisovka_errors.log');  // ❌ Problem
```

**Po:**
```php
// PROD prostředí
ini_set('error_log', '/var/www/erdms-dev/logs/php/prod-error.log');      // ✅ Fixnuto
ini_set('error_log', '/var/www/erdms-dev/logs/php/spisovka-error.log');  // ✅ Fixnuto
```

### **2. Přesměrování debug logů**

**Všechny debug logy přesunuty z `/tmp/` do `/var/www/erdms-dev/logs/`:**
- `dual-notification-debug.log`
- `hierarchy_debug.log` 
- `debug_order_update.log`
- `invoice_debug.json`
- `invoice_debug_processed.json`

### **3. Logrotate konfigurace**

```bash
# Instalace automatické rotace logů
sudo cp /var/www/erdms-dev/docs/deployment/logrotate-erdms.conf /etc/logrotate.d/erdms
sudo chmod 644 /etc/logrotate.d/erdms
```

**Rotace:**
- **PHP error logy**: denně, 30 dní historie
- **PHP debug logy**: denně, 7 dní historie  
- **App debug logy**: týdně, 4 týdny historie

### **4. Cleanup skript**

```bash
# Spuštění čištění a migrace
sudo /var/www/erdms-dev/scripts/cleanup-tmp-logs.sh
```

## 📊 **Porovnání kapacit**

| Lokace | Celková velikost | Využito | Volno |
|--------|------------------|---------|-------|
| `/tmp/` (tmpfs) | 5.9GB | 63MB | 5.8GB |
| `/var/www/` | 501GB | 34GB | **467GB** |

## 🔍 **Monitoring**

```bash
# Sledování nových logů
tail -f /var/www/erdms-dev/logs/php/prod-error.log
tail -f /var/www/erdms-dev/logs/dual-notification-debug.log

# Kontrola velikostí
du -sh /var/www/erdms-dev/logs/*

# Test logrotate
sudo logrotate -d /etc/logrotate.d/erdms
```

## 🎯 **Výsledek**

- ✅ Všechny logy nyní směřují do `/var/www/` (467GB volných)
- ✅ Automatická rotace logů (nedojde k zaplnění)
- ✅ `/tmp/` osvobozen od velkých log souborů
- ✅ Aplikace nebude kolabovat kvůli zaplněné `/tmp/`

---

**Status: Kompletní řešení implementováno** 🚀