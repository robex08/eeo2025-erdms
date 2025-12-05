# 🧪 FÁZE 1 - QUICK TEST REFERENCE

**Rychlá testovací příručka pro ověření bezpečnostního fixu session seed**

---

## ⚡ RYCHLÉ TESTY (5 minut)

### ✅ Test 1: Session seed NENÍ v sessionStorage (30 sekund)

1. Otevřít aplikaci → Přihlásit se
2. DevTools (F12) → Application tab → Session Storage
3. Hledat klíč `_session_seed`

**Očekáváno:** ❌ Klíč `_session_seed` **NEEXISTUJE**

**Console kontrola:**
```javascript
sessionStorage.getItem('_session_seed')  // Musí vrátit: null
```

---

### ✅ Test 2: Session seed JE v paměti (30 sekund)

**Console kontrola:**
```javascript
window._securityContext
```

**Očekávaný výstup:**
```javascript
{
  sessionSeed: "1737212345678-abc123xyz-123,45,67,...",  // Náhodný string
  sessionStart: 1737212345678,  // Timestamp
  keyRotations: 0  // Počet rotací
}
```

---

### ✅ Test 3: Encryption Stats (1 minuta)

**Console kontrola:**
```javascript
getEncryptionStats()
```

**Očekávaný výstup:**
```javascript
{
  initialized: true,
  hasSeed: true,           // ✅ Seed existuje
  sessionStart: "2025-01-18T14:30:00.000Z",
  keyAgeMs: 3600000,
  keyAgeHours: "1.00",
  rotationCount: 0,
  inStorage: false         // ✅ DŮLEŽITÉ: Musí být false!
}
```

**Klíčová kontrola:** `inStorage: false` (seed NENÍ v storage)

---

### ✅ Test 4: Login/Logout/Login (2 minuty)

**Kroky:**
1. Přihlásit se
2. Console: `window._securityContext.keyRotations` → **0**
3. Odhlásit se (mělo by console logovat rotaci)
4. Přihlásit se znovu
5. Console: `window._securityContext.keyRotations` → **1** (nebo 0 pokud nový tab)

**Očekávaný console log při odhlášení:**
```
[SECURITY] Šifrovací klíč rotován { rotationCount: 1, timestamp: "2025-01-..." }
```

---

### ✅ Test 5: Auth stále funguje (1 minuta)

**Kroky:**
1. Přihlásit se
2. Zavřít tab (POZOR: ne odhlásit, jen zavřít!)
3. Otevřít aplikaci znovu

**Očekáváno:**
- ✅ Automaticky přihlášen (auth token přežil)
- ✅ Nový `sessionSeed` vygenerován (zkontrolovat `getEncryptionStats()`)

**Proč funguje:** Auth token používá `PERSISTENT_KEY` (browser fingerprint), ne session seed

---

## 🔍 DETAILNÍ DIAGNOSTIKA (pokud něco nefunguje)

### Diagnostický script (spustit v Console)

```javascript
// === KOMPLETNÍ DIAGNOSTIKA ===
console.group('🔍 FÁZE 1 Diagnostika');

// 1. Session Storage kontrola
console.log('1️⃣ SessionStorage:');
console.log('  _session_seed:', sessionStorage.getItem('_session_seed'));
console.log('  Celkový počet keys:', sessionStorage.length);

// 2. Memory kontrola
console.log('2️⃣ Memory (window._securityContext):');
console.log('  Existuje:', !!window._securityContext);
if (window._securityContext) {
  console.log('  sessionSeed:', window._securityContext.sessionSeed?.slice(0, 50) + '...');
  console.log('  sessionStart:', new Date(window._securityContext.sessionStart).toISOString());
  console.log('  keyRotations:', window._securityContext.keyRotations);
}

// 3. Encryption stats
console.log('3️⃣ Encryption Stats:');
if (typeof getEncryptionStats === 'function') {
  console.table(getEncryptionStats());
} else {
  console.log('  ⚠️ getEncryptionStats() není dostupná');
}

// 4. LocalStorage auth check
console.log('4️⃣ LocalStorage Auth:');
console.log('  auth_token_persistent:', localStorage.getItem('auth_token_persistent')?.slice(0, 30) + '...');
console.log('  auth_user_persistent:', localStorage.getItem('auth_user_persistent')?.slice(0, 30) + '...');

console.groupEnd();
```

**Spustit a zkopírovat výstup pokud je problém**

---

## ⚠️ CO DĚLAT POKUD...

### ❌ `sessionStorage._session_seed` stále existuje

**Příčina:** Starý cache v prohlížeči  
**Řešení:**
1. Hard refresh: `Ctrl + Shift + R` (Windows/Linux) nebo `Cmd + Shift + R` (Mac)
2. Vymazat sessionStorage ručně: `sessionStorage.clear()`
3. Zavřít všechny taby aplikace a otevřít nový

---

### ❌ `window._securityContext` je `undefined`

**Příčina:** `encryption.js` se nenačetl nebo nebyl modifikován správně  
**Kontrola:**
```javascript
// V DevTools → Sources → src/utils/encryption.js
// Hledat řádek: if (!window._securityContext) {
```

**Řešení:**
1. Zkontrolovat že soubor byl správně uložen
2. Hard refresh: `Ctrl + Shift + R`
3. Zkontrolovat console na chyby (import errors, syntax errors)

---

### ❌ `getEncryptionStats()` vrací `inStorage: true`

**Příčina:** Session seed je stále v sessionStorage (nemělo by nastat)  
**Řešení:**
1. `sessionStorage.clear()`
2. Hard refresh: `Ctrl + Shift + R`
3. Zkontrolovat že modifikace `encryption.js` je správná (hledat `sessionStorage.setItem`)

---

### ❌ Logout nevolá `rotateEncryptionKey()`

**Kontrola:**
```javascript
// V DevTools → Sources → src/utils/logoutCleanup.js
// Hledat řádek: import { rotateEncryptionKey } from './encryption.js';
// Hledat řádek: rotateEncryptionKey();
```

**Console při odhlášení očekáván:**
```
[SECURITY] Šifrovací klíč rotován { rotationCount: 1, ... }
```

**Pokud chybí:** Import nebo volání nebylo přidáno správně → zkontrolovat soubor

---

### ❌ Auth nefunguje po F5

**Příčina:** Toto by **NEMĚLO** nastat (auth používá persistent key, ne session)  
**Kontrola:**
```javascript
localStorage.getItem('auth_token_persistent')  // Mělo by existovat
```

**Pokud chybí:** Problém není v FÁZI 1, ale v auth systému (mimo scope)

---

## 📊 EXPECTED vs ACTUAL BEHAVIOR

### ✅ EXPECTED (správné chování)

| Akce | SessionStorage | Memory | LocalStorage Auth |
|------|----------------|--------|-------------------|
| **1. První přihlášení** | ❌ `_session_seed` = null | ✅ `sessionSeed` = generován | ✅ `auth_token` = uložen |
| **2. F5 Refresh** | ❌ prázdný | ✅ `sessionSeed` = NOVÝ | ✅ `auth_token` = zachován |
| **3. Odhlášení** | ❌ prázdný | ✅ `sessionSeed` = null (rotace) | ✅ `auth_token` = smazán |
| **4. Nové přihlášení** | ❌ prázdný | ✅ `sessionSeed` = nový | ✅ `auth_token` = nový |

---

## 🎯 SUCCESS CRITERIA

**FÁZE 1 je úspěšná pokud:**

- [x] `sessionStorage.getItem('_session_seed')` → `null`
- [x] `window._securityContext.sessionSeed` → existuje (string)
- [x] `getEncryptionStats().inStorage` → `false`
- [x] Login/Logout/Login → funguje
- [x] F5 refresh → auth zachován (auto-login)
- [x] Console log při odhlášení → `[SECURITY] Šifrovací klíč rotován`

**Pokud všech 6 kontrol prošlo → ✅ FÁZE 1 KOMPLETNÍ**

---

## 🚀 NEXT STEPS

Po úspěšném testu FÁZE 1:

1. **Commit změny:**
   ```bash
   git add src/utils/encryption.js src/utils/logoutCleanup.js
   git commit -m "FÁZE 1: Session seed security fix (memory storage)"
   ```

2. **Dokumentovat:**
   - Aktualizovat README.md (sekce Security)
   - Archivovat tento dokument

3. **Spustit FÁZI 2:**
   - Implementovat `DraftStorageService`
   - Per-user persistent key pro drafty
   - Draft přežije F5 + logout

---

**Odhadovaný čas testování:** 5-10 minut  
**Kritičnost:** P0 - CRITICAL (musí projít před FÁZÍ 2)  
**Rollback dostupný:** Ano (git revert nebo restore z `/archiv/`)

---

**Poznámka:** Všechny console.log příkazy pro `[SECURITY]` lze po úspěšném testu odstranit nebo změnit na `console.debug()` pro produkci.
