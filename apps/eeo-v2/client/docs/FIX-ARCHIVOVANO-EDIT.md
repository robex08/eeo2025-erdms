# Fix: Otevírání archivovaných objednávek k editaci

## Datum: 19. října 2025

## Problém
Uživatelé nemohli otevřít objednávky se stavem `ARCHIVOVANO` k editaci. Po kliknutí na editaci a potvrzení varování se objednávka nenačetla.

## Příčina
V funkci `handleEditConfirm()` v Orders25List.js chyběl parametr `archivovano: 1` při volání API `getOrder25()`. Backend bez tohoto parametru nevrací archivované objednávky z bezpečnostních důvodů.

## Řešení
Přidán parametr `archivovano: 1` do všech volání `getOrder25()` v kontextu editace objednávky.

---

## Změny v souborech

### 1. Orders25List.js - handleEditConfirm()

#### Před:
```javascript
const dbOrder = await getOrder25({
  token,
  username,
  orderId: orderIdToLoad
});
```

#### Po:
```javascript
const dbOrder = await getOrder25({
  token,
  username,
  orderId: orderIdToLoad,
  archivovano: 1 // Vždy zahrnout archivované při načítání pro editaci
});
```

### 2. Debug logy pro diagnostiku

Pro lepší diagnostiku problémů s načítáním objednávek byly přidány konzolové logy:

#### Orders25List.js - handleEditConfirm()
```javascript
console.log('🔍 DEBUG: Načítám objednávku pro editaci, ID:', orderIdToLoad, 'stav:', orderToUse.stav_objednavky);

const dbOrder = await getOrder25({...});

console.log('✅ DEBUG: Objednávka načtena z DB:', dbOrder ? 'ANO' : 'NE', dbOrder?.stav_objednavky);

if (!dbOrder) {
  console.error('❌ DEBUG: Backend nevrátil data pro objednávku ID:', orderIdToLoad);
  showToast('Nepodařilo se načíst objednávku z databáze', { type: 'error' });
  return;
}
```

#### api25orders.js - getOrder25()
```javascript
// Před odesláním na backend
console.log('📤 DEBUG API: getOrder25 payload:', { 
  id: orderId, 
  archivovano: payload.archivovano 
});

// Po přijetí odpovědi
console.log('📥 DEBUG API: getOrder25 response:', { 
  status: data.status, 
  hasData: !!data.data,
  dataId: data.data?.id,
  dataStav: data.data?.stav_objednavky,
  err: data.err
});
```

---

## Flow načítání archivované objednávky

### 1. Kliknutí na editaci objednávky
```javascript
handleEdit(order) {
  // Pokud je stav ARCHIVOVANO
  if (order.stav_objednavky === 'ARCHIVOVANO') {
    setOrderToEdit(order);
    setShowArchivedWarningModal(true); // Zobraz varování
    return;
  }
}
```

### 2. Potvrzení varování
```javascript
handleArchivedWarningConfirm() {
  setShowArchivedWarningModal(false);
  
  // Zkontroluj, jestli existuje koncept
  if (shouldShowConfirmDialog) {
    setShowEditConfirmModal(true);
  } else {
    handleEditConfirm(orderToEdit); // ← Zde volej s archivovano=1
  }
}
```

### 3. Načtení objednávky z DB
```javascript
handleEditConfirm(orderParam) {
  const dbOrder = await getOrder25({
    token,
    username,
    orderId: orderIdToLoad,
    archivovano: 1 // ✅ KLÍČOVÝ PARAMETR
  });
  
  // Pokračuj v editaci...
  navigate(`/order-form-25?edit=${orderId}&archivovano=1`);
}
```

### 4. Backend API
```javascript
POST /orders25/by-id
{
  "token": "...",
  "username": "...",
  "id": 123,
  "archivovano": 1  // ✅ Backend vrátí i archivované objednávky
}
```

---

## Co backend kontroluje

### Bez parametru archivovano
```php
// Backend vrací pouze objednávky, které NEJSOU archivované
SELECT * FROM objednavky WHERE id = ? AND stav_objednavky != 'ARCHIVOVANO'
```

### S parametrem archivovano=1
```php
// Backend vrací všechny objednávky včetně archivovaných
SELECT * FROM objednavky WHERE id = ?
```

---

## Debug konzole

### Úspěšné načtení:
```
🔍 DEBUG: Načítám objednávku pro editaci, ID: 456, stav: ARCHIVOVANO
📤 DEBUG API: getOrder25 payload: { id: 456, archivovano: 1 }
📥 DEBUG API: getOrder25 response: { 
  status: 'ok', 
  hasData: true, 
  dataId: 456, 
  dataStav: 'ARCHIVOVANO', 
  err: undefined 
}
✅ DEBUG: Objednávka načtena z DB: ANO ARCHIVOVANO
```

### Neúspěšné načtení (bez parametru):
```
🔍 DEBUG: Načítám objednávku pro editaci, ID: 456, stav: ARCHIVOVANO
📤 DEBUG API: getOrder25 payload: { id: 456, archivovano: undefined }
📥 DEBUG API: getOrder25 response: { 
  status: 'ok', 
  hasData: false, 
  dataId: undefined, 
  dataStav: undefined, 
  err: 'Objednávka nenalezena' 
}
❌ DEBUG: Backend nevrátil data pro objednávku ID: 456
```

---

## Další místa, kde se posílá archivovano=1

### 1. OrderForm25.js - Načtení pro editaci z URL
```javascript
const dbOrder = await getOrder25({
  token,
  username,
  orderId: editOrderId,
  archivovano: archivovanoParam ? 1 : undefined
});
```

### 2. OrderForm25.js - Revalidace
```javascript
const dbOrder = await getOrder25({ 
  token, 
  username, 
  orderId,
  archivovano: 1 // Při revalidaci vždy zahrnout archivované
});
```

### 3. Orders25List.js - Otevření konceptu
```javascript
navigate(`/order-form-25?edit=${order.id}&archivovano=1`);
```

### 4. Orders25List.js - Po potvrzení editace
```javascript
navigate(`/order-form-25?edit=${orderId}&archivovano=1`);
```

---

## Testování

### Před nasazením ověřte:
1. ✅ Otevření archivované objednávky k editaci funguje
2. ✅ V konzoli se zobrazují debug logy s parametrem archivovano=1
3. ✅ Backend vrací data pro archivované objednávky
4. ✅ Varování o archivované objednávce se zobrazí
5. ✅ Po potvrzení se objednávka načte do formuláře
6. ✅ URL obsahuje parametr archivovano=1

### Kroky pro test:
1. Najděte objednávku se stavem ARCHIVOVANO
2. Klikněte na ikonu editace (tužka)
3. Měl by se zobrazit varující modal
4. Klikněte na "Ano, rozumím rizikům a chci pokračovat"
5. Objednávka by se měla načíst do formuláře
6. V konzoli zkontrolujte debug logy

---

## Co hlídat v konzoli

### Správné chování:
```
📤 DEBUG API: getOrder25 payload: { id: X, archivovano: 1 }
✅ DEBUG: Objednávka načtena z DB: ANO
```

### Problém s backendem:
```
📥 DEBUG API: getOrder25 response: { status: 'ok', hasData: false, err: '...' }
❌ DEBUG: Backend nevrátil data pro objednávku ID: X
```

---

**Status:** ✅ HOTOVO
**Soubory změněny:**
- Orders25List.js (handleEditConfirm)
- api25orders.js (getOrder25)

**Datum:** 19. října 2025

## Poznámka
Debug logy lze později odstranit nebo přepnout na `console.debug()` místo `console.log()` pro produkci.
