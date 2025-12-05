# 🕵️ Inkognito / Anonymní Režim - Implementace

## Problém

Po přihlášení v normálním okně, persistent tokeny v `localStorage` zůstávají aktivní i po otevření anonymního okna (Inkognito / Private Browsing). To znamená, že:

1. **Normální okno**: Uživatel se přihlásí → tokeny se uloží do `localStorage`
2. **F5 refresh** → Uživatel zůstane přihlášen ✅ (OK)
3. **Anonymní okno**: Otevře aplikaci → Najde tokeny v `localStorage` → Automaticky přihlášen ⚠️ (NE OK!)
4. **Zavření anonymního okna** → Tokeny zůstávají v `localStorage` ⚠️ (NE OK!)

### Očekávané chování

V anonymním okně:
- ✅ Uživatel se může přihlásit
- ✅ Po F5 zůstane přihlášen (dokud je okno otevřené)
- ✅ Po **zavření anonymního okna** → automaticky odhlášen
- ✅ **Nový persistent token NENÍ uložen do localStorage** (zůstane jen v sessionStorage)

## Řešení

### 1. Detekce anonymního režimu

**Soubor**: `src/utils/incognitoDetection.js`

```javascript
export const detectIncognitoMode = async () => {
  // METODA 1: localStorage quota test
  // METODA 2: FileSystem API test (Chrome/Edge)
  // METODA 3: IndexedDB test (Firefox)
  // METODA 4: sessionStorage persistence test
  
  return isIncognito;
};
```

**Detekční metody:**

| Prohlížeč | Metoda detekce | Spolehlivost |
|-----------|----------------|--------------|
| Chrome/Edge | Storage quota < 120MB | ⭐⭐⭐⭐⭐ |
| Firefox | IndexedDB blokován | ⭐⭐⭐⭐ |
| Safari | localStorage omezený | ⭐⭐⭐ |
| Všechny | localStorage write test | ⭐⭐⭐ |

### 2. Inkognito-aware storage wrapper

**Soubor**: `src/utils/authStorageIncognito.js`

Wrapper nad původním `authStorage.js`, který:
- ✅ Detekuje inkognito mód před ukládáním
- ✅ V inkognito používá `sessionStorage` (zmizí po zavření okna)
- ✅ V normálním režimu používá `localStorage` (persistent)
- ✅ Při načítání kontroluje **OBA** storage (sessionStorage prioritně)

```javascript
const getAppropriateStorage = async () => {
  const isIncognito = await isIncognitoMode();
  return isIncognito ? sessionStorage : localStorage;
};

export const saveAuthData = {
  token: async (token) => {
    const storage = await getAppropriateStorage();
    // Ulož do správného storage podle režimu
  }
};

export const loadAuthData = {
  token: async () => {
    // 1. Zkus sessionStorage (inkognito)
    // 2. Fallback na localStorage (normální)
  }
};
```

### 3. Integrace do AuthContext

**Změna v**: `src/context/AuthContext.js`

```javascript
// PŘED:
import { saveAuthData, loadAuthData, clearAuthData } from '../utils/authStorage';

// PO:
import { saveAuthData, loadAuthData, clearAuthData } from '../utils/authStorageIncognito';
```

Žádné další změny v `AuthContext.js` nejsou potřeba! Wrapper je transparentní.

## Testy

### 1. Základní test v DevTools console

```javascript
// Test detekce inkognito
import { isIncognitoMode, detectIncognitoMode } from './src/utils/incognitoDetection.js';

const testIncognito = async () => {
  const isIncognito = await isIncognitoMode();
  console.log('Inkognito mód:', isIncognito ? 'ANO' : 'NE');
  
  if (isIncognito) {
    console.log('✅ Tokeny budou v sessionStorage');
    console.log('✅ Po zavření okna budou automaticky smazány');
  } else {
    console.log('✅ Tokeny budou v localStorage');
    console.log('✅ Po zavření okna zůstanou (24h expiration)');
  }
};

testIncognito();
```

### 2. Manuální testovací scénáře

#### Scénář A: Normální okno → Přihlášení → F5
```
1. Otevři normální okno
2. Přihlaš se (user: admin, pwd: admin)
3. Zkontroluj localStorage → měl by obsahovat auth_token_persistent
4. Zmáčkni F5
5. ✅ Měl bys zůstat přihlášen
6. Zavři prohlížeč → Otevři znovu
7. ✅ Měl bys zůstat přihlášen (24h)
```

#### Scénář B: Anonymní okno → Přihlášení → F5
```
1. Otevři anonymní okno (Ctrl+Shift+N v Chrome)
2. Přihlaš se (user: admin, pwd: admin)
3. Zkontroluj sessionStorage → měl by obsahovat auth_token_persistent
4. Zkontroluj localStorage → NEmá obsahovat auth_token_persistent
5. Zmáčkni F5
6. ✅ Měl bys zůstat přihlášen
7. Zavři anonymní okno → Otevři nové
8. ✅ Měl bys být ODHLÁŠEN
```

#### Scénář C: Normální okno přihlášen → Otevři anonymní okno
```
1. V normálním okně se přihlaš
2. localStorage obsahuje auth_token_persistent
3. Otevři NOVÉ anonymní okno
4. ⚠️ Detekce inkognito by měla zabránit použití localStorage tokenu
5. ✅ V anonymním okně by neměl být automaticky přihlášen
```

### 3. Automatizovaný test

**Soubor**: `test-debug/test-incognito-mode.js`

```javascript
const testIncognitoImplementation = async () => {
  console.group('🕵️ Test inkognito implementace');
  
  // 1. Detekce
  const { isIncognitoMode } = await import('../src/utils/incognitoDetection.js');
  const isIncognito = await isIncognitoMode();
  console.log('1. Detekce:', isIncognito ? 'INKOGNITO' : 'NORMÁLNÍ');
  
  // 2. Storage test
  const { saveAuthData, loadAuthData } = await import('../src/utils/authStorageIncognito.js');
  
  await saveAuthData.token('test-token-123');
  const loaded = await loadAuthData.token();
  
  if (isIncognito) {
    console.log('2. Token v sessionStorage:', sessionStorage.getItem('auth_token_persistent') ? '✅' : '❌');
    console.log('3. Token NENÍ v localStorage:', !localStorage.getItem('auth_token_persistent') ? '✅' : '❌');
  } else {
    console.log('2. Token v localStorage:', localStorage.getItem('auth_token_persistent') ? '✅' : '❌');
  }
  
  console.log('4. Token načten zpět:', loaded === 'test-token-123' ? '✅' : '❌');
  
  console.groupEnd();
};

testIncognitoImplementation();
```

## Detekční limity

### ⚠️ Není 100% spolehlivé

Detekce inkognito **není garantovaná** ve všech prohlížečích a verzích. Možné problémy:

| Problém | Důsledek | Řešení |
|---------|----------|--------|
| Detekce selže (false negative) | Token ulož do localStorage i v inkognito | User zůstane přihlášen i po zavření okna → vyžaduje manuální logout |
| Detekce nahlásí inkognito v normálním režimu (false positive) | Token v sessionStorage místo localStorage | Po zavření okna dojde k odhlášení → user se musí přihlásit znovu |

### Fallback strategie

Pro maximální bezpečnost:

```javascript
// V logout cleanup
export const performLogoutCleanup = () => {
  // Vymaž VŽDY oba storage
  sessionStorage.clear();
  localStorage.removeItem('auth_token_persistent');
  localStorage.removeItem('auth_user_persistent');
  // ...
};
```

## Debug

### Zobrazení stavu v DevTools

```javascript
console.group('🔍 Auth Storage Debug');
console.log('sessionStorage:', Object.keys(sessionStorage).filter(k => k.includes('auth')));
console.log('localStorage:', Object.keys(localStorage).filter(k => k.includes('auth')));

import { isIncognitoMode } from './src/utils/incognitoDetection.js';
const isIncognito = await isIncognitoMode();
console.log('Režim:', isIncognito ? 'INKOGNITO' : 'NORMÁLNÍ');
console.groupEnd();
```

### Force režim (pro testování)

V `incognitoDetection.js`:

```javascript
// Pro vynucené testování inkognito módu
const FORCE_INCOGNITO = false; // Nastav na true pro test

export const isIncognitoMode = async () => {
  if (FORCE_INCOGNITO) return true;
  // ... normální detekce
};
```

## Výhody řešení

✅ **Transparentní** - Žádné změny v `AuthContext.js` (kromě importu)
✅ **Backward compatible** - Funguje i když detekce selže (fallback na localStorage)
✅ **Testovatelné** - Jasné API pro testy
✅ **Bezpečné** - V inkognito nikdy nepersistuje do localStorage
✅ **Multi-browser** - Různé detekční metody pro různé prohlížeče

## Známá omezení

⚠️ **Safari Private Browsing** - Detekce může být méně spolehlivá
⚠️ **Brave Shield** - Může blokovat některé detekční metody
⚠️ **Firefox Container Tabs** - Nejsou inkognito, ale mají izolovaný storage
⚠️ **Mobile prohlížeče** - Inkognito detekce může být odlišná

## Závěr

Implementace poskytuje **best-effort** ochranu proti persistentnímu přihlášení v anonymním režimu, ale není 100% garantovaná. Pro maximální bezpečnost by uživatelé měli používat **explicitní logout** před zavřením okna.
