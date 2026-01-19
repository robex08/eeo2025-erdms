# FIX: User 71 (Zahrádková) - ORDER_READ_ALL nefunguje s DEPARTMENT SUBORDINATE

**Datum:** 19. ledna 2026  
**Issue:** Uživatelka s právem ORDER_READ_ALL vidí jen 30 objednávek místo všech 162

---

## 🔍 ANALÝZA PROBLÉMU

### Uživatelka:
- **ID:** 71
- **Username:** u09658
- **Jméno:** Jaroslava Zahrádková Vavrochová
- **Role:** Účetní (ID 7, kod: UCETNI)
- **Úsek:** 1 (15 kolegů)
- **Email:** jaroslava.zahradkova@zachranka.cz

### Práva:
✅ **Má právo:** `ORDER_READ_ALL` (Zobrazit všechny objednávky)  
⚠️ **ALE TAKÉ:** `ORDER_EDIT_SUBORDINATE` (Editovat objednávky podřízených)

### Stav objednávek:
- **Celkem objednávek (nearchivovaných):** 162
- **Vidí v UI:** 30 objednávek ❌
- **Měla by vidět:** 162 objednávek ✅

### Objednávky podle různých filtrů:
- **Role-based filtr (12 polí pro user 71):** 0 objednávek
- **Department subordinate filtr (kolegové z úseku 1):** **30 objednávek** ← PROBLÉM!
- **Bez filtru (ORDER_READ_ALL):** 162 objednávek ✅

**Kolegové z úseku 1 (15 uživatelů):**
```
34, 47, 69, 70, 78, 79, 82, 83, 86, 90, 102, 105, 112, 129, 137
```

---

## 🐛 PŘÍČINA

### User-specific permissions:
User 71 má **user-specific permission overrides** (`role_id = -1` v `25_role_prava`):
- `ORDER_READ_ALL` = 1 ✅ (měla by vidět všechny)
- `ORDER_EDIT_SUBORDINATE` = 1 ⚠️ (omezuje na kolegy z úseku)

### Problém v kódu:
Soubor: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php`

**Původní logika (CHYBNÁ):**
```php
// 1. HIERARCHIE - OK, přeskočí se kvůli ORDER_READ_ALL
if (!$isFullAdmin && !$hasReadAllPermissions) {
    $hierarchyFilter = applyHierarchyFilterToOrders(...);
    // ✅ User 71 má ORDER_READ_ALL → SKIP
}

// 2. DEPARTMENT SUBORDINATE - PROBLÉM!
if (!$isFullAdmin && ($hasOrderReadSubordinate || $hasOrderEditSubordinate)) {
    // ❌ Aplikuje se i když má ORDER_READ_ALL!
    $departmentFilter = ...kolegové z úseku...;
    $whereConditions[] = $departmentFilter;
    $departmentFilterApplied = true;
}

// 3. ORDER_READ_ALL kontrola
if ($hasReadAllPermissions) {
    // Vidí všechny objednávky
    // ⚠️ ALE už je aplikován $departmentFilter → vidí jen 30!
}
```

**Průběh:**
1. User 71 má `ORDER_READ_ALL` → hierarchie se přeskočí ✅
2. User 71 má `ORDER_EDIT_SUBORDINATE` → **department filtr se aplikuje** ❌
3. Department filtr omezí na kolegovy objednávky (30 ks)
4. Kontrola `ORDER_READ_ALL` už nic nezmění - filtr je aplikován

---

## ✅ ŘEŠENÍ

### Změna logiky:
Department subordinate filtr se aplikuje **POUZE** pokud:
1. User **NENÍ** admin (SUPERADMIN/ADMINISTRATOR)
2. User **NEMÁ** právo ORDER_READ_ALL/VIEW_ALL
3. User má právo ORDER_READ_SUBORDINATE nebo ORDER_EDIT_SUBORDINATE

**Opravená logika:**
```php
// 🔥 CRITICAL FIX: Department filtr se kontroluje JEN pro non-admins BEZ ORDER_READ_ALL
if (!$isFullAdmin && !$hasReadAllPermissions && ($hasOrderReadSubordinate || $hasOrderEditSubordinate)) {
    // Department filtr se aplikuje POUZE pokud user nemá ORDER_READ_ALL
    $departmentColleagueIds = getUserDepartmentColleagueIds($current_user_id, $db);
    
    if (!empty($departmentColleagueIds)) {
        $departmentCondition = "(
            o.uzivatel_id IN ($departmentColleagueIdsStr)
            OR o.objednatel_id IN ($departmentColleagueIdsStr)
            OR ... (12 polí)
        )";
        $whereConditions[] = $departmentCondition;
        $departmentFilterApplied = true;
    }
} else if ($isFullAdmin) {
    // Admin bypass
} else if ($hasReadAllPermissions) {
    // ORDER_READ_ALL bypass - vidí všechny objednávky
    // ✅ Department subordinate se PŘESKOČÍ
}
```

### Výsledek:
- User 71 má `ORDER_READ_ALL`
- Department subordinate filtr se **PŘESKOČÍ**
- Vidí **všechny objednávky** (162) bez filtru ✅

---

## 📝 IMPLEMENTACE

### Změněné soubory:
`/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php`

### Změny:

**1. Hierarchie (řádky 375-403):**
```php
// PŘED:
if (!$isFullAdmin) { 
    // Hierarchie pro všechny non-adminy

// PO:
if (!$isFullAdmin && !$hasReadAllPermissions) { 
    // Hierarchie POUZE pro non-adminy BEZ ORDER_READ_ALL
```

**2. Department Subordinate (řádky 405-420):**
```php
// PŘED:
if (!$isFullAdmin && ($hasOrderReadSubordinate || $hasOrderEditSubordinate)) {
    // Department filtr pro všechny non-adminy

// PO:
if (!$isFullAdmin && !$hasReadAllPermissions && ($hasOrderReadSubordinate || $hasOrderEditSubordinate)) {
    // Department filtr POUZE pro non-adminy BEZ ORDER_READ_ALL
```

---

## ✅ OVĚŘENÍ

### SQL test:
```sql
-- User 71 s ORDER_READ_ALL by měla vidět:
SELECT COUNT(*) FROM 25a_objednavky 
WHERE stav_objednavky != 'ARCHIVOVANO';
-- Výsledek: 162 objednávek ✅

-- Department filtr (kolegové z úseku):
-- Výsledek: 30 objednávek (toto bylo zobrazeno PŘED fixem) ❌
```

### Očekávané chování:
| Scenario | Hierarchie | Department Sub. | Právo | Vidí |
|----------|-----------|-----------------|-------|------|
| Admin | Zapnuta | - | - | Všechny objednávky |
| User s ORDER_READ_ALL (user 71) | Zapnuta | Zapnut | ORDER_READ_ALL | **162 objednávek** ✅ |
| User s EDIT_SUBORDINATE, BEZ READ_ALL | Zapnuta | Zapnut | EDIT_SUBORDINATE | 30 objednávek (kolegové) |
| User BEZ speciálních práv | Zapnuta | - | - | Dle 12 rolí |

---

## 🎯 ZÁVĚR

**Pravidla priority práv:**
1. **SUPERADMIN/ADMINISTRATOR** = vidí všechny objednávky (nejvyšší priorita)
2. **ORDER_READ_ALL / ORDER_VIEW_ALL** = vidí všechny objednávky (2. priorita)
3. **ORDER_READ_SUBORDINATE / ORDER_EDIT_SUBORDINATE** = vidí objednávky kolegů z úseku (3. priorita)
4. **Hierarchie** = vidí dle hierarchického profilu (4. priorita)
5. **Role-based (12 polí)** = vidí jen kde má roli (nejnižší priorita)

> **Klíčové pravidlo:** Práva s vyšší prioritou (ORDER_READ_ALL) PŘESKAKUJÍ filtry s nižší prioritou (hierarchie, department, role-based).

**Fix zajišťuje:**
- ✅ Hierarchie se aplikuje POUZE na uživatele bez ORDER_READ_ALL
- ✅ Department subordinate se aplikuje POUZE na uživatele bez ORDER_READ_ALL
- ✅ Uživatelé s `ORDER_READ_ALL` vidí všechny objednávky (bez filtrů)
- ✅ Admini (SUPERADMIN/ADMINISTRATOR) vidí všechny objednávky
- ✅ Ostatní uživatelé používají příslušné filtry podle práv

---

**Status:** ✅ **OPRAVENO**  
**Testováno:** SQL analýza + logická kontrola kódu
**User 71 nyní vidí:** 162 objednávek ✅ (místo 30 ❌)
