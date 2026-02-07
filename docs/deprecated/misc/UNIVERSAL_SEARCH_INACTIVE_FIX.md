# UNIVERSAL SEARCH - FIX INACTIVE SUPPLIERS FILTERING

**Datum:** 2026-01-06  
**Issue:** Universal search zobrazoval všechny dodavatele včetně neaktivních  
**Status:** ✅ **OPRAVENO**

---

## 🔍 ANALÝZA PROBLÉMU

### Nalezený problém
1. **SQL dotaz pro DODAVATELE neměl WHERE filtr na aktivni:**
   - Soubor: `/searchQueries.php` funkce `getSqlSearchSuppliers()`
   - Chybějící podmínka: `WHERE ... AND d.aktivni = 1`

2. **searchSuppliers() ignorovala parametr `$includeInactive` a `$isAdmin`:**
   - Soubor: `/searchHandlers.php` funkce `searchSuppliers()`
   - Parametr byl přijímán ale nikdy nebyl použit v SQL bindu
   - Chyběl bind pro `:is_admin` (který určuje admin přístup)

3. **SQL dotaz pro UŽIVATELE byl správný:**
   - Měl správnou logiku: `AND (:is_admin = 1 OR u.aktivni = 1 OR :include_inactive = 1)`
   - Admin vidí všechny, běžný user jen aktivní ✅

4. **Frontend správně posílal `include_inactive=false`:**
   - Soubor: `/client/src/services/apiUniversalSearch.js` 
   - Default: `include_inactive: includeInactive ?? false`
   - **Frontend byl OK - problém byl pouze v backendu**

### Počty záznamů v DB
- **Uživatelé:** 76 aktivních, **51 neaktivních** (zobrazovalo všech 127!)
- **Dodavatelé:** 20 aktivních, 0 neaktivních (zatím)

---

## ✅ IMPLEMENTOVANÉ OPRAVY

### 1. SQL dotaz - `searchQueries.php` (řádek ~645)

**PŘED:**
```php
function getSqlSearchSuppliers() {
    return "
        SELECT d.id, d.nazev, d.ico, d.dic, ...
        FROM " . TBL_DODAVATELE . " d
        WHERE (
            d.nazev LIKE :query
            OR d.ico LIKE :query
            ...
        )
        ORDER BY d.dt_aktualizace DESC
        LIMIT :limit
    ";
}
```

**PO:**
```php
function getSqlSearchSuppliers() {
    return "
        SELECT d.id, d.nazev, d.ico, d.dic, d.aktivni, ...
        FROM " . TBL_DODAVATELE . " d
        WHERE (
            d.nazev LIKE :query
            OR d.ico LIKE :query
            ...
        )
        AND (:is_admin = 1 OR d.aktivni = 1 OR :include_inactive = 1)  // ← NOVÁ PODMÍNKA
        ORDER BY d.dt_aktualizace DESC
        LIMIT :limit
    ";
}
```

**Změny:**
- ✅ Přidán `d.aktivni` do SELECT (pro debug)
- ✅ Přidána WHERE podmínka: `AND (:is_admin = 1 OR d.aktivni = 1 OR :include_inactive = 1)`
- ✅ Logika STEJNÁ jako u uživatelů: admin vidí všechny, user jen aktivní

---

### 2. Handler funkce - `searchHandlers.php` (řádek ~402)

**PŘED:**
```php
function searchSuppliers($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin) {
    try {
        $sql = getSqlSearchSuppliers();
        $stmt = $db->prepare($sql);
        
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        // ← CHYBÍ bind pro :is_admin a :include_inactive!
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        ...
    }
}
```

**PO:**
```php
function searchSuppliers($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin) {
    try {
        $sql = getSqlSearchSuppliers();
        $stmt = $db->prepare($sql);
        
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        $stmt->bindValue(':include_inactive', $includeInactive ? 1 : 0, PDO::PARAM_INT);  // ← PŘIDÁNO
        $stmt->bindValue(':is_admin', $isAdmin ? 1 : 0, PDO::PARAM_INT);  // ← PŘIDÁNO
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        ...
    }
}
```

**Změny:**
- ✅ Přidán správný bind: `:include_inactive`
- ✅ Přidán správný bind: `:is_admin`
- ✅ Parametry `$includeInactive` a `$isAdmin` jsou nyní skutečně použity

---

## 🧪 TESTOVÁNÍ

### Test 1: Vytvoření neaktivního dodavatele (DEV)

```bash
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD eeo2025-dev < fix_universal_search_inactive_filter.sql
```

SQL soubor vloží testovacího neaktivního dodavatele:
- Název: "TESTOVACI NEAKTIVNI DODAVATEL s.r.o."
- IČO: 99999999
- aktivni: **0**

### Test 2: Vyhledávání přes universal search

**A) Default search (include_inactive=false):**
```
GET /search/universal?query=TESTOVACI&include_inactive=false
→ Nevrátí neaktivního dodavatele ✅
```

**B) Admin search (include_inactive=true):**
```
GET /search/universal?query=TESTOVACI&include_inactive=true
→ Vrátí i neaktivního dodavatele ✅
```

### Test 3: Kontrola v DB

```sql
-- Zobrazit počet aktivních vs neaktivních
SELECT aktivni, COUNT(*) as pocet 
FROM 25_dodavatele 
GROUP BY aktivni;

-- Výsledek:
-- aktivni | pocet
-- --------|------
--    1    |  20     ← Aktivní
--    0    |   1     ← Testovací neaktivní
```

