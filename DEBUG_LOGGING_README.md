# 🐛 Debug Logging - Rychlý Start

## Sledování logů v real-time

```bash
# Základní sledování
tail -f /var/www/erdms-dev/logs/php-debug.log

# Filtrovat maintenance checks
tail -f /var/www/erdms-dev/logs/php-debug.log | grep -v "maintenance-status"

# Sledovat pouze konkrétní endpoint
tail -f /var/www/erdms-dev/logs/php-debug.log | grep "invoices"

# Sledovat pouze ERROR
tail -f /var/www/erdms-dev/logs/php-debug.log | grep "ERROR"
```

## Přidání logování do kódu

### 1. Základní zpráva
```php
debug_log("Zpracovávám objednávku");
```

### 2. Zpráva s daty
```php
debug_log("User login", ['user_id' => $user_id, 'success' => true]);
```

### 3. SQL query
```php
$start = microtime(true);
$stmt->execute();
$time = microtime(true) - $start;

debug_log_sql($query, $params, $time);
```

### 4. Exception
```php
try {
    // kód
} catch (Exception $e) {
    debug_log_exception($e, "Upload faktury");
    throw $e;
}
```

## Příklad v handleru

```php
function handle_orders_create($input, $config, $queries) {
    debug_log("START orders/create");
    
    // Validace
    if (!$input['token']) {
        debug_log("ERROR: Missing token");
        return error_response(400, "Chybí token");
    }
    
    debug_log("Input validated", ['has_token' => true]);
    
    try {
        // DB operace
        $start = microtime(true);
        $stmt = $db->prepare("INSERT INTO orders ...");
        $stmt->execute($params);
        $time = microtime(true) - $start;
        
        debug_log_sql("INSERT INTO orders ...", $params, $time);
        debug_log("Order created", ['order_id' => $db->lastInsertId()]);
        
    } catch (Exception $e) {
        debug_log_exception($e, "Create order");
        throw $e;
    }
    
    debug_log("END orders/create - SUCCESS");
}
```

## Vyčištění logu

```bash
# Vyprázdni log
> /var/www/erdms-dev/logs/php-debug.log

# Nebo smaž
rm /var/www/erdms-dev/logs/php-debug.log
```

## Co logovat?

✅ **ANO:**
- Začátek/konec důležitých funkcí
- Chybové stavy
- SQL queries s parametry
- Exceptions s kontextem
- Důležité business logika kroky

❌ **NE:**
- Každý řádek kódu
- Citlivá data (hesla, tokeny)
- High-frequency operace (maintenance-status každé 3s)

## Formát zpráv

```
[timestamp] [file:line] Message | Data: {...}
```

Příklad:
```
[2026-01-23 11:05:16] [invoiceHandlers.php:45] START invoices25/by-order | Data: {"objednavka_id":123}
[2026-01-23 11:05:16] [invoiceHandlers.php:67] Token verified | Data: {"username":"petr.novak"}
[2026-01-23 11:05:16] [invoiceHandlers.php:89] SQL: SELECT * FROM faktury WHERE objednavka_id = ? | Data: {"params":[123],"time_ms":2.3}
[2026-01-23 11:05:16] [invoiceHandlers.php:102] Found 3 invoices | Data: {"count":3}
```

## Troubleshooting

**Log se neaktualizuje:**
```bash
# Restartuj PHP-FPM
systemctl restart php8.4-fpm

# Zkontroluj oprávnění
ls -la /var/www/erdms-dev/logs/
```

**Log příliš velký:**
```bash
# Zjisti velikost
du -h /var/www/erdms-dev/logs/php-debug.log

# Zálohuj a vyprázdni
cp /var/www/erdms-dev/logs/php-debug.log /var/www/erdms-dev/logs/php-debug.log.backup
> /var/www/erdms-dev/logs/php-debug.log
```

---

📖 **Kompletní dokumentace:** `docs/DEV_PHP_LOGGING_SOLUTION.md`
