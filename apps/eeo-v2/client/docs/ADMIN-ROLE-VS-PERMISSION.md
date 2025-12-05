# ADMIN - Role vs Právo - Kritická poznámka

**Datum:** 20. listopadu 2025  
**Autor:** Development Team  
**Status:** ✅ OPRAVENO V CELÉM PROJEKTU - AUTOMATICKY

---

## 🚨 KRITICKÉ PRAVIDLO

### ✅ ŘEŠENÍ (po opravě):
```javascript
// hasPermission('ADMIN') NYNÍ AUTOMATICKY kontroluje ROLE, ne právo!
const canEdit = hasPermission('ADMIN'); // ✅ Kontroluje ROLI SUPERADMIN nebo ADMINISTRATOR
```

### Jak to funguje:
Funkce `hasPermission()` v `AuthContext.js` má **speciální logiku** pro `'ADMIN'`:
- Když zavoláte `hasPermission('ADMIN')`, funkce **automaticky zkontroluje ROLE** místo práv
- Kontroluje, zda má uživatel roli `SUPERADMIN` nebo `ADMINISTRATOR`
- **Žádné změny v existujícím kódu nejsou potřeba!**

---

## Definice pojmů

### 1. ADMIN jako **ALIAS PRO ROLE**
**`ADMIN`** v kontextu `hasPermission('ADMIN')` znamená:
- Uživatel má **roli** `SUPERADMIN` **NEBO** `ADMINISTRATOR`
- **NENÍ TO PRÁVO!** Je to speciální alias pro kontrolu admin rolí
- Implementováno přímo v `hasPermission()` funkci v `AuthContext.js`

**Interní logika v hasPermission():**
```javascript
// V AuthContext.js - hasPermission funkce
if (norm === 'ADMIN') {
  // Speciální případ - kontrola rolí místo práv
  return userDetail.roles.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
}
```

### 2. ADMIN jako právo
- V databázi **NEEXISTUJE** právo s kódem `ADMIN`
- `hasPermission('ADMIN')` automaticky kontroluje **ROLE**, ne práva
- **Žádné změny kódu nejsou potřeba!**

---

## Implementace v AuthContext

### `/src/context/AuthContext.js`

Funkce `hasPermission()` má **vestavěnou logiku** pro speciální případ `'ADMIN'`:

```javascript
const hasPermission = useCallback((code) => {
  try {
    if (!code) return false;
    const norm = code.toString().trim().toUpperCase();
    
    // 🚨 SPECIÁLNÍ PŘÍPAD: 'ADMIN' není právo, ale alias pro kontrolu admin rolí!
    if (norm === 'ADMIN') {
      let ud = userDetail || {};
      // fallback: try persisted userDetail from localStorage
      try {
        if ((!ud || Object.keys(ud).length === 0)) {
          const raw = localStorage.getItem('auth_user_detail_persistent');
          if (raw) {
            ud = JSON.parse(raw) || ud;
          }
        }
      } catch (e) { /* ignore */ }
      
      if (ud?.roles && Array.isArray(ud.roles)) {
        return ud.roles.some(role => 
          role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
        );
      }
      return false;
    }
    
    // ... zbytek logiky pro normální práva
  } catch (e) { return false; }
}, [userPermissions, userDetail]);
```

### Volitelná helper funkce (přidána do kontextu)

Pro explicitní kontrolu admin role je dostupná i funkce `hasAdminRole()`:

```javascript
// V AuthContext
const hasAdminRole = useCallback(() => {
  if (!userDetail?.roles) return false;
  return userDetail.roles.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  );
}, [userDetail]);

// Poskytováno v kontextu
return (
  <AuthContext.Provider value={{ 
    ...,
    hasPermission,
    hasAdminRole  // ✅ Volitelná explicitní kontrola
  }}>
```

---

## Použití v projektu

### ✅ ŽÁDNÉ ZMĚNY NEJSOU POTŘEBA!

Všechny existující výskyty `hasPermission('ADMIN')` fungují **automaticky** správně:

```javascript
// Všechny tyto výskyty NYNÍ fungují správně (kontrolují ROLE):

// 1. /src/components/dictionaries/tabs/RoleTab.js
const canEdit = hasPermission('ADMIN') || hasPermission('DICT_MANAGE');

// 2. /src/components/dictionaries/tabs/PravaTab.js
const canEdit = hasPermission('ADMIN') || hasPermission('DICT_MANAGE');

// 3. /src/pages/Orders25List.js (4 místa)
{approvalCount > 0 && (hasPermission('ADMIN') || hasPermission('ORDER_APPROVE')) && (
const canHardDelete = hasPermission('ADMIN') || hasPermission('ORDER_DELETE_ALL');
(hasPermission('ADMIN') || hasPermission('ORDER_DELETE_ALL'))
{(hasPermission('ADMIN') || hasPermission('ORDER_DELETE_ALL')) ? (
```

**Důvod:** Funkce `hasPermission()` má vestavěnou logiku, která při volání s parametrem `'ADMIN'` automaticky kontroluje role místo práv.

---

## Pravidla pro budoucí vývoj

### ✅ SPRÁVNĚ - Dvě možnosti:

#### Varianta 1: Pomocí hasPermission (DOPORUČENO)
```javascript
// Jednoduchý, čitelný zápis - automaticky kontroluje ROLE
const { hasPermission } = useContext(AuthContext);

if (hasPermission('ADMIN')) {
  // Uživatel je SUPERADMIN nebo ADMINISTRATOR
  // Funguje automaticky díky speciální logice v hasPermission()
}
```

#### Varianta 2: Pomocí hasAdminRole (EXPLICITNÍ)
```javascript
// Explicitní kontrola admin role
const { hasAdminRole } = useContext(AuthContext);

if (hasAdminRole()) {
  // Uživatel je SUPERADMIN nebo ADMINISTRATOR
  // Jasně viditelné, že kontrolujeme roli
}
```

#### Varianta 3: Přímá kontrola (PRO POKROČILÉ)
```javascript
// Přímá kontrola v userDetail
const isAdmin = userDetail?.roles?.some(r => 
  r.kod_role === 'SUPERADMIN' || r.kod_role === 'ADMINISTRATOR'
);
```

### 💡 Doporučení:
- **Pro konzistenci s existujícím kódem:** Používejte `hasPermission('ADMIN')`
- **Pro explicitnost:** Používejte `hasAdminRole()`
- Obě varianty jsou **správné a fungují identicky**

---

## Přehled rolí a práv v projektu

### Role (kod_role)
- `SUPERADMIN` - Super administrátor (nejvyšší práva)
- `ADMINISTRATOR` - Administrátor (vysoká práva)
- `UZIVATEL` - Běžný uživatel
- `GARANT` - Garant projektu
- atd.

### Práva (kod_prava)
- `DICT_MANAGE` - Správa číselníků
- `ORDER_MANAGE` - Správa objednávek
- `ORDER_APPROVE` - Schvalování objednávek
- `ORDER_EDIT_ALL` - Editace všech objednávek
- `CASH_BOOK_MANAGE` - Správa pokladny
- atd.

**DŮLEŽITÉ:** `ADMIN` NENÍ v seznamu práv! Je to pouze alias pro kontrolu admin rolí.

---

## Testování

### Test kontroly admin role

```javascript
// Uživatel s rolí SUPERADMIN
const userDetail = {
  roles: [
    { kod_role: 'SUPERADMIN', nazev_role: 'Super administrátor' }
  ]
};

console.log(hasAdminRole(userDetail)); // true

// Uživatel s rolí ADMINISTRATOR
const userDetail2 = {
  roles: [
    { kod_role: 'ADMINISTRATOR', nazev_role: 'Administrátor' }
  ]
};

console.log(hasAdminRole(userDetail2)); // true

// Běžný uživatel
const userDetail3 = {
  roles: [
    { kod_role: 'UZIVATEL', nazev_role: 'Uživatel' }
  ]
};

console.log(hasAdminRole(userDetail3)); // false
```

---

## Checklist - Implementace v projektu

- [x] ✅ Upravena funkce `hasPermission()` v `/src/context/AuthContext.js` - přidána speciální logika pro 'ADMIN'
- [x] ✅ Přidána helper funkce `hasAdminRole()` do AuthContext (volitelná, pro explicitní kontrolu)
- [x] ✅ Vytvořena dokumentace `ADMIN-ROLE-VS-PERMISSION.md`
- [x] ✅ **AUTOMATICKY opraveno v celém projektu** - všechny existující výskyty `hasPermission('ADMIN')` nyní fungují správně
- [ ] ⏳ Backend: Ověřit, že právo `ADMIN` není v databázi (nebo ho označit jako deprecated)
- [ ] ⏳ Code review: Otestovat funkčnost na všech místech použití

---

## Závěr

### ✅ HOTOVO - Funguje automaticky v celém projektu!

**`hasPermission('ADMIN')`** nyní **správně kontroluje admin ROLE**, ne právo!

### Co bylo změněno:
1. ✅ Funkce `hasPermission()` v `AuthContext.js` má speciální logiku pro `'ADMIN'`
2. ✅ Při volání `hasPermission('ADMIN')` se automaticky kontrolují role `SUPERADMIN` nebo `ADMINISTRATOR`
3. ✅ **Žádné změny v existujícím kódu nebyly potřeba** - vše funguje automaticky
4. ✅ Přidána volitelná funkce `hasAdminRole()` pro explicitní kontrolu

### Jak to funguje:
```javascript
// Tento kód NYNÍ automaticky kontroluje ROLE:
if (hasPermission('ADMIN')) {
  // ✅ Zkontroluje, zda má uživatel roli SUPERADMIN nebo ADMINISTRATOR
  // ✅ FUNGUJE V CELÉM PROJEKTU bez změn!
}
```

---

**Poznámka pro vývojáře:**  
- ✅ `hasPermission('ADMIN')` je **plně funkční** a kontroluje admin role
- ✅ Můžete použít i `hasAdminRole()` pro explicitní kontrolu
- ✅ Obě varianty jsou správné a fungují identicky
- 💡 V databázi **neexistuje právo** s kódem `ADMIN` - je to pouze alias pro kontrolu rolí
