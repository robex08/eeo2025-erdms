# FIX: Session Loss - Zakázání zastaralé migrace

**Datum:** 15. října 2025  
**Problém:** Uživatelé ztráceli session mezi záložkami a dokonce i po F5 refresh v normálním režimu

## 🔴 Problém

Po spuštění `git checkout src/utils/authStorage.js` se vrátila původní verze souboru, která obsahuje:
- ✅ Správné používání `localStorage` s `PERSISTENT_KEYS`
- ✅ Šifrování dat s encryption seedem v `localStorage`

**ALE:** V `AuthContext.js` se stále volá **zastaralá funkce** `migrateAuthDataToSessionStorage()`, která:
1. Migruje data Z localStorage **DO sessionStorage** místo opačně
2. Používá `SESSION_KEYS` místo `PERSISTENT_KEYS`
3. Způsobuje ztrátu session mezi záložkami
4. Způsobuje odhlášení po F5 refresh

## ✅ Řešení

### 1. Zakomentování volání migrace v AuthContext.js

**Soubor:** `src/context/AuthContext.js` (řádek ~207)

**Před:**
```javascript
// Migrace starých dat z localStorage do sessionStorage
migrateAuthDataToSessionStorage();

const storedUser = await loadAuthData.user();
```

**Po:**
```javascript
// ❌ ZAKÁZÁNO: Migrace starých dat z localStorage do sessionStorage
// Tato funkce je ZASTARALÁ a používá sessionStorage místo localStorage!
// Způsobuje ztrátu session mezi záložkami a po F5 refresh
// migrateAuthDataToSessionStorage();

const storedUser = await loadAuthData.user();
```

## 📊 Důsledky

### Před opravou:
1. Uživatel se přihlásí → data uložena v `localStorage` s `PERSISTENT_KEYS`
2. AuthContext se inicializuje → **volá `migrateAuthDataToSessionStorage()`**
3. Migrace **přesouvá** data z localStorage do `sessionStorage` s `SESSION_KEYS`
4. Nová záložka → nemá přístup k `sessionStorage` → **odhlášení**
5. F5 refresh → `sessionStorage` může být vymazán → **odhlášení**

### Po opravě:
1. Uživatel se přihlásí → data uložena v `localStorage` s `PERSISTENT_KEYS`
2. AuthContext se inicializuje → **migrace NENÍ volána**
3. Data zůstávají v `localStorage` → sdílená mezi všemi záložkami ✅
4. Nová záložka → **automaticky přihlášen** ✅
5. F5 refresh → **session zachována** ✅

## 🧹 Vyčištění migračního flagu

Pokud už byla migrace jednou spuštěna, je třeba vyčistit migrační flag:

**Manuálně v browser console:**
```javascript
localStorage.removeItem('auth_migration_completed');
console.log('✅ Migrační flag smazán');
```

**Nebo použít připravený skript:**
- Soubor: `test-debug/clear-migration-flag.js`
- Zkopírovat obsah do browser console

## 📝 Poznámky

### Proč se volala migrace?
Migrace byla původně vytvořena pro přechod z `localStorage` na `sessionStorage` z důvodu bezpečnosti. Ale tento přístup:
- ❌ Nefunguje pro multi-tab aplikace
- ❌ Způsobuje ztrátu session po F5
- ❌ Komplikuje incognito mode

### Správné řešení:
- ✅ Používat `localStorage` s `PERSISTENT_KEYS` pro ALL auth data
- ✅ Šifrovat citlivá data pomocí Web Crypto API
- ✅ Incognito mode automaticky izoluje `localStorage` v prohlížeči
- ✅ BroadcastChannel API pro sync mezi záložkami

## 🔍 Verifikace

Po opravě zkontrolujte v browser console:

```javascript
// Zkontrolovat, že data JSOU v localStorage
console.log('Token:', localStorage.getItem('auth_token_persistent') ? '✅' : '❌');
console.log('User:', localStorage.getItem('auth_user_persistent') ? '✅' : '❌');

// Zkontrolovat, že data NEJSOU v sessionStorage
console.log('Token v sessionStorage:', sessionStorage.getItem('auth_token') ? '⚠️ PROBLÉM' : '✅ OK');
```

## 📚 Související soubory

- `src/context/AuthContext.js` - Zakomentováno volání migrace
- `src/utils/authStorage.js` - Funkce `migrateAuthDataToSessionStorage()` ponechána pro zpětnou kompatibilitu (ale NENÍ volána)
- `test-debug/clear-migration-flag.js` - Helper skript pro vyčištění flagu

## ✅ Stav po opravě

- [x] Zakomentováno volání `migrateAuthDataToSessionStorage()` v AuthContext
- [x] Vytvořen helper skript pro vyčištění migračního flagu
- [x] Dokumentace vytvořena
- [ ] Otestovat v normálním režimu (multi-tab)
- [ ] Otestovat v incognito režimu (multi-tab + F5)
- [ ] Ověřit šifrování dat

## 🎯 Očekávané chování

**Normální režim:**
- ✅ Přihlášení drženo mezi všemi záložkami
- ✅ F5 refresh zachová session
- ✅ Nové záložky automaticky přihlášené

**Incognito režim:**
- ✅ Přihlášení drženo mezi všemi záložkami v rámci jednoho okna
- ✅ F5 refresh zachová session
- ✅ Zavření okna smaže všechna data (automaticky prohlížečem)

**Multi-user:**
- ✅ Změna uživatele automaticky smaže data předchozího uživatele (userStorage.js)
- ✅ Žádné sdílení dat mezi uživateli
