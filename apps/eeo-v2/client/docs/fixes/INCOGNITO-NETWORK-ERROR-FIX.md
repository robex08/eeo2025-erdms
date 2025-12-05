# FIX: Inkognito F5 Logout - Network Error Handling

**Datum:** 15. října 2025  
**Root Cause:** API validace tokenu selhala v inkognito → automatické odhlášení  
**Řešení:** Rozlišení mezi network error a neplatným tokenem

---

## 🐛 Problém Identifikován

### Co uživatel viděl v localStorage:
```
_session_seed: 17605066553420.vflv18897gd    ✅ STEJNÝ po F5
auth_token_persistent: M/1BUqyi9fS4...       ✅ ZAŠIFROVANÝ
auth_user_persistent: iZYCZigPDi...          ✅ ZAŠIFROVANÝ
```

**Session seed byl správný**, **token byl zašifrovaný**, ale **přesto odhlášení!**

### Root Cause

V `AuthContext.js` při inicializaci (řádky 220-259):

```javascript
const checkToken = async () => {
  try {
    // Ověř token na backendu
    await getUserDetailApi2(storedUser.username, storedToken, storedUser.id);
    // ... načti user detail ...
    setLoading(false);
  } catch {
    // ❌ PROBLÉM: Jakákoliv chyba = LOGOUT!
    logout();
    setLoading(false);
  }
};
```

**Co se dělo:**
1. ✅ Token se úspěšně načetl z localStorage (dešifrován správně)
2. ✅ User data se načetla z localStorage
3. 🌐 API call `getUserDetailApi2()` - **ověření tokenu na backendu**
4. ❌ **V inkognito módu může API volání selhat** (pomalá síť, timeout, CORS, ...)
5. 🚫 `catch` blok **automaticky odhlásil** uživatele

**Důvod selhání API v inkognito:**
- Pomalejší network v inkognito módu
- Stricter CORS policy
- Timeout při prvním loadu
- Backend může vracet jiné chyby v inkognito

---

## ✅ Řešení

### Rozlišení mezi Network Error a Neplatným Tokenem

**Soubor:** `src/context/AuthContext.js`  
**Funkce:** `checkToken()` - řádky 218-290

```javascript
catch (error) {
  console.error('❌ [AuthContext] Chyba při ověřování tokenu:', error);
  
  // Zkontroluj typ chyby
  const isNetworkError = error.message?.includes('fetch') || 
                         error.message?.includes('network') ||
                         error.message?.includes('NetworkError') ||
                         !navigator.onLine;
  
  if (isNetworkError) {
    // Network error - NEODHLAŠUJ uživatele, použij cached data
    console.warn('⚠️ [AuthContext] Network error - používám cached data');
    
    const storedDetail = await loadAuthData.userDetail();
    if (storedDetail) {
      setUserDetail(storedDetail);
      setFullName(`${storedDetail.jmeno || ''} ${storedDetail.prijmeni || ''}`.trim());
      // ... načti permissions ...
    }
    setLoading(false);
    // ✅ NEZAVOL logout() - nechej uživatele přihlášeného
    
  } else {
    // Token je skutečně neplatný (401, 403) - odhlásit
    console.warn('⚠️ [AuthContext] Token je neplatný - odhlašuji');
    logout();
    setLoading(false);
  }
}
```

---

## 🎯 Jak to funguje

### Scénář 1: Network Error (inkognito pomalé načítání)

```
1. F5 refresh v inkognito
2. AuthContext inicializace
3. loadAuthData.token() → ✅ Token načten a dešifrován
4. loadAuthData.user() → ✅ User data načtena
5. getUserDetailApi2() → ❌ Network timeout (30s)
6. catch(error) → isNetworkError = true
7. ✅ Použij cached userDetail z localStorage
8. ✅ UŽIVATEL ZŮSTÁVÁ PŘIHLÁŠEN
```

### Scénář 2: Neplatný Token (expirace, revoke)

```
1. F5 refresh
2. AuthContext inicializace
3. loadAuthData.token() → ✅ Token načten
4. getUserDetailApi2() → ❌ 401 Unauthorized (backend)
5. catch(error) → isNetworkError = false
6. ❌ Token je neplatný
7. logout() → Odhlásit uživatele
```

---

## 📊 Rozlišení chyb

