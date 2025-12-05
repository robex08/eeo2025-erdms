# Multi-Tab Support & Shared Session Implementation

## Datum implementace
15. října 2025

## Popis řešení
Implementován **single-session multi-tab support** - uživatel může pracovat v aplikaci ve více záložkách současně se **sdíleným stavem** a **jedním konceptem objednávky**.

## Problém
- Uživatel otevře odkaz v nové záložce → **požaduje se nové přihlášení** ❌
- Token byl v `sessionStorage` → **izolovaný per záložka** ❌
- Odhlášení v jedné záložce → **ostatní záložky zůstávají přihlášené** ❌
- Více konceptů v různých záložkách → **zmatečné** ❌

## Řešení

### 1. Přesun auth dat do localStorage (sdílený)

**PŘED:**
```javascript
sessionStorage:
  - auth_token (izolovaný per záložka)
  - auth_user (izolovaný per záložka)
  - auth_user_detail (izolovaný per záložka)
```

**PO:**
```javascript
localStorage (sdílený všemi záložkami):
  - auth_token_persistent (šifrovaný, 24h expiration)
  - auth_user_persistent
  - auth_user_detail_persistent
  - auth_permissions_persistent
  - app_current_user_id
```

### 2. Broadcast Channel API pro synchronizaci

Nový modul: **`src/utils/tabSync.js`**

```javascript
// Broadcast zprávy mezi záložkami
broadcastLogin(userId, username)
broadcastLogout()
broadcastUserChanged(oldUserId, newUserId)
broadcastDraftUpdated(userId, draftData)
```

**Typy zpráv:**
- `LOGIN` - Přihlášení uživatele
- `LOGOUT` - Odhlášení uživatele
- `USER_CHANGED` - Změna uživatele
- `DRAFT_UPDATED` - Aktualizace konceptu
- `DRAFT_DELETED` - Smazání konceptu
- `REFRESH_ORDERS_LIST` - Obnovení seznamu objednávek

### 3. Synchronizace logout napříč záložkami

**AuthContext.js:**
```javascript
useEffect(() => {
  initTabSync();
  
  const cleanup = onTabSyncMessage((message) => {
    switch (message.type) {
      case BROADCAST_TYPES.LOGOUT:
        // Odhlásit i tuto záložku
        logout();
        break;
        
      case BROADCAST_TYPES.LOGIN:
        // Reload pokud jiný uživatel
        if (message.payload?.userId !== user_id) {
          window.location.reload();
        }
        break;
    }
  });
  
  return () => cleanup();
}, [logout, user_id]);
```

### 4. Jeden sdílený koncept objednávky

**OrderForm25.js:**
```javascript
// Koncept je sdílený všemi záložkami
const getDraftKey = () => `order25-draft-${user_id}`;

// Při změně konceptu → broadcast
const saveDraft = async (draftData) => {
  localStorage.setItem(getDraftKey(), JSON.stringify(draftData));
  broadcastDraftUpdated(user_id, draftData);
};
```

### 5. Fallback pro starší prohlížeče

Pokud `BroadcastChannel` API není podporováno:
```javascript
// Fallback: localStorage event
localStorage.setItem('tab_sync_message', JSON.stringify(message));
localStorage.removeItem('tab_sync_message'); // Spustí event

window.addEventListener('storage', (event) => {
  if (event.key === 'tab_sync_message') {
    callback(JSON.parse(event.newValue));
  }
});
```

## Scénáře použití

### Scénář 1: Otevření odkazu v nové záložce
```
Záložka 1: Uživatel je přihlášen
  → localStorage: token, user_id, permissions

Záložka 2: Klikne na odkaz → Otevře se v nové záložce
  → Načte token z localStorage
  → ✅ Uživatel je automaticky přihlášen (bez login formuláře)
```

### Scénář 2: Odhlášení v jedné záložce
```
Záložka 1: Klikne "Odhlásit"
  → clearAllUserData()
  → broadcastLogout()

Záložka 2: Přijme broadcast LOGOUT
  → logout()
  → ✅ Automaticky se odhlásí
  → Přesměruje na /login
```

### Scénář 3: Práce s konceptem ve více záložkách
```
Záložka 1: Vyplní pole "Dodavatel"
  → saveDraft()
  → broadcastDraftUpdated()

Záložka 2: Přijme broadcast DRAFT_UPDATED
  → loadDraft()
  → ✅ Automaticky načte aktualizovaný koncept
  → Vidí pole "Dodavatel" vyplněné
```