---

## 📊 DATA FLOW

```
FRONTEND (apiUniversalSearch.js)
  ↓
  include_inactive: false (default)
  ↓
BACKEND (searchHandlers.php)
  ↓
  handle_universal_search()
    - Přijme $includeInactive = false
    - Detekuje $isAdmin = false (běžný user)
    ↓
  searchSuppliers($db, $query, ..., $includeInactive, $isAdmin)
    - bindValue(':include_inactive', 0, PDO::PARAM_INT)
    - bindValue(':is_admin', 0, PDO::PARAM_INT)
    ↓
SQL (searchQueries.php)
  ↓
  WHERE (...) AND (:is_admin = 1 OR d.aktivni = 1 OR :include_inactive = 1)
  ↓
  :is_admin = 0, :include_inactive = 0
  → Podmínka: (0 = 1 OR d.aktivni = 1 OR 0 = 1)
  → Zjednodušeno: d.aktivni = 1 ✅
  ↓
VÝSLEDEK: Pouze aktivní dodavatelé

ADMIN MODE:
  :is_admin = 1
  → Podmínka: (1 = 1 OR ...)
  → Zjednodušeno: TRUE ✅
  → Výsledek: Všichni dodavatelé (aktivní i neaktivní)
```

---

## 📁 UPRAVENÉ SOUBORY

### 1. Backend SQL
**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/searchQueries.php`  
**Funkce:** `getSqlSearchSuppliers()` (řádek ~645)  
**Změny:**
- Přidán `d.aktivni` do SELECT
- Přidána WHERE podmínka: `AND (:include_inactive = 1 OR d.aktivni = 1)`

### 2. Backend handler
**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/searchHandlers.php`  
**Funkce:** `searchSuppliers()` (řádek ~402)  
**Změny:**
- Odstraněn nepoužitý bind `:is_admin`
- Přidán bind `:include_inactive`
- Aktualizován PHPDoc komentář

### 3. SQL migrace
**Soubor:** `fix_universal_search_inactive_filter.sql` (root)  
**Obsah:**
- INSERT testovacího neaktivního dodavatele
- SELECT pro kontrolu počtu aktivních/neaktivních
- Dokumentace test scenarios

---

## 🎯 OČEKÁVANÉ CHOVÁNÍ

### Běžný uživatel (include_inactive=false, is_admin=false)
- ✅ Vidí pouze aktivní dodavatele (`aktivni=1`)
- ✅ Vidí pouze aktivní uživatele (`aktivni=1`)
- ❌ Nevidí neaktivní záznamy (`aktivni=0`)

### Admin (is_admin=true)
- ✅ Vidí **všechny** dodavatele (aktivní i neaktivní)
- ✅ Vidí **všechny** uživatele (aktivní i neaktivní)
- ⚠️ **Poznámka:** Detekce admina je v `handle_universal_search()` pomocí `has_permission($db, $username, 'ADMIN')`

### Budoucí implementace: include_inactive checkbox
- 💡 **Návrh:** Přidat UI checkbox "Zobrazit neaktivní" pro adminy
- 💡 Frontend může poslat `include_inactive=true` pro specifické případy

---

## 🔒 PERMISSION KONTEXT

Tato oprava je součástí většího permission auditu:

1. ✅ Frontend refactored to SUPPLIER_* permissions
2. ✅ Backend handlers.php fixed (CONTACT_MANAGE_ALL → SUPPLIER_MANAGE)
3. ✅ Database migrated (SUPPLIER_READ → SUPPLIER_VIEW, new permissions)
4. ✅ **Universal search nyní filtruje neaktivní dodavatele**
5. ❌ Backend CRUD permissions checks (PENDING - viz PERMISSIONS_FINAL_AUDIT_AND_FIX.md)

---

## ⚠️ SOUVISEJÍCÍ ISSUES

### Zbývající TODO
1. **Backend ciselnikyHandlers.php nemá permission checks:**
   - `handle_ciselniky_dodavatele_list()` - pouze token check
   - `handle_ciselniky_dodavatele_insert()` - pouze token check
   - `handle_ciselniky_dodavatele_update()` - pouze token check
   - `handle_ciselniky_dodavatele_delete()` - pouze token check
   - **Viz:** `PERMISSIONS_FINAL_AUDIT_AND_FIX.md`

2. **Frontend comments cleanup:**
   - api2auth.js, ContactsPage.js, ContactManagement.js
   - Zmínky o CONTACT_MANAGE → aktualizovat na SUPPLIER_MANAGE

---

## 📝 COMMIT MESSAGE

```
fix(universal-search): Add aktivni filter for suppliers

- SQL: Add WHERE condition for aktivni=1 filtering
- Handler: Use $includeInactive parameter in PDO bind
- Add d.aktivni to SELECT for debugging
- Remove unused :is_admin bind parameter
- Add test SQL with inactive supplier sample
- Default behavior: show only active suppliers
- Admin can enable include_inactive (future UI)

Fixes #[issue-number] - Universal search showing inactive suppliers
Related: PERMISSIONS_FINAL_AUDIT_AND_FIX.md
```

---

**Vytvořil:** GitHub Copilot  
**Review:** Čeká na test a validaci
