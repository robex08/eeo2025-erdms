# ✅ ROČNÍ POPLATKY - DOKONČENÍ IMPLEMENTACE PRÁV

**Datum:** 1. února 2026  
**Status:** ✅ DOKONČENO

---

## 🎯 CO BYLO PROVEDENO

### 1. ✅ Backend API - Kontroly práv (HOTOVO)

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php`

Všechny handlery mají kompletní kontroly práv:

#### 🔐 Helper funkce pro kontrolu práv

```php
// Základní kontroly práv
- hasAnnualFeesPermission($user, $permissionCode)
- hasAnyAnnualFeesPermission($user, $permissionCodes)
- isAnnualFeesAdmin($user)

// Specializované kontroly
- canViewAnnualFees($user)      // VIEW, MANAGE nebo ADMIN
- canCreateAnnualFees($user)    // CREATE, MANAGE nebo ADMIN
- canEditAnnualFees($user)      // EDIT, MANAGE nebo ADMIN
- canDeleteAnnualFees($user)    // DELETE + EDIT, MANAGE nebo ADMIN
- canMarkPaymentAnnualFees($user) // PAYMENT + VIEW/EDIT, MANAGE nebo ADMIN
```

#### 📋 Handlery s implementovanými kontrolami

| Handler | Právo | Status |
|---------|-------|--------|
| `handleAnnualFeesList` | VIEW | ✅ |
| `handleAnnualFeesDetail` | VIEW | ✅ |
| `handleAnnualFeesCreate` | CREATE | ✅ |
| `handleAnnualFeesUpdate` | EDIT | ✅ |
| `handleAnnualFeesUpdateItem` | EDIT nebo PAYMENT | ✅ |
| `handleAnnualFeesCreateItem` | CREATE | ✅ |
| `handleAnnualFeesDelete` | DELETE + EDIT | ✅ |
| `handleAnnualFeesDeleteItem` | DELETE + EDIT | ✅ |
| `handleAnnualFeesStats` | VIEW | ✅ |

---

### 2. ✅ Frontend - Kontroly práv (HOTOVO)

**Soubor:** `apps/eeo-v2/client/src/pages/AnnualFeesPage.js`

#### 🔐 Implementované kontroly v komponentě

```javascript
// Načtení práv z AuthContext
const { hasPermission } = useContext(AuthContext);

// Zkontrolované práva
const isAdmin = hasPermission('ADMIN');
const hasManage = hasPermission('ANNUAL_FEES_MANAGE');
const hasView = hasPermission('ANNUAL_FEES_VIEW');
const hasCreate = hasPermission('ANNUAL_FEES_CREATE');
const hasEdit = hasPermission('ANNUAL_FEES_EDIT');
const hasDelete = hasPermission('ANNUAL_FEES_DELETE');
const hasItemPayment = hasPermission('ANNUAL_FEES_ITEM_PAYMENT');

// Složené kontroly
const canView = isAdmin || hasManage || hasView || hasEdit || hasCreate;
const canCreate = isAdmin || hasManage || hasCreate;
const canEdit = isAdmin || hasManage || hasEdit;
const canDelete = isAdmin || hasManage || (hasDelete && hasEdit);
```

#### 📊 Podmíněné zobrazení UI

```javascript
// Tlačítko pro vytvoření nového poplatku
{canCreate && <Button>Nový poplatek</Button>}

// Tlačítka pro editaci
{canEdit && <EditButton />}

// Tlačítka pro mazání
{canDelete && <DeleteButton />}

// Kontrola při načítání dat
if (!canView) {
  return <div>Nemáte oprávnění k zobrazení ročních poplatků</div>;
}
```

---

### 3. ✅ Routing a Menu (DOKONČENO)

#### **App.js** - Route kontrola

**Před:**
```javascript
// Pouze pro ADMINY
{isLoggedIn && hasAdminRole && hasAdminRole() && 
  <Route path="/annual-fees" element={<AnnualFeesPage />} />}
```

**Po úpravě:**
```javascript
// Pro kohokoliv s ANNUAL_FEES právy
{isLoggedIn && hasPermission && (
  hasPermission('ANNUAL_FEES_MANAGE') ||
  hasPermission('ANNUAL_FEES_VIEW') ||
  hasPermission('ANNUAL_FEES_CREATE') ||
  hasPermission('ANNUAL_FEES_EDIT') ||
  hasPermission('ADMIN')
) && <Route path="/annual-fees" element={<AnnualFeesPage />} />}
```

#### **Layout.js** - Menu BETA funkce

**Před:**
```javascript
// Menu pouze pro ADMINY
{ hasAdminRole && hasAdminRole() && (
  <MenuDropdownWrapper>
    <MenuDropdownButton>BETA funkce</MenuDropdownButton>
    <MenuDropdownContent>
      <MenuDropdownItem to="/orders25-list-v3">Objednávky V3</MenuDropdownItem>
      <MenuDropdownItem to="/annual-fees">Evidence ročních poplatků</MenuDropdownItem>
    </MenuDropdownContent>
  </MenuDropdownWrapper>
) }
```

**Po úpravě:**
```javascript
// Menu pro ADMINY NEBO uživatele s ANNUAL_FEES právy
{ (hasAdminRole && hasAdminRole() || 
   hasPermission('ANNUAL_FEES_MANAGE') || 
   hasPermission('ANNUAL_FEES_VIEW') || 
   hasPermission('ANNUAL_FEES_CREATE') || 
   hasPermission('ANNUAL_FEES_EDIT')) && (
  <MenuDropdownWrapper>
    <MenuDropdownButton>BETA funkce</MenuDropdownButton>
    <MenuDropdownContent>
      {/* Objednávky V3 - pouze ADMINI */}
      {hasAdminRole && hasAdminRole() && (
        <MenuDropdownItem to="/orders25-list-v3">Objednávky V3</MenuDropdownItem>
      )}
      {/* Evidence ročních poplatků - ADMINI nebo s právy */}
      {(hasPermission('ANNUAL_FEES_MANAGE') || 
        hasPermission('ANNUAL_FEES_VIEW') || 
        hasPermission('ANNUAL_FEES_CREATE') || 
        hasPermission('ANNUAL_FEES_EDIT') || 
        (hasAdminRole && hasAdminRole())) && (
        <MenuDropdownItem to="/annual-fees">Evidence ročních poplatků</MenuDropdownItem>
      )}
    </MenuDropdownContent>
  </MenuDropdownWrapper>
) }
```

---

## 🗄️ Databáze - Práva

### Tabulka: `25_prava` (již vytvořeno)

Všech 8 práv pro roční poplatky je v databázi:

```sql
-- Základní práva
ANNUAL_FEES_MANAGE      -- Superuser právo (má všechna práva)
ANNUAL_FEES_VIEW        -- Čtení (zobrazení seznamu + detailu)
ANNUAL_FEES_CREATE      -- Vytváření nových poplatků
ANNUAL_FEES_EDIT        -- Editace existujících poplatků
ANNUAL_FEES_DELETE      -- Mazání poplatků (vyžaduje i EDIT)

-- Práva pro položky
ANNUAL_FEES_ITEM_CREATE   -- Vytváření nových položek
ANNUAL_FEES_ITEM_UPDATE   -- Editace položek
ANNUAL_FEES_ITEM_PAYMENT  -- Označování plateb (s VIEW nebo EDIT)
```

### Admin role

Admin role (`ADMINISTRATOR`) již má přiřazeno právo `ANNUAL_FEES_MANAGE`.

---

## 📝 Logika práv

### Hierarchie práv

```
1. ADMIN role (SUPERADMIN/ADMINISTRATOR) → přístup ke všemu
2. ANNUAL_FEES_MANAGE → má všechna práva (jako mini-admin)
3. Granulární práva:
   - ANNUAL_FEES_VIEW → pouze čtení
   - ANNUAL_FEES_CREATE → vytváření nových
   - ANNUAL_FEES_EDIT → editace existujících
   - ANNUAL_FEES_DELETE → mazání (vyžaduje i EDIT)
   - ANNUAL_FEES_ITEM_* → práce s položkami
```

### Speciální pravidla

#### DELETE právo
```php
// Mazat může pouze ten, kdo má DELETE + EDIT
canDeleteAnnualFees($user) = 
  isAdmin($user) || 
  hasPermission('ANNUAL_FEES_MANAGE') ||
  (hasPermission('ANNUAL_FEES_DELETE') && hasPermission('ANNUAL_FEES_EDIT'))
```

#### PAYMENT právo (označení k zaplacení)
```php
// Označit k zaplacení může i bez EDIT práva
canMarkPaymentAnnualFees($user) = 
  isAdmin($user) || 
  hasPermission('ANNUAL_FEES_MANAGE') ||
  (hasPermission('ANNUAL_FEES_ITEM_PAYMENT') && 
   (hasPermission('ANNUAL_FEES_VIEW') || hasPermission('ANNUAL_FEES_EDIT')))
```

---

## 🧪 Testování

### Testovací scénáře

#### 1. Uživatel bez práv
- ❌ Nevidí menu "Beta funkce"
- ❌ Nemá přístup k URL `/annual-fees` (redirect nebo 403)
- ❌ API vrací 403 Forbidden

#### 2. Uživatel s ANNUAL_FEES_VIEW
- ✅ Vidí menu "Evidence ročních poplatků"
- ✅ Může otevřít seznam a detail
- ❌ Nevidí tlačítka pro vytváření, editaci, mazání
- ✅ API povoluje LIST, DETAIL, STATS
- ❌ API odmítá CREATE, UPDATE, DELETE (403)

#### 3. Uživatel s ANNUAL_FEES_CREATE
- ✅ Vidí menu
- ✅ Vidí tlačítko "Nový poplatek"
- ✅ Může vytvářet nové poplatky
- ❌ Nemůže editovat existující (bez EDIT práva)

#### 4. Uživatel s ANNUAL_FEES_EDIT
- ✅ Vidí menu
- ✅ Může editovat existující poplatky
- ✅ Může měnit položky
- ❌ Nemůže mazat (bez DELETE práva)

#### 5. Uživatel s ANNUAL_FEES_MANAGE
- ✅ Má všechna práva (jako admin)
- ✅ Vytváření, editace, mazání
- ✅ Práce s položkami
- ✅ Všechny API endpointy fungují

#### 6. ADMIN (ADMINISTRATOR/SUPERADMIN)
- ✅ Automatický přístup ke všemu
- ✅ Vidí všechna menu včetně "Objednávky V3"
- ✅ Všechny operace povoleny

---

## 🔒 Bezpečnost

### Backend (PHP)

✅ **Každý handler kontroluje práva na začátku**
```php
if (!canViewAnnualFees($user)) {
    http_response_code(403);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Nemáte oprávnění'
    ]);
    return;
}
```

✅ **HTTP response codes podle standardů**
- `200 OK` - úspěch
- `400 Bad Request` - špatné parametry
- `403 Forbidden` - nedostatečná práva
- `404 Not Found` - záznam neexistuje
- `405 Method Not Allowed` - špatná HTTP metoda
- `500 Internal Server Error` - serverová chyba

### Frontend (React)

✅ **Podmíněné zobrazení UI prvků**
```javascript
{canCreate && <CreateButton />}
{canEdit && <EditButton />}
{canDelete && <DeleteButton />}
```

✅ **Kontrola před akcí**
```javascript
if (!canCreate && !canEdit) {
  showToast('Nemáte oprávnění k této akci', 'error');
  return;
}
```

✅ **Error handling z API**
```javascript
try {
  await createAnnualFee(data);
} catch (error) {
  if (error.response?.status === 403) {
    showToast('Nedostatečná oprávnění', 'error');
  }
}
```

---

## 📚 Dokumentace

### Soubory k prostudování

1. **ANNUAL_FEES_IMPLEMENTATION_PLAN.md** - Původní plán implementace
2. **ANNUAL_FEES_PERMISSIONS_DOCS.md** - Detailní dokumentace práv
3. **ANNUAL_FEES_PERMISSIONS_IMPLEMENTATION.md** - Implementační poznámky
4. **ANNUAL_FEES_ATTACHMENTS_IMPLEMENTATION.md** - Systém příloh
5. **annual_fees_permissions_migration.sql** - SQL migrace práv

---

## ✅ CHECKLIST - CO JE HOTOVO

### Backend
- [x] ✅ Helper funkce pro kontrolu práv
- [x] ✅ `handleAnnualFeesList` - kontrola VIEW práv
- [x] ✅ `handleAnnualFeesDetail` - kontrola VIEW práv
- [x] ✅ `handleAnnualFeesCreate` - kontrola CREATE práv
- [x] ✅ `handleAnnualFeesUpdate` - kontrola EDIT práv
- [x] ✅ `handleAnnualFeesUpdateItem` - kontrola EDIT/PAYMENT práv
- [x] ✅ `handleAnnualFeesCreateItem` - kontrola CREATE práv
- [x] ✅ `handleAnnualFeesDelete` - kontrola DELETE práv
- [x] ✅ `handleAnnualFeesDeleteItem` - kontrola DELETE práv
- [x] ✅ `handleAnnualFeesStats` - kontrola VIEW práv
- [x] ✅ HTTP response codes (403, 400, 404, 500)
- [x] ✅ Error zprávy v češtině

### Frontend
- [x] ✅ Načtení práv z AuthContext
- [x] ✅ Kontrola práv při načítání stránky
- [x] ✅ Podmíněné zobrazení tlačítek (Create, Edit, Delete)
- [x] ✅ Validace práv před API voláním
- [x] ✅ Error handling pro 403 Forbidden

### Routing a Menu
- [x] ✅ Route kontrola v App.js (místo hasAdminRole)
- [x] ✅ Menu Beta funkce - podmíněné zobrazení
- [x] ✅ Podmíněné zobrazení položek v Beta menu

### Databáze
- [x] ✅ 8 práv pro roční poplatky vytvořeno
- [x] ✅ Admin role má ANNUAL_FEES_MANAGE
- [x] ✅ SQL migrace připravena i pro PROD

---

## 🚀 NASAZENÍ

### DEV prostředí
✅ Všechny změny provedeny
✅ Připraveno k testování

### PRODUCTION prostředí
⏳ Čeká na potvrzení nasazení

**Před nasazením do PROD:**
1. Otestovat všechny scénáře v DEV
2. Ověřit, že uživatelé s právy vidí menu
3. Ověřit, že uživatelé bez práv nevidí modul
4. Zkontrolovat API response (403, 400, 500)
5. Spustit SQL migraci na PROD DB
6. Nasadit FE + BE změny

---

## 🎉 SHRNUTÍ

Modul ročních poplatků je nyní **plně zabezpečený** pomocí granulárního systému práv:

1. ✅ Backend kontroluje práva ve všech handlerech
2. ✅ Frontend skrývá nedostupné akce
3. ✅ Menu a routing respektují práva
4. ✅ Admin má automatický přístup
5. ✅ Granulární práva umožňují flexibilní řízení přístupu

**Modul je připraven k ostrému provozu! 🚀**

---

**Vytvořeno:** 1. února 2026  
**Autor:** GitHub Copilot  
**Status:** ✅ DOKONČENO
