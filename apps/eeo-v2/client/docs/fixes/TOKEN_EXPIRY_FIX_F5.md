# 🔐 FIX: Token vyprší po F5 (náhodné odhlášení)

**Datum:** 8. února 2026  
**Problém:** Když uživatel dá F5 (refresh stránky), někdy se vymaže token a musí se znovu přihlásit.

---

## 🐛 PŮVODNÍ PROBLÉM

### Symptomy:
- ✅ Přihlásíš se do aplikace
- ✅ Pracuješ normálně
- ❌ Dáš F5 → **NÁHODNĚ** se objeví login page
- ❌ Musíš se znovu přihlásit

### Root Cause:

**1. Krátká expirace tokenu (12 hodin)**
```javascript
// authStorage.js - PŮVODNÍ KÓD
const TOKEN_EXPIRY_HOURS = 12; // 12 hodin ❌
```

**Důsledek:**
- Přihlásíš se v 10:00
- Po 22:00 (12h) token expiruje
- Při F5 se token smaže → logout

---

**2. Přísná kontrola expirace (bez tolerance)**
```javascript
// authStorage.js - PŮVODNÍ KÓD
if (tokenData.expires && Date.now() > tokenData.expires) {
  localStorage.removeItem(PERSISTENT_KEYS.TOKEN); // ❌ Okamžitě smazán
  return null;
}
```

**Problém:**
- Pokud server a klient mají mírně rozdílný čas (±5 min)
- Token může být považován za expirovaný dříve

---

**3. Předčasný logout v AuthContext**
```javascript
// AuthContext.js - PŮVODNÍ KÓD
const tokenData = await loadAuthData.token();
if (!tokenData) {
  logout('token_missing'); // ❌ Logout bez debug logu
  return;
}
```

**Problém:**
- Pokud loadAuthData.token() vrátí `null` (např. kvůli chybě při dešifrování)
- Okamžitě logout bez jakéhokoliv warning/debug logu

---

## ✅ ŘEŠENÍ

### Změna 1: Prodloužení expirace na 7 dní

```diff
// /var/www/erdms-dev/apps/eeo-v2/client/src/utils/authStorage.js

- const TOKEN_EXPIRY_HOURS = 12; // 12 hodin ❌
+ const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 dní (168 hodin) ✅
```

**Benefit:**
- Token vydrží celý týden místo půl dne
- Uživatel se nemusí přihlašovat každý den

---

### Změna 2: Tolerance window pro expiraci (1 hodina)

```diff
// /var/www/erdms-dev/apps/eeo-v2/client/src/utils/authStorage.js

- // Zkontroluj expiraci
- if (tokenData && tokenData.expires && Date.now() > tokenData.expires) {
-   localStorage.removeItem(PERSISTENT_KEYS.TOKEN);
-   return null;
- }

+ // Zkontroluj expiraci - s 1h tolerance window
+ const TOLERANCE_MS = 60 * 60 * 1000; // 1 hodina
+ if (tokenData && tokenData.expires) {
+   const timeLeft = tokenData.expires - Date.now();
+   if (timeLeft < -TOLERANCE_MS) {
+     // Token expiroval před více než hodinou → smazat
+     if (process.env.NODE_ENV === 'development') {
+       console.warn('🔐 Token expiroval před', Math.floor(-timeLeft / (1000 * 60)), 'minutami → smazán');
+     }
+     localStorage.removeItem(PERSISTENT_KEYS.TOKEN);
+     return null;
+   } else if (timeLeft < 0) {
+     // Token expiroval, ale v rámci tolerance → použít
+     if (process.env.NODE_ENV === 'development') {
+       console.warn('🔐 Token expiroval, ale v rámci tolerance window → používám');
+     }
+   }
+ }
```

**Benefit:**
- Pokud token expiroval před 10 minutami → stále funguje (grace period)
- Eliminuje false positives kvůli časovým rozdílům server/klient

---

### Změna 3: Debug logy pro diagnostiku

```diff
// /var/www/erdms-dev/apps/eeo-v2/client/src/context/AuthContext.js

try {
  const tokenData = await loadAuthData.token();
  if (!tokenData) {
+   if (process.env.NODE_ENV === 'development') {
+     console.warn('🔐 Token chybí v localStorage při page load → logout');
+   }
    logout('token_missing');
    setLoading(false);
    return;
  }
+   if (process.env.NODE_ENV === 'development') {
+     console.log('✅ Token nalezen v localStorage → pokračuji s API validací');
+   }
} catch (tokenCheckError) {
  console.warn('⚠️ Chyba při kontrole lokální expirace tokenu:', tokenCheckError);
}
```

**Benefit:**
- V development módu uvidíš v console **PŘESNĚ** proč došlo k logout
- Snazší debugging dalších potenciálních problémů

---

## 🧪 TESTOVÁNÍ

### Před deploymentem otestuj:

1. **Test normálního F5:**
   ```
   ✅ Přihlaš se
   ✅ Dej F5
   ✅ Měl bys zůstat přihlášený
   ```

