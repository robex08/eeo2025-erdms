# Multi-Tab Session Fix - Summary

## 🎯 Problém

Aplikace se **odhlašovala v nové záložce** a **po F5 refresh**, i když měla funkční autentifikaci přes localStorage.

### Symptomy
- ✅ První záložka: Přihlášen OK
- ❌ Nová záložka: Vyžaduje přihlášení
- ❌ F5 refresh: Vyžaduje přihlášení
- ❌ Menu bar: Nezobrazoval správný stav objednávky po změnách

## 🔍 Root Cause Analysis

### 1. **Network Error Handling v AuthContext**
**Problém**: Při validaci tokenu v `AuthContext.js` se ANY error (včetně network errors v incognito) vedl k automatickému odhlášení.

```javascript
// ❌ BEFORE - Špatně
catch (error) {
  const isNetworkError = ...;
  if (isNetworkError) {
    // používám cached data
    setLoading(false);
  } else {
    // ⚠️ NEPLATNÝ TOKEN → odhlásit
    logout();
  }
}
```

**Důsledek**: V incognito módu nebo při pomalém síti se uživatel okamžitě odhlásil.

### 2. **Broadcast LOGIN Handler**
**Problém**: Když se záložka otevřela a přijala LOGIN broadcast z jiné záložky, místo načtení dat z localStorage se rovnou dělal `window.location.reload()`.

```javascript
// ❌ BEFORE - Špatně
case BROADCAST_TYPES.LOGIN:
  if (message.payload?.userId && message.payload.userId !== user_id) {
    window.location.reload(); // ⚠️ Zbytečný reload!
  }
  break;
```

**Důsledek**: Nová záložka se reloadovala, což vymazalo částečně načtený stav.

### 3. **Chybějící Broadcast Events v OrderForm25**
**Problém**: OrderForm25 neposílal broadcast zprávy při změně draftu → menu bar v ostatních záložkách se neaktualizoval.

## ✅ Řešení

### 1. Oprava Error Handling v AuthContext.js

```javascript
// ✅ AFTER - Správně
catch (error) {
  // Rozpoznej skutečné AUTH errory (401/403) vs network errors
  const isAuthError = error.status === 401 || error.status === 403 || ...;
  const isNetworkError = error.message?.includes('fetch') || ...;
  
  if (isAuthError) {
    // Skutečný auth error → odhlásit
    console.warn('Token je neplatný (401/403) - odhlašuji');
    logout();
  } else if (isNetworkError) {
    // Network error → použij cached data, NEODHLAŠUJ
    console.warn('Network error - používám cached data');
    const storedDetail = await loadAuthData.userDetail();
    // ... load cached data
    setLoading(false);
    // ✅ NEZAVOL logout()
  } else {
    // Neznámá chyba → také použij cached data
    console.warn('Neznámá chyba - používám cached data');
    // ... load cached data
    setLoading(false);
  }
}
```

**Benefit**: Uživatel zůstane přihlášen i při network errors.

### 2. Oprava Broadcast LOGIN Handler

```javascript
// ✅ AFTER - Správně
case BROADCAST_TYPES.LOGIN:
  if (message.payload?.userId) {
    // Pokud je to jiný uživatel, reload
    if (user_id && message.payload.userId !== user_id) {
      window.location.reload();
      return;
    }
    
    // ✅ Pokud není nikdo přihlášen, načti data z localStorage
    if (!user_id || !token) {
      const storedUser = await loadAuthData.user();
      const storedToken = await loadAuthData.token();
      const storedDetail = await loadAuthData.userDetail();
      const storedPerms = await loadAuthData.userPermissions();
      
      if (storedUser && storedToken) {
        console.log('✅ Data načtena z localStorage po LOGIN broadcastu');
        setUser(storedUser);
        setToken(storedToken);
        setIsLoggedIn(true);
        setUserId(storedUser.id);
        // ... set detail & permissions
      }
    }
  }
  break;
```

**Benefit**: Nová záložka načte data z localStorage bez reload.

### 3. Přidání Broadcast Events v OrderForm25.js

```javascript
// ✅ Import
import { 
  broadcastDraftUpdated, 
  broadcastDraftDeleted, 
  broadcastOrderSaved 
} from '../utils/tabSync';

// ✅ Po uložení draftu
broadcastDraftUpdated(user_id, draftData);
broadcastOrderSaved(orderId, orderNumber);

// ✅ Po smazání draftu
broadcastDraftDeleted(user_id);
```

**Benefit**: Všechny záložky vidí změny v real-time.

### 4. Rozšíření Broadcast Listener v Layout.js

```javascript
// ✅ AFTER - Kompletní handler
useEffect(() => {
  const cleanup = onTabSyncMessage((message) => {
    switch (message.type) {
      case BROADCAST_TYPES.DRAFT_DELETED:
      case BROADCAST_TYPES.DRAFT_UPDATED:
      case BROADCAST_TYPES.ORDER_SAVED:
        if (message.payload?.userId === user_id) {
          console.log('📥 [Layout] Draft event received, updating UI');
          recalcHasDraft(); // ✅ Refresh menu bar
        }
        break;
    }
  });
  return cleanup;
}, [user_id, recalcHasDraft]);
```

**Benefit**: Menu bar se automaticky aktualizuje při změnách.

## 📊 Změny v souborech

| Soubor | Změny | Důvod |
|--------|-------|-------|
| `src/context/AuthContext.js` | Vylepšený error handling při validaci tokenu | Zabránit odhlášení při network errors |
| `src/context/AuthContext.js` | Vylepšený LOGIN broadcast handler | Načíst data místo reload |
| `src/components/Layout.js` | Rozšířený broadcast listener | Poslouchat DRAFT_UPDATED a ORDER_SAVED |
| `src/forms/OrderForm25.js` | Přidány broadcast funkce | Oznámit změny ostatním záložkám |
| `docs/features/MULTI-TAB-SESSION-MANAGEMENT.md` | Nová dokumentace | Best practices pro multi-tab |

## 🧪 Testování

### Test 1: Nová záložka
```
1. Přihlásit se v záložce A
2. Otevřít novou záložku B
3. ✅ Záložka B je automaticky přihlášená
```

### Test 2: F5 Refresh
```
1. Přihlásit se a vytvořit koncept
2. Stisknout F5
3. ✅ Zůstat přihlášen, koncept zůstane
```

### Test 3: Menu Bar Sync
```
1. Otevřít koncept v záložce A
2. Uložit změny v záložce B
3. ✅ Menu bar v záložce A se aktualizuje
```

### Test 4: Smazání konceptu
```
1. Otevřít koncept v 2 záložkách
2. Smazat koncept v záložce A
3. ✅ Menu bar v záložce B se změní na "Nová objednávka"
```

### Test 5: Odhlášení
```
1. Přihlášen ve 3 záložkách
2. Odhlásit se v záložce A
3. ✅ Všechny 3 záložky se odhlásí
```

## 📚 Best Practices

### ✅ DO
- Používat `localStorage` pro session data (sdílení mezi záložkami)
- Rozpoznat AUTH errors (401/403) vs network errors
- Posílat broadcast events při změnách stavu
- Poslouchat broadcast events v UI komponentách
- Testovat ve více záložkách a po F5

### ❌ DON'T
- Nepoužívat `sessionStorage` pro auth data (každá záložka vlastní session)
- Neodhlašovat při network errors
- Nedělat `window.location.reload()` když stačí načíst z localStorage
- Neposílat broadcast bez user_id (riziko cross-user leaks)

## 🔒 Bezpečnost

### Zachováno
- ✅ Token expiration (24h)
- ✅ Šifrování citlivých dat (Web Crypto API)
- ✅ User data isolation (per user_id)
- ✅ Auto-cleanup při změně uživatele

### Vylepšeno
- ✅ Network error tolerance (cached data)
- ✅ Broadcast security (user_id filtering)
- ✅ Cross-tab synchronization

## 🎉 Výsledek

**BEFORE**:
- ❌ Odhlášení v nové záložce
- ❌ Odhlášení po F5
- ❌ Menu bar se neaktualizoval

**AFTER**:
- ✅ Session funguje ve všech záložkách
- ✅ F5 refresh zachová přihlášení
- ✅ Menu bar se automaticky synchronizuje
- ✅ Real-time aktualizace mezi záložkami

---

**Datum**: 15. října 2025  
**Status**: ✅ Implementováno a otestováno  
**Related docs**: [MULTI-TAB-SESSION-MANAGEMENT.md](./MULTI-TAB-SESSION-MANAGEMENT.md)
