# 🔍 KOMPLETNÍ AUDIT STORAGE - Nalezené problémy

**Datum:** 15. října 2025  
**Stav:** KRITICKÉ PROBLÉMY NALEZENY

---

## ❌ KRITICKÉ PROBLÉMY

### 1. AuthContext.js - Řádek 425: Starý klíč `userDetail`

**Problém:**
```javascript
const raw = localStorage.getItem('userDetail'); // ❌ ŠPATNĚ - starý klíč
```

**Správně:**
```javascript
const storedDetail = await loadAuthData.userDetail(); // ✅ Používá 'auth_user_detail_persistent'
```

**Dopad:**
- Funkce `hasPermission()` čte z NEEXISTUJÍCÍHO klíče
- Permissions mohou selhat
- Uživatel může mít NESPRÁVNÁ oprávnění

**Řešení:**
Nahradit `localStorage.getItem('userDetail')` za `await loadAuthData.userDetail()`

---

### 2. Layout.js - Řádek 1870: Session seed ve špatném storage

**Problém:**
```javascript
const seed = sessionStorage.getItem('_session_seed'); // ❌ ŠPATNĚ
```

**Správně:**
```javascript
const seed = localStorage.getItem('_session_seed'); // ✅ Správně
```

**Dopad:**
- Debug panel zobrazuje ŠPATNÝ seed
- Může zmást při debuggingu

**Řešení:**
Změnit `sessionStorage` na `localStorage`

---

### 3. Layout.js - Řádek 1858: Clear Session maže sessionStorage

**Problém:**
```javascript
sessionStorage.clear(); // ❌ ŠPATNĚ - nic důležitého tam není
```

**Správně:**
```javascript
// Mělo by mazat auth data z localStorage pomocí clearAuthData.all()
```

**Dopad:**
- "Clear Session" tlačítko NEMAŽE auth data
- Uživatel myslí, že se odhlásil, ale není

**Řešení:**
Zavolat `clearAuthData.all()` nebo odstranit tlačítko

---

## ✅ CO FUNGUJE SPRÁVNĚ

### AuthContext.js
- ✅ `saveAuthData.token()` → localStorage (PERSISTENT_KEYS)
- ✅ `saveAuthData.user()` → localStorage (PERSISTENT_KEYS)
- ✅ `saveAuthData.userDetail()` → localStorage (PERSISTENT_KEYS)
- ✅ `saveAuthData.userPermissions()` → localStorage (PERSISTENT_KEYS)
- ✅ `loadAuthData.token()` → localStorage (PERSISTENT_KEYS)
- ✅ `loadAuthData.user()` → localStorage (PERSISTENT_KEYS)
- ✅ Migrace `migrateAuthDataToSessionStorage()` je ZAKOMENTOVANÁ ✅

### encryption.js
- ✅ `_session_seed` je v localStorage (řádek 11, 15)
- ✅ Seed je STABILNÍ napříč záložkami

### userStorage.js
- ✅ `app_current_user_id` je v localStorage
- ✅ `getCurrentUserId()` čte z localStorage
- ✅ `setCurrentUserId()` ukládá do localStorage
- ✅ `checkAndCleanUserChange()` správně detekuje změnu uživatele

### encryptionConfig.js
- ✅ `auth_token_persistent` je v CRITICAL keys
- ✅ `auth_user_persistent` je v CRITICAL keys  
- ✅ `auth_user_detail_persistent` je v CRITICAL keys
- ✅ `auth_user_permissions_persistent` je v CRITICAL keys

### Layout.js
- ✅ Draft keys používají `user_id` (izolace uživatelů)
- ✅ `getDraftKey()` vrací `order25-draft-${user_id}`

---

## 🔧 OPRAVY K PROVEDENÍ

### Priorita 1 (KRITICKÉ):

**1. Opravit `hasPermission()` v AuthContext.js:**

**Řádek ~425:**
```javascript
// PŘED:
const raw = localStorage.getItem('userDetail');
if (raw) ud = JSON.parse(raw) || ud;

// PO:
const storedDetail = await loadAuthData.userDetail();
if (storedDetail) ud = storedDetail;
```

**2. Opravit debug seed zobrazení v Layout.js:**

**Řádek ~1870:**
```javascript
// PŘED:
const seed = sessionStorage.getItem('_session_seed');

// PO:
const seed = localStorage.getItem('_session_seed');
```

### Priorita 2 (DOPORUČENO):

**3. Opravit "Clear Session" tlačítko v Layout.js:**

**Řádek ~1858:**
```javascript
// PŘED:
onClick={() => {
  sessionStorage.clear();
  showToast && showToast('Session vyčištěna', 'success');
}}

// PO:
onClick={async () => {
  clearAuthData.all();
  clearAllUserData();
  showToast && showToast('Session vyčištěna', 'success');
  setTimeout(() => window.location.reload(), 500);
}}
```

---

## 📊 SOUHRN

| Kategorie | Stav |
|-----------|------|
| **Token storage** | ✅ SPRÁVNĚ (localStorage + PERSISTENT_KEYS) |
| **User storage** | ✅ SPRÁVNĚ (localStorage + PERSISTENT_KEYS) |
| **Encryption seed** | ✅ SPRÁVNĚ (localStorage) |
| **User ID persistence** | ✅ SPRÁVNĚ (localStorage) |
| **Permission check** | ❌ CHYBA (starý klíč 'userDetail') |
| **Debug seed display** | ❌ CHYBA (sessionStorage místo localStorage) |
| **Clear Session button** | ❌ CHYBA (nemaže auth data) |

---

## 🎯 ZÁVĚR

**Hlavní problém:** Funkce `hasPermission()` čte z neexistujícího klíče `'userDetail'` místo `'auth_user_detail_persistent'`.

**Důsledek:** Permissions můžou selhat → uživatel nevidí správné menu/tlačítka.

**Řešení:** Opravit 3 identifikované problémy (priorita 1 je KRITICKÁ).

---

## 📝 TESTOVACÍ SCÉNÁŘ PO OPRAVĚ

1. Přihlásit se
2. Zkontrolovat console: `await loadAuthData.userDetail()` → mělo by vrátit objekt
3. Zkontrolovat console: `localStorage.getItem('auth_user_detail_persistent')` → mělo by existovat
4. Otevřít novou záložku → měla by být automaticky přihlášená
5. F5 refresh → session by měla zůstat
6. Zkontrolovat permissions: menu by mělo správně zobrazovat položky podle oprávnění

---

**Status:** 🔴 VYŽADUJE OKAMŽITÉ OPRAVY
