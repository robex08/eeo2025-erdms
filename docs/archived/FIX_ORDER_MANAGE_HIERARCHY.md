# FIX: Hierarchie nesmí přidávat ORDER_MANAGE právo

**Datum:** 18. prosince 2025  
**Autor:** GitHub Copilot  
**Issue:** Uživatel bez práva ORDER_APPROVE vidí schvalovací blok

## 🔍 PROBLÉM

Uživatel 100 (Robert Holovský) vidí schvalovací blok v OrderForm25, i když **NEMÁ** právo `ORDER_APPROVE` ani `ORDER_MANAGE` v databázi.

### Analýza:

1. **Backend kontrola:**
   ```
   ✅ Uživatel 100 NEMÁ ORDER_APPROVE
   ✅ Uživatel 100 NEMÁ ORDER_MANAGE
   ✅ Má pouze: ORDER_CREATE, ORDER_READ_OWN, ORDER_EDIT_OWN, ORDER_DELETE_OWN
   ```

2. **Frontend kontrola:**
   ```javascript
   canApproveOrders: false   // ✅ Správně
   canManageOrders: true     // ❌ ŠPATNĚ!
   ```

3. **Příčina:**
   - Hierarchie v `permissionHierarchyService.js` měla mapping:
   ```javascript
   'ORDER_DELETE_OWN': {
     upgrade: 'ORDER_MANAGE'  // ❌ Automaticky povyšuje na admin právo!
   }
   ```
   - Uživatel má `ORDER_DELETE_OWN` → hierarchie ho automaticky povýšila na `ORDER_MANAGE`

## 🔧 OPRAVA

**Soubor:** `/apps/eeo-v2/client/src/services/permissionHierarchyService.js`

**Změny:**
1. `ORDER_DELETE_OWN.upgrade`: `'ORDER_MANAGE'` → `null`
2. `ORDER_DELETE_ALL.upgrade`: `'ORDER_MANAGE'` → `null`
3. `ORDER_APPROVE.upgrade`: `'ORDER_MANAGE'` → `null`

**Důvod:**
- `ORDER_MANAGE` je **administrativní právo**
- Nesmí být automaticky přidáváno hierarchií
- Musí být přiřazeno **přímo z role** v databázi

## ✅ VÝSLEDEK

Po opravě:
- Hierarchie již **NEPŘIDÁVÁ** `ORDER_MANAGE` automaticky
- Uživatel 100 bude mít `canManageOrders: false`
- Schvalovací blok se **NEZOBRAZÍ** uživatelům bez práva

## 🧪 TEST

**Před opravou:**
```javascript
userPermissions: ['ORDER_DELETE_OWN', ...]
expandedPermissions: ['ORDER_DELETE_OWN', 'ORDER_DELETE_ALL', 'ORDER_MANAGE', ...]
canManageOrders: true  // ❌
```

**Po opravě:**
```javascript
userPermissions: ['ORDER_DELETE_OWN', ...]
expandedPermissions: ['ORDER_DELETE_OWN', 'ORDER_DELETE_ALL']  // ✅ BEZ ORDER_MANAGE
canManageOrders: false  // ✅
```

## 📋 SOUVISEJÍCÍ SOUBORY

- ✅ `hierarchyOrderFilters.php` - Opravena kontrola vlastních objednávek
- ✅ `permissionHierarchyService.js` - Odstraněn upgrade na ORDER_MANAGE
- ✅ `OrderForm25.js` - Přidán debug logging pro user_id=100

## 🔄 AKCE PO MERGE

1. **Vyčistit localStorage** všem uživatelům (obsahuje staré expandedPermissions)
2. **Force refresh** React aplikace (Ctrl+Shift+R)
3. **Testovat** s uživatelem bez ORDER_APPROVE práva
