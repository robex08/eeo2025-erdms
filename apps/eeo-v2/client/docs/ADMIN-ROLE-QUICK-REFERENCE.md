# ADMIN - Rychlá reference

**Datum:** 20. listopadu 2025  
**Status:** ✅ AKTIVNÍ

---

## 🎯 Základní pravidlo

```javascript
hasPermission('ADMIN')  // ✅ Kontroluje ROLE, ne právo!
```

---

## Co to znamená?

### `'ADMIN'` = Alias pro admin role

Když zavoláte:
```javascript
if (hasPermission('ADMIN')) {
  // Tato podmínka je TRUE, pokud uživatel má:
  // - roli SUPERADMIN nebo
  // - roli ADMINISTRATOR
}
```

---

## Implementace

### Kde je to implementováno?
`/src/context/AuthContext.js` - funkce `hasPermission()`

### Jak to funguje?
```javascript
const hasPermission = useCallback((code) => {
  const norm = code.toString().trim().toUpperCase();
  
  // Speciální případ pro 'ADMIN'
  if (norm === 'ADMIN') {
    return userDetail.roles.some(role => 
      role.kod_role === 'SUPERADMIN' || 
      role.kod_role === 'ADMINISTRATOR'
    );
  }
  
  // ... normální kontrola práv pro ostatní kódy
}, [userPermissions, userDetail]);
```

---

## Použití v projektu

### Existující kód funguje automaticky:
```javascript
// Všude v projektu, kde vidíte:
const canEdit = hasPermission('ADMIN') || hasPermission('DICT_MANAGE');

// Nyní správně kontroluje:
// 1. Má uživatel roli SUPERADMIN nebo ADMINISTRATOR? NEBO
// 2. Má uživatel právo DICT_MANAGE?
```

---

## Důležité poznámky

### ❌ V databázi NEEXISTUJE právo 'ADMIN'
- 'ADMIN' je **pouze alias** v kódu
- Skutečná práva mají kódy jako: `DICT_MANAGE`, `ORDER_MANAGE`, atd.

### ✅ Role v databázi:
- `SUPERADMIN` - nejvyšší správce
- `ADMINISTRATOR` - administrátor
- `UZIVATEL` - běžný uživatel
- atd.

---

## Alternativní způsob kontroly

Pokud chcete **explicitně** kontrolovat admin roli:

```javascript
const { hasAdminRole } = useContext(AuthContext);

if (hasAdminRole()) {
  // Uživatel je SUPERADMIN nebo ADMINISTRATOR
}
```

Obě varianty fungují **identicky**:
- `hasPermission('ADMIN')` ✅
- `hasAdminRole()` ✅

---

## Pro vývojáře

### Když přidáváte novou funkcionalitu:

```javascript
// ✅ SPRÁVNĚ - kontrola admin přístupu
if (hasPermission('ADMIN')) {
  // Funkce dostupná pouze pro adminy
}

// ✅ SPRÁVNĚ - kontrola konkrétního práva
if (hasPermission('ORDER_MANAGE')) {
  // Funkce dostupná pro uživatele s právem ORDER_MANAGE
}

// ✅ SPRÁVNĚ - kombinace
if (hasPermission('ADMIN') || hasPermission('ORDER_MANAGE')) {
  // Funkce dostupná pro adminy NEBO uživatele s právem ORDER_MANAGE
}
```

---

## Testování

### Jak otestovat, zda uživatel je admin?

```javascript
// V console (Developer Tools):
const { userDetail } = JSON.parse(
  localStorage.getItem('auth_user_detail_persistent')
);

console.log('Role:', userDetail?.roles);
// Hledejte: kod_role = 'SUPERADMIN' nebo 'ADMINISTRATOR'

// Test hasPermission:
// V React komponeně:
const { hasPermission } = useContext(AuthContext);
console.log('Je admin?', hasPermission('ADMIN'));
```

---

**Pro více informací:** Viz `ADMIN-ROLE-VS-PERMISSION.md`
