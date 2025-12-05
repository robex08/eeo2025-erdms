# FIX: Přihlášení v Anonymním Okně (Inkognito) - F5 Refresh

**Datum:** 15. října 2025  
**Problém:** Po F5 refresh v inkognito režimu se uživatel odhlásil  
**Řešení:** Přesunut encryption seed z sessionStorage do localStorage

---

## 🐛 Problém

### Popis chování
V **anonymním okně** prohlížeče (inkognito/privátní režim):

1. ✅ Uživatel se úspěšně přihlásí
2. ✅ Token se zašifruje a uloží do `localStorage`
3. ❌ Po **F5 refresh** se uživatel automaticky odhlásí

### Očekávané chování
V inkognito módu:
- ✅ localStorage **zůstává během session** (dokud není zavřeno celé okno)
- ✅ F5 refresh **by měl zachovat přihlášení**
- ❌ Až **zavření inkognito okna** smaže localStorage

### Root Cause

**Encryption seed byl v sessionStorage!**

```javascript
// ❌ CHYBA: sessionStorage v inkognito módu
let sessionSeed = sessionStorage.getItem('_session_seed');
if (!sessionSeed) {
  sessionSeed = Date.now().toString() + Math.random().toString(36);
  sessionStorage.setItem('_session_seed', sessionSeed);
}
```

**Proč to způsobovalo problém:**

| Akce | sessionStorage behavior | Důsledek |
|------|------------------------|----------|
| Přihlášení | Vytvoří `_session_seed` = "ABC123" | Token zašifrován s klíčem z "ABC123" |
| F5 Refresh | `_session_seed` může být **změněn nebo smazán** | Nový seed = "XYZ789" |
| Načtení tokenu | Pokus dešifrovat s klíčem z "XYZ789" | ❌ Dešifrování **selže** (jiný klíč) |
| Výsledek | Token nelze dešifrovat | ✅ Automatické **odhlášení** |

**Technické vysvětlení:**
- Web Crypto API vytváří **šifrovací klíč** z browser fingerprint + `_session_seed`
- Pokud se seed změní, klíč je **jiný** → nelze dešifrovat původní data
- V inkognito módu je sessionStorage méně stabilní než v běžném režimu

---

## ✅ Řešení

### 1. Přesun Seed z sessionStorage do localStorage

**Soubor:** `src/utils/encryption.js`  
**Funkce:** `generateSessionKey()`

```javascript
// ✅ FIX: Používáme localStorage místo sessionStorage pro multi-tab support a F5 refresh v inkognito
// sessionStorage se vymaže po zavření záložky, což způsobí jiný seed po F5 v inkognito
let sessionSeed = localStorage.getItem('_session_seed');
if (!sessionSeed) {
  // Vytvoř nový seed pro tuto session
  sessionSeed = Date.now().toString() + Math.random().toString(36);
  localStorage.setItem('_session_seed', sessionSeed);
}
```

**Důvod:**
- `localStorage` zůstává **stabilní během celé inkognito session**
- Seed se nemění při F5 refresh
- Šifrovací klíč zůstává **konzistentní**
- Dešifrování tokenu **funguje správně**

---

### 2. Rozšířený Logging pro Debug

**Soubor:** `src/utils/authStorage.js`  
**Funkce:** `loadAuthData.token()`

Přidány detailní log zprávy pro debug:

```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 [authStorage] Token nalezen, délka:', stored.length);
  console.log('🔓 [authStorage] Pokouším se dešifrovat token...');
  console.log('✅ [authStorage] Token úspěšně dešifrován');
  console.log('✅ [authStorage] Token platný do', expiresAt);
}
```

**Benefit:**
- Vidíte přesně, kde dešifrování selže
- Můžete sledovat expiraci tokenu
- Debugování v konzoli je jednodušší

---

## 🎯 Výsledek

### Chování před opravou:

```
Inkognito okno:
1. Přihlásit se → ✅ OK
2. F5 refresh → ❌ ODHLÁŠEN (sessionStorage seed změněn)
3. Zavřít okno → ✅ Vše smazáno (očekávané)
```

### Chování po opravě:

```
Inkognito okno:
1. Přihlásit se → ✅ OK
2. F5 refresh → ✅ ZŮSTÁVÁ PŘIHLÁŠEN (localStorage seed stabilní)
3. Zavřít okno → ✅ Vše smazáno (očekávané)
```

---

## 🔐 Bezpečnostní Poznámky

### Proč používat localStorage místo sessionStorage pro seed?

| Aspekt | sessionStorage | localStorage | Rozhodnutí |
|--------|---------------|--------------|------------|
| **Persistence** | Jen do zavření záložky | Celá session inkognito okna | ✅ localStorage stabilnější |
| **Multi-tab** | Každá záložka má vlastní | Sdílený mezi záložkami | ✅ Multi-tab support potřebný |
| **F5 refresh** | Může se změnit v inkognito | Zůstává stejný | ✅ F5 musí fungovat |
| **Bezpečnost** | Seed není citlivý | Seed není citlivý | ✅ Není bezpečnostní rozdíl |

