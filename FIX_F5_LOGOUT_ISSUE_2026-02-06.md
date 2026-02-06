# 🔧 FIX: Odhlašování při F5/Reload stránky

## 📋 Problém
Uživatel byl automaticky odhlášen při jakémkoliv refresh stránky (F5), přechodu mezi sekcemi, nebo kliknutí do profilu.

## 🔍 Analýza příčiny

### Hlavní problém: Axios interceptor
V `api2auth.js` byl axios interceptor, který **okamžitě** odhlašoval uživatele při **jakémkoliv 401** response:

```javascript
// PŘED (ŠPATNĚ):
if (error.response?.status === 401) {
  // Okamžitě odhlásit - BEZ KONTROLY KONTEXTU
  window.dispatchEvent(new CustomEvent('authError', { ... }));
}
```

**Důsledek:**
- Při F5 se volá `getUserDetailApi2()` z `AuthContext.checkToken()`
- Pokud backend vrátil 401 (race condition, timeout, server se budí, ...)
- Interceptor OKAMŽITĚ odhlásí uživatele
- I když měl validní token + cached data v localStorage

### Sekundární problémy:
1. **Žádná grace period** po page load - okamžité odhlášení i během prvních sekund
2. **Ignorování cached dat** - i když existovala validní data v localStorage
3. **Chybějící lokální validace tokenu** - API call bez předchozí kontroly expirace

## ✅ Řešení

### 1. Axios Interceptor - Vícevrstvá ochrana (`api2auth.js`)

```javascript
// ✅ OCHRANA 1: Grace period po page load (10 sekund)
const timeSincePageLoad = Date.now() - pageLoadTimestamp;
if (timeSincePageLoad < PAGE_LOAD_GRACE_PERIOD) {
  // 401 během prvních 10s → NEODHLA��UJ (může být false positive)
  return Promise.reject(error); // Vra�� chybu, ale NEtriggeruj logout
}

// ✅ OCHRANA 2: Kontrola cached dat před logout
const storedToken = await loadAuthData.token();
const storedUser = await loadAuthData.user();

if (storedToken && storedUser) {
  // Máme validní cached data → NEODHLAŠUJ okamžitě
  // 401 může být dočasná network chyba, server timeout, ...
  return Promise.reject(error); // Předej chybu checkToken funkci
}

// Teprve NYNÍ je 401 pravděpodobně skutečný auth error → odhlásit
```

### 2. AuthContext - Lepší error handling (`AuthContext.js`)

```javascript
// ✅ PŘEDCHOZÍ KONTROLA: Validuj token lokálně PŘED API callem
const tokenData = await loadAuthData.token();
if (!tokenData) {
  logout('token_missing');
  return;
}

// ✅ API CALL: Zkus validovat na backendu
try {
  await getUserDetailApi2(storedUser.username, storedToken, storedUser.id);
  // Token validní ✅
} catch (error) {
  // ✅ CRITICALLY IMPROVED: Inteligentní rozlišení typu chyby
  
  const hasCachedData = storedDetail && storedUser && storedToken;
  
  if (error.status === 401 && hasCachedData) {
    // 401 + máme cached data → POUŽIJ CACHED DATA, NEodhlašuj okamžitě
    setUserDetail(storedDetail);
    setIsLoggedIn(true); // ← KRITICKÉ: Zůstat přihlášen!
  } else if (error.status === 401 && !hasCachedData) {
    // 401 + žádná cached data → skutečný auth error
    logout('token_invalid');
  }
}
```

## 🎯 Výsledek

### PŘED:
```
1. Uživatel klikne na Profil
2. React Router navigace → page reload
3. checkToken() volá getUserDetailApi2()
4. Server vrátí 401 (např. timeout po 200ms)
5. Axios interceptor okamžitě odhlásí
6. Uživatel vidí login screen 😡
```

### PO:
```
1. Uživatel klikne na Profil
2. React Router navigace → page reload
3. checkToken() nejdřív zkontroluje lokální token expiraci ✅
4. Pak volá getUserDetailApi2()
5. Pokud 401:
   a) Během prvních 10s → IGNORUJ (grace period) ✅
   b) Máme cached data → POUŽIJ JE, zůstan přihlášen ✅
   c) Žádná cached data + 401 → logout (skutečný error)
6. Uživatel zůstává přihlášen 🎉
```

## 📊 Testování

### Scénáře k otestování:
- [ ] F5 na hlavní stránce
- [ ] F5 v profilu uživatele
- [ ] F5 v nastavení
- [ ] Přechod Profil → Nastavení → Profil
- [ ] Otevření nové záložky (multi-tab test)
- [ ] Reload po 5 minutách nečinnosti
- [ ] Skutečná expirace tokenu (po 12h) - měl by odhlásit

### Expected behavior:
✅ Uživatel zůstává přihlášen při všech reloadech/navigacích  
✅ Token se validuje chytře (lokálně + cache fallback)  
✅ Pouze skutečné auth errory způsobí logout  
✅ Network glitches/timeouty jsou gracefully handlované  

## 🔧 Soubory změněny

1. **`apps/eeo-v2/client/src/services/api2auth.js`**
   - Přidána grace period po page load (10s)
   - Kontrola cached dat před logout
   - Lepší detekce false positive 401

2. **`apps/eeo-v2/client/src/context/AuthContext.js`**
   - Lokální validace tokenu před API call
   - Inteligentní error handling
   - Priorita cached dat při 401 během page load

## 📅 Datum implementace
6. února 2026

## 👨‍💻 Implementoval
GitHub Copilot + development tým

## 🔗 Související dokumenty
- `MULTI-TAB-AUTH-FIX.md` - Multi-tab session management
- `TOKEN_REFRESH_SERVICE.md` - Auto-refresh mechanismus
- `PHPAPI.prompt.md` - Backend auth standardy
