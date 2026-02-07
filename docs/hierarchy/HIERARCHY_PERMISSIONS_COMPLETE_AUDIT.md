# 🔐 Kompletní audit hierarchických práv v aplikaci EEO 2025

**Datum:** 15.12.2025  
**Verze:** 1.89.H8  
**Status:** ✅ IMPLEMENTOVÁNO A FUNKČNÍ

---

## 📋 Executive Summary

Hierarchický systém práv byl úspěšně implementován a **automaticky funguje na všech místech**, kde se používá `hasPermission()` z `AuthContext`. Díky centralizované implementaci v `AuthContext` **není potřeba žádných změn** v existujícím kódu.

---

## 🏗️ Architektura

### 1. Centrální komponenty

#### AuthContext.js ✅
- **Stav hierarchie:** `hierarchyStatus` (enabled, isImmune, profileId, profileName, logic)
- **Rozšířená práva:** `expandedPermissions` (obsahuje base + hierarchická práva)
- **Funkce:** `hasPermission()` - **automaticky kontroluje expandedPermissions**
- **Načítání:**
  - Při loginu: `login()`
  - Při page reload: `useEffect` s loadAuthData
  - Při refresh profilu: `refreshUserDetail()`

#### permissionHierarchyService.js ✅
- **PERMISSION_HIERARCHY_MAP:** Definice pravidel expansion/upgrade
  - `ORDER_READ_OWN` → expand: `ORDER_READ_ALL`, upgrade: `ORDER_EDIT_OWN`
  - `ORDER_READ_ALL` → upgrade: `ORDER_EDIT_ALL`
  - `ORDER_EDIT_OWN` → expand: `ORDER_EDIT_ALL`, upgrade: `ORDER_DELETE_OWN`
  - `ORDER_EDIT_ALL` → upgrade: `ORDER_DELETE_ALL`
  - `ORDER_DELETE_OWN` → expand: `ORDER_DELETE_ALL`
  - `ORDER_CREATE` → upgrade: `ORDER_EDIT_OWN`
  
- **Funkce:** `expandPermissionsWithHierarchy(basePermissions, hierarchyEnabled, expand, upgrade)`

#### hierarchyService.js ✅
- Načítá konfiguraci hierarchie z `global_settings`
- Vrací: enabled, profileId, profileName, logic, logicDescription
- API: `getHierarchyConfig(token, username)`

---

## 🎯 Kde se používá hierarchie

### ✅ Desktop aplikace

#### 1. Orders25List.js - Seznam objednávek
**Status:** ✅ FUNGUJE - používá `hasPermission()` z AuthContext

**Kontroly práv:**
- `ORDER_READ_OWN` / `ORDER_READ_ALL` - zobrazení
- `ORDER_EDIT_OWN` / `ORDER_EDIT_ALL` - editace
- `ORDER_DELETE_OWN` / `ORDER_DELETE_ALL` - mazání
- `ORDER_CREATE` - vytváření
- `ORDER_APPROVE` - schvalování

**Hierarchie:**
- ✅ Backend filtruje data podle hierarchických vztahů
- ✅ Frontend kontroluje práva přes `hasPermission()` (automaticky s hierarchií)
- ✅ Uživatelé s `HIERARCHY_IMMUNE` vidí data bez hierarchického omezení

**Umístění kódu:**
```javascript
// Řádek 4146
const { hasPermission } = useContext(AuthContext);

// Řádek 4183-4195 - Permission checks
const canViewAll = hasPermission('ORDER_MANAGE') ||
                   hasPermission('ORDER_READ_ALL') ||
                   hasPermission('ORDER_EDIT_ALL') ||
                   hasPermission('ORDER_DELETE_ALL');
```

#### 2. OrderForm25.js - Formulář objednávky
**Status:** ✅ FUNGUJE - používá `hasPermission()` z AuthContext

**Kontroly práv:**
- `ORDER_EDIT_OWN` / `ORDER_EDIT_ALL` - editace fází
- `ORDER_APPROVE` - schvalování
- `ORDER_MANAGE` - kompletní správa

**Umístění kódu:**
```javascript
// Řádek 4046
const { hasPermission } = useContext(AuthContext);

// Řádek 6376 - Phase 2 edit permission
const canEditPhase2 = hasPermission('ORDER_MANAGE') || 
                      hasPermission('ORDER_APPROVE') || 
                      hasPermission('ORDER_EDIT_OWN') || 
                      hasPermission('ORDER_EDIT_ALL');

// Řádek 6414-6417 - Various permissions
const canApproveOrders = hasPermission('ORDER_APPROVE');
const canManageOrders = hasPermission('ORDER_MANAGE');
const canEditPhase3 = hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_EDIT_ALL');
```

#### 3. Layout.js - Navigace a menu
**Status:** ✅ FUNGUJE

**Hierarchie badge:**
- ✅ Zobrazuje `.H{profileId}` v hlavičce
- ✅ Zelená barva (#10b981) pro aktivní hierarchii
- ✅ Šedá barva (#9ca3af) pro IMMUNE uživatele
- ✅ Opacity 0.6 pro IMMUNE uživatele

**Umístění kódu:**
```javascript
// Řádek 1519 - AuthContext destructuring
const { hierarchyStatus } = useContext(AuthContext);

// Řádek 1551-1560 - hierarchyInfo computation
const hierarchyInfo = useMemo(() => {
  if (!hierarchyStatus?.hierarchyEnabled || !hierarchyStatus?.profileId) {
    return { enabled: false };
  }
  return {
    profileId: hierarchyStatus.profileId,
    enabled: true,
    isImmune: hierarchyStatus.isImmune || false
  };
}, [hierarchyStatus]);

// Řádek 2449-2454 - Badge render
<span style={{ 
  color: hierarchyInfo.isImmune ? '#9ca3af' : '#10b981',
  opacity: hierarchyInfo.isImmune ? 0.6 : 1
}}>.H{hierarchyInfo.profileId}</span>
```

#### 4. App.js - Routing
**Status:** ✅ FUNGUJE - používá `hasPermission()` pro route guards

**Umístění kódu:**
```javascript
// Řádek 236
const { hasPermission } = useContext(AuthContext);

// Řádek 486-487 - Route guards s hasPermission
{isLoggedIn && hasPermission('USER_VIEW') && <Route path="/users" element={<Users />} />}
{isLoggedIn && hasPermission('DICT_VIEW') && <Route path="/dictionaries" element={<DictionariesNew />} />}
```

---

### ✅ Backend API

#### hierarchyOrderFilters.php ✅
**Status:** ✅ FUNGUJE

**Kontrola HIERARCHY_IMMUNE:**
```php
// Řádek 87-109
function isUserHierarchyImmune($userId, $db) {
    $queryRoles = "
        SELECT COUNT(*) as cnt
        FROM 25_uzivatele_role ur
        INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
        INNER JOIN 25_prava p ON p.id = rp.pravo_id
        WHERE ur.uzivatel_id = :userId
          AND p.kod_prava = 'HIERARCHY_IMMUNE'
          AND p.aktivni = 1
    ";
    return $row['cnt'] > 0;
}
```

**Aplikace hierarchie:**
- Načte hierarchické vztahy z `25_hierarchie_vztahy`
- Filtruje objednávky podle `typ_vztahu` (nadrizeny, podrizeny, kolega, atd.)
- Respektuje `logic` (AND/OR)
- **IMMUNE uživatelé:** Vrací NULL (= žádné omezení)

---

## 🔍 Kontrolní checklist

### ✅ Frontend

| Komponenta | hasPermission | expandedPermissions | hierarchyStatus | Badge | Status |
|------------|---------------|---------------------|-----------------|-------|--------|
| AuthContext | ✅ Implementováno | ✅ Nastaveno | ✅ Načítáno | - | ✅ OK |
| Orders25List | ✅ Používá | ✅ Automaticky | - | - | ✅ OK |
| OrderForm25 | ✅ Používá | ✅ Automaticky | - | - | ✅ OK |
| Layout | ✅ Používá | - | ✅ Zobrazuje | ✅ Zelená/Šedá | ✅ OK |
| App.js | ✅ Používá | - | - | - | ✅ OK |

### ✅ Backend

| Soubor | HIERARCHY_IMMUNE | Filtrace | Logic AND/OR | Status |
|--------|------------------|----------|--------------|--------|
| hierarchyOrderFilters.php | ✅ Kontroluje | ✅ Aplikuje | ✅ Podporuje | ✅ OK |
| apiOrderV2.js | ✅ Volá PHP | - | - | ✅ OK |

### ✅ Permissions

| Právo | Expansion | Upgrade | Testováno | Status |
|-------|-----------|---------|-----------|--------|
| ORDER_READ_OWN | → ORDER_READ_ALL | → ORDER_EDIT_OWN | ✅ Ano | ✅ OK |
| ORDER_READ_ALL | - | → ORDER_EDIT_ALL | ✅ Ano | ✅ OK |
| ORDER_EDIT_OWN | → ORDER_EDIT_ALL | → ORDER_DELETE_OWN | ✅ Ano | ✅ OK |
| ORDER_EDIT_ALL | - | → ORDER_DELETE_ALL | ✅ Ano | ✅ OK |
| ORDER_DELETE_OWN | → ORDER_DELETE_ALL | - | ✅ Ano | ✅ OK |
| ORDER_CREATE | - | → ORDER_EDIT_OWN | ✅ Ano | ✅ OK |

---

## 🚀 Mobilní aplikace (TODO - Sprint 2+)

### ⚠️ Cashbook - PLÁNOVÁNO

**Práva k implementaci:**
- `CASH_BOOK_READ_OWN` → `CASH_BOOK_READ_ALL`
- `CASH_BOOK_EDIT_OWN` → `CASH_BOOK_EDIT_ALL`
- `CASH_BOOK_DELETE_OWN` → `CASH_BOOK_DELETE_ALL`

**Akce:**
1. Přidat CASH_BOOK práva do `PERMISSION_HIERARCHY_MAP`
2. Vytvořit `hierarchyCashbookFilters.php`
3. Integrovat do `apiCashbook.js`

### ⚠️ Invoices - PLÁNOVÁNO

**Práva k implementaci:**
- `INVOICE_READ_OWN` → `INVOICE_READ_ALL`
- `INVOICE_EDIT_OWN` → `INVOICE_EDIT_ALL`
- `INVOICE_DELETE_OWN` → `INVOICE_DELETE_ALL`

**Akce:**
1. Přidat INVOICE práva do `PERMISSION_HIERARCHY_MAP`
2. Vytvořit `hierarchyInvoiceFilters.php`
3. Integrovat do `apiInvoice.js`

---

## 🐛 Známé problémy a jejich řešení

### ✅ VYŘEŠENO: extractPermissionCodes nenačítal HIERARCHY_IMMUNE

**Problém:** Regex pattern `/ORDER_APPROVE|ORDER|APPROVE|SCHVAL|PRAVO|PRAVY/i` **neobsahoval `HIERARCHY`**

**Řešení:** Přidán `HIERARCHY` do patternu:
```javascript
// AuthContext.js řádek 742
if (typeof v === 'string' && /ORDER_APPROVE|ORDER|APPROVE|SCHVAL|PRAVO|PRAVY|HIERARCHY/i.test(v)) scanValue(v);
```

**Navíc:** Explicitní skenování `roles[].rights`:
```javascript
// AuthContext.js řádek 747-755
if (detail.roles && Array.isArray(detail.roles)) {
  detail.roles.forEach(role => {
    if (role.rights && Array.isArray(role.rights)) {
      scanValue(role.rights);
    }
  });
}
```

### ✅ VYŘEŠENO: Badge nezobrazoval šedou barvu pro IMMUNE uživatele

**Problém:** `isImmune` byl vždy `false`, protože se nečetl správně z `userDetail`

**Řešení:** Načítání čerstvých dat z API a použití `extractPermissionCodes`:
```javascript
// AuthContext.js řádek 492-498
const freshDetail = await getUserDetailApi2(storedUser.username, storedToken, storedUser.id);
const freshPerms = extractPermissionCodes(freshDetail || {});
hasImmunity = freshPerms.includes('HIERARCHY_IMMUNE');
```

---

## 📊 Testovací scénáře

### ✅ Test 1: Uživatel s ORDER_READ_OWN + hierarchie

**Výchozí práva:** `['ORDER_READ_OWN', 'ORDER_CREATE']`  
**Po aplikaci hierarchie:** `['ORDER_READ_OWN', 'ORDER_CREATE', 'ORDER_READ_ALL', 'ORDER_EDIT_OWN']`

**Očekáváno:**
- ✅ Vidí svoje objednávky
- ✅ Vidí objednávky podřízených (hierarchie)
- ✅ Může editovat svoje objednávky
- ❌ Nemůže editovat cizí objednávky

### ✅ Test 2: Uživatel s HIERARCHY_IMMUNE

**Výchozí práva:** `['ORDER_READ_OWN', 'HIERARCHY_IMMUNE']`  
**Po aplikaci hierarchie:** `['ORDER_READ_OWN', 'HIERARCHY_IMMUNE']` (žádné rozšíření)

**Očekáváno:**
- ✅ Vidí VŠECHNY objednávky (backend vrací null filter)
- ✅ Badge `.H8` je šedý
- ✅ Opacity 0.6

### ✅ Test 3: Uživatel bez hierarchie

**Výchozí práva:** `['ORDER_READ_OWN']`  
**Hierarchie:** DISABLED  
**Po aplikaci hierarchie:** `['ORDER_READ_OWN']` (beze změny)

**Očekáváno:**
- ✅ Vidí pouze svoje objednávky
- ❌ Badge `.H8` se nezobrazuje

---

## 🔧 Maintenance

### Přidání nového práva do hierarchie

1. Upravit `PERMISSION_HIERARCHY_MAP` v `permissionHierarchyService.js`
2. Přidat do backend filtru (např. `hierarchyOrderFilters.php`)
3. Testovat s různými rolemi
4. Aktualizovat dokumentaci

### Změna logiky hierarchie

1. Upravit `expandPermissionsWithHierarchy()` v `permissionHierarchyService.js`
2. Testovat všechny scénáře
3. Zkontrolovat, že `HIERARCHY_IMMUNE` stále funguje

---

## 📝 Poznámky

1. **Hierarchie funguje AUTOMATICKY** - všude, kde se používá `hasPermission()` z `AuthContext`
2. **Není potřeba měnit existující kód** - vše je centralizované
3. **Badge v hlavičce** - vizuální indikátor hierarchie (zelený/šedý)
4. **Backend respektuje HIERARCHY_IMMUNE** - vrací null filter pro immune uživatele

---

## ✅ Závěr

Hierarchický systém práv je **plně funkční** pro:
- ✅ Orders25List (seznam objednávek)
- ✅ OrderForm25 (formulář objednávky)
- ✅ Layout (navigace a badge)
- ✅ Backend API (filtrace dat)

**Zbývá implementovat:**
- ⚠️ Cashbook (Sprint 2)
- ⚠️ Invoices (Sprint 3)

---

**Autor:** GitHub Copilot (Claude Sonnet 4.5)  
**Poslední aktualizace:** 15.12.2025 23:00
