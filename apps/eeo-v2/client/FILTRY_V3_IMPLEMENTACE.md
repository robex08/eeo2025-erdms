# Filtry V3 - Implementované Změny

**Datum:** 6. února 2026  
**Status:** ✅ HOTOVO - Připraveno k testování

---

## ✅ CO BYLO UPRAVENO

### 1. BACKEND (orderV3Handlers.php)

#### 🆕 Přidána podpora pro pole ID (IN clause)
```php
// PŘED: Neexistovalo
// PO:
if (!empty($filters['objednatel']) && is_array($filters['objednatel'])) {
    $ids = array_map('intval', $filters['objednatel']);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $where_conditions[] = "o.objednatel_id IN ($placeholders)";
    foreach ($ids as $id) {
        $where_params[] = $id;
    }
}
```

**Podporované filtry:**
- `objednatel` → `o.objednatel_id IN (...)`
- `garant` → `o.garant_uzivatel_id IN (...)`
- `prikazce` → `o.prikazce_id IN (...)`
- `schvalovatel` → `o.schvalovatel_id IN (...)`

#### 🆕 Přidána podpora pro pole stavů
```php
if (!empty($filters['stav']) && is_array($filters['stav'])) {
    $workflow_conditions = array();
    foreach ($filters['stav'] as $stav_key) {
        if (isset($stav_map[$stav_key])) {
            $workflow_kod = $stav_map[$stav_key];
            if ($stav_key === 'NOVA') {
                $workflow_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = ?";
            } else {
                $workflow_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = ?";
            }
            $where_params[] = $workflow_kod;
        }
    }
    if (!empty($workflow_conditions)) {
        $where_conditions[] = '(' . implode(' OR ', $workflow_conditions) . ')';
    }
}
```

**Mapování stavů:**
- NOVA → kontroluje první element `$[0]`
- Ostatní → kontrolují poslední element
- OR logika pro více stavů

#### 🆕 Přidána podpora pro cenové rozsahy
```php
// PŘED: Jen operátory (>=10000)
// PO: Také rozsahy (od-do)

if (!empty($filters['cena_max_od']) && !empty($filters['cena_max_do'])) {
    $where_conditions[] = "o.max_cena_s_dph BETWEEN ? AND ?";
    $where_params[] = floatval($filters['cena_max_od']);
    $where_params[] = floatval($filters['cena_max_do']);
} elseif (!empty($filters['cena_max_od'])) {
    $where_conditions[] = "o.max_cena_s_dph >= ?";
    $where_params[] = floatval($filters['cena_max_od']);
} elseif (!empty($filters['cena_max_do'])) {
    $where_conditions[] = "o.max_cena_s_dph <= ?";
    $where_params[] = floatval($filters['cena_max_do']);
}
```

#### 🆕 Přidána podpora pro stav registru (checkboxy)
```php
if (!empty($filters['stav_registru']) && is_array($filters['stav_registru'])) {
    $stav_conditions = array();
    
    foreach ($filters['stav_registru'] as $stav) {
        switch ($stav) {
            case 'publikovano':
                $stav_conditions[] = "o.bylo_zverejneno = 1";
                break;
            case 'nepublikovano':
                $stav_conditions[] = "(o.ma_byt_zverejneno = 1 AND o.bylo_zverejneno = 0)";
                break;
            case 'nezverejnovat':
                $stav_conditions[] = "o.ma_byt_zverejneno = 0";
                break;
        }
    }
    
    if (!empty($stav_conditions)) {
        $where_conditions[] = '(' . implode(' OR ', $stav_conditions) . ')';
    }
}
```

---

### 2. FRONTEND HOOK (useOrdersV3.js)

#### ✏️ Upravena funkce convertFiltersForBackend()

**Cenové rozsahy:**
```javascript
// PŘED:
if (filters.amountFrom) {
  backendFilters.cena_max = `>=${filters.amountFrom}`;
}

// PO:
if (filters.amountFrom) {
  backendFilters.cena_max_od = filters.amountFrom;
}
if (filters.amountTo) {
  backendFilters.cena_max_do = filters.amountTo;
}
```

**Stav registru:**
```javascript
// PŘED: Jen přímý boolean
if (filters.maBytZverejneno) {
  backendFilters.ma_byt_zverejneno = true;
}

// PO: Konverze na pole pro backend
const stavRegistru = [];
if (filters.byloZverejneno) {
  stavRegistru.push('publikovano');
}
if (filters.maBytZverejneno && !filters.byloZverejneno) {
  stavRegistru.push('nepublikovano');
}
if (stavRegistru.length > 0) {
  backendFilters.stav_registru = stavRegistru;
}
```

---

## 📊 KOMPLETNÍ TOK DAT

### Příklad: Filtrování podle objednatele

```
1. COMPONENT (OrdersFiltersV3Full.js)
   User vybere: Jan Novák (ID 123), Petr Svoboda (ID 456)
   ↓
   State: filters.objednatel = ['123', '456']

2. HOOK (useOrdersV3.js)
   convertFiltersForBackend():
   ↓
   backendFilters.objednatel = ['123', '456']

3. API CALL (apiOrdersV3.js)
   POST /api.eeo/v2025.03_25/order-v3/list
   Body: {
     token, username,
     filters: { objednatel: ['123', '456'] },
     sorting, pagination
   }

4. BACKEND (orderV3Handlers.php)
   handleGetOrdersList():
   ↓
   $ids = [123, 456] (intval conversion)
   $where_conditions[] = "o.objednatel_id IN (?, ?)"
   $where_params = [123, 456]

5. SQL QUERY
   SELECT o.*, ...
   FROM objednavky o
   WHERE o.objednatel_id IN (123, 456)
   AND ... (other filters)
   ORDER BY ...
   LIMIT ...

6. RESPONSE
   {
     success: true,
     orders: [...],
     total_count: 42
   }
```

---

## 🧪 JAK TESTOVAT

### 1. Otevři aplikaci
```
https://eeo-dev.example.com/orders-v3
```

### 2. Otevři DevTools Console (F12)

### 3. Testuj jednotlivé filtry

#### Test 1: Objednatel multiselect
1. Klikni na "Objednatel" dropdown
2. Vyber 2 uživatele (např. Jan Novák, Petr Svoboda)
3. Sleduj console:
   ```
   🔍 Filters sent to API: {objednatel: ['123', '456']}
   ```
4. Zkontroluj výsledky: Jen objednávky těchto uživatelů

#### Test 2: Cenový rozsah
1. Zadej "Cena od": 10000
2. Zadej "Cena do": 50000
3. Sleduj console:
   ```
   🔍 Filters sent to API: {cena_max_od: 10000, cena_max_do: 50000}
   ```
4. Zkontroluj: Max cena všech objednávek je 10k-50k

#### Test 3: Stavy (multiselect)
1. Vyber "Nová" a "Schválená"
2. Sleduj console:
   ```
   🔍 Filters sent to API: {stav: ['NOVA', 'SCHVALENA']}
   ```
3. Zkontroluj: Jen objednávky v těchto stavech

#### Test 4: Stav registru (checkboxy)
1. Zaškrtni "Bylo již zveřejněno"
2. Sleduj console:
   ```
   🔍 Filters sent to API: {stav_registru: ['publikovano']}
   ```
3. Zkontroluj: Jen publikované objednávky

#### Test 5: Kombinace filtrů
1. Vyber objednatele: Jan Novák
2. Zadej cenu od: 10000
3. Vyber stav: Schválená
4. Sleduj console:
   ```
   🔍 Filters sent to API: {
     objednatel: ['123'],
     cena_max_od: 10000,
     stav: ['SCHVALENA']
   }
   ```
5. Zkontroluj: Jen objednávky splňující VŠE

### 4. Test Clear buttons
1. Nastav nějaké filtry
2. Klikni "Vymazat filtry" (červené tlačítko)
3. Zkontroluj: Všechny filtry se vymazaly
4. Zkontroluj: Načetly se všechny objednávky

---

## 🐛 MOŽNÉ PROBLÉMY A ŘEŠENÍ

### Problem 1: "Žádné výsledky" i když by měly být
**Příčina:** SQL syntax error nebo špatný typ dat
**Debug:**
```php
// V orderV3Handlers.php přidej:
error_log("[OrderV3] WHERE SQL: " . $where_sql);
error_log("[OrderV3] WHERE params: " . json_encode($where_params));
```

### Problem 2: Filtry se nevymazávají
**Příčina:** onClearAll nevolá správnou funkci
**Debug:**
```javascript
// V useOrdersV3.js zkontroluj:
const handleClearAllFilters = useCallback(() => {
  setColumnFilters({});
  setPanelFilters({});
  setGlobalFilter('');
  loadOrders(); // ← MUSÍ BÝT
}, [loadOrders]);
```

### Problem 3: Multiselect neposílá ID
**Příčina:** Options mají špatnou strukturu
**Debug:**
```javascript
// V OrdersFiltersV3Full.js zkontroluj:
console.log('Sorted users:', sortedActiveUsers);
// Každý objekt MUSÍ mít: {id: '123', displayName: 'Jan Novák'}
```

### Problem 4: Backend nerozpozná pole
**Příčina:** JSON není správně parsovaný
**Debug:**
```php
// V orderV3Handlers.php:
error_log("[OrderV3] Filters type check: " . gettype($filters['objednatel']));
error_log("[OrderV3] is_array: " . (is_array($filters['objednatel']) ? 'YES' : 'NO'));
```

---

## 📝 SOUBORY ZMĚNĚNÉ

1. ✅ `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php`
   - Přidáno: ID-based filtry (IN clause)
   - Přidáno: Status array filtry (OR logic)
   - Přidáno: Cenový rozsah (BETWEEN)
   - Přidáno: Stav registru (publikováno/nepublikováno)

2. ✅ `/var/www/erdms-dev/apps/eeo-v2/client/src/hooks/ordersV3/useOrdersV3.js`
   - Upraveno: convertFiltersForBackend() pro cenové rozsahy
   - Upraveno: Stav registru konverze

3. ✅ `/var/www/erdms-dev/apps/eeo-v2/client/FILTRY_V3_SQL_TESTING.md`
   - Vytvořeno: Testovací dokumentace

4. ✅ `/var/www/erdms-dev/apps/eeo-v2/client/FILTRY_V3_IMPLEMENTACE.md`
   - Vytvořeno: Tento dokument

---

## ✅ CHECKLIST PŘED NASAZENÍM

- [x] Backend podporuje pole ID (IN clause)
- [x] Backend podporuje pole stavů (OR logic)
- [x] Backend podporuje cenové rozsahy (BETWEEN)
- [x] Backend podporuje stav registru (checkboxy)
- [x] Hook správně konvertuje názvy filtrů
- [x] Hook správně konvertuje datové typy
- [x] Dokumentace vytvořena
- [ ] **Manuální test v prohlížeči** ← DALŠÍ KROK
- [ ] **Kontrola SQL logů**
- [ ] **Kontrola výkonu dotazů**

---

**Status:** ✅ Kód připraven, čeká na testování  
**Následující akce:** Otevři aplikaci a otestuj podle FILTRY_V3_SQL_TESTING.md