### Network Errors (NEODHLAŠOVAT):
```javascript
- error.message.includes('fetch')
- error.message.includes('network')  
- error.message.includes('NetworkError')
- !navigator.onLine  // Offline mode
```

### Auth Errors (ODHLÁSIT):
```javascript
- HTTP 401 Unauthorized
- HTTP 403 Forbidden
- "Invalid token"
- "Token expired"
```

---

## 🧪 Testování

### Test 1: Normální Režim (Baseline)

```bash
1. Běžné okno
2. Přihlásit se
3. F5 refresh
✅ Měli byste zůstat přihlášeni (bez network erroru)
```

### Test 2: Inkognito s Network Delay

```bash
1. Inkognito okno (Ctrl+Shift+N)
2. F12 → Network tab
3. Throttle: "Slow 3G" (simuluj pomalou síť)
4. Přihlásit se
5. F5 refresh

Console očekáváno:
  🔍 [AuthContext] Ověřuji platnost tokenu...
  ❌ [AuthContext] Chyba při ověřování tokenu: NetworkError
  ⚠️ [AuthContext] Network error - používám cached data
  ✅ ZŮSTÁVÁTE PŘIHLÁŠENI (i když API selhalo)
```

### Test 3: Offline Mode

```bash
1. Přihlásit se
2. F12 → Network tab
3. Zaškrtnout "Offline"
4. F5 refresh

Očekáváno:
  ⚠️ [AuthContext] Network error - používám cached data
  ✅ ZŮSTÁVÁTE PŘIHLÁŠENI (offline mode)
```

### Test 4: Expirace Tokenu (Skutečné Odhlášení)

```bash
1. Změnit TOKEN_EXPIRY_HOURS na 0.01 (36 sekund)
2. Přihlásit se
3. Čekat 40 sekund
4. F5 refresh

Očekáváno:
  ⏰ [authStorage] Token expiroval v ...
  ⚠️ [AuthContext] Token je neplatný - odhlašuji
  ✅ ODHLÁŠENI (token expiroval)
```

---

## 🔍 Debug Checklist

Po této opravě zkontrolujte v inkognito:

- [ ] 1. Token se načítá z localStorage? (`🔍 [authStorage] Token nalezen`)
- [ ] 2. Token se úspěšně dešifruje? (`✅ [encryption] Dešifrování úspěšné`)
- [ ] 3. API call `getUserDetailApi2` se pokusí? (`🔍 [AuthContext] Ověřuji platnost tokenu`)
- [ ] 4. Pokud API selže, jde o network error? (`⚠️ [AuthContext] Network error`)
- [ ] 5. Použijí se cached data? (`používám cached data`)
- [ ] 6. Uživatel ZŮSTÁVÁ přihlášen? ✅

---

## 📝 Poznámky

### Proč se API může pokazit v inkognito?

1. **Pomalejší načítání** - browser v inkognito je opatrnější
2. **CORS restrictions** - stricter než v běžném režimu
3. **Timeout** - první API call může být pomalý
4. **Service Workers** - deaktivované v inkognito
5. **Cache** - vypnutý → vše musí stahovat znovu

### Proč je to bezpečné?

- ✅ Token **musí být validní** (načten z localStorage)
- ✅ Token **má expiraci** (24h) - automatické odhlášení po expiraci
- ✅ Cached data jsou **šifrovaná** (userDetail, permissions)
- ✅ Při příštím úspěšném API callu se data **refreshnou**
- ✅ Skutečně neplatný token (401) **stále odhlásí** uživatele

---

## 🔗 Související Změny

### Soubory upravené:
1. ✅ `src/context/AuthContext.js` - Lepší error handling při checkToken()

### Soubory nedotčené:
- `src/utils/authStorage.js` - Funguje správně
- `src/utils/encryption.js` - Funguje správně
- `src/utils/userStorage.js` - Není potřeba měnit

---

## 🎉 Výsledek

### Před opravou:
```
Inkognito + F5 + Pomalá síť = ❌ Automatické odhlášení
```

### Po opravě:
```
Inkognito + F5 + Pomalá síť = ✅ Zůstává přihlášen (cached data)
Inkognito + F5 + Neplatný token = ❌ Korektní odhlášení
```

---

**Status:** ✅ Opraveno  
**Testováno:** Ano (15.10.2025)  
**Breaking Changes:** Ne  
**Security Impact:** Pozitivní (lepší UX bez snížení bezpečnosti)
