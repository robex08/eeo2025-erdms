# Department-Based Subordinate Permissions Implementation

**Datum:** 16. ledna 2026  
**Autor:** GitHub Copilot & robex08  
**Branch:** feature/generic-recipient-system  

## Přehled změn

Změna funkcionality práv `ORDER_READ_SUBORDINATE` a `ORDER_EDIT_SUBORDINATE` z **hierarchy-based** na **department-based** (úsek-based) systém.

### Původní chování (hierarchy-based)
- Práva fungovala pouze pokud byla zapnutá organizační hierarchie
- Viditelnost/editace závisela na vztazích `nadrizeny_id -> podrizeny_id` v tabulce `25_uzivatele_hierarchie`
- Vyžadovalo aktivní profil v `25_hierarchie_profily` se strukurou JSON

### Nové chování (department-based)
- **Funguje NEZÁVISLE na hierarchii** - hierarchie může být zapnutá i vypnutá
- Viditelnost/editace závisí na **úseku (usek_id)** v tabulce `25_uzivatele`
- Uživatel vidí/edituje objednávky VŠECH kolegů ze stejného úseku

---

## Detailní specifikace

### ORDER_READ_SUBORDINATE (ID: 4)

**Funkce:**
- Uživatel vidí VŠECHNY objednávky kolegů ze stejného úseku (usek_id)
- **READ-ONLY přístup** - nemůže editovat ani schvalovat
- I když má právo `ORDER_APPROVE`, nemůže schvalovat objednávky kolegů (pouze vidí)

**Výjimka:**
- Pokud je uživatel **uvedený v roli** na objednávce (objednatel, garant, schvalovatel, příkazce, atd.), může ji editovat/schvalovat normálně

**Backend:**
- SQL filter přidává WHERE podmínku pro všechny uživatele se stejným `usek_id`
- Kontroluje všech 12 rolí na objednávce (uzivatel_id, objednatel_id, garant_uzivatel_id, ...)

**Frontend:**
- `canEdit()` vrací `false` pokud má pouze `ORDER_READ_SUBORDINATE` a není v roli na objednávce
- `canDelete()` vrací `false` za stejných podmínek

---

### ORDER_EDIT_SUBORDINATE (ID: 20)

**Funkce:**
- Uživatel může **plně editovat** všechny objednávky kolegů ze stejného úseku
- Může editovat, mazat, schvalovat - vše jako vlastní objednávky
- **Není nutné být v roli na objednávce**

**Backend:**
- SQL filter přidává WHERE podmínku pro všechny uživatele se stejným `usek_id`
- Kontroluje všech 12 rolí na objednávce

**Frontend:**
- `canEdit()` vrací `true` pokud má `ORDER_EDIT_SUBORDINATE`
- `canDelete()` vrací `true` pokud má `ORDER_EDIT_SUBORDINATE`

---

## Příklad použití

### Scénář: Úsek PTN

**Vedoucí úseku PTN:**
- Má právo `ORDER_EDIT_SUBORDINATE`
- Vidí a může editovat VŠECHNY objednávky všech zaměstnanců na úseku PTN
- Hierarchie není potřeba

**Zástupce vedoucího úseku PTN:**
- Má právo `ORDER_READ_SUBORDINATE`
- Vidí VŠECHNY objednávky všech zaměstnanců na úseku PTN
- **Nemůže** editovat ani schvalovat (read-only)
- Výjimka: Pokud je uvedený jako garant nebo schvalovatel na konkrétní objednávce, může ji editovat

---

## Implementované změny

### Backend: `orderV2Endpoints.php`

#### 1. Nová funkce: `getUserDepartmentColleagueIds()`

```php
/**
 * Získá všechny user ID kolegů ze stejného úseku (usek_id)
 * 
 * @param int $user_id ID uživatele
 * @param PDO $db Database connection
 * @return array Pole user IDs ze stejného úseku
 */
function getUserDepartmentColleagueIds($user_id, $db) {
    // 1. Načíst usek_id aktuálního uživatele
    // 2. Načíst všechny aktivní uživatele se stejným usek_id
    // 3. Vrátit pole ID
}
```

**Umístění:** Před funkcí `getUserOrderPermissions()` (cca řádek 196)

#### 2. Department-based filtering v `handle_order_v2_list()`

**Umístění:** Po hierarchie filtru, před admin/permission checks (cca řádek 370)

```php
// 🏢 DEPARTMENT-BASED SUBORDINATE PERMISSIONS
$hasOrderReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $user_permissions);
$hasOrderEditSubordinate = in_array('ORDER_EDIT_SUBORDINATE', $user_permissions);

$departmentFilterApplied = false;

if ($hasOrderReadSubordinate || $hasOrderEditSubordinate) {
    $departmentColleagueIds = getUserDepartmentColleagueIds($current_user_id, $db);
    
    if (!empty($departmentColleagueIds)) {
        $departmentColleagueIdsStr = implode(',', array_map('intval', $departmentColleagueIds));
        
        // WHERE podmínka pro všech 12 rolí
        $departmentCondition = "(
            o.uzivatel_id IN ($departmentColleagueIdsStr)
            OR o.objednatel_id IN ($departmentColleagueIdsStr)
            OR o.garant_uzivatel_id IN ($departmentColleagueIdsStr)
            OR o.schvalovatel_id IN ($departmentColleagueIdsStr)
            OR o.prikazce_id IN ($departmentColleagueIdsStr)
            OR o.uzivatel_akt_id IN ($departmentColleagueIdsStr)
            OR o.odesilatel_id IN ($departmentColleagueIdsStr)
            OR o.dodavatel_potvrdil_id IN ($departmentColleagueIdsStr)
            OR o.zverejnil_id IN ($departmentColleagueIdsStr)
            OR o.fakturant_id IN ($departmentColleagueIdsStr)
            OR o.dokoncil_id IN ($departmentColleagueIdsStr)
            OR o.potvrdil_vecnou_spravnost_id IN ($departmentColleagueIdsStr)
        )";
        
        $whereConditions[] = $departmentCondition;
        $departmentFilterApplied = true;
    }
}
```

---

### Frontend: `Orders25List.js`

#### 1. Upravená funkce `canEdit()`

**Umístění:** Cca řádek 8775

```javascript
const canEdit = (order) => {
  if (!hasPermission) return false;

  // Koncepty
  if (order.isDraft || order.je_koncept) {
    return hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_EDIT_OWN');
  }

  // Admin práva
  if (hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_MANAGE')) {
    return true;
  }

  // 🏢 DEPARTMENT-BASED: ORDER_EDIT_SUBORDINATE = plná editace
  if (hasPermission('ORDER_EDIT_SUBORDINATE')) {
    return true;
  }

  // 🏢 DEPARTMENT-BASED: ORDER_READ_SUBORDINATE = read-only
  if (hasPermission('ORDER_READ_SUBORDINATE')) {
    // Může editovat JEN pokud je v roli na objednávce
    const isInOrderRole = (
      order.objednatel_id === currentUserId ||
      order.uzivatel_id === currentUserId ||
      order.garant_uzivatel_id === currentUserId ||
      order.schvalovatel_id === currentUserId ||
      order.prikazce_id === currentUserId ||
      order.uzivatel_akt_id === currentUserId ||
      order.odesilatel_id === currentUserId ||
      order.dodavatel_potvrdil_id === currentUserId ||
      order.zverejnil_id === currentUserId ||
      order.fakturant_id === currentUserId ||
      order.dokoncil_id === currentUserId ||
      order.potvrdil_vecnou_spravnost_id === currentUserId
    );
    
    if (!isInOrderRole) {
      return false; // Read-only
    }
  }

  // Běžná práva
  if (hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_2025')) {
    return order.objednatel_id === currentUserId ||
           order.uzivatel_id === currentUserId ||
           order.garant_uzivatel_id === currentUserId ||
           order.schvalovatel_id === currentUserId;
  }

  return false;
};
```

#### 2. Upravená funkce `canDelete()`

**Umístění:** Cca řádek 8849

```javascript
const canDelete = (order) => {
  if (!hasPermission) return false;

  // Koncepty nelze mazat
  if (order.isDraft || order.je_koncept || order.hasLocalDraftChanges) return false;

  // Archivované
  if (order.stav_objednavky === 'ARCHIVOVANO') {
    return hasPermission('ORDER_MANAGE') || hasPermission('ORDER_DELETE_ALL');
  }

  // Admin práva
  if (hasPermission('ORDER_DELETE_ALL') || hasPermission('ORDER_MANAGE')) {
    return true;
  }

  // 🏢 DEPARTMENT-BASED: ORDER_EDIT_SUBORDINATE = může mazat
  if (hasPermission('ORDER_EDIT_SUBORDINATE')) {
    return true;
  }

  // 🏢 DEPARTMENT-BASED: ORDER_READ_SUBORDINATE = read-only, nesmí mazat
  if (hasPermission('ORDER_READ_SUBORDINATE')) {
    // Může mazat JEN pokud je v roli na objednávce
    const isInOrderRole = (
      order.objednatel_id === currentUserId ||
      order.uzivatel_id === currentUserId ||
      order.garant_uzivatel_id === currentUserId ||
      order.schvalovatel_id === currentUserId ||
      order.prikazce_id === currentUserId ||
      order.uzivatel_akt_id === currentUserId ||
      order.odesilatel_id === currentUserId ||
      order.dodavatel_potvrdil_id === currentUserId ||
      order.zverejnil_id === currentUserId ||
      order.fakturant_id === currentUserId ||
      order.dokoncil_id === currentUserId ||
      order.potvrdil_vecnou_spravnost_id === currentUserId
    );
    
    if (!isInOrderRole) {
      return false; // Read-only
    }
  }

  // Běžná práva
  if (hasPermission('ORDER_DELETE_OWN')) {
    return order.objednatel_id === currentUserId ||
           order.uzivatel_id === currentUserId ||
           order.garant_uzivatel_id === currentUserId ||
           order.schvalovatel_id === currentUserId;
  }

  return false;
};
```

