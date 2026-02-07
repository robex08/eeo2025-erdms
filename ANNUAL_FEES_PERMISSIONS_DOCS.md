# 📋 DOKUMENTACE: Implementace práv pro modul Ročních poplatků

## 🎯 PŘEHLED PRÁV

### Hierarchie práv
```
ANNUAL_FEES_MANAGE          - 👑 Superuser (všechna práva)
├── ANNUAL_FEES_CREATE      - ✏️ Vytváření nových poplatků  
├── ANNUAL_FEES_VIEW        - 👁️ Zobrazení (read-only)
├── ANNUAL_FEES_EDIT        - ✏️ Editace existujících
├── ANNUAL_FEES_DELETE      - 🗑️ Mazání poplatků
└── Položky:
    ├── ANNUAL_FEES_ITEM_CREATE  - ➕ Přidání položek
    ├── ANNUAL_FEES_ITEM_UPDATE  - ✏️ Editace položek 
    ├── ANNUAL_FEES_ITEM_DELETE  - 🗑️ Mazání položek
    └── ANNUAL_FEES_ITEM_PAYMENT - 💳 Označování jako zaplaceno/nezaplaceno
```

## 🔧 IMPLEMENTACE V KÓDU

### 1. Backend API Kontroly
**Soubory k úpravě:**
```
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php
apps/eeo-v2/api-legacy/api.eeo/api.php
```

**Kontroly práv podle endpointů:**
```php
// POST /annual-fees/list
if (!hasAnyPermission(['ANNUAL_FEES_VIEW', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}

// POST /annual-fees/create  
if (!hasAnyPermission(['ANNUAL_FEES_CREATE', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}

// POST /annual-fees/update
if (!hasAnyPermission(['ANNUAL_FEES_EDIT', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}

// POST /annual-fees/delete
if (!hasAnyPermission(['ANNUAL_FEES_DELETE', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}

// POST /annual-fees/create-item
if (!hasAnyPermission(['ANNUAL_FEES_ITEM_CREATE', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}

// POST /annual-fees/update-item
if (!hasAnyPermission(['ANNUAL_FEES_ITEM_UPDATE', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}

// POST /annual-fees/delete-item
if (!hasAnyPermission(['ANNUAL_FEES_ITEM_DELETE', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}

// POST /annual-fees/mark-paid (označení jako zaplaceno)
if (!hasAnyPermission(['ANNUAL_FEES_ITEM_PAYMENT', 'ANNUAL_FEES_MANAGE'])) {
    return unauthorized();
}
```

### 2. Frontend UI Kontroly
**Soubor:** `apps/eeo-v2/client/src/pages/AnnualFeesPage.js`

**Podmíněné zobrazení tlačítek:**
```jsx
// Přidání nového poplatku
{hasPermission(['ANNUAL_FEES_CREATE', 'ANNUAL_FEES_MANAGE']) && (
  <CreateButton onClick={handleCreate}>
    Nový roční poplatek
  </CreateButton>
)}

// Editace hlavního řádku
{hasPermission(['ANNUAL_FEES_EDIT', 'ANNUAL_FEES_MANAGE']) && (
  <EditButton onClick={() => handleEdit(fee.id)} />
)}

// Mazání poplatku
{hasPermission(['ANNUAL_FEES_DELETE', 'ANNUAL_FEES_MANAGE']) && (
  <DeleteButton onClick={() => handleDelete(fee.id)} />
)}

// Přidání položky
{hasPermission(['ANNUAL_FEES_ITEM_CREATE', 'ANNUAL_FEES_MANAGE']) && (
  <AddItemButton onClick={() => handleAddItem(feeId)} />
)}

// Editace položky
{hasPermission(['ANNUAL_FEES_ITEM_UPDATE', 'ANNUAL_FEES_MANAGE']) && (
  <EditItemButton onClick={() => handleEditItem(itemId)} />
)}

// Mazání položky
{hasPermission(['ANNUAL_FEES_ITEM_DELETE', 'ANNUAL_FEES_MANAGE']) && 
 item.stav !== 'ZAPLACENO' && (
  <DeleteItemButton onClick={() => handleDeleteItem(itemId)} />
)}

// Označení jako zaplaceno/nezaplaceno
{hasPermission(['ANNUAL_FEES_ITEM_PAYMENT', 'ANNUAL_FEES_MANAGE']) && (
  <PaymentButton 
    onClick={() => handleTogglePayment(itemId)} 
    isPaid={item.stav === 'ZAPLACENO'} 
  />
)}
```

### 3. Menu a Navigace
**Soubor:** `apps/eeo-v2/client/src/components/Navigation.js`

```jsx
// Odkaz v hlavním menu
{hasPermission(['ANNUAL_FEES_VIEW', 'ANNUAL_FEES_MANAGE']) && (
  <NavLink to="/annual-fees">
    <FaMoneyBill /> Roční poplatky
  </NavLink>
)}
```

### 4. Hierarchické omezení dat
**Logika:** Uživatel vidí pouze poplatky svého útvaru a podřízených útvarů

```php
// V annualFeesHandlers.php - handleAnnualFeesList()
if (!hasPermission('ANNUAL_FEES_MANAGE')) {
    // Omezit na hierarchii uživatele
    $hierarchyIds = getUserSubordinateOrganizations($userId);
    $whereConditions[] = "rf.organizace_id IN (" . implode(',', $hierarchyIds) . ")";
}
```

## 🚀 TODO - Implementace kroky

### ✅ HOTOVO
- [x] Přidána práva do DB (DEV)
- [x] Admin role má ANNUAL_FEES_MANAGE

### 🔲 K IMPLEMENTACI

#### 1. Backend validace
- [ ] Přidat kontroly práv do všech annualFeesHandlers funkcí
- [ ] Implementovat hierarchické filtrování dat
- [ ] Přidat error zprávy pro nedostatečná oprávnění

#### 2. Frontend kontroly  
- [ ] Přidat hasPermission kontroly do AnnualFeesPage.js
- [ ] Podmíněné zobrazení všech akčních tlačítek
- [ ] Skrýt formuláře pro uživatele bez práv

#### 3. Navigace a menu
- [ ] Přidat podmínku do hlavního menu
- [ ] Redirect na 403 pokud nemá READ práva

#### 4. Testování
- [ ] Test s uživatelem bez práv
- [ ] Test s různými kombinacemi práv
- [ ] Test hierarchických omezení

## 📝 POZNÁMKY

### Speciální logika
1. **MANAGE právo** = má všechna práva (superuser)
2. **Mazání položek** = pouze pokud není zaplaceno
3. **Hierarchie** = vidí pouze vlastní útvar + podřízené
4. **Admin role** = automaticky MANAGE právo

### Chybové stavy
- `401 Unauthorized` - není přihlášen
- `403 Forbidden` - nemá dostatečná práva  
- `404 Not Found` - data mimo jeho hierarchii

### Audit trail
- Všechny změny logovat s user_id
- Zaznamenat kdo co změnil (dt_aktualizace, aktualizoval_uzivatel_id)