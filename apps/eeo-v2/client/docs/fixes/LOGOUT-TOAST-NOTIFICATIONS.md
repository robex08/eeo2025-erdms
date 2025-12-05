# LOGOUT TOAST NOTIFIKACE - PŘEHLED

## Implementované logout důvody a zprávy

### 🟢 USER_MANUAL
**Uživatel se odhlásil sám**
- **Titel:** "Odhlášení"
- **Zpráva:** "Byli jste úspěšně odhlášeni."
- **Typ:** success (zelený)
- **Trvání:** 3 sekundy

### 🟡 TOKEN_EXPIRED  
**Platnost tokenu vypršela**
- **Titel:** "Platnost přihlášení vypršela"
- **Zpráva:** "Vaše přihlášení vypršelo. Prosím přihlaste se znovu."
- **Typ:** warning (žlutý)
- **Trvání:** 5 sekund

### 🟡 TOKEN_INVALID
**Token je neplatný**
- **Titel:** "Neplatné přihlášení"
- **Zpráva:** "Vaše přihlášení je neplatné. Prosím přihlaste se znovu."
- **Typ:** warning (žlutý)
- **Trvání:** 5 sekund

### 🔴 SERVER_ERROR
**Chyba komunikace se serverem**
- **Titel:** "Chyba serveru"
- **Zpráva:** "Došlo k chybě při komunikaci se serverem. Byli jste odhlášeni."
- **Typ:** error (červený)
- **Trvání:** 6 sekund

### 🔴 ACCOUNT_DEACTIVATED
**Účet byl deaktivován**
- **Titel:** "Účet deaktivován"
- **Zpráva:** "Váš účet byl deaktivován. Kontaktujte administrátora."
- **Typ:** error (červený)
- **Trvání:** 8 sekund

### 🟡 DATA_CORRUPTION
**Poškozená přihlašovací data**
- **Titel:** "Poškozená data"
- **Zpráva:** "Byla detekována poškozená přihlašovací data. Prosím přihlaste se znovu."
- **Typ:** warning (žlutý)
- **Trvání:** 6 sekund

### 🔵 SECURITY_CLEANUP
**Security cleanup**
- **Titel:** "Bezpečnostní vyčištění"
- **Zpráva:** "Z bezpečnostních důvodů byla provedena obnova přihlášení."
- **Typ:** info (modrý)
- **Trvání:** 5 sekund

### 🟡 ENCRYPTION_ERROR
**Chyba šifrování dat**
- **Titel:** "Chyba šifrování"
- **Zpráva:** "Došlo k chybě při zabezpečení dat. Prosím přihlaste se znovu."
- **Typ:** warning (žlutý)
- **Trvání:** 6 sekund

### 🔵 DEVELOPMENT_RESET
**Vývojový reset (dev mode)**
- **Titel:** "Vývojový reset"
- **Zpráva:** "Přihlašovací data byla resetována (vývojový režim)."
- **Typ:** info (modrý)
- **Trvání:** 4 sekundy

## Automatická detekce důvodů

### Server errors (API responses)
- **401 Unauthorized** → `TOKEN_EXPIRED`
- **403 Forbidden** → `TOKEN_INVALID`
- **500+ Server errors** → `SERVER_ERROR`

### Encryption errors
- **"decrypt", "encrypt", "crypto", "operationerror"** → `ENCRYPTION_ERROR`

### Data parsing errors
- **"json", "parse", "syntax"** → `DATA_CORRUPTION`

### Account status
- **"deactivat", "disabled", "suspended"** → `ACCOUNT_DEACTIVATED`

## Použití v kódu

### Základní logout s automatickou detekcí
```javascript
// Automaticky detekuje důvod na základě chyby
logout(detectLogoutReason(error), { error: error.message });
```

### Logout s konkrétním důvodem
```javascript
import { LOGOUT_REASONS } from '../utils/logoutNotifications';

// Manuální odhlášení
logout(LOGOUT_REASONS.USER_MANUAL);

// Deaktivovaný účet
logout(LOGOUT_REASONS.ACCOUNT_DEACTIVATED);

// S dodatečnými informacemi
logout(LOGOUT_REASONS.DATA_CORRUPTION, { 
  details: 'Neúplná data v úložišti' 
});
```

### Přímé zobrazení toast (bez logout)
```javascript
import { showLogoutToast, LOGOUT_REASONS } from '../utils/logoutNotifications';

showLogoutToast(showToast, LOGOUT_REASONS.TOKEN_EXPIRED, {
  details: 'Dodatečné informace'
});
```

## Debug a testování

### V browser console:
```javascript
// Zobrazí všechny dostupné důvody
console.log(window.LOGOUT_REASONS);

// Test konkrétního důvodu
showLogoutToast(showToast, LOGOUT_REASONS.ENCRYPTION_ERROR);
```

### V debug panelu:
- **Test Logout Toast** - testuje náhodný logout důvod
- Všechny toast notifikace se logují do console

## Fallback mechanismus

Pokud Toast context není dostupný:
- **Error/Warning toasty** → zobrazí se browser alert
- **Success/Info toasty** → pouze console log
- Všechny události se vždy logují do console

## Logování

Každý logout event se loguje s:
- Timestamp
- Důvod odhlášení
- Username/UserID
- User Agent
- Current URL
- Dodatečné informace

V development módu vše v console, v produkci můžeme přidat analytics tracking.