# 🔄 Token Refresh Implementation - 12h Token Lifetime

**Datum implementace:** 29. ledna 2026  
**Verze:** 2.20-DEV  
**Status:** ✅ Implementováno

---

## 📋 Co bylo provedeno

### 1. ✅ Zkrácení token expiry z 24h na 12h

**Upravené soubory:**

#### Frontend:
- `/apps/eeo-v2/client/src/utils/authStorage.js`
  - `TOKEN_EXPIRY_HOURS = 12` (bylo 24)
  
- `/apps/eeo-v2/client/src/utils/authStorageIncognito.js`
  - Token expiry: `12h` (bylo 24h)

#### Backend:
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php`
  - `TOKEN_LIFETIME = 12 * 3600` (bylo 24 * 3600)
  - `TOKEN_REFRESH_THRESHOLD = 10 * 60` (bylo 2 * 3600)

**Důvod:**
- ✅ Vyšší bezpečnost (kratší okno pro útok)
- ✅ 12h pokrývá pracovní dobu + buffer
- ✅ Auto-refresh zajistí, že uživatel nebude odhlášen

---

### 2. ✅ Token Refresh Service

**Nový soubor:** `/apps/eeo-v2/client/src/utils/tokenRefresh.js`

**Funkce:**
- ⏱️ Automatický refresh **10 minut** před expirací tokenu
- 🔄 Silent refresh (na pozadí bez zásahu uživatele)
- 🎯 Singleton pattern (jedna instance v celé aplikaci)
- 📡 Event-driven (broadcastuje `tokenRefreshed`, `authError`)
- 🛡️ Prevention proti concurrent refreshes

**API:**
```javascript
import { tokenRefreshService } from '../utils/tokenRefresh';

// Start timer (volá se automaticky po login)
tokenRefreshService.startRefreshTimer(expiresAt);

// Stop timer (volá se automaticky při logout)
tokenRefreshService.stopRefreshTimer();

// Manuální refresh (pro emergency)
await tokenRefreshService.manualRefresh();
```

**Timeline:**
```
0min ─────────────────────────────────────────────────────── 12h (720min)
 ↑                                              ↑             ↑
Login                                      Refresh       Token expires
                                          (710min)
                                      10 min před expirací
```

---

### 3. ✅ PHP Backend Endpoint

**Nová funkce:** `handle_token_refresh()` v handlers.php (před handle_user_detail)

**Endpoint:** `POST /api.eeo/token-refresh`

**Request:**
```json
{
  "username": "testuser",
  "old_token": "dGVzdHVzZXJ8MTczMzQwMDAwMA=="
}
```

**Response (úspěch):**
```json
{
  "token": "dGVzdHVzZXJ8MTczMzQwNTAwMA==",
  "expires_at": "2026-01-30 14:30:00",
  "message": "Token refreshed successfully",
  "lifetime_seconds": 43200
}
```

**Response (error):**
```json
{
  "err": "Neplatný nebo expirovaný token",
  "code": "INVALID_TOKEN"
}
```

**Registrace v api.php:**
```php
case 'token-refresh':
    if ($request_method === 'POST') {
        handle_token_refresh($input, $config, $queries);
    }
    break;
```

**Bezpečnost:**
- ✅ Ověření starého tokenu přes `verify_token()`
- ✅ Kontrola shody username
- ✅ Generování nového tokenu s aktuálním timestampem
- ✅ HTTP status codes (400, 401, 500)

---

### 4. ✅ Integrace do AuthContext

**Soubor:** `/apps/eeo-v2/client/src/context/AuthContext.js`

**Změny:**

#### Import:
```javascript
import { tokenRefreshService } from '../utils/tokenRefresh';
```

#### Login flow:
```javascript
// Po úspěšném login
setIsLoggedIn(true);

// Start refresh timer
const expiresAt = Date.now() + (12 * 60 * 60 * 1000);
tokenRefreshService.startRefreshTimer(expiresAt);
```

#### Page reload flow:
```javascript
// Po validaci existujícího tokenu
setIsLoggedIn(true);

// Start refresh timer i při reload
tokenRefreshService.startRefreshTimer(expiresAt);
```

#### Logout flow:
```javascript
const logout = useCallback((reason, skipBroadcast) => {
  // Stop refresh timer
  tokenRefreshService.stopRefreshTimer();
  
  // ... zbytek logout logiky
});
```

---

## 🔍 Jak to funguje

### Scénář 1: Normální login

```
1. Uživatel se přihlásí (username/password)
   ↓
2. Backend vygeneruje token (12h expiry)
   ↓
3. Frontend uloží token do localStorage
   ↓
4. AuthContext spustí tokenRefreshService.startRefreshTimer()
   ↓
5. Timer čeká 11h 50min (10 min před expirací)
   ↓
6. Automaticky zavolá /api.eeo/token-refresh
   ↓
7. Backend ověří starý token a vydá nový
   ↓
8. Frontend uloží nový token
   ↓
9. Naplánuje další refresh za 11h 50min
   ↓
10. Uživatel zůstane přihlášen ✅
```

### Scénář 2: Page reload (F5)

```
1. Uživatel refreshne stránku
   ↓
2. AuthContext načte token z localStorage
   ↓
3. Validuje token voláním getUserDetail
   ↓
4. Pokud je token platný → setIsLoggedIn(true)
   ↓
5. Spustí tokenRefreshService.startRefreshTimer()
   ↓
6. Timer pokračuje normálně
```

### Scénář 3: Token brzy vyprší

```
1. Token byl vytvořen před 11h 55min
   ↓
2. startRefreshTimer() zjistí, že zbývá < 10 min
   ↓
3. Spustí okamžitý refresh (1s delay)
   ↓
4. Získá nový token
   ↓
5. Uživatel si nevšimne nic ✅
```

### Scénář 4: Refresh selže

```
1. Token refresh API call vrátí 401
   ↓
2. tokenRefreshService vyvolá event 'authError'
   ↓
3. App.js zachytí event
   ↓
4. Zobrazí toast: "Session expired. Please log in again."
   ↓
5. Logout → redirect na login
```

---

## 🧪 Testování

### Manuální test:

```javascript
// V browser console:

// 1. Zkontroluj timer
console.log(tokenRefreshService);

// 2. Manuální refresh (emergency test)
await tokenRefreshService.manualRefresh();

// 3. Poslouchej eventy
window.addEventListener('tokenRefreshed', (e) => {
  console.log('✅ Token refreshed:', e.detail);
});

window.addEventListener('authError', (e) => {
  console.log('❌ Auth error:', e.detail);
});
```

### Automated test scénáře:

**Test 1: Normal refresh after 11h 50min**
- Login → Počkej 11h 50min → Měl by se volat refresh

**Test 2: Refresh with expired token**
- Vytvoř token starý 13h → refresh by měl selhat → logout

**Test 3: Multiple tabs**
- Otevři 2 záložky → Login v jedné → Obě by měly zůstat přihlášeny

**Test 4: Network error during refresh**
- Odpoj síť během refreshe → Mělo by zobrazit error

---

## 📊 Monitoring

### Logy k sledování:

**Frontend (dev console):**
```
🔄 Token refresh timer started
🔄 Token refresh naplánován za 710 minut
📅 Token vyprší: 30. 1. 2026 14:30:00
🔄 Spouštím token refresh...
✅ Token refreshed successfully
📅 Nový token vyprší: za 12h
```

**Backend (PHP error log):**
```
Token refresh: username=testuser, old_token_valid=yes, new_token_generated
```

### Chybové stavy:

**Missing auth data:**
```
❌ Token refresh failed: Missing auth data for refresh
```

**Server error:**
```
❌ Token refresh failed: Token refresh failed: 500
```

**Network error:**
```
❌ Token refresh failed: fetch failed
```

---

## 🚀 Deployment

### DEV prostředí:
```bash
# Již implementováno v feature branch
git status
git diff apps/eeo-v2/client/src/utils/
git diff apps/eeo-v2/api-legacy/
```

### PROD deployment:
```bash
# 1. Build frontend
cd dashboard
npm run build-eeo-v2

# 2. Copy files
# Frontend je již zbuildován
# Backend (PHP) se nasadí automaticky

# 3. Test
curl -X POST https://erdms.zachranka.cz/api.eeo/token-refresh \
  -H "Content-Type: application/json" \
  -d '{"username":"test","old_token":"..."}'
```

---

## 🔒 Bezpečnostní poznámky

### ✅ Co je bezpečné:

1. **Kratší token lifetime (12h)** - menší okno pro útok
2. **Auto-refresh na pozadí** - uživatel nemusí znát token
3. **Validace starého tokenu** - nelze získat nový token bez platného starého
4. **Username matching** - token nelze použít pro jiného uživatele
5. **HTTP-only cookies** (budoucnost - pro session ID)

### ⚠️ Co by se mělo zlepšit:

1. **Token rotation** - každý refresh by měl invalidovat starý token
2. **Refresh token** - oddělit access token (krátký) a refresh token (dlouhý)
3. **Rate limiting** - omezit počet refresh requestů
4. **Audit log** - logovat všechny refresh events do DB
5. **Device fingerprinting** - detekovat změnu zařízení

---

## 📝 Poznámky k údržbě

### Změna refresh intervalu:

**Frontend:** `utils/tokenRefresh.js`
```javascript
const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000; // 10 minut
// Změň na 5 min: 5 * 60 * 1000
```

**Backend:** `handlers.php`
```php
define('TOKEN_REFRESH_THRESHOLD', 10 * 60); // 10 minut
```

### Změna token lifetime:

**Frontend:** `utils/authStorage.js`
```javascript
const TOKEN_EXPIRY_HOURS = 12; // 12 hodin
```

**Backend:** `handlers.php`
```php
define('TOKEN_LIFETIME', 12 * 3600); // 12 hodin
```

**⚠️ DŮLEŽITÉ:** Frontend a backend musí mít STEJNOU hodnotu!

---

## 🐛 Known Issues

### Issue 1: Timer není přesný po hibernaci
**Problém:** Pokud uživatel přepne laptop do sleep mode, timer se může zpozdit  
**Řešení:** Kontrolovat čas při každém page focus event

### Issue 2: Concurrent refreshes
**Problém:** Více záložek může spustit refresh současně  
**Řešení:** `isRefreshing` flag preventuje concurrent calls

### Issue 3: Token expiry tracking
**Problém:** Při page reload nevíme přesný čas expirace tokenu  
**Řešení:** Uložit `expires_at` do localStorage (TODO)

---

## ✅ Checklist pro testování

- [ ] Login → Timer se spustí
- [ ] Page reload → Timer se spustí znovu
- [ ] Logout → Timer se zastaví
- [ ] Refresh after 11h 50min → Nový token
- [ ] Expired token refresh → Error + logout
- [ ] Multiple tabs → Všechny refreshují
- [ ] Network error → Graceful handling
- [ ] Manual refresh → Funguje

---

## 📞 Support

Pokud narazíte na problémy:

1. Zkontrolujte browser console (dev tools)
2. Zkontrolujte PHP error log: `/var/log/apache2/erdms-dev-php-error.log`
3. Ověřte, že token-refresh endpoint funguje: `curl -X POST ...`
4. Zkontrolujte localStorage: `localStorage.getItem('auth_token_persistent')`

---

**Implementováno:** ✅  
**Otestováno v DEV:** ⏳ (potřeba testovat)  
**Ready for PROD:** ❌ (po testování v DEV)
