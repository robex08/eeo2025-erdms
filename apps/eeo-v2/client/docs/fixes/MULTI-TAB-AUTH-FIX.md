# 🔧 Multi-Tab Authentication Fix

## Problém

Když uživatel otevřel novou záložku aplikace, byl vyzván k novému přihlášení, i když byl již přihlášen v jiné záložce stejného prohlížeče.

### Původní stav (ŠPATNĚ ❌)

- `saveAuthData.token()` → `localStorage` (PERSISTENT_KEYS) ✅
- `saveAuthData.user()` → `sessionStorage` (SESSION_KEYS) ❌
- `saveAuthData.userDetail()` → `sessionStorage` (SESSION_KEYS) ❌  
- `saveAuthData.userPermissions()` → `sessionStorage` (SESSION_KEYS) ❌

**Důsledek**:
- Token byl sdílený napříč záložkami (localStorage)
- Ale user data NEBYLA sdílená (sessionStorage je per-tab)
- Podmínka `if (storedUser && storedToken)` v AuthContext byla FALSE v nové záložce
- → Vyžadovalo se nové přihlášení

### Nový stav (SPRÁVNĚ ✅)

- `saveAuthData.token()` → `localStorage` (PERSISTENT_KEYS) ✅
- `saveAuthData.user()` → `localStorage` (PERSISTENT_KEYS) ✅
- `saveAuthData.userDetail()` → `localStorage` (PERSISTENT_KEYS) ✅
- `saveAuthData.userPermissions()` → `localStorage` (PERSISTENT_KEYS) ✅

**Výsledek**:
- Všechna auth data jsou sdílená napříč záložkami
- Nová záložka najde kompletní session (token + user + detail + permissions)
- → NENÍ potřeba nové přihlášení

## Řešení

### Změny v `src/utils/authStorage.js`

#### 1. Save methods - změna z sessionStorage na localStorage

**PŘED**:
```javascript
user: async (userData) => {
  sessionStorage.setItem(SESSION_KEYS.USER, encrypted); // ❌ per-tab
}
```

**PO**:
```javascript
user: async (userData) => {
  localStorage.setItem(PERSISTENT_KEYS.USER, encrypted); // ✅ shared
}
```

Stejná změna pro:
- `userDetail()`
- `userPermissions()`

#### 2. Load methods - čtení z localStorage

**PŘED**:
```javascript
user: async () => {
  const stored = sessionStorage.getItem(SESSION_KEYS.USER); // ❌
}
```

**PO**:
```javascript
user: async () => {
  const stored = localStorage.getItem(PERSISTENT_KEYS.USER); // ✅
}
```

#### 3. Clear methods - mazání z OBOU storage

```javascript
user: () => {
  localStorage.removeItem(PERSISTENT_KEYS.USER);
  sessionStorage.removeItem(SESSION_KEYS.USER); // fallback pro stará data
}
```

## Chování aplikace

### Normální režim (Desktop/Laptop)

```
1. Záložka A: Přihlášení → Data v localStorage
2. Záložka B: Otevřít → Automaticky přihlášen ✅
3. Záložka A: F5 refresh → Zůstane přihlášen ✅
4. Zavřít prohlížeč → Data zůstanou (24h expiration)
5. Otevřít prohlížeč znovu → Automaticky přihlášen ✅
```

### Anonymní režim (Incognito/Private)

V anonymním režimu je `localStorage` **izolovaný** od normálního režimu:

```
1. Normální okno: Přihlášen jako User A
2. Anonymní okno: Přihlášení jako User B → Nový localStorage
3. Anonymní okno má vlastní session ✅
4. Zavřít anonymní okno → localStorage anonymního okna se smaže ✅
5. Normální okno: Stále přihlášen jako User A ✅
```

## Multi-Tab Sync

Již existuje implementace v `src/utils/tabSync.js` pomocí **BroadcastChannel API**:

- ✅ Login v jedné záložce → Všechny záložky dostanou notifikaci
- ✅ Logout v jedné záložce → Všechny záložky se odhlásí
- ✅ Změna uživatele → Všechny záložky se reload

## User Data Izolace

Již existuje implementace v `src/utils/userStorage.js`:

```javascript
// Při loginu zkontroluj, zda se změnil uživatel
const userChanged = checkAndCleanUserChange(loginData.id);

if (userChanged) {
  // Smaž data předchozího uživatele (koncepty, drafty atd.)
  clearUserData(previousUserId);
}
```

### Co se maže při změně uživatele:

- ✅ Koncepty objednávek (`order_draft_${previousUserId}`)
- ✅ UI stav (`panel_state_${previousUserId}_*`)
- ✅ Notifikace (`notif_data_${previousUserId}`)
- ✅ Chat data (`chat_data_${previousUserId}`)
- ✅ Tasks (`layout_tasks_${previousUserId}`)

### Co zůstává (globální data):

- Session seed (`_session_seed`)
- App theme (`app_theme_mode`)
- Last route (`app_lastRoute`)
- Suppliers cache (`suppliers_cache`)

## Šifrování dat

Auth data jsou šifrována pomocí Web Crypto API:

| Data | Šifrování | Storage | Důvod |
|------|-----------|---------|-------|
| Token | ✅ ANO | localStorage | Nejvíce citlivé |
| User | ✅ ANO | localStorage | Obsahuje username |
| UserDetail | ✅ ANO | localStorage | Osobní údaje (jméno, příjmení) |
| UserPermissions | ✅ ANO | localStorage | Bezpečnostní údaje |

**Šifrovací klíč**: Generován z browser fingerprint + session seed
- Persistent napříč záložkami (stejný seed v localStorage)
- Unikátní per prohlížeč + session

## Testování

### Manuální test - Multi-tab

```
1. Otevři záložku A, přihlaš se (admin/admin)
2. Otevři záložku B (Ctrl+T)
3. ✅ Záložka B by měla být automaticky přihlášena
4. Záložka B: F5
5. ✅ Záložka B zůstane přihlášena
6. Záložka A: Logout
7. ✅ Záložka B by se měla automaticky odhlásit
```

### Manuální test - Anonymní režim

```
1. Normální okno: Přihlaš se jako admin
2. Otevři anonymní okno (Ctrl+Shift+N)
3. ✅ Anonymní okno NENÍ automaticky přihlášeno
4. Anonymní okno: Přihlaš se jako admin
5. ✅ Oba režimy mají vlastní session
6. Zavři anonymní okno
7. ✅ Normální okno zůstane přihlášeno
```

### Manuální test - User switch

```
1. Přihlaš se jako User A
2. Vytvoř koncept objednávky
3. Odhlás se
4. Přihlaš se jako User B
5. ✅ User B NEVIDÍ koncept User A
6. Vytvoř koncept objednávky (jako User B)
7. Odhlás se, přihlaš jako User A
8. ✅ User A vidí svůj koncept, NEVIDÍ koncept User B
```

## Debug

### DevTools Console

```javascript
// Zkontroluj auth data
console.log('Token:', localStorage.getItem('auth_token_persistent'));
console.log('User:', localStorage.getItem('auth_user_persistent'));
console.log('UserDetail:', localStorage.getItem('auth_user_detail_persistent'));
console.log('Permissions:', localStorage.getItem('auth_user_permissions_persistent'));

// Zkontroluj current user
console.log('Current user ID:', localStorage.getItem('app_current_user_id'));
```

### Očekávaný výstup

**Když přihlášen**:
```
Token: [base64 encrypted string]
User: [base64 encrypted string]
UserDetail: [base64 encrypted string]
Permissions: [base64 encrypted string]
Current user ID: 5
```

**Když odhlášen**:
```
Token: null
User: null
UserDetail: null
Permissions: null
Current user ID: null
```

## Závěr

✅ **Multi-tab authentication funguje**
✅ **User data jsou izolována per user_id**
✅ **Anonymní režim má vlastní localStorage**
✅ **BroadcastChannel sync mezi záložkami**
✅ **Auth data jsou šifrována**

Aplikace nyní podporuje:
- Práci ve více záložkách současně
- Automatické přihlášení v nových záložkách
- Synchronizaci logout napříč záložkami
- Izolaci dat mezi různými uživateli
- Anonymní režim bez interference s normálním režimem
