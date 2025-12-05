# 🔐 Encryption Debug Mode

Systém umožňuje vypnout šifrování citlivých dat pro účely debugování.

## 📋 Konfigurace

V `.env` souboru nastavte:

```env
# 🔐 ENCRYPTION DEBUG MODE
# false = normální šifrování (DOPORUČENO)
# true = DEBUG režim - data nejsou šifrována
REACT_APP_ENCRYPTION_DEBUG=false
```

## 🚨 VAROVÁNÍ BEZPEČNOSTI

- **NIKDY** nenastavujte `REACT_APP_ENCRYPTION_DEBUG=true` v produkci!
- Debug režim exponuje citlivá data v plain textu v sessionStorage
- Používejte pouze při lokálním vývoji a debugování

## 📊 Použití

### Normální režim (DOPORUČENO)
```env
REACT_APP_ENCRYPTION_DEBUG=false  # nebo odstraňte řádek
```
- Citlivá data (tokeny, uživatelské údaje) jsou šifrována
- Bezpečné pro produkci
- V dev konzoli vidíte: `🔒 Token zašifrován a uložen`

### Debug režim (POUZE PRO VÝVOJ)
```env
REACT_APP_ENCRYPTION_DEBUG=true
```
- Šifrování je vypnuto
- Data jsou viditelná v plain textu v DevTools
- V dev konzoli vidíte varování: `🚨 ENCRYPTION DEBUG MODE: Šifrování vypnuto`

## 🛠️ Implementace

Systém používá funkci `shouldEncryptData()` která:
1. Kontroluje `REACT_APP_ENCRYPTION_DEBUG` flag
2. Pokud je `true`, vrací `false` (bez šifrování)
3. Pokud je `false` nebo není nastaveno, používá normální logiku šifrování

## 🎯 Příklady

```javascript
// V authStorage.js
if (shouldEncryptData(SESSION_KEYS.TOKEN)) {
  // Šifrování je povoleno
  const encrypted = await encryptData(token);
  sessionStorage.setItem(SESSION_KEYS.TOKEN, encrypted);
} else {
  // Debug režim nebo fallback
  sessionStorage.setItem(SESSION_KEYS.TOKEN, token);
}
```

## 🔍 Monitorování

V development módu můžete sledovat stav šifrování v konzoli:
- `🔒 Data zašifrována` = normální režim
- `🚨 ENCRYPTION DEBUG MODE` = debug režim aktivní
- `⚠️ Data uložena NEŠIFROVANĚ (fallback)` = chyba šifrování