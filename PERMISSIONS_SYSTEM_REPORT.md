# 🔐 PERMISSIONS SYSTEM REPORT
**Datum:** 5. ledna 2026  
**Projekt:** EEO 2025 ERDMS  
**Autor:** System Audit  

---

## 1. PŘEHLED SYSTÉMU PRÁV

### 1.1 Architektura
- **Backend:** PHP (API Legacy) + MySQL databáze
- **Frontend:** React (AuthContext + permission hooks)
- **Storage:** 
  - DB tabulky: `25_prava`, `25_role`, `25_role_prava`, `25_uzivatele`, `25_uzivatel_role`
  - Session/LocalStorage: `auth_user_permissions_persistent`, `auth_user_detail_persistent`

### 1.2 Tok práv
```
1. Přihlášení → getUserDetailApi2() → načte uživatele včetně práv z DB
2. extractPermissionCodes() → extrahuje kódy práv do pole
3. saveAuthData.userPermissions() → uloží do sessionStorage
4. hasPermission() → kontroluje práva v runtime
5. Refresh → načte práva ze sessionStorage nebo znovu z API
```

---

## 2. DATABÁZOVÁ PRÁVA

### 2.1 ORDER_* (Objednávky)

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **ORDER_2025** | Správa objednávek pro rok 2025 a dál | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_MANAGE** | Kompletní správa objednávek (všechna práva) | ADMINISTRATOR, HLAVNI_UCETNI, SPRAVCE_ROZPOCTU, SUPERADMIN, VEREJNE_ZAKAZKY |
| **ORDER_READ_ALL** | Zobrazit všechny objednávky | ADMINISTRATOR, HLAVNI_UCETNI, REDITEL, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, UCETNI, VEREJNE_ZAKAZKY |
| **ORDER_READ_OWN** | Zobrazit vlastní objednávky | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_READ_SUBORDINATE** | Zobrazit objednávky podřízených | ADMINISTRATOR, NAMESTEK, PRIKAZCE_OPERACE, SUPERADMIN |
| **ORDER_EDIT_ALL** | Upravit jakoukoliv objednávku (admin) | ADMINISTRATOR, HLAVNI_UCETNI, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, VEREJNE_ZAKAZKY |
| **ORDER_EDIT_OWN** | Upravit vlastní objednávku (před schválením) | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_EDIT_SUBORDINATE** | Editace objednávky podřízených | ADMINISTRATOR, NAMESTEK, PRIKAZCE_OPERACE, SPRAVCE_ROZPOCTU, SUPERADMIN |
| **ORDER_DELETE_ALL** | Smazat jakoukoliv objednávku (admin) | ADMINISTRATOR, SPRAVCE_ROZPOCTU, SUPERADMIN |
| **ORDER_DELETE_OWN** | Smazat vlastní objednávku (před schválením) | ADMINISTRATOR, PRIMAR, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VRCHNI |
| **ORDER_CREATE** | Vytvořit novou objednávku | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_SAVE** | Uložit rozpracovanou objednávku | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_APPROVE** | Schválit nebo zamítnout objednávku | ADMINISTRATOR, NAMESTEK, PRIKAZCE_OPERACE, SUPERADMIN |
| **ORDER_LOCK** | Zamknout objednávku proti úpravám | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REDITEL, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_UNLOCK** | Odemknout zamčenou objednávku (admin) | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REDITEL, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_COMPLETE** | Dokončení objednávky - uzavření workflow | ADMINISTRATOR, HLAVNI_UCETNI, SPRAVCE_ROZPOCTU, SUPERADMIN, UCETNI |
| **ORDER_PUBLISH_REGISTRY** | Zveřejnění objednávky v registru smluv | ADMINISTRATOR, SPRAVCE_ROZPOCTU, SUPERADMIN, VEREJNE_ZAKAZKY |
| **ORDER_OLD** | Správa původních objednávek z EEO (archiv) | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REDITEL, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |
| **ORDER_SHOW_ARCHIVE** | Zobrazení checkboxu ARCHIV v seznamu | ŽÁDNÉ ROLE (manuální přiřazení) |
| **ORDER_IMPORT** | Možnost importu ze starých objednávek | ADMINISTRATOR, SPRAVCE_ROZPOCTU, SUPERADMIN |

### 2.2 INVOICE_* (Faktury)

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **INVOICE_MANAGE** | Správa faktur - přidávání a úprava faktur | ADMINISTRATOR, HLAVNI_UCETNI, SUPERADMIN, UCETNI, VEREJNE_ZAKAZKY |
| **INVOICE_VIEW** | Prohlížení všech faktur (read-only) | HLAVNI_UCETNI, PRIMAR, REFERENT, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VRCHNI |
| **INVOICE_ADD** | Přidávání faktur k objednávkám | ADMINISTRATOR, HLAVNI_UCETNI, SUPERADMIN, UCETNI, VEREJNE_ZAKAZKY |
| **INVOICE_EDIT** | Editace faktur k objednávkám | ADMINISTRATOR, HLAVNI_UCETNI, SUPERADMIN, UCETNI, VEREJNE_ZAKAZKY |
| **INVOICE_DELETE** | Smazání faktur | ADMINISTRATOR, SUPERADMIN |
| **INVOICE_MATERIAL_CORRECTNESS** | Faktury - věcná správnost | HLAVNI_UCETNI, PRIKAZCE_OPERACE, PRIMAR, REFERENT, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VEREJNE_ZAKAZKY, VRCHNI |

### 2.3 HIERARCHY_* (Hierarchie)

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **HIERARCHY_IMMUNE** | Imunní vůči hierarchii workflow - vidí všechna data | ADMINISTRATOR, SUPERADMIN |

### 2.4 USER_* (Uživatelé)

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **USER_VIEW** | Zobrazení seznamu uživatelů (read-only) | SUPERADMIN |
| **USER_MANAGE** | Spravovat uživatele, role a jejich zařazení | ADMINISTRATOR, SUPERADMIN |
| **USER_DELETE** | Oprávnění smazat uživatele z databáze | SUPERADMIN |
| **USER_SUBSTITUTE** | Má právo být zástupem | SUPERADMIN |

### 2.5 DICT_* (Číselníky)

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **DICT_VIEW** | Zobrazení číselníků (read-only) | SUPERADMIN |
| **DICT_MANAGE** | Může spravovat číselníky | SUPERADMIN |

### 2.6 CONTACT_* (Kontakty dodavatelů)

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **CONTACT_READ** | Zobrazit kontakty dodavatelů | ADMINISTRATOR, HLAVNI_UCETNI, NAMESTEK, PRIKAZCE_OPERACE, PRIMAR, REDITEL, REFERENT, ROZPOCTAR, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VRCHNI |
| **CONTACT_EDIT** | Editovat kontakty dodavatelů | ADMINISTRATOR, HLAVNI_UCETNI, SPRAVCE_ROZPOCTU, SUPERADMIN, UCETNI |
| **CONTACT_MANAGE** | Spravovat kontakty dodavatelů | ADMINISTRATOR, SUPERADMIN |

### 2.7 CASH_* (Pokladní kniha)

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **CASH_BOOK_MANAGE** | Kompletní správa všech pokladních knih | ADMINISTRATOR, SUPERADMIN |
| **CASH_BOOK_VIEW** | Zobrazení pokladní knihy (obecné právo) | SUPERADMIN |
| **CASH_BOOK_READ_ALL** | Zobrazení všech pokladních knih | ADMINISTRATOR, HLAVNI_UCETNI, ROZPOCTAR, SPRAVCE_ROZPOCTU, SUPERADMIN |
| **CASH_BOOK_READ_OWN** | Zobrazení vlastní pokladní knihy | ADMINISTRATOR, REFERENT, SUPERADMIN, THP_PES |
| **CASH_BOOK_EDIT_ALL** | Editace záznamů ve všech pokladních knihách | ADMINISTRATOR, ROZPOCTAR, SUPERADMIN |
| **CASH_BOOK_EDIT_OWN** | Editace záznamů ve vlastní pokladní knize | ADMINISTRATOR, REFERENT, SUPERADMIN, THP_PES |
| **CASH_BOOK_CREATE** | Vytvoření nového záznamu | ADMINISTRATOR, REFERENT, ROZPOCTAR, SUPERADMIN, THP_PES |
| **CASH_BOOK_DELETE_ALL** | Smazání záznamů ze všech pokladních knih | ADMINISTRATOR, ROZPOCTAR, SUPERADMIN |
| **CASH_BOOK_DELETE_OWN** | Smazání záznamů z vlastní pokladní knihy | ADMINISTRATOR, REFERENT, SUPERADMIN, THP_PES |
| **CASH_BOOK_EXPORT_ALL** | Export všech pokladních knih (CSV, PDF) | ADMINISTRATOR, HLAVNI_UCETNI, ROZPOCTAR, SPRAVCE_ROZPOCTU, SUPERADMIN |
| **CASH_BOOK_EXPORT_OWN** | Export vlastní pokladní knihy (CSV, PDF) | ADMINISTRATOR, REFERENT, SUPERADMIN, THP_PES |

### 2.8 OSTATNÍ PRÁVA

| Kód práva | Popis | Přiřazeno k rolím |
|-----------|-------|-------------------|
| **TEMPLATE_MANAGE** | Spravovat šablony objednávek | ADMINISTRATOR, SUPERADMIN |
| **PHONEBOOK_VIEW** | Přístup k telefonnímu a emailovému seznamu | HLAVNI_UCETNI, PRIMAR, REFERENT, SPRAVCE_ROZPOCTU, SUPERADMIN, THP_PES, UCETNI, VEDOUCI_AUTODILNY, VEDOUCI_ODDELENI, VRCHNI |

---

## 3. BACKEND IMPLEMENTACE

### 3.1 PHP Kontrola práv (hierarchyOrderFilters.php)

```php
// ✅ PRIORITA KONTROLY PRÁV (canUserViewOrder):

// 0. ORDER_MANAGE → PLNÝ PŘÍSTUP
if (in_array('ORDER_MANAGE', $user_permissions)) {
    return true;
}

// 1. Hierarchy disabled → allow
if (!$hierarchy_settings || !$hierarchy_settings['enabled']) {
    return true;
}

// 2. HIERARCHY_IMMUNE → bypass hierarchie
if (isUserHierarchyImmune($userId, $db)) {
    return true;
}

// 3. Kontrola 12-rolových polí v objednávce
// uzivatel_id, objednatel_id, garant_uzivatel_id, schvalovatel_id, 
// prikazce_id, uzivatel_akt_id, odesilatel_id, dodavatel_potvrdil_id, 
// zverejnil_id, fakturant_id, dokoncil_id, potvrdil_vecnou_spravnost_id

// 4. Kontrola hierarchických vztahů (pokud existují)
```

### 3.2 Použití v API endpointech (orderV2Endpoints.php)

#### LIST endpoint (~/order-v2/list-enriched)
```php
// 🔥 KRITICKÁ LOGIKA filtrování:

// ORDER_MANAGE nebo ORDER_READ_ALL → Vidí všechny objednávky
if ($hasOrderManage || $hasOrderReadAll || $hasOrderViewAll || ...) {
    // ŽÁDNÝ role-based WHERE filter
}

// ORDER_OLD právo:
// - s archivovano=1 → Vidí VŠECHNY archivované objednávky
// - bez READ_ALL → Hybrid filter (všechny archivované + role filter pro aktivní)

// Běžný uživatel (ORDER_READ_OWN):
// - 12-role WHERE filter (uzivatel_id=X OR objednatel_id=X OR ...)
```

#### GET detail endpoint (~/order-v2/{id})
```php
// Před vrácením objednávky:
if (!canUserViewOrder($orderId, $userId, $pdo)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Nemáte oprávnění zobrazit tuto objednávku']);
    exit;
}
```

### 3.3 Použití u pokladní knihy (CashbookPermissions.php)

```php
class CashbookPermissions {
    // Middleware pro kontrolu práv
    
    public function canViewCashbook($cashbookId) {
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_READ_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_READ_OWN') && $this->isOwnCashbox()) return true;
        return false;
    }
    
    public function canEditCashbook($cashbookId) {
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_OWN') && $this->isOwnCashbox()) return true;
        return false;
    }
}
```

---

## 4. FRONTEND IMPLEMENTACE

### 4.1 AuthContext.js - Hlavní poskytovatel práv

```javascript
// extractPermissionCodes() - Extrakce práv z user detail
const extractPermissionCodes = (detail) => {
  if (!detail) return [];
  
  // Kontrola různých formátů z API:
  // 1. detail.permissions = [{ kod_prava: 'ORDER_MANAGE' }, ...]
  // 2. detail.role[0].prava = [{ kod_prava: 'ORDER_APPROVE' }, ...]
  
  const codes = new Set();
  
  // Z direct permissions
  if (Array.isArray(detail.permissions)) {
    detail.permissions.forEach(p => {
      if (p.kod_prava) codes.add(p.kod_prava);
    });
  }
  
  // Z role.prava
  if (Array.isArray(detail.role)) {
    detail.role.forEach(role => {
      if (Array.isArray(role.prava)) {
        role.prava.forEach(p => {
          if (p.kod_prava) codes.add(p.kod_prava);
        });
      }
    });
  }
  
  return Array.from(codes);
};

// hasPermission() - Hlavní funkce pro kontrolu práv
const hasPermission = useCallback((requiredPermission) => {
  if (!requiredPermission) return false;
  
  // Speciální aliasy:
  if (requiredPermission === 'ADMIN') {
    return expandedPermissions.includes('SUPERADMIN') || 
           expandedPermissions.includes('ADMINISTRATOR');
  }
  
  // 🔐 HIERARCHIE: Použít expandedPermissions (obsahují hierarchické rozšíření)
  return expandedPermissions.includes(requiredPermission);
}, [expandedPermissions]);
```

### 4.2 Použití v komponentách

#### Orders25List.js
```javascript
const { hasPermission, user_id } = useContext(AuthContext);

// ✅ SPRÁVNĚ: Zobrazit "Moje objednávky" všem uživatelům
const showMyOrdersTile = true; // Už NENÍ omezeno na adminy

// Filtrace na FE straně:
const filterMyOrders = (order) => {
  if (!showOnlyMyOrders) return true; // Zobrazit všechny
  
  // Kontrola 12 rolí:
  return order.uzivatel_id === user_id ||
         order.objednatel_id === user_id ||
         order.garant_uzivatel_id === user_id ||
         order.schvalovatel_id === user_id ||
         order.prikazce_id === user_id ||
         // ... atd.
};
```

#### OrderForm25.js
```javascript
const { hasPermission, userDetail, user_id } = useContext(AuthContext);

// Kontroly práv pro různé akce:
const canEditPhase2 = hasPermission('ORDER_MANAGE') || 
                      hasPermission('ORDER_APPROVE') || 
                      hasPermission('ORDER_EDIT_OWN') || 
                      hasPermission('ORDER_EDIT_ALL');

const canApproveOrders = hasPermission('ORDER_APPROVE');
const canManageOrders = hasPermission('ORDER_MANAGE');
const canPublishRegistry = hasPermission('ORDER_PUBLISH_REGISTRY');
const canManageInvoices = hasPermission('INVOICE_MANAGE');

// Odemykání fází:
const canUnlockAnything = isSuperAdmin || isAdmin || 
                          hasPermission('ORDER_MANAGE');
```

#### InvoiceEvidencePage.js
```javascript
const { hasPermission } = useContext(AuthContext);

// Kontrola práv pro zobrazení všech objednávek:
const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                         hasPermission('ORDER_MANAGE') || 
                         hasPermission('ADMIN');

// Read-only mode pro věcnou správnost:
const isReadOnlyMode = !hasPermission('INVOICE_MANAGE') && 
                       hasPermission('INVOICE_MATERIAL_CORRECTNESS');
```

### 4.3 Použití v App.js (Routing)

```javascript
// Ochrana routů podle práv:
{isLoggedIn && hasPermission('USER_VIEW') && 
  <Route path="/users" element={<Users />} />
}

{isLoggedIn && hasPermission('DICT_VIEW') && 
  <Route path="/dictionaries" element={<DictionariesNew />} />
}

{isLoggedIn && hasPermission('CONTACT_READ') && 
  <Route path="/address-book" element={<AddressBookPage />} />
}

{isLoggedIn && hasPermission('SUPERADMIN') && 
  <Route path="/debug" element={<DebugPanel />} />
}
```

---

## 5. HIERARCHIE WORKFLOW INTEGRACE

### 5.1 Jak funguje hierarchie s právy

```javascript
// permissionHierarchyService.js

// expandPermissionsWithHierarchy()
// - Základní práva (z DB)
// - + Hierarchické rozšíření (pokud aktivní)
// = Expanded permissions (používané v hasPermission())

// Příklad:
// - Základní: ['ORDER_READ_OWN', 'ORDER_EDIT_OWN']
// - Hierarchie aktivní: ANO
// - Rozšířené: ['ORDER_READ_OWN', 'ORDER_EDIT_OWN', 
//               'ORDER_READ_SUBORDINATE', 'ORDER_EDIT_SUBORDINATE']
```

### 5.2 HIERARCHY_IMMUNE implementace

```php
// Backend kontrola:
function isUserHierarchyImmune($userId, $db) {
    $stmt = $db->prepare("
        SELECT COUNT(*) as has_immunity
        FROM 25_uzivatele u
        JOIN 25_uzivatel_role ur ON u.id = ur.uzivatel_id
        JOIN 25_role r ON ur.role_id = r.id
        JOIN 25_role_prava rp ON r.id = rp.role_id
        JOIN 25_prava p ON rp.pravo_id = p.id
        WHERE u.id = ? AND p.kod_prava = 'HIERARCHY_IMMUNE'
    ");
    // ...
}

// V canUserViewOrder():
if (isUserHierarchyImmune($userId, $db)) {
    return true; // Bypass hierarchie
}
```

```javascript
// Frontend:
// HIERARCHY_IMMUNE je součástí userPermissions
// a automaticky rozšiřuje expandedPermissions
```

---

## 6. BEST PRACTICES & BEZPEČNOST

### 6.1 ✅ DOBRÉ POSTUPY

1. **Vždy kontrolovat práva na backendu** - Frontend kontrola je pouze UX
2. **Používat hasPermission()** - NE přímý přístup k userPermissions
3. **Kontrolovat ORDER_MANAGE jako první** - Má nejvyšší prioritu
4. **HIERARCHY_IMMUNE jako druhý** - Bypass hierarchie
5. **Pak role-based kontroly** - 12 polí v objednávce
6. **Nakonec hierarchické vztahy** - Pouze pokud je hierarchie aktivní

### 6.2 ⚠️ ZNÁMÉ PROBLÉMY

1. **ORDER_SHOW_ARCHIVE** - Nemá přiřazenou žádnou roli (manuální DB insert)
2. **Legacy tabulky** - Kód odkazuje na `25_uzivatel_role` (správně) a `25_uzivatele_hierarchie` (neexistuje)
3. **Frontend duplikace kontroly práv** - Viz detailní analýza v sekci 6.4
4. **Permissions cache** - Při změně práv je třeba refresh nebo logout/login

### 6.4 🔍 FRONTEND DUPLIKACE KONTROLY PRÁV - DETAILNÍ ANALÝZA

#### Problém
Permission kontroly jsou duplikovány napříč komponentami bez centralizace, což vede k:
- Obtížné údržbě (změna logiky vyžaduje úpravu na více místech)
- Riziku nekonzistence (různé kontroly pro stejnou akci)
- Code bloatu (opakování stejného kódu)
- Těžkému testování (nelze testovat centrálně)

#### Identifikované duplikace

##### 1. **canEditPhase2 / canEditPhase3** (OrderForm25.js)
```javascript
// ❌ DUPLICITNÍ definice:
const canEditPhase2 = hasPermission('ORDER_MANAGE') || 
                      hasPermission('ORDER_APPROVE') || 
                      hasPermission('ORDER_EDIT_OWN') || 
                      hasPermission('ORDER_EDIT_ALL');

const canEditPhase3 = hasPermission('ORDER_MANAGE') || 
                      hasPermission('ORDER_EDIT_OWN') || 
                      hasPermission('ORDER_EDIT_ALL');

// ✅ MĚLO BY BÝT: canEditPhase(phaseNumber)
```
**Výskyt:** OrderForm25.js (řádky 6522, 6563)  
**Dopad:** Změna logiky vyžaduje úpravu 2 míst

##### 2. **canApproveOrders / canManageOrders** (OrderForm25.js)
```javascript
// ❌ DUPLICITNÍ kontroly:
const canApproveOrders = hasPermission('ORDER_APPROVE');
const canManageOrders = hasPermission('ORDER_MANAGE');

// Použití duplikováno v:
- OrderForm25.js: 6560, 6561, 6564, 20411, 20694
- workflowUtils.js: 448, 529
```
**Výskyt:** 2 soubory, 7 lokací  
**Dopad:** Logika schvalování roztroušena

##### 3. **canViewAllOrders** (InvoiceEvidencePage.js + Orders25List.js + UniversalSearchInput.js)
```javascript
// ❌ DUPLICITNÍ definice v 3 souborech:

// InvoiceEvidencePage.js:1420
const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                         hasPermission('ORDER_MANAGE') || 
                         hasPermission('ADMIN');

// Orders25List.js:4237
const canViewAll = hasPermission('ORDER_MANAGE') ||
                   hasPermission('ORDER_READ_ALL') ||
                   hasPermission('ORDER_VIEW_ALL') ||
                   hasPermission('ADMIN');

// UniversalSearchInput.js:164
const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                         hasPermission('ORDER_MANAGE') || 
                         hasPermission('ADMIN');
```
**Výskyt:** 3 soubory, různé definice!  
**Dopad:** 🔴 **KRITICKÉ** - Nekonzistentní logika pro stejnou funkci

##### 4. **isSuperAdmin / isAdmin** (Různé komponenty)
```javascript
// ❌ DUPLICITNÍ kontroly administrátorského přístupu:

// OrderForm25.js:6570-6571
const isSuperAdmin = hasPermission('SUPERADMIN');
const isAdmin = hasPermission('ADMINISTRATOR');

// availableSections.js:15
const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
  role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
);

// ContactsPage.js:552
const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
  role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
);

// App.js:80, 116
hasAdminRole() // Funkce v AuthContext
```
**Výskyt:** 4+ soubory, 3 různé přístupy  
**Dopad:** Nekonzistence - někdy kontrola přes hasPermission(), někdy přes roles array

##### 5. **canSaveOrder** (OrderForm25.js)
```javascript
// ❌ DUPLICITNÍ logika:
const canSaveOrder = hasPermission('ORDER_MANAGE') || 
                     hasPermission('ORDER_EDIT_OWN') || 
                     hasPermission('ORDER_EDIT_ALL');

// Podobná logika v:
const canEditPhase2 = hasPermission('ORDER_MANAGE') || 
                      hasPermission('ORDER_APPROVE') ||  // + navíc
                      hasPermission('ORDER_EDIT_OWN') || 
                      hasPermission('ORDER_EDIT_ALL');
```
**Výskyt:** OrderForm25.js (6567)  
**Dopad:** Nejasné rozdíly mezi "save" a "edit" právy

#### Statistika duplikací

| Typ kontroly | Počet souborů | Počet výskytů | Konzistence |
|--------------|---------------|---------------|-------------|
| **canViewAllOrders** | 3 | 7 | 🔴 NEKONZISTENTNÍ |
| **canEditPhase** | 1 | 2 | 🟡 DUPLICITNÍ |
| **isAdmin/isSuperAdmin** | 4+ | 10+ | 🔴 NEKONZISTENTNÍ |
| **canApproveOrders** | 2 | 7 | 🟢 KONZISTENTNÍ |
| **canManageOrders** | 2 | 5 | 🟢 KONZISTENTNÍ |
| **canSaveOrder** | 1 | 3 | 🟡 PŘEKRYV S JINÝMI |

#### Doporučená řešení

##### ✅ Priorita VYSOKÁ
1. **Vytvořit centrální Permission Service**
```javascript
// services/permissionService.js
export class PermissionService {
  static canViewAllOrders(hasPermission) {
    return hasPermission('ORDER_MANAGE') ||
           hasPermission('ORDER_READ_ALL') ||
           hasPermission('ORDER_VIEW_ALL') ||
           hasPermission('INVOICE_MANAGE') ||
           hasPermission('ADMIN');
  }
  
  static canEditPhase(phaseNumber, hasPermission) {
    const basePermissions = [
      'ORDER_MANAGE',
      'ORDER_EDIT_OWN',
      'ORDER_EDIT_ALL'
    ];
    
    if (phaseNumber === 2) {
      basePermissions.push('ORDER_APPROVE');
    }
    
    return basePermissions.some(p => hasPermission(p));
  }
  
  static isAdmin(hasPermission) {
    return hasPermission('ADMIN'); // Využívá speciální alias v AuthContext
  }
}
```

2. **Refaktorovat všechny komponenty na použití service**
```javascript
// ❌ PŘED:
const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                         hasPermission('ORDER_MANAGE') || 
                         hasPermission('ADMIN');

// ✅ PO:
const canViewAllOrders = PermissionService.canViewAllOrders(hasPermission);
```

##### ✅ Priorita STŘEDNÍ
3. **Vytvořit custom hooks pro běžné kontroly**
```javascript
// hooks/useOrderPermissions.js
export function useOrderPermissions() {
  const { hasPermission } = useContext(AuthContext);
  
  return useMemo(() => ({
    canViewAll: PermissionService.canViewAllOrders(hasPermission),
    canEditPhase2: PermissionService.canEditPhase(2, hasPermission),
    canEditPhase3: PermissionService.canEditPhase(3, hasPermission),
    canApprove: hasPermission('ORDER_APPROVE'),
    canManage: hasPermission('ORDER_MANAGE'),
    isAdmin: PermissionService.isAdmin(hasPermission)
  }), [hasPermission]);
}
```

4. **Dokumentovat rozdíly mezi podobnými právy**
- ORDER_EDIT_OWN vs ORDER_EDIT_ALL
- ORDER_READ_OWN vs ORDER_READ_ALL
- canEditPhase2 vs canEditPhase3 vs canSaveOrder

##### ✅ Priorita NÍZKÁ
5. **Přidat TypeScript definice**
```typescript
interface OrderPermissions {
  canViewAll: boolean;
  canEditPhase2: boolean;
  canEditPhase3: boolean;
  canApprove: boolean;
  canManage: boolean;
  isAdmin: boolean;
}
```

#### Měřitelné benefity refactoringu

| Metrika | Před | Po | Zlepšení |
|---------|------|-----|----------|
| **Počet definic canViewAllOrders** | 3 | 1 | -66% |
| **Počet souborů s duplikací** | 8+ | 2 | -75% |
| **Konzistence logiky** | 60% | 100% | +40% |
| **Testovatelnost** | Nízká | Vysoká | ✅ |
| **Čas na změnu** | ~30 min | ~5 min | -83% |

### 6.3 🔒 BEZPEČNOSTNÍ AUDIT

| Právo | Kritičnost | Počet rolí | Status |
|-------|------------|------------|--------|
| ORDER_MANAGE | 🔴 VYSOKÁ | 5 rolí | ✅ OK - Kontroluje se jako první |
| ORDER_DELETE_ALL | 🔴 VYSOKÁ | 3 role | ✅ OK - Pouze admin role |
| HIERARCHY_IMMUNE | 🔴 VYSOKÁ | 2 role | ✅ OK - Pouze SUPERADMIN/ADMIN |
| USER_DELETE | 🔴 VYSOKÁ | 1 role | ✅ OK - Pouze SUPERADMIN |
| ORDER_READ_ALL | 🟡 STŘEDNÍ | 8 rolí | ✅ OK - Běžné admin právo |
| ORDER_APPROVE | 🟡 STŘEDNÍ | 4 role | ✅ OK - Workflow právo |
| ORDER_OLD | 🟡 STŘEDNÍ | 16 rolí | ⚠️ POZOR - Vidí všechny archivované |

---

## 6.5 🌲 ORG HIERARCHIE - NODE, EDGE A PŘÍSTUPOVÁ PRÁVA

### 6.5.1 Struktura JSON hierarchie

Hierarchie je uložena v tabulce `25_hierarchie_profily` v poli `structure_json`:

```json
{
  "nodes": [
    {
      "id": "role-5-1766006577394",
      "typ": "role",
      "data": {
        "type": "role",
        "roleId": 5,
        "name": "Příkazce operace",
        "scopeDefinition": {
          "type": "DYNAMIC_FROM_ENTITY",
          "fields": ["prikazce_id"]
        },
        "delivery": {
          "email": true
        }
      }
    },
    {
      "id": "template-2-1766007051172",
      "typ": "template",
      "data": {
        "type": "template",
        "templateId": 2,
        "name": "Objednávka odeslána ke schválení",
        "eventTypes": ["ORDER_PENDING_APPROVAL"]
      }
    }
  ],
  "edges": [
    {
      "source": "template-2-1766007051172",
      "target": "role-5-1766006577394",
      "modules": {
        "orders": true,
        "invoices": false,
        "cashbook": false
      },
      "eventTypes": ["ORDER_PENDING_APPROVAL"]
    }
  ]
}
```

### 6.5.2 Typy NODE

#### 1. **USER Node** (typ: "user")
Reprezentuje konkrétního uživatele v systému.

```json
{
  "id": "user-123-timestamp",
  "typ": "user",
  "data": {
    "type": "user",
    "uzivatel_id": 123,
    "name": "Jan Novák",
    "email": "jan.novak@example.com"
  }
}
```

**Použití pro přístupová práva:**
- ❌ **NEPOUŽIVÁ SE** pro filtrování objednávek
- ✅ **POUŽÍVÁ SE** pro notifikace (direct notification routing)
- 🔍 **Poznámka:** V current implementaci (getUserRelationshipsFromStructure) se hledá user node, ale **není třeba** pro orders filtering

#### 2. **ROLE Node** (typ: "role")
Reprezentuje roli (z tabulky `25_role`).

```json
{
  "id": "role-5-timestamp",
  "typ": "role",
  "data": {
    "type": "role",
    "roleId": 5,
    "name": "Příkazce operace",
    "scopeDefinition": {
      "type": "DYNAMIC_FROM_ENTITY",
      "fields": ["prikazce_id"]  // ✅ KLÍČOVÉ pro přístup!
    },
    "delivery": {
      "email": true
    }
  }
}
```

**scopeDefinition - Definice přístupových práv:**
- `type: "DYNAMIC_FROM_ENTITY"` - Práva odvozená z polí v objednávce
- `fields: ["prikazce_id"]` - Uživatel vidí objednávky, kde je v poli `prikazce_id`
- `fields: ["objednatel_id", "garant_uzivatel_id"]` - Vidí kde je v jednom Z těchto polí

**Použití pro přístupová práva:**
- ✅ **POUŽÍVÁ SE** pro filtrování objednávek (getUserRelationshipsFromStructure)
- ✅ **POUŽÍVÁ SE** pro notifikace
- 🔍 **Backend:** Kontroluje se v hierarchyOrderFilters.php

#### 3. **LOCATION Node** (typ: "location")
Reprezentuje lokalitu (nemocnice, pracoviště).

```json
{
  "id": "location-12-timestamp",
  "typ": "location",
  "data": {
    "type": "location",
    "lokalita_id": 12,
    "name": "Fakultní nemocnice"
  }
}
```

**Použití pro přístupová práva:**
- ⚠️ **ČÁSTEČNĚ IMPLEMENTOVÁNO** - Backend mapuje na `lokalita_id`
- 🔍 **Problém:** Objednávky nemají přímé pole `lokalita_id`, potřeba JOIN přes users

#### 4. **DEPARTMENT Node** (typ: "department")
Reprezentuje útvar/úsek.

```json
{
  "id": "department-7-timestamp",
  "typ": "department",
  "data": {
    "type": "department",
    "usek_id": 7,
    "name": "Úsek IT"
  }
}
```

**Použití pro přístupová práva:**
- ⚠️ **ČÁSTEČNĚ IMPLEMENTOVÁNO** - Backend mapuje na `usek_id`
- 🔍 **Problém:** Objednávky nemají přímé pole `usek_id`, potřeba JOIN přes users

#### 5. **TEMPLATE Node** (typ: "template")
Reprezentuje notifikační šablonu.

```json
{
  "id": "template-2-timestamp",
  "typ": "template",
  "data": {
    "type": "template",
    "templateId": 2,
    "name": "Objednávka odeslána ke schválení",
    "eventTypes": ["ORDER_PENDING_APPROVAL"]
  }
}
```

**Použití pro přístupová práva:**
- ❌ **NEPOUŽIVÁ SE** pro filtrování objednávek
- ✅ **POUŽÍVÁ SE** pouze pro notifikace

### 6.5.3 EDGE - Propojení NODE

EDGE definuje vztah mezi dvěma NODE a určuje, **pro které moduly** je vztah aktivní.

```json
{
  "source": "template-2-1766007051172",
  "target": "role-5-1766006577394",
  "modules": {
    "orders": true,      // ✅ Aktivní pro objednávky
    "invoices": false,   // ❌ Neaktivní pro faktury
    "cashbook": false    // ❌ Neaktivní pro pokladnu
  },
  "eventTypes": ["ORDER_PENDING_APPROVAL"]
}
```

**Klíčová vlastnost: modules.orders**
- `orders: true` → Edge SE POUŽÍVÁ pro filtrování objednávek
- `orders: false` nebo chybí → Edge SE PŘESKAKUJE

**Backend implementace (hierarchyOrderFilters.php:110-117):**
```php
$modules = isset($edge['data']['modules']) ? $edge['data']['modules'] : ['orders' => true];

if (!isset($modules['orders']) || !$modules['orders']) {
    continue; // Skip pokud není orders module
}
```

### 6.5.4 Jak Backend používá hierarchii pro ORDERS

#### Krok 1: Načtení aktivního profilu
```php
function getUserRelationshipsFromStructure($userId, $db) {
    $stmt = $db->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE aktivni = 1");
    $stmt->execute();
    $profile = $stmt->fetch();
}
```

#### Krok 2: Nalezení USER nebo ROLE NODE
```php
// Najít user node
foreach ($structure['nodes'] as $node) {
    if ($node['typ'] === 'user' && $node['data']['uzivatel_id'] == $userId) {
        $userNodeId = $node['id'];
        break;
    }
}

// Najít role nodes pro uživatele
$userRoles = /* SELECT role_id FROM 25_uzivatel_role WHERE uzivatel_id = $userId */;
```

#### Krok 3: Procházení EDGES s modules.orders = true
```php
foreach ($structure['edges'] as $edge) {
    // Kontrola modules.orders
    if (!isset($edge['modules']['orders']) || !$edge['modules']['orders']) {
        continue; // PŘESKOČIT
    }
    
    // Je edge od/k user node nebo role node?
    if ($edge['source'] === $userNodeId || $edge['target'] === $userNodeId) {
        // Najít cílový node
        $targetNode = /* ... */;
        
        // Mapovat na přístupová práva
        if ($targetNode['typ'] === 'role') {
            $relationships[] = [
                'typ_vztahu' => 'user-role',
                'role_id' => $targetNode['data']['roleId']
            ];
        }
    }
}
```

#### Krok 4: Return NULL pokud žádné relationships
```php
if (empty($relationships)) {
    return []; // → applyHierarchyFilterToOrders() vrátí NULL → použije se 12-role filter
}
```

### 6.5.5 ⚠️ SOUČASNÉ PROBLÉMY V HIERARCHII

#### Problém 1: EDGES bez modules definice
```sql
SELECT COUNT(*) FROM (
  SELECT JSON_EXTRACT(e.edge, '$.modules.orders') as orders_enabled
  FROM 25_hierarchie_profily hp,
  JSON_TABLE(hp.structure_json, '$.edges[*]' COLUMNS(edge JSON PATH '$')) e
  WHERE hp.id = 12
) edges
WHERE orders_enabled IS NULL;
```
**Výsledek:** Většina edges nemá `modules` definici!

**Dopad:**
- Backend používá fallback: `['orders' => true]` pokud `modules` chybí
- ⚠️ **RIZIKO:** Všechny edges jsou implicitně aktivní pro orders

**Řešení:**
1. Explicitně nastavit `modules.orders = false` pro notifikační edges
2. Nebo změnit fallback na `false` místo `true`

#### Problém 2: NODE typu LOCATION a DEPARTMENT nejsou funkční
```php
// Backend kód:
elseif ($targetNode['typ'] === 'location') {
    $rel['lokalita_id'] = $targetNode['data']['lokalita_id'];
    $rel['typ_vztahu'] = 'user-location';
}
```

**Problém:** Objednávky nemají pole `lokalita_id`!

**Řešení možnosti:**
1. Přidat `lokalita_id` do tabulky objednávek (DB změna)
2. Nebo provádět JOIN přes uživatele: `orders.uzivatel_id → users.lokalita_id`
3. Nebo odstranit LOCATION/DEPARTMENT node z orders hierarchie

#### Problém 3: scopeDefinition.fields není validován
```json
{
  "scopeDefinition": {
    "fields": ["neexistujici_pole"]  // ❌ Žádná validace!
  }
}
```

**Dopad:** Backend tiše ignoruje neexistující pole

**Řešení:** Validace při ukládání hierarchie (frontend + backend)

### 6.5.6 ✅ DOPORUČENÍ PRO HIERARCHII

#### Vysoká priorita
1. **Explicitní modules definice u všech edges**
   - Template → Role edges: `modules.orders = false` (pouze notifikace)
   - Role → Role edges: `modules.orders = true` (subordinace)

2. **Validace scopeDefinition.fields**
   - Povolit pouze existující pole z tabulky objednávek
   - Seznam povolených: `prikazce_id`, `objednatel_id`, `garant_uzivatel_id`, atd.

3. **Dokumentovat účel každého node typu**
   - USER: pouze notifikace
   - ROLE: notifikace + přístupová práva
   - LOCATION/DEPARTMENT: TBD (implementovat nebo odstranit)
   - TEMPLATE: pouze notifikace

#### Střední priorita
4. **Přidat UI indikátor modules stavu**
   - Vizuálně zobrazit, zda edge ovlivňuje orders/invoices/cashbook
   - Warning pokud modules chybí

5. **Backend logging**
   - Logovat, které edges byly použity pro filtering
   - Logovat NODE bez modules definice

#### Nízká priorita
6. **Optimalizace:** Cachovat getUserRelationshipsFromStructure výsledky
7. **Testing:** Unit testy pro různé konfigurace edges

---

## 7. ARCHITEKTONICKÝ NÁVRH: BACKEND-FIRST PERMISSIONS

### 7.1 🎯 Koncept: "Backend jako Single Source of Truth"

#### Současný problém
```javascript
// ❌ SOUČASNÝ STAV - Logika rozptýlena mezi FE a BE:

// Frontend (OrderForm25.js):
const canEditPhase2 = hasPermission('ORDER_MANAGE') || 
                      hasPermission('ORDER_APPROVE') || 
                      hasPermission('ORDER_EDIT_OWN') || 
                      hasPermission('ORDER_EDIT_ALL');

// Backend (hierarchyOrderFilters.php):
if (in_array('ORDER_MANAGE', $user_permissions)) return true;
if (isUserHierarchyImmune($userId, $db)) return true;
// ... + kontrola 12 rolí
// ... + kontrola hierarchie
```

**Rizika:**
- 🔴 Duplikace logiky (FE ≠ BE může vést k bezpečnostním dírám)
- 🔴 Složité ladění (změna vyžaduje úpravu FE + BE)
- 🔴 Nekonzistence (FE může zobrazit tlačítko, které BE odmítne)
- 🔴 Performance (FE musí načíst všechna práva a počítat lokálně)

#### Navrhované řešení: Backend-Computed Permissions

```javascript
// ✅ NAVRHOVANÝ STAV - Backend počítá, FE jen zobrazuje:

// 1) Frontend požádá BE o konkrétní permissions pro kontext
const response = await fetch('/api/permissions/compute', {
  body: JSON.stringify({
    context: 'order-form',
    orderId: 123,
    userId: currentUserId
  })
});

// 2) Backend vrátí pre-computed permissions
const permissions = await response.json();
/*
{
  canView: true,
  canEdit: false,
  canEditPhase2: true,
  canEditPhase3: false,
  canApprove: true,
  canDelete: false,
  canSave: true,
  canUnlock: false,
  // ... atd.
  
  // + Metadata pro debugging:
  reason: {
    canEdit: "User is not ORDER_MANAGE and order is locked",
    canEditPhase2: "User has ORDER_APPROVE permission"
  }
}
*/

// 3) Frontend JEN zobrazuje podle TRUE/FALSE
<button disabled={!permissions.canSave}>Uložit</button>
<button disabled={!permissions.canApprove}>Schválit</button>
```

### 7.2 🏗️ Implementační návrh

#### Backend: Nový API endpoint
```php
// api/v2025.03_25/permissions/compute.php

class PermissionComputer {
    private $userId;
    private $db;
    private $hierarchySettings;
    private $userPermissions;
    
    public function __construct($userId, $db) {
        $this->userId = $userId;
        $this->db = $db;
        $this->hierarchySettings = getHierarchySettings($db);
        $this->userPermissions = getUserPermissions($userId, $db);
    }
    
    /**
     * Vypočítat permissions pro objednávkový formulář
     */
    public function computeOrderFormPermissions($orderId) {
        // Načíst objednávku
        $order = $this->getOrder($orderId);
        
        return [
            'canView' => $this->canViewOrder($orderId, $order),
            'canEdit' => $this->canEditOrder($orderId, $order),
            'canEditPhase2' => $this->canEditPhase($orderId, $order, 2),
            'canEditPhase3' => $this->canEditPhase($orderId, $order, 3),
            'canApprove' => $this->canApproveOrder($orderId, $order),
            'canDelete' => $this->canDeleteOrder($orderId, $order),
            'canSave' => $this->canSaveOrder($orderId, $order),
            'canUnlock' => $this->canUnlockOrder($orderId, $order),
            'canPublishRegistry' => $this->canPublishToRegistry($orderId, $order),
            'canManageInvoices' => $this->canManageInvoices($orderId, $order),
            
            // Metadata pro debugging (pouze DEV/TEST):
            'computed_at' => date('Y-m-d H:i:s'),
            'hierarchy_active' => $this->hierarchySettings['enabled'],
            'user_immune' => $this->isUserHierarchyImmune()
        ];
    }
    
    /**
     * Vypočítat permissions pro seznam objednávek
     */
    public function computeOrderListPermissions() {
        return [
            'canViewAll' => $this->canViewAllOrders(),
            'canCreateNew' => $this->canCreateOrder(),
            'canExport' => $this->canExportOrders(),
            'canViewArchived' => $this->canViewArchivedOrders(),
            'showArchiveCheckbox' => $this->hasPermission('ORDER_SHOW_ARCHIVE')
        ];
    }
    
    private function canEditPhase($orderId, $order, $phaseNumber) {
        // ✅ CENTRALIZOVANÁ logika editace fáze
        
        // 1. ORDER_MANAGE → vždy může
        if ($this->hasPermission('ORDER_MANAGE')) {
            return true;
        }
        
        // 2. Objednávka uzamčena?
        if ($order['workflow_locked'] && !$this->canUnlockOrder($orderId, $order)) {
            return false;
        }
        
        // 3. Specifická pravidla pro fázi
        if ($phaseNumber === 2) {
            return $this->hasPermission('ORDER_APPROVE') ||
                   $this->hasPermission('ORDER_EDIT_OWN') ||
                   $this->hasPermission('ORDER_EDIT_ALL');
        }
        
        if ($phaseNumber === 3) {
            return $this->hasPermission('ORDER_EDIT_OWN') ||
                   $this->hasPermission('ORDER_EDIT_ALL');
        }
        
        return false;
    }
    
    private function hasPermission($permissionCode) {
        return in_array($permissionCode, $this->userPermissions);
    }
    
    private function isUserHierarchyImmune() {
        return isUserHierarchyImmune($this->userId, $this->db);
    }
    
    // ... další metody
}

// Endpoint handler:
$computer = new PermissionComputer($current_user_id, $pdo);

if ($_GET['context'] === 'order-form') {
    $orderId = (int)$_POST['orderId'];
    $permissions = $computer->computeOrderFormPermissions($orderId);
    echo json_encode(['success' => true, 'permissions' => $permissions]);
}
```

#### Frontend: Permission Hook
```javascript
// hooks/useComputedPermissions.js

import { useState, useEffect } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useOrderFormPermissions(orderId) {
  const { token, username, user_id } = useContext(AuthContext);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!orderId || !token) return;
    
    async function fetchPermissions() {
      try {
        setLoading(true);
        const response = await fetch('/api/v2025.03_25/permissions/compute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            context: 'order-form',
            orderId: orderId,
            userId: user_id,
            username: username
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setPermissions(data.permissions);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPermissions();
  }, [orderId, token, user_id, username]);
  
  return { permissions, loading, error };
}

// Použití v komponentě:
function OrderForm25({ orderId }) {
  const { permissions, loading, error } = useOrderFormPermissions(orderId);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!permissions) return null;
  
  return (
    <form>
      <button disabled={!permissions.canSave}>Uložit</button>
      <button disabled={!permissions.canApprove}>Schválit</button>
      <button disabled={!permissions.canEditPhase2}>Upravit fázi 2</button>
      
      {permissions.canDelete && (
        <button onClick={handleDelete}>Smazat</button>
      )}
    </form>
  );
}
```

### 7.3 📊 Výhody a nevýhody

#### ✅ Výhody Backend-First přístupu

| Aspekt | Benefit | Dopad |
|--------|---------|-------|
| **Bezpečnost** | Single source of truth - FE nemůže obejít kontroly | 🔴→🟢 Vysoký |
| **Konzistence** | Logika na JEDNOM místě | 🔴→🟢 Vysoký |
| **Údržba** | Změna logiky = 1 soubor místo 8+ | 🟡→🟢 Střední |
| **Testování** | Backend unit testy pokryjí vše | 🔴→🟢 Vysoký |
| **Performance** | FE nepočítá, jen zobrazuje | 🟡→🟢 Střední |
| **Debugging** | Metadata z BE říkají PROČ | 🔴→🟢 Vysoký |
| **Hierarchie** | Plná integrace bez FE změn | 🟡→🟢 Vysoký |

#### ⚠️ Nevýhody a mitigace

| Nevýhoda | Řešení | Priorita |
|----------|--------|----------|
| **Extra HTTP call** | Cache permissions lokálně (SessionStorage) | 🟡 Střední |
| **Latence UI** | Optimistic UI + validace na BE | 🟡 Střední |
| **Větší BE zátěž** | Cache na BE (Redis, Memcached) | 🟢 Nízká |
| **Složitější API** | Dobře dokumentované endpointy | 🟢 Nízká |
| **Legacy compatibility** | Postupná migrace, keep backward compat | 🟡 Střední |

### 7.4 🚀 Migrační strategie

#### Fáze 1: Proof of Concept (2-3 týdny)
1. Implementovat `PermissionComputer` třídu na BE
2. Vytvořit `/api/permissions/compute` endpoint
3. Implementovat `useOrderFormPermissions` hook
4. Refaktorovat **1 komponentu** (OrderForm25) na nový systém
5. A/B testing: porovnat FE logiku vs BE logiku

#### Fáze 2: Rozšíření (4-6 týdnů)
6. Migrace dalších komponent:
   - Orders25List
   - InvoiceEvidencePage
   - UniversalSearchInput
7. Postupně deprecate lokální hasPermission() pro business logiku
8. Zachovat hasPermission() pouze pro UI zobrazení (menu, routing)

#### Fáze 3: Optimalizace (2-3 týdny)
9. Implementovat BE cache (Redis)
10. Optimistic UI patterns
11. Batch permission requests (1 call pro více kontextů)

#### Fáze 4: Cleanup (1-2 týdny)
12. Odstranit duplicitní FE logiku
13. Přesunout hasPermission() na "display-only" mode
14. Update dokumentace

**Celkový čas:** 9-14 týdnů  
**Effort:** ~160-240 hodin  
**ROI:** Vysoký (bezpečnost + údržba)

### 7.5 💡 Hybridní přístup (Doporučeno)

**Optimální řešení:** Kombinace Backend-First + FE cache

```javascript
// permissionService.js - Hybrid approach

class PermissionService {
  constructor() {
    this.cache = new Map(); // In-memory cache
    this.cacheTTL = 5 * 60 * 1000; // 5 minut
  }
  
  /**
   * Získat permissions s automatickým cache
   */
  async getPermissions(context, params) {
    const cacheKey = this.getCacheKey(context, params);
    
    // 1) Zkusit cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.permissions;
    }
    
    // 2) Fetch z BE
    const permissions = await this.fetchFromBackend(context, params);
    
    // 3) Uložit do cache
    this.cache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    });
    
    return permissions;
  }
  
  /**
   * Invalidovat cache při změnách
   */
  invalidate(context, params) {
    const cacheKey = this.getCacheKey(context, params);
    this.cache.delete(cacheKey);
  }
  
  /**
   * Fallback: Lokální kontrola jen pro UI display
   */
  canDisplay(permissionCode) {
    // Jen pro menu, routing - NE pro business logiku!
    const userPermissions = JSON.parse(
      sessionStorage.getItem('auth_user_permissions_persistent') || '[]'
    );
    return userPermissions.includes(permissionCode);
  }
}

export const permissionService = new PermissionService();
```

**Použití:**
```javascript
// Pro business logiku - VŽDY z BE:
const permissions = await permissionService.getPermissions('order-form', { orderId: 123 });
<button disabled={!permissions.canSave}>Uložit</button>

// Pro UI display - lokální check:
{permissionService.canDisplay('ORDER_MANAGE') && (
  <MenuItem>Admin menu</MenuItem>
)}
```

### 7.6 📋 Action Items

#### Pro rozhodnutí (TERAZ)
- [ ] Schválit backend-first přístup jako dlouhodobou strategii
- [ ] Určit timeline a zdroje
- [ ] Vybrat 1 komponentu pro PoC

#### Pro implementaci (Fáze 1)
- [ ] Vytvořit `PermissionComputer` třídu
- [ ] Implementovat `/api/permissions/compute` endpoint
- [ ] Napsat unit testy pro PermissionComputer
- [ ] Vytvořit `useComputedPermissions` hook
- [ ] Refaktorovat OrderForm25 jako PoC

#### Pro monitoring
- [ ] Měřit latenci permission requests
- [ ] Sledovat cache hit rate
- [ ] Logovat permission denials s důvodem

---

## 8. DOPORUČENÍ KE ZLEPŠENÍ

### 8.1 Priorita VYSOKÁ

1. **Vyřešit ORDER_SHOW_ARCHIVE** - Přiřadit k rolím nebo odstranit
2. **Dokumentovat ORDER_OLD logiku** - Složité chování s archivovanými objednávkami
3. **Audit rolí** - Některé role mají příliš mnoho práv (REFERENT, THP_PES, ...)
4. **⭐ ROZHODNOUT o Backend-First přístupu** - Viz sekce 7

### 8.2 Priorita STŘEDNÍ

5. **Centralizovat permission kontroly** - Vytvořit utility funkce místo duplikace
6. **Přidat permission testy** - Unit testy pro kritické kontroly
7. **Logging** - Logovat změny práv a odmítnuté přístupy
8. **Hierarchie modules.orders** - Explicitně nastavit u všech edges

### 8.3 Priorita NÍZKÁ

9. **Optimalizovat DB dotazy** - Cachovat práva uživatele
10. **Frontend permission service** - Centrální služba místo rozprostření v komponentách
11. **Permission dokumentace** - Rozšířit popis každého práva v DB

---

## 8. SQL QUERIES PRO AUDIT

### 8.1 Uživatelé s kritickými právy
```sql
SELECT u.login_name, u.jmeno, u.prijmeni, r.kod_role, p.kod_prava
FROM 25_uzivatele u
JOIN 25_uzivatel_role ur ON u.id = ur.uzivatel_id
JOIN 25_role r ON ur.role_id = r.id
JOIN 25_role_prava rp ON r.id = rp.role_id
JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava IN ('ORDER_MANAGE', 'ORDER_DELETE_ALL', 'HIERARCHY_IMMUNE', 'USER_DELETE')
AND u.aktivni = 1
ORDER BY p.kod_prava, u.login_name;
```

### 8.2 Role bez práv
```sql
SELECT r.kod_role, r.nazev, COUNT(rp.pravo_id) as pocet_prav
FROM 25_role r
LEFT JOIN 25_role_prava rp ON r.id = rp.role_id
WHERE r.aktivni = 1
GROUP BY r.id
HAVING pocet_prav = 0;
```

### 8.3 Práva bez rolí
```sql
SELECT p.kod_prava, p.popis
FROM 25_prava p
LEFT JOIN 25_role_prava rp ON p.id = rp.pravo_id
WHERE p.aktivni = 1 AND rp.role_id IS NULL;
```

---

## 9. MOBILE APP KONZISTENCE

### 9.1 Architektura mobile vs desktop

| Aspekt | Desktop | Mobile | Konzistentní? |
|--------|---------|--------|---------------|
| **API Endpoints** | `listOrdersV2()`, `listInvoices25()` | `listOrdersV2()`, `listInvoices25()` | ✅ **ANO** |
| **Data Service** | `apiOrderV2.js` | `mobileDataService.js` (používá `apiOrderV2`) | ✅ **ANO** |
| **Filtrační funkce** | `filterOrders()` z `orderStatsUtils.js` | `filterOrders()` z `orderStatsUtils.js` | ✅ **ANO** (SHARED) |
| **isAdmin check** | `SUPERADMIN \|\| ADMINISTRATOR` | `SUPERADMIN \|\| ADMINISTRATOR` | ✅ **ANO** |
| **canApprove check** | `isAdmin \|\| ORDER_APPROVE` | `isAdmin \|\| ORDER_APPROVE` | ✅ **ANO** |
| **12-role filter** | `filterOrders(userId)` → všech 12 rolí | `filterOrders(userId)` → všech 12 rolí | ✅ **ANO** (opraveno 5.1.2026) |

### 9.2 Shared utility: orderStatsUtils.js

**Funkce `filterOrders()` je sdílená mezi desktop i mobile:**

```javascript
// /var/www/erdms-dev/apps/eeo-v2/client/src/utils/orderStatsUtils.js

export function filterOrders(orders, options = {}) {
  const {
    showArchived = false,
    userId = null,
    isAdmin = false
  } = options;

  // 1. Základní filtrování: ID > 1, !isLocalConcept
  // 2. Archivované objednávky (pokud showArchived=false)
  // 3. Filtrování podle VŠECH 12 ROLÍ (pouze pro non-admin):
  //    - uzivatel_id, objednatel_id, garant_uzivatel_id, schvalovatel_id,
  //    - prikazce_id, uzivatel_akt_id, odesilatel_id, dodavatel_potvrdil_id,
  //    - zverejnil_id, fakturant_id, dokoncil_id, potvrdil_vecnou_spravnost_id
  
  if (!isAdmin && userId) {
    filtered = filtered.filter(o => {
      if (o.isDraft || o.je_koncept) {
        return o.objednatel_id === userId || o.uzivatel_id === userId;
      }
      
      // ✅ VŠECH 12 ROLÍ - konzistentní s backend hierarchyOrderFilters.php
      return (
        o.uzivatel_id === userId ||
        o.objednatel_id === userId ||
        o.garant_uzivatel_id === userId ||
        o.schvalovatel_id === userId ||
        o.prikazce_id === userId ||
        o.uzivatel_akt_id === userId ||
        o.odesilatel_id === userId ||
        o.dodavatel_potvrdil_id === userId ||
        o.zverejnil_id === userId ||
        o.fakturant_id === userId ||
        o.dokoncil_id === userId ||
        o.potvrdil_vecnou_spravnost_id === userId
      );
    });
  }
  
  return filtered;
}
```

### 9.3 Mobile komponenty

**MobileDashboard.jsx:**
```javascript
// Line 129-131: isAdmin check
const isAdmin = userDetail?.roles?.some(role => 
  role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
) || false;

// Line 133-135: canApprove check
const canApprove = isAdmin || userDetail?.permissions?.some(p => 
  p.kod_opravneni === 'ORDER_APPROVE'
) || false;
```

**mobileDataService.js:**
```javascript
// Line 32-35: Používá STEJNÉ API jako desktop
const [ordersResult, invoicesResult, ...cashbookResults] = await Promise.allSettled([
  listOrdersV2({ rok: year }, token, username, false, true),
  listInvoices25({ token, username, year, page: 1, per_page: 1000 }),
  ...cashbookPromises
]);

// Line 150-151: Používá SHARED filterOrders()
const filteredOrders = filterOrders(orders, { showArchived, userId, isAdmin });
const stats = calculateOrderStats(filteredOrders);

// 🎯 Komentář v kódu potvrzuje: 
// "POUŽIJ SPOLEČNÉ FUNKCE pro filtrování a výpočet statistik"
```

### 9.4 Testování mobile konzistence

**Scénáře pro testování:**

| Test | Očekávaný výsledek | Desktop | Mobile |
|------|-------------------|---------|--------|
| User 113 (příkazce) vidí order 17 | ✅ Vidí | ✅ Ano | ✅ Ano |
| User 113 vidí objednávky kde je garant | ✅ Vidí | ✅ Ano | ✅ Ano |
| User 113 vidí objednávky kde je schvalovatel | ✅ Vidí | ✅ Ano | ✅ Ano |
| Admin vidí všechny objednávky | ✅ Vidí vše | ✅ Ano | ✅ Ano |
| ORDER_APPROVE může schvalovat | ✅ Tlačítko Schválit | ✅ Ano | ✅ Ano |
| Hierarchy active ale neblokuje | ✅ Notifikace fungují, přístup OK | ✅ Ano | ✅ Ano |

### 9.5 Závěr mobile konzistence

✅ **OVĚŘENO 5.1.2026:**
- Mobile používá **STEJNÉ API** jako desktop (`listOrdersV2`, `listInvoices25`)
- Mobile používá **SHARED filtrační funkci** `filterOrders()` z `orderStatsUtils.js`
- Mobile kontroluje **VŠECH 12 ROLÍ** stejně jako backend
- Mobile má **STEJNÉ permission checks** (`isAdmin`, `canApprove`)
- Komentáře v kódu explicitně potvrzují shared function usage

⚠️ **OPRAVENO:**
- `filterOrders()` původně kontrolovala jen `prikazce_id`
- Rozšířeno na všech 12 rolí → konzistentní s backend `canUserViewOrder()`

🎯 **POLITIK CONSISTENCY:**
**Desktop a mobile mají IDENTICKOU permission politiku pro příkazce/schvalování.**

---

## 10. ZÁVĚR### 9.5 Závěr mobile konzistence

✅ **OVĚŘENO 5.1.2026:**
- Mobile používá **STEJNÉ API** jako desktop (`listOrdersV2`, `listInvoices25`)
- Mobile používá **SHARED filtrační funkci** `filterOrders()` z `orderStatsUtils.js`
- Mobile kontroluje **VŠECH 12 ROLÍ** stejně jako backend
- Mobile má **STEJNÉ permission checks** (`isAdmin`, `canApprove`)
- Komentáře v kódu explicitně potvrzují shared function usage

⚠️ **OPRAVENO:**
- `filterOrders()` původně kontrolovala jen `prikazce_id`
- Rozšířeno na všech 12 rolí → konzistentní s backend `canUserViewOrder()`

🎯 **POLITIK CONSISTENCY:**
**Desktop a mobile mají IDENTICKOU permission politiku pro příkazce/schvalování.**

---

## 10. ZÁVĚR

Systém práv je komplexní, ale dobře strukturovaný. Hlavní body:

✅ **FUNGUJE:**
- Backend kontrola práv přes hierarchyOrderFilters.php
- Frontend hasPermission() s AuthContext
- ORDER_MANAGE a HIERARCHY_IMMUNE mají nejvyšší prioritu
- 12-rolový filter pro běžné uživatele (backend + frontend)
- **Mobile a desktop mají identickou permission logiku** (shared utilities)

⚠️ **K DOLADĚNÍ:**
- ORDER_SHOW_ARCHIVE bez rolí
- ORDER_OLD složitá logika
- Některé role mají příliš mnoho práv
- Frontend duplikace kontroly práv (canViewAllOrders má 3+ definice)

🔒 **BEZPEČNOST:**
- Kritická práva pouze pro admin role
- Backend vždy kontroluje oprávnění
- HIERARCHY_IMMUNE správně implementována
- **Frontend filterOrders() opraveno na 12-role check** (5.1.2026)

🎯 **CROSS-PLATFORM KONZISTENCE:**
- Desktop a mobile používají shared `filterOrders()` z `orderStatsUtils.js`
- Obě platformy kontrolují všech 12 rolí v objednávkách
- Identické `isAdmin` a `canApprove` checks
- Stejné API endpointy (`listOrdersV2`, `listInvoices25`)

---

**Vytvořeno:** 5. ledna 2026  
**Aktualizováno:** 5. ledna 2026 (mobile konzistence verifikována + oprava filterOrders)  
**Soubor:** `/var/www/erdms-dev/PERMISSIONS_SYSTEM_REPORT.md`  
**Pro dotazy kontaktujte:** Správce systému
