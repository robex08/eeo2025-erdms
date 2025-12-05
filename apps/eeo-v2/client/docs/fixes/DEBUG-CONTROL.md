# Debug funkce - řízení v produkci

## 🔧 Jak vypnout debug funkce

Debug funkce jsou automaticky dostupné pouze v **development módu** (`NODE_ENV=development`).

### Environment proměnné:

```bash
# .env soubor
REACT_APP_ENABLE_DEBUG=false   # Vypne debug funkce i v dev módu
```

### Automatické chování:

#### ✅ Development mód (`npm start`)
- **REACT_APP_ENABLE_DEBUG=true** (default) → Debug funkce dostupné
- **REACT_APP_ENABLE_DEBUG=false** → Debug funkce vypnuté

#### 🚫 Produkce (`npm run build`)
- Debug funkce **VŽDY vypnuté** bez ohledu na REACT_APP_ENABLE_DEBUG

### Debug funkce, které se řídí tímto nastavením:

1. **window.debugEncryption*** - Testování šifrování
   - `window.debugEncryption.status()`
   - `window.debugEncryption.test()`
   - `window.debugEncryption.testData(data, key)`
   - `window.debugEncryption.clearStorage()`

2. **window.testEncryption*** - Detailní testy šifrování
   - `window.testEncryption.cycle()`
   - `window.testEncryption.persistence()`
   - `window.testEncryption.authFlow()`
   - `window.testEncryption.runAll()`

3. **window.debugF5Issue*** - Testování F5 refresh problémů
   - `window.debugF5Issue.runAllTests()`
   - `window.debugF5Issue.testEncryptionStability()`
   - `window.debugF5Issue.checkAuthData()`

## 🚀 Pro produkci:

### Doporučené nastavení:

```bash
# .env.production
REACT_APP_ENABLE_DEBUG=false
# nebo neuvádějte proměnnou vůbec
```

### Build pro produkci:
```bash
npm run build
# Debug funkce budou automaticky odstraněny
```

## 🔍 Kontrola stavu:

V dev módu v konzoli uvidíte:
- ✅ `🛠️ Debug funkce dostupné: window.debugEncryption.help()`
- ❌ `🚫 Debug funkce vypnuty pomocí REACT_APP_ENABLE_DEBUG=false`

## 📝 Poznámky:

- Debug funkce **neovlivňují výkon** v produkci - jsou úplně odstraněny z kódu
- Logování do konzole je také podmíněné - v produkci se nezobrazuje
- Environment proměnné začínající `REACT_APP_` jsou vestavěny do build během kompilace