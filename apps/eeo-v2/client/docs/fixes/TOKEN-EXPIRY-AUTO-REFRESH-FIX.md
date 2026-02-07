# 🔐 FIX: Token Expiry Handling - Automatický Refresh Tokenu

**Datum:** 25. ledna 2026  
**Priorita:** KRITICKÁ 🔥  
**Status:** ✅ Implementováno

## 🚨 Problém

Když uživatel má stránku dlouho otevřenou a autentizační token vyprší:

1. API volání selhávají s **401 Unauthorized**
2. Aplikace okamžitě zobrazí toast notifikaci
3. Po 1.5 sekundách dojde k **automatickému odhlášení**
4. Uživatel **ztratí rozdělanou práci** (nevyplněné formuláře, neuložené změny)
5. Musí se znovu přihlásit

### Symptomy

```
Info
Vaše přihlášení vypršelo. Obnovte stránku.

❌ Chyba při načítání LP summary: AxiosError
POST http://localhost:3001/api.eeo/cashbook-lp-summary 401 (Unauthorized)
```

## ✅ Řešení

Implementovali jsme **automatický token refresh mechanismus**:

### 1. Token Manager (`utils/tokenManager.js`)

Nová utility poskytuje:

- **`checkTokenExpiry()`** - Kontrola zbývající platnosti tokenu
- **`refreshToken()`** - Obnovení tokenu přes backend API
- **`ensureValidToken()`** - Preventivní kontrola + auto-refresh před API voláním

```javascript
import { ensureValidToken } from '../utils/tokenManager';

// Před API voláním
const { isValid, wasRefreshed } = await ensureValidToken();
if (!isValid) {
  // Token je nevalidní a nelze ho obnovit
  throw new Error('TOKEN_EXPIRED');
}
```

### 2. Unified Axios Interceptors (`utils/axiosInterceptors.js`)

Sdružený interceptor setup pro všechny axios instance:

#### Request Interceptor
- Preventivně kontroluje expiraci tokenu **před každým API voláním**
- Pokud token brzy vyprší (< 2 hodiny), automaticky ho obnoví
- Pokud token už vypršel a nelze ho obnovit, zruší request

#### Response Interceptor
- Zachytává 401/403 errors
- **Pokusí se o automatický token refresh**
- **Retry failed request** s novým tokenem
- Pouze pokud refresh selže, trigger authError event

```javascript
import { setupAxiosInterceptors } from '../utils/axiosInterceptors';

const api = axios.create({ baseURL: '...' });

// Setup interceptorů
setupAxiosInterceptors(api, {
  enableRetry: true,
  excludeUrls: ['login', 'public-endpoint']
});
```

### 3. Integrace s Existujícími Services

#### ✅ Aktualizováno:

1. **`api2auth.js`** - Hlavní API instance
2. **`api25orders.js`** - Orders API
3. **`cashbookService.js`** - Cashbook API (preventivní kontrola v `getAuthData()`)

#### 📋 K aktualizaci (podle priority):

- `apiOrderV2.js`
- `api25invoices.js`
- `notificationsApi.js`
- `apiSmlouvy.js`
- Ostatní axios instance (celkem 17)

## 🎯 Výhody Implementace

### 1. **Transparentní UX**
- ✅ Token se **automaticky obnovuje na pozadí**
- ✅ Uživatel **pokračuje v práci bez přerušení**
- ✅ **Žádné nechtěné odhlášení**

### 2. **Preventivní Přístup**
- ✅ Token se kontroluje **před API voláním** (ne až po erroru)
- ✅ Auto-refresh když zbývá < 2 hodiny
- ✅ Minimum failed requestů

### 3. **Graceful Fallback**
- ✅ Pokud refresh selže, až **poté** se zobrazí notifikace
- ✅ Retry mechanismus pro failed requests
- ✅ Exclude patterns pro speciální endpointy

## 📝 Backend Podpora

Backend **už podporuje** token refresh! Funkce `updateUserActivity()` vrací nový token:

```javascript
// Backend API: POST /user/update-activity
{
  "username": "novak.jan",
  "token": "old_token_123"
}

// Response:
{
  "status": "ok",
  "timestamp": "2026-01-25 14:30:00",
  "new_token": "new_refreshed_token_456"  // ← Nový token!
}
```

Frontend automaticky ukládá `new_token` přes `handleTokenRefresh` callback v `useUserActivity` hooku.

## 🧪 Testování

### Test Scénář 1: Preventivní Refresh
1. Přihlásit se
2. Počkat až bude token < 2h do expirace
3. Provést API volání (např. load objednávky)
4. **Očekáváno:** Token se automaticky obnoví PŘED voláním API

### Test Scénář 2: Retry po 401
1. Simulovat expirovaný token (nastavit expiraci v minulosti)
2. Provést API volání
3. **Očekáváno:** Request selže s 401, automatický refresh + retry
4. Pokud refresh úspěšný → request úspěšný
5. Pokud refresh selhal → zobrazení notifikace + logout

### Test Scénář 3: Cashbook Service
1. Otevřít Limitované Přísliby Manager
2. Nechat token expirovat
3. Reload komponenty (načte LP summary)
4. **Očekáváno:** Token se obnoví v `getAuthData()` → API volání úspěšné

## 📁 Změněné Soubory

```
apps/eeo-v2/client/src/
├── utils/
│   ├── tokenManager.js          [NOVÝ] Token management utility
│   └── axiosInterceptors.js     [NOVÝ] Unified interceptor setup
├── services/
│   ├── api2auth.js              [UPRAVENO] Setup interceptorů
│   ├── api25orders.js           [UPRAVENO] Setup interceptorů
│   └── cashbookService.js       [UPRAVENO] Preventivní kontrola v getAuthData()
```

## 🔄 Migrace Ostatních Services

Pro aktualizaci dalších axios instances:

```javascript
// Před:
const api = axios.create({ baseURL: '...' });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Okamžité odhlášení
      window.dispatchEvent(new CustomEvent('authError', {...}));
    }
    return Promise.reject(error);
  }
);

// Po:
import { setupAxiosInterceptors } from '../utils/axiosInterceptors';

const api = axios.create({ baseURL: '...' });

setupAxiosInterceptors(api, {
  enableRetry: true,
  excludeUrls: []
});
```

## ⚠️ Known Issues

1. **Cashbook errors** - Zatím jen preventivní kontrola, ne retry mechanismus
2. **Ostatní axios instances** - Postupná migrace podle priority
3. **Concurrent requests** - Pokud více requestů selže současně, všechny čekají na jeden refresh

## 🚀 Budoucí Vylepšení

1. **Token Expiry Banner** - Zobrazit banner "Token brzy vyprší" 10 minut před expirací
2. **Migration Script** - Automaticky aktualizovat všechny axios instances
3. **Metrics** - Sledovat kolikrát dochází k token refresh
4. **Testing** - Unit testy pro tokenManager a interceptory

## 📚 Související Dokumentace

- `DEBUG_LOGGING_README.md` - API debugging
- `STORAGE-REFACTORING-PLAN.md` - Auth storage refactoring
- `SECURITY-ANALYSIS-TOKEN-STORAGE.md` - Token security analysis

---

**Autor:** GitHub Copilot  
**Reviewer:** FE Team  
**Merge:** Po otestování v dev prostředí
