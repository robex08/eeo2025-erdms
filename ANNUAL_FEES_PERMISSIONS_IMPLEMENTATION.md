# 🔐 Implementace oprávnění pro roční poplatky - Kompletní dokumentace

## ✅ IMPLEMENTOVÁNO

### Backend (/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php)

#### Helper funkce (nové):
- `hasAnnualFeesPermission($user, $permissionCode)` - kontrola jednoho práva
- `hasAnyAnnualFeesPermission($user, $permissionCodes)` - kontrola alespoň jednoho práva
- `isAnnualFeesAdmin($user)` - kontrola admin role
- `canViewAnnualFees($user)` - může zobrazit (VIEW + CREATE + EDIT + MANAGE + ADMIN)
- `canCreateAnnualFees($user)` - může vytvářet (CREATE + MANAGE + ADMIN)
- `canEditAnnualFees($user)` - může editovat (EDIT + MANAGE + ADMIN)
- `canDeleteAnnualFees($user)` - může mazat (DELETE + EDIT + MANAGE + ADMIN)
- `canMarkPaymentAnnualFees($user)` - může označit platbu (PAYMENT + VIEW/EDIT + MANAGE + ADMIN)

#### Kontroly práv implementovány v:
- ✅ `handleAnnualFeesList()` - VIEW právo
- ✅ `handleAnnualFeesDetail()` - VIEW právo
- ✅ `handleAnnualFeesCreate()` - CREATE právo
- ✅ `handleAnnualFeesUpdate()` - EDIT právo
- ✅ `handleAnnualFeesDelete()` - DELETE právo (+ EDIT)
- ✅ `handleAnnualFeesCreateItem()` - CREATE nebo EDIT právo
- ✅ `handleAnnualFeesUpdateItem()` - EDIT nebo PAYMENT právo (podle typu změny)
- ✅ `handleAnnualFeesDeleteItem()` - DELETE právo (+ EDIT)
- ✅ `handleAnnualFeesStats()` - VIEW právo

### Frontend (/apps/eeo-v2/client/src/pages/AnnualFeesPage.js)

#### Implementované kontroly:
- ✅ Přidán import `hasPermission` z AuthContext
- ✅ Definovány proměnné práv na začátku komponenty
- ✅ Přístup odepřen pokud nemá VIEW právo
- ✅ Tlačítko "Nový roční poplatek" - pouze s CREATE
- 🔲 Tlačítko EDIT v hlavním řádku - pouze s EDIT
- 🔲 Tlačítko DELETE v hlavním řádku - pouze s DELETE
- 🔲 Tlačítko "Přidat řádek" pro položky - pouze s CREATE nebo EDIT
- 🔲 Tlačítko EDIT položky - pouze s EDIT
- 🔲 Tlačítko DELETE položky - pouze s DELETE
- 🔲 Změna stavu položky na ZAPLACENO - pouze s PAYMENT

## 📝 STRUKTURA PRÁV

### 1. ADMIN / ANNUAL_FEES_MANAGE
**Plný přístup ke všemu**
- Vidí všechno
- Může vše editovat
- Může vytvářet
- Může mazat
- Může označovat platby

### 2. ANNUAL_FEES_VIEW
**Pouze čtení**
- Vidí seznam ročních poplatků
- Vidí detaily a položky
- Vidí statistiky
- ❌ Nemůže editovat
- ❌ Nemůže vytvářet
- ❌ Nemůže mazat

### 3. ANNUAL_FEES_CREATE
**Vytváření nových poplatků**
- Vidí seznam (implicitně VIEW)
- Může vytvářet nové roční poplatky
- Může přidávat položky k existujícím
- ❌ Nemůže editovat existující
- ❌ Nemůže mazat

### 4. ANNUAL_FEES_EDIT
**Editace existujících**
- Vidí seznam (implicitně VIEW)
- Může editovat hlavičku poplatků
- Může editovat položky
- Může přidávat položky
- ❌ Nemůže mazat (bez DELETE)

### 5. ANNUAL_FEES_DELETE
**Mazání (jen s EDIT)**
- ❌ Bez EDIT je zbytečný
- ✅ S EDIT může mazat poplatky a položky
- Kontrola: DELETE + EDIT

### 6. ANNUAL_FEES_ITEM_PAYMENT
**Označování plateb (s VIEW nebo EDIT)**
- ❌ Bez VIEW nebo EDIT je zbytečný
- ✅ S VIEW může pouze označovat jako zaplaceno
- ✅ S EDIT může kompletně spravovat platby
- Kontrola: PAYMENT + (VIEW nebo EDIT)

## 🚀 DALŠÍ KROKY

### Frontend - zbývá implementovat:

1. **Editace hlavního řádku:**
```jsx
{canEdit && (
  <Button variant="secondary" onClick={() => handleEditFee(fee.id)}>
    <FontAwesomeIcon icon={faEdit} />
  </Button>
)}
```

2. **Mazání hlavního řádku:**
```jsx
{canDelete && (
  <Button variant="secondary" onClick={() => handleDeleteFee(fee.id, fee.nazev)}>
    <FontAwesomeIcon icon={faTrash} />
  </Button>
)}
```

3. **Editace položky:**
```jsx
{canEdit && (
  <Button variant="secondary" onClick={() => handleEditItem(item.id)}>
    <FontAwesomeIcon icon={faEdit} />
  </Button>
)}
```

4. **Mazání položky:**
```jsx
{canDelete && item.stav !== 'ZAPLACENO' && (
  <Button variant="secondary" onClick={() => handleDeleteItem(item.id, item.nazev_polozky)}>
    <FontAwesomeIcon icon={faTrash} />
  </Button>
)}
```

5. **Označení jako zaplaceno:**
```jsx
{canMarkPayment && (
  <InlineSelect
    value={item.stav || ''}
    onChange={(e) => handleUpdateItem(item.id, {stav: e.target.value})}
    disabled={!canMarkPayment}
  >
    <option value="NEZAPLACENO">Nezaplaceno</option>
    <option value="ZAPLACENO">Zaplaceno</option>
  </InlineSelect>
)}
```

6. **Přidání nové položky:**
```jsx
{(canCreate || canEdit) && !addingItemForFee && (
  <Button onClick={() => handleAddItem(feeId)}>
    <FontAwesomeIcon icon={faPlus} /> Přidat řádek
  </Button>
)}
```

### Menu navigace:

```jsx
// V Navigation.js nebo podobném
{hasPermission(['ANNUAL_FEES_VIEW', 'ANNUAL_FEES_MANAGE', 'ADMIN']) && (
  <NavLink to="/annual-fees">
    <FontAwesomeIcon icon={faMoneyBill} /> Roční poplatky
  </NavLink>
)}
```

## 🧪 TESTOVÁNÍ

### Testovací scénáře:

1. **Bez práv:**
   - Zobrazí se "Přístup odepřen"
   - Nelze přistoupit přes URL

2. **Pouze VIEW:**
   - Vidí seznam a detail
   - ❌ Žádná tlačítka pro editaci
   - ❌ Tlačítko pro vytvoření nového

3. **CREATE bez EDIT:**
   - Vidí seznam
   - ✅ Tlačítko "Nový roční poplatek"
   - ❌ Tlačítka pro editaci existujících

4. **EDIT bez DELETE:**
   - Vidí seznam
   - ✅ Tlačítka pro editaci
   - ❌ Tlačítka pro mazání

5. **DELETE + EDIT:**
   - Vidí seznam
   - ✅ Tlačítka pro editaci
   - ✅ Tlačítka pro mazání

6. **PAYMENT + VIEW:**
   - Vidí seznam
   - ✅ Může měnit stav na ZAPLACENO
   - ❌ Nemůže editovat jiné věci

7. **ADMIN/MANAGE:**
   - ✅ Vidí všechno
   - ✅ Může všechno

## 📊 SQL Migrace

SQL migrace je připravena v: `/var/www/erdms-dev/annual_fees_permissions_migration.sql`

Přidává 9 práv:
1. ANNUAL_FEES_MANAGE
2. ANNUAL_FEES_CREATE
3. ANNUAL_FEES_VIEW
4. ANNUAL_FEES_EDIT
5. ANNUAL_FEES_DELETE
6. ANNUAL_FEES_ITEM_CREATE
7. ANNUAL_FEES_ITEM_UPDATE
8. ANNUAL_FEES_ITEM_DELETE
9. ANNUAL_FEES_ITEM_PAYMENT

Admin role automaticky dostává ANNUAL_FEES_MANAGE.

## 💡 Poznámky

- Backend používá verify_token_v2 který vrací user object s permissions a roles
- Frontend používá hasPermission hook z AuthContext
- Alias 'ADMIN' v hasPermission automaticky kontroluje admin role
- Všechny DELETE operace vyžadují i EDIT právo (bezpečnostní pravidlo)
- PAYMENT právo je zbytečné bez VIEW nebo EDIT
