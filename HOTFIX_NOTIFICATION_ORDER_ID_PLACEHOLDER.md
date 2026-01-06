# HOTFIX: Oprava {order_id} placeholder v notifikačních emailech

**Datum:** 6. ledna 2026  
**Issue:** Placeholder `{order_id}` v email šablonách se nenahrazuje skutečnou hodnotou  
**Důvod:** Chybějící `order_id` v `loadOrderPlaceholders()` + nedokonalá funkce `replacePlaceholders()`  
**Branch:** `feature/generic-recipient-system` (DEV)  
**Pro PROD:** Manuální aplikace změn (nemůžeme nahrát celé api-legacy)

---

## 🎯 Problém

V notifikačních emailech se `{order_id}` v URL nenahrazuje:
```html
<!-- ŠPATNĚ (před opravou) -->
<a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}">

<!-- SPRÁVNĚ (po opravě) -->
<a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit=11257">
```

---

## 📝 Soubory k úpravě na PRODUKCI

### 1️⃣ `/var/www/erdms-prod/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

#### **ZMĚNA A: Funkce `replacePlaceholders()` (řádek ~103)**

**PŘED:**
```php
function replacePlaceholders($text, $data) {
    if (empty($text) || empty($data)) return $text;
    
    foreach ($data as $key => $value) {
        // Konvertovat hodnotu na string (pokud je to pole nebo objekt)
        if (is_array($value)) {
            $value = implode(', ', $value);
        } elseif (is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE);
        } elseif (!is_string($value) && !is_numeric($value)) {
            $value = (string)$value;
        }
        
        $text = str_replace('{' . $key . '}', $value, $text);
    }
    return $text;
}
```

**PO:**
```php
function replacePlaceholders($text, $data) {
    if (empty($text)) return $text;
    
    // ✅ OPRAVA: I když je $data prázdné, stejně nahradit placeholdery pomlčkou
    if (!empty($data)) {
        foreach ($data as $key => $value) {
            // Konvertovat hodnotu na string (pokud je to pole nebo objekt)
            if (is_array($value)) {
                $value = implode(', ', $value);
            } elseif (is_object($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE);
            } elseif (!is_string($value) && !is_numeric($value)) {
                $value = (string)$value;
            }
            
            // XSS prevence pro stringové hodnoty (stejně jako v notif_replacePlaceholders)
            if (is_string($value) && !is_numeric($value)) {
                $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            }
            
            $text = str_replace('{' . $key . '}', $value, $text);
        }
    }
    
    // ✅ OPRAVA: Odstranit nenaplněné placeholdery (nahradit pomlčkou)
    // Podporuje malá písmena, čísla a podtržítka
    $text = preg_replace('/\{[a-z0-9_]+\}/', '-', $text);
    
    return $text;
}
```

---

#### **ZMĚNA B: Funkce `loadOrderPlaceholders()` (řádek ~2048)**

**Najdi tuto sekci:**
```php
            // ✅ NOVÉ: Účastníci - ID pro hierarchii
            'objednavka_id' => $order['id'] ?? null,
            'uzivatel_id' => $order['uzivatel_id'] ?? null,           // Vytvořil
            'objednatel_id' => $order['objednatel_id'] ?? null,       // Objednatel
            'prikazce_id' => $order['prikazce_id'] ?? null,           // Příkazce
            'garant_uzivatel_id' => $order['garant_uzivatel_id'] ?? null, // Garant
            'schvalovatel_id' => $order['schvalovatel_id'] ?? null,   // Schvalovatel
```

**Nahraď za:**
```php
            // ✅ NOVÉ: Účastníci - ID pro hierarchii
            'order_id' => $order['id'] ?? null,                        // ✅ KRITICKÉ: Pro linky v emailech!
            'objednavka_id' => $order['id'] ?? null,                   // Alias pro frontend
            'uzivatel_id' => $order['uzivatel_id'] ?? null,           // Vytvořil
            'objednatel_id' => $order['objednatel_id'] ?? null,       // Objednatel
            'prikazce_id' => $order['prikazce_id'] ?? null,           // Příkazce
            'garant_uzivatel_id' => $order['garant_uzivatel_id'] ?? null, // Garant
            'schvalovatel_id' => $order['schvalovatel_id'] ?? null,   // Schvalovatel
```

**Co se mění:** Přidává se řádek `'order_id' => $order['id'] ?? null,` jako PRVNÍ (před `objednavka_id`)

---

### 2️⃣ `/var/www/erdms-prod/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php`

#### **ZMĚNA: Funkce `notif_replacePlaceholders()` (řádek ~237)**

**Najdi:**
```php
    // Odstranit nenaplněné placeholdery (nahradit pomlčkou)
    $text = preg_replace('/\{[a-z_]+\}/', '-', $text);
```

**Nahraď za:**
```php
    // Odstranit nenaplněné placeholdery (nahradit pomlčkou)
    // ✅ OPRAVA: Přidána podpora pro číslice (order_id, invoice_id, atd.)
    $text = preg_replace('/\{[a-z0-9_]+\}/', '-', $text);
```

**Co se mění:** V regex `[a-z_]` → `[a-z0-9_]` (přidána `0-9` pro podporu číslic)

---

## 🚀 Postup nasazení na PROD

### Krok 1: Zálohování
```bash
cd /var/www/erdms-prod/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

# Vytvoř zálohy s časovým razítkem
cp notificationHandlers.php notificationHandlers.php.backup_$(date +%Y%m%d_%H%M%S)
cp notificationHelpers.php notificationHelpers.php.backup_$(date +%Y%m%d_%H%M%S)

# Zkontroluj že zálohy existují
ls -lah *.backup_*
```