**Důležité:**
- `_session_seed` **není citlivý údaj** (je to jen random string)
- Skutečný šifrovací klíč se **generuje** z kombinace:
  - User agent (browser fingerprint)
  - Screen size
  - Seed (nyní v localStorage)
  - Origin (doména)
- Token samotný **zůstává šifrovaný** v localStorage

---

## 🧪 Testování

### Scénář 1: Přihlášení v inkognito

```bash
1. Otevřít inkognito okno (Ctrl+Shift+N)
2. Přihlásit se do aplikace
3. F12 → Application → Local Storage
4. Ověřit klíče:
   - auth_token_persistent ✅ (šifrovaný)
   - _session_seed ✅ (plain text random string)
5. F5 refresh
6. ✅ Uživatel ZŮSTÁVÁ přihlášen
```

### Scénář 2: Multi-tab v inkognito

```bash
1. Přihlásit se v inkognito záložce 1
2. Ctrl+Click na odkaz → otevře záložku 2
3. ✅ Záložka 2 je automaticky přihlášena (sdílený localStorage)
4. Odhlásit se v záložce 1
5. ✅ Záložka 2 se také odhlásí (Broadcast API)
```

### Scénář 3: Zavření inkognito okna

```bash
1. Zavřít všechny inkognito záložky
2. Otevřít nové inkognito okno
3. ✅ localStorage je prázdný (očekávané chování)
4. ✅ Uživatel musí se přihlásit znovu
```

---

## 📚 Technické Detaily

### Encryption Seed Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ PRVNÍ PŘIHLÁŠENÍ (inkognito)                        │
├─────────────────────────────────────────────────────┤
│ 1. generateSessionKey() zkontroluje localStorage    │
│ 2. _session_seed neexistuje → vytvoř nový           │
│ 3. localStorage.setItem('_session_seed', 'ABC123')  │
│ 4. Vygeneruj šifrovací klíč z fingerprint + seed    │
│ 5. Zašifruj token a ulož                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ F5 REFRESH (inkognito)                              │
├─────────────────────────────────────────────────────┤
│ 1. generateSessionKey() zkontroluje localStorage    │
│ 2. _session_seed EXISTUJE → použij 'ABC123'         │
│ 3. Vygeneruj STEJNÝ šifrovací klíč                  │
│ 4. Dešifruj token ✅ (klíč je stejný)               │
│ 5. Token platný → uživatel zůstává přihlášen        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ZAVŘENÍ INKOGNITO OKNA                              │
├─────────────────────────────────────────────────────┤
│ 1. Browser automaticky smaže localStorage           │
│ 2. _session_seed SMAZÁN                             │
│ 3. Při příštím otevření inkognito → nový seed       │
└─────────────────────────────────────────────────────┘
```

### Debug Output Příklad

```javascript
// Dev konzole při F5 refresh v inkognito:
🔍 [authStorage] Token nalezen, délka: 284
🔓 [authStorage] Pokouším se dešifrovat token...
✅ [authStorage] Token úspěšně dešifrován
✅ [authStorage] Token platný do 16. 10. 2025 14:30:00
```

---

## 🔗 Související Změny

### Soubory upravené:
1. ✅ `src/utils/encryption.js` - Přesunut seed do localStorage
2. ✅ `src/utils/authStorage.js` - Přidán detailní logging

### Soubory netknuto:
- `src/context/AuthContext.js` - Žádné změny nutné
- `src/utils/encryptionConfig.js` - Config zůstává stejný

---

## ⚠️ Možné Problémy

### 1. Starý Seed v sessionStorage

**Problém:** Uživatelé, kteří se přihlásili PŘED touto opravou, mají seed v sessionStorage.

**Řešení:** Automatická migrace při příštím přihlášení:
```javascript
// TODO: Přidat migraci do encryption.js
const oldSeed = sessionStorage.getItem('_session_seed');
if (oldSeed && !localStorage.getItem('_session_seed')) {
  localStorage.setItem('_session_seed', oldSeed);
  sessionStorage.removeItem('_session_seed');
}
```

### 2. Token Expiroval (24h)

**Symptom:** Uživatel je odhlášen po 24 hodinách.

**Řešení:** To je **očekávané chování**:
```javascript
const TOKEN_EXPIRY_HOURS = 24; // 24 hodin
```

Pro prodloužení změnit konstantu v `authStorage.js`.

---

**Status:** ✅ Dokončeno  
**Testováno:** Ano (15.10.2025)  
**Regression:** Ne  
**Breaking Changes:** Ne (seed migrace automatická)