2. **Test expirace po 7 dnech:**
   ```
   ⚠️ Simulace: Změň v localStorage expires na minulost
   ✅ Dej F5
   ✅ Měl bys být odhlášen s warning logem
   ```

3. **Test tolerance window:**
   ```
   ⚠️ Změň expires na před 30 minutami
   ✅ Dej F5
   ✅ Měl bys zůstat přihlášený (v rámci tolerance)
   ```

---

## 🔍 DEBUG SCRIPT (Pro browser console)

Pokud se problém opakuje, zkopíruj tento kód do browser console:

```javascript
// 🔍 DEBUG: Kontrola tokenu v localStorage
const PERSISTENT_KEYS = { TOKEN: 'auth_token_persistent' };

try {
  const stored = localStorage.getItem(PERSISTENT_KEYS.TOKEN);
  if (!stored) {
    console.log('❌ Žádný token v localStorage');
  } else {
    console.log('✅ Token nalezen, délka:', stored.length);
    
    // Zkus parsovat
    try {
      const tokenData = JSON.parse(stored);
      const now = Date.now();
      const expires = tokenData.expires;
      
      if (expires) {
        const timeLeft = expires - now;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const daysLeft = Math.floor(hoursLeft / 24);
        
        console.log('⏰ Expirace:', new Date(expires).toLocaleString('cs-CZ'));
        console.log('⏳ Zbývá:', daysLeft, 'dní,', hoursLeft % 24, 'hodin,', minutesLeft, 'minut');
        
        if (timeLeft < 0) {
          console.log('❌ TOKEN JE EXPIROVANÝ!');
          const minutesAgo = Math.floor(-timeLeft / (1000 * 60));
          console.log('   Expiroval před', minutesAgo, 'minutami');
        } else {
          console.log('✅ Token je platný');
        }
      } else {
        console.log('⚠️ Token nemá expires field');
      }
    } catch (e) {
      console.log('⚠️ Token není JSON nebo je zašifrovaný:', e.message);
      console.log('🔍 První znaky:', stored.substring(0, 50) + '...');
    }
  }
  
  // Zkontroluj i user data
  const user = localStorage.getItem('auth_user_persistent');
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('👤 User:', userData.username, '(ID:', userData.id + ')');
    } catch (e) {
      console.log('⚠️ User data nejsou parsovatelná');
    }
  }
} catch (e) {
  console.log('❌ Chyba:', e.message);
}
```

**Co tento script dělá:**
- ✅ Kontroluje přítomnost tokenu v localStorage
- ✅ Parsuje token a zobrazuje expiraci
- ✅ Počítá přesně kolik času zbývá
- ✅ Upozorní, pokud token už expiroval
- ✅ Zobrazí user info

---

## 📊 TIMELINE EXPIRACE

### Původní nastavení (12 hodin):
```
10:00 - Přihlášení
22:00 - Token expiruje ❌
22:01 - F5 → Logout ❌
```

### Nové nastavení (7 dní):
```
Pondělí 10:00 - Přihlášení
Pondělí 22:00 - Stále přihlášen ✅
Úterý celý den - Stále přihlášen ✅
...
Pondělí 10:00 (za týden) - Token expiruje
Pondělí 11:00 - F5 → Logout (ale s 1h tolerance ještě funguje!)
```

---

## 🚀 DEPLOYMENT

### Produkční build:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev  # Test v dev módu
npm run build:prod # Produkce
```

### Restart:
```bash
systemctl reload apache2
```

---

## 📝 POZNÁMKY

1. **Token refresh:**
   - Token se stále automaticky refreshuje každých 10 minut (tokenRefreshService)
   - Expirace 7 dní je pouze fallback, pokud refresh selže

2. **Bezpečnost:**
   - Token je stále šifrovaný v localStorage (Web Crypto API)
   - 7 dní je přijatelné pro interní aplikace
   - Pro vyšší bezpečnost lze snížit na 24-48 hodin

3. **Multi-tab sync:**
   - Token se sdílí mezi záložkami přes localStorage
   - Logout v jedné záložce odhlásí všechny ostatní (BroadcastChannel)

---

## ✅ CHECKLIST

- [x] Zvýšena expirace z 12h na 7 dní
- [x] Přidán tolerance window (1 hodina)
- [x] Přidány debug logy pro diagnostiku
- [x] Vytvořen debug script pro browser console
- [x] Dokumentace vytvořena
- [ ] Testováno v development módu
- [ ] Testováno v production módu
- [ ] User feedback po 1 týdnu provozu

---

## 🔗 SOUVISEJÍCÍ SOUBORY

- [/var/www/erdms-dev/apps/eeo-v2/client/src/utils/authStorage.js](../utils/authStorage.js)
- [/var/www/erdms-dev/apps/eeo-v2/client/src/context/AuthContext.js](../context/AuthContext.js)
- [SESSIONSTORAGE_MIGRATION.md](./SESSIONSTORAGE_MIGRATION.md)
- [INCOGNITO-NETWORK-ERROR-FIX.md](./INCOGNITO-NETWORK-ERROR-FIX.md)