### Krok 2: Editace souborů

**Varianta A - VIM:**
```bash
vim notificationHandlers.php

# Najdi funkci replacePlaceholders:
/function replacePlaceholders
# Proved změny podle dokumentace výše

# Najdi funkci loadOrderPlaceholders:
/loadOrderPlaceholders
# Najdi sekci s 'objednavka_id' a přidej 'order_id'

# Ulož a zavři:
:wq
```

**Varianta B - NANO:**
```bash
nano notificationHandlers.php

# Ctrl+W pro vyhledávání: "function replacePlaceholders"
# Proved změny podle dokumentace
# Ctrl+W pro vyhledávání: "objednavka_id"
# Přidej řádek s order_id

# Ctrl+O pro uložení
# Ctrl+X pro ukončení
```

**Potom stejně pro druhý soubor:**
```bash
nano notificationHelpers.php

# Ctrl+W: "preg_replace"
# Najdi správný řádek a změň [a-z_] na [a-z0-9_]
# Ctrl+O, Ctrl+X
```

### Krok 3: Ověření změn

**Rychlá kontrola změn:**
```bash
# Zkontroluj že order_id je přidáno
grep -n "'order_id'" notificationHandlers.php

# Měl by najít řádek ve funkci loadOrderPlaceholders
# Výstup: 2048:            'order_id' => $order['id'] ?? null,

# Zkontroluj regex v notificationHelpers.php
grep -n "a-z0-9_" notificationHelpers.php

# Měl by najít: preg_replace('/\{[a-z0-9_]+\}/', '-', $text);
```

### Krok 4: Restart PHP (volitelné, většinou není potřeba)
```bash
# Pokud používáš OPcache nebo podobné
sudo systemctl reload php7.4-fpm
# NEBO
sudo systemctl restart php-fpm
```

### Krok 5: TEST
```bash
# 1. Vytvoř testovací objednávku v systému
# 2. Zkontroluj přijatý email
# 3. Ověř že link obsahuje číslo místo {order_id}
```

---

## 📊 Shrnutí změn

| Soubor | Funkce | Řádek | Změna | Důvod |
|--------|--------|-------|-------|-------|
| `notificationHandlers.php` | `replacePlaceholders()` | ~103 | Přidán regex + XSS prevence + oprava logiky | Odstraňuje nenaplněné placeholdery |
| `notificationHandlers.php` | `loadOrderPlaceholders()` | ~2048 | Přidán `'order_id' => $order['id']` | Email šablony používají `{order_id}` |
| `notificationHelpers.php` | `notif_replacePlaceholders()` | ~237 | Regex `[a-z_]` → `[a-z0-9_]` | Podpora číslic v placeholderech |

---

## ✅ Co oprava řeší

1. **Placeholder `{order_id}` se správně nahradí** číselnou hodnotou v emailech
2. **XSS prevence** - stringové hodnoty jsou escapované pomocí `htmlspecialchars()`
3. **Nenaplněné placeholdery** se odstraní (nahradí za `-`)
4. **Podpora číslic** v placeholder názvech (order_id, invoice_id, cashbook_id, atd.)
5. **Backward compatible** - fungují OBA placeholdery (`order_id` i `objednavka_id`)

---

## 🔍 Technické detaily

### Proč chyběl `order_id`?

Generic Recipient System používá funkci `loadOrderPlaceholders()` která:
- Načítá data z DB pomocí `$objectId` (což JE order ID)
- Vytváří placeholder array pro nahrazení v šablonách
- **ALE původně měla pouze `objednavka_id`, ne `order_id`**

Email šablony v DB používají anglické názvy placeholderů:
```html
<a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}">
```

Proto byla potřeba přidat `order_id` do placeholder array.

### Proč dvě opravy v replacePlaceholders?

Existují **DVĚ funkce** pro replacement:
1. `notif_replacePlaceholders()` - starý systém (měl regex, ale neměl číslice)
2. `replacePlaceholders()` - Generic Recipient System (neměl regex vůbec)

Obě musely být opraveny pro konzistenci.

---

## 🆘 Rollback (v případě problémů)

```bash
cd /var/www/erdms-prod/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/

# Najdi nejnovější zálohy
ls -lt *.backup_* | head -2

# Obnov ze zálohy (nahraď timestamp)
cp notificationHandlers.php.backup_20260106_210000 notificationHandlers.php
cp notificationHelpers.php.backup_20260106_210000 notificationHelpers.php

# Reload PHP
sudo systemctl reload php7.4-fpm
```

---

## 📞 Kontakt

- **Vytvořil:** GitHub Copilot + Developer
- **Datum:** 6. ledna 2026
- **Branch DEV:** `feature/generic-recipient-system`
- **Status:** Připraveno k nasazení na PROD

---

## ✨ Po nasazení

Po úspěšném nasazení:
1. ✅ Otestuj vytvoření objednávky
2. ✅ Zkontroluj přijaté emaily (všechny varianty: APPROVER_URGENT, APPROVER_NORMAL, SUBMITTER)
3. ✅ Ověř že linky fungují (vedou na správnou objednávku)
4. ✅ Smaž tento dokument nebo přesuň do archívu

---

**DŮLEŽITÉ:** Tyto změny jsou už aplikované v DEV na branch `feature/generic-recipient-system`.  
Až doděláš velkou změnu v API, stačí mergnut/nahrát celé API a tento hotfix už bude součástí.