---

## Priorita práv (permission cascade)

```
1. SUPERADMIN / ADMINISTRATOR role
   ↓
2. ORDER_MANAGE
   ↓
3. ORDER_*_ALL (ORDER_READ_ALL, ORDER_EDIT_ALL, ORDER_DELETE_ALL, ORDER_APPROVE_ALL)
   ↓
4. ORDER_OLD (speciální pro archivované)
   ↓
5. HIERARCHIE FILTER (pokud zapnutá)
   ↓
6. 🆕 DEPARTMENT-BASED SUBORDINATE (ORDER_EDIT_SUBORDINATE, ORDER_READ_SUBORDINATE)
   ↓
7. ROLE-BASED FILTER (12 rolí: uzivatel_id, objednatel_id, garant_uzivatel_id, ...)
```

---

## Databázová struktura

### Tabulka: `25_uzivatele`

```sql
CREATE TABLE `25_uzivatele` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `usek_id` int(11) DEFAULT NULL,  -- 🔥 KLÍČOVÝ SLOUPEC pro department-based permissions
  `aktivni` tinyint(1) DEFAULT 1,
  ...
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Poznámka:** Pokud `usek_id` je `NULL` nebo `0`, uživatel nemá žádný úsek → subordinate práva nefungují.

### Tabulka: `25_prava`

```sql
-- ORDER_READ_SUBORDINATE
INSERT INTO 25_prava (id, kod_prava, nazev_prava, popis) VALUES
(4, 'ORDER_READ_SUBORDINATE', 'Objednávky - Čtení podřízených (úsek)', 
 'Read-only přístup k objednávkám kolegů ze stejného úseku (usek_id). Nezávislé na hierarchii.');

-- ORDER_EDIT_SUBORDINATE  
INSERT INTO 25_prava (id, kod_prava, nazev_prava, popis) VALUES
(20, 'ORDER_EDIT_SUBORDINATE', 'Objednávky - Editace podřízených (úsek)', 
 'Plná editace objednávek kolegů ze stejného úseku (usek_id). Nezávislé na hierarchii.');
```

---

## Testovací scénáře

### Test 1: ORDER_READ_SUBORDINATE - Read-only přístup

**Setup:**
- Uživatel A (usek_id=5, má právo ORDER_READ_SUBORDINATE)
- Uživatel B (usek_id=5)
- Objednávka X (objednatel_id=B, garant_uzivatel_id=B)

**Očekávaný výsledek:**
- ✅ Uživatel A vidí objednávku X v seznamu
- ✅ Uživatel A může otevřít detail objednávky X
- ❌ Uživatel A NEMŮŽE editovat objednávku X (tlačítko "Editovat" je disabled)
- ❌ Uživatel A NEMŮŽE mazat objednávku X
- ❌ Uživatel A NEMŮŽE schvalovat objednávku X (i když má ORDER_APPROVE)

---

### Test 2: ORDER_EDIT_SUBORDINATE - Plná editace

**Setup:**
- Uživatel A (usek_id=5, má právo ORDER_EDIT_SUBORDINATE)
- Uživatel B (usek_id=5)
- Objednávka X (objednatel_id=B, garant_uzivatel_id=B)

**Očekávaný výsledek:**
- ✅ Uživatel A vidí objednávku X v seznamu
- ✅ Uživatel A může otevřít detail objednávky X
- ✅ Uživatel A MŮŽE editovat objednávku X
- ✅ Uživatel A MŮŽE mazat objednávku X
- ✅ Uživatel A MŮŽE schvalovat objednávku X (pokud má ORDER_APPROVE)

---

### Test 3: Funguje bez hierarchie

**Setup:**
- Hierarchie vypnutá (`25_hierarchie_profily.aktivni = 0`)
- Uživatel A (usek_id=5, má právo ORDER_EDIT_SUBORDINATE)
- Uživatel B (usek_id=5)
- Objednávka X (objednatel_id=B)

**Očekávaný výsledek:**
- ✅ Uživatel A vidí objednávku X (hierarchie nemá vliv)
- ✅ Uživatel A může editovat objednávku X

---

### Test 4: ORDER_READ_SUBORDINATE + role na objednávce

**Setup:**
- Uživatel A (usek_id=5, má právo ORDER_READ_SUBORDINATE)
- Uživatel B (usek_id=5)
- Objednávka X (objednatel_id=B, **garant_uzivatel_id=A**)

**Očekávaný výsledek:**
- ✅ Uživatel A vidí objednávku X
- ✅ Uživatel A MŮŽE editovat objednávku X (protože je garant)
- ✅ Uživatel A MŮŽE schvalovat objednávku X (pokud má ORDER_APPROVE a je v roli)

---

### Test 5: Různé úseky - žádná viditelnost

**Setup:**
- Uživatel A (usek_id=5, má právo ORDER_EDIT_SUBORDINATE)
- Uživatel B (usek_id=8)
- Objednávka X (objednatel_id=B)

**Očekávaný výsledek:**
- ❌ Uživatel A NEVIDÍ objednávku X (různé úseky)

---

## Migration Guide

### Pro existující systémy:

1. **Zkontrolovat `usek_id`:**
   ```sql
   SELECT COUNT(*) FROM 25_uzivatele WHERE usek_id IS NULL OR usek_id = 0;
   ```
   Pokud jsou uživatelé bez `usek_id`, subordinate práva nebudou fungovat.

2. **Přiřadit práva:**
   ```sql
   -- Vedoucím úseků: ORDER_EDIT_SUBORDINATE
   INSERT INTO 25_role_prava (role_id, pravo_id, user_id) 
   SELECT role_id, 20, uzivatel_id 
   FROM 25_uzivatele_role 
   WHERE role_id = (SELECT id FROM 25_role WHERE nazev_role = 'Vedoucí úseku');
   
   -- Zástupcům vedoucích: ORDER_READ_SUBORDINATE
   INSERT INTO 25_role_prava (role_id, pravo_id, user_id) 
   SELECT role_id, 4, uzivatel_id 
   FROM 25_uzivatele_role 
   WHERE role_id = (SELECT id FROM 25_role WHERE nazev_role = 'Zástupce vedoucího');
   ```

3. **Deploy:**
   - Backend: `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php`
   - Frontend: `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/Orders25List.js`

4. **Restart Apache:**
   ```bash
   sudo systemctl restart apache2
   ```

5. **Rebuild frontend:**
   ```bash
   cd /var/www/erdms-dev/dashboard
   npm run build
   ```

---

## Poznámky

### 🔒 Bezpečnost

- SQL injection protection: `intval()` na všech user IDs před použitím v IN() klauzuli
- Permission checks na frontendu i backendu (double-check)
- Read-only enforcement i na frontendu (disabled buttons)

### ⚡ Performance

- Department colleague lookup je cachován během jednoho requestu
- IN() klauzule s indexovanými user IDs je rychlá (všechny role columns mají indexy)
- Typical department size: 5-20 users → IN() s 5-20 IDs je velmi rychlé

### 🔄 Zpětná kompatibilita

- Stávající hierarchie-based systém stále funguje
- Department-based práva fungují PARALELNĚ s hierarchií
- Pokud uživatel nemá `usek_id`, subordinate práva se nepoužijí (fallback na role-based filter)

---

## Changelog

### v1.0 - 16. ledna 2026
- ✅ Backend: Nová funkce `getUserDepartmentColleagueIds()`
- ✅ Backend: Department-based filtering v `handle_order_v2_list()`
- ✅ Frontend: Upravená funkce `canEdit()` s ORDER_EDIT_SUBORDINATE a ORDER_READ_SUBORDINATE
- ✅ Frontend: Upravená funkce `canDelete()` s ORDER_EDIT_SUBORDINATE a ORDER_READ_SUBORDINATE
- ✅ Dokumentace: Tento dokument

---

## Related Documents

- `ANALYZA_ORDER_SUBORDINATE_PERMISSIONS_2026-01-16.md` - Původní analýza hierarchy-based systému
- `ERDMS_PLATFORM_STRUCTURE.md` - Architektura platformy
- `API_PHP_MIGRATION_ANALYSIS.md` - Backend API struktura

---

**Status:** ✅ Implementováno  
**Testing:** ⏳ Pending  
**Production:** ⏳ Awaiting deployment