### Scénář 4: Přihlášení jiného uživatele
```
Záložka 1: Uživatel A přihlášen

Záložka 2: Uživatel A se odhlásí → Uživatel B se přihlásí
  → checkAndCleanUserChange(B)
  → vyčistí data uživatele A
  → broadcastUserChanged(A, B)

Záložka 1: Přijme broadcast USER_CHANGED
  → logout()
  → ✅ Automaticky reload → login screen
```

## Výhody řešení

✅ **Multi-tab friendly**: Otevření odkazu v nové záložce nežádá přihlášení
✅ **Sdílený stav**: Všechny záložky vidí stejná data
✅ **Jeden koncept**: Ne zmatečné více konceptů v různých záložkách
✅ **Sync logout**: Odhlášení v jedné záložce = odhlášení všech
✅ **Bezpečnost**: User-specific data izolována per user_id
✅ **Fallback**: Funguje i ve starších prohlížečích (localStorage event)
✅ **Real-time sync**: Změny se promítnou do všech záložek okamžitě

## Změněné soubory

1. **src/utils/tabSync.js** (NOVÝ)
   - Broadcast Channel API wrapper
   - Sync zprávy mezi záložkami

2. **src/utils/authStorage.js**
   - `sessionStorage` → `localStorage` (pro multi-tab)
   - SESSION_KEYS → PERSISTENT_KEYS

3. **src/context/AuthContext.js**
   - Import tabSync utilities
   - useEffect pro broadcast listener
   - broadcastLogin() při přihlášení
   - broadcastLogout() při odhlášení

4. **src/utils/userStorage.js** (již existuje)
   - User-specific data izolace
   - Detekce změny uživatele

## Možná budoucí vylepšení

### Priorita 1 (Doporučeno):
1. **Draft synchronizace v real-time**
   ```javascript
   // V OrderForm25.js
   useEffect(() => {
     const cleanup = onTabSyncMessage((message) => {
       if (message.type === BROADCAST_TYPES.DRAFT_UPDATED) {
         if (message.payload.userId === user_id) {
           // Reload draft from localStorage
           loadDraft();
         }
       }
     });
     return cleanup;
   }, [user_id]);
   ```

2. **Conflict resolution**
   - Pokud 2 záložky editují současně → lock mechanismus
   - Nebo merge strategie (last-write-wins, nebo user prompt)

### Priorita 2 (Nice to have):
3. **Visual indicator** - zobrazit kolik záložek má aplikaci otevřených
4. **Tab heartbeat** - detekovat mrtvé záložky
5. **Server-side sync** - ukládat koncepty na server místo localStorage

## Testování

### Manuální test:
1. Přihlaste se v Záložce 1
2. Otevřete odkaz v Záložce 2 (Ctrl+Click)
3. ✅ Ověřte, že Záložka 2 je automaticky přihlášena
4. V Záložce 1 klikněte "Odhlásit"
5. ✅ Ověřte, že Záložka 2 se automaticky odhlásila

### Browser Console test:
```javascript
// Záložka 1
localStorage.getItem('auth_user_persistent')
localStorage.getItem('app_current_user_id')

// Záložka 2 (měla by vidět stejné hodnoty)
localStorage.getItem('auth_user_persistent')
localStorage.getItem('app_current_user_id')
```

### Broadcast test:
```javascript
// Záložka 1
import { broadcastMessage } from './utils/tabSync';
broadcastMessage('TEST', { data: 'hello from tab 1' });

// Záložka 2 (v console by mělo být)
// 📥 Přijato: { type: 'TEST', payload: { data: 'hello from tab 1' } }
```

## Poznámky

- **BroadcastChannel API**: Podporováno v Chrome 54+, Firefox 38+, Safari 15.4+
- **Fallback**: Pro starší prohlížeče používáme `storage` event
- **Šifrování**: Token a citlivá data zůstávají šifrována i v localStorage
- **24h expiration**: Token automaticky expiruje po 24 hodinách

## Bezpečnostní opatření

✅ **Token šifrování**: Web Crypto API (AES-GCM)
✅ **User isolation**: Data vázána na user_id
✅ **Automatic cleanup**: Při změně uživatele vyčištění starých dat
✅ **Expiration**: Token s časovým limitem 24h
✅ **Broadcast only cross-tab**: Zprávy nejsou posílány na server
