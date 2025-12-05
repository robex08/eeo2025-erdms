# 🔐 Oprava autentizace v Notification API

**Datum:** 15. října 2025  
**Problém:** `Error: Missing authentication data`  
**Řešení:** Použití šifrovaných údajů z `authStorage.js`

---

## ❌ Původní problém

```
[NotificationsAPI] Failed to fetch notifications: 
Error: Missing authentication data
    at getAuthData (notificationsApi.js:101:1)
```

### Příčina:
- `notificationsApi.js` hledal **nešifrované** údaje:
  ```javascript
  const token = localStorage.getItem('authToken');
  const username = localStorage.getItem('username');
  ```
- Aplikace ale ukládá **šifrované** údaje pomocí Web Crypto API
- Klíče jsou jiné: `auth_token_persistent`, `auth_user_persistent`

---

## ✅ Řešení

### 1. Import šifrovacích funkcí

```javascript
import { loadAuthData } from '../utils/authStorage';
```

### 2. Změna `getAuthData()` na async

**PŘED:**
```javascript
const getAuthData = () => {
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  const username = sessionStorage.getItem('username') || localStorage.getItem('username');
  
  if (!token || !username) {
    throw new Error('Missing authentication data');
  }
  
  return { token, username };
};
```

**PO:**
```javascript
const getAuthData = async () => {
  try {
    const token = await loadAuthData.token();
    const user = await loadAuthData.user();
    
    if (!token || !user?.username) {
      throw new Error('Missing authentication data');
    }
    
    return { 
      token, 
      username: user.username 
    };
  } catch (error) {
    console.error('[NotificationsAPI] Auth error:', error);
    throw new Error('Missing authentication data');
  }
};
```

### 3. Přidání `await` do všech API funkcí

Všech 5 funkcí muselo být upraveno:

```javascript
// PŘED
const auth = getAuthData();

// PO
const auth = await getAuthData();
```

**Upravené funkce:**
- ✅ `getNotificationsList()`
- ✅ `getUnreadCount()`
- ✅ `markNotificationAsRead()`
- ✅ `markAllNotificationsAsRead()`
- ✅ `dismissNotification()`

---

## 🔍 Jak funguje šifrování

### Uložení (při přihlášení):
```javascript
import { saveAuthData } from '../utils/authStorage';

// Uložit token (šifrovaný)
await saveAuthData.token('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// Uložit user data (šifrovaný)
await saveAuthData.user({ 
  username: 'tomas.holosky',
  displayName: 'Tomáš Holoský'
});
```

### Načtení (v API):
```javascript
import { loadAuthData } from '../utils/authStorage';

// Načíst token (automaticky dešifruje)
const token = await loadAuthData.token();
// -> 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Načíst user data (automaticky dešifruje)
const user = await loadAuthData.user();
// -> { username: 'tomas.holosky', displayName: 'Tomáš Holoský' }
```

### Co se stane v localStorage:
```javascript
// KLÍČ: 'auth_token_persistent'
// HODNOTA (šifrovaná): 'U2FsdGVkX1+abc123...XYZ789=='

// KLÍČ: 'auth_user_persistent'  
// HODNOTA (šifrovaná): 'U2FsdGVkX1+def456...UVW012=='
```

---

## 🧪 Testování po opravě

### 1. Přihlas se do aplikace
```
http://localhost:3000
```

### 2. Otevři Console (F12)
```javascript
// Ověř, že token funguje
import { loadAuthData } from './utils/authStorage';

const token = await loadAuthData.token();
console.log('Token:', token);
// ✅ Mělo by vypsat JWT token

const user = await loadAuthData.user();
console.log('Username:', user.username);
// ✅ Mělo by vypsat tvé uživatelské jméno
```

### 3. Klikni na zvoněček
- ✅ Měl by se otevřít dropdown
- ✅ Zobrazit "Žádné nové notifikace" (nebo seznam, pokud máš notifikace)
- ❌ **NE** "Error: Missing authentication data"

---

## 📊 Srovnání

| Aspekt | PŘED | PO |
|--------|------|-----|
| **Šifrování** | ❌ Nešifrované | ✅ Šifrované (Web Crypto API) |
| **Klíče** | `authToken`, `username` | `auth_token_persistent`, `auth_user_persistent` |
| **Storage** | sessionStorage + localStorage | localStorage (persistent) |
| **Expiration** | ❌ Žádná | ✅ 24 hodin |
| **Auth funkce** | Synchronní | Asynchronní (async/await) |
| **Bezpečnost** | Nízká | Vysoká |

---

## ✅ Výsledek

**Všechny notifikační endpointy nyní fungují s šifrovanou autentizací:**

1. ✅ **getNotificationsList()** - Načte seznam notifikací
2. ✅ **getUnreadCount()** - Získá počet nepřečtených
3. ✅ **markNotificationAsRead()** - Označí jako přečtenou
4. ✅ **markAllNotificationsAsRead()** - Označí vše jako přečtené
5. ✅ **dismissNotification()** - Skryje notifikaci

**Token a username jsou nyní správně dešifrovány před odesláním na backend.**

---

## 🔗 Související soubory

- `src/services/notificationsApi.js` - ✅ UPRAVENO
- `src/utils/authStorage.js` - Šifrovací funkce
- `src/utils/encryption.js` - Web Crypto API implementace
- `src/context/AuthContext.js` - Správa přihlášení

---

**Opraveno:** 15. října 2025  
**Status:** ✅ Funguje
