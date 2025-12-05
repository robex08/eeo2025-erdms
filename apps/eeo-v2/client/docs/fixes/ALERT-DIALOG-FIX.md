# OPRAVA NECHTĚNÝCH LOGOUT ALERT DIALOGŮ

## PROBLÉM ❌
Při každém načtení aplikace se zobrazoval alert dialog "Poškozená data", i když se uživatel normálně přihlašoval.

## PŘÍČINY
1. **Fallback alert mechanismus** - pokud Toast context nebyl dostupný, zobrazil se browser alert
2. **Toast při inicializaci** - logout notifikace se zobrazovaly i při běžné inicializaci app
3. **Příliš přísná detekce** - normální stavy se mylně považovaly za "poškozená data"

## IMPLEMENTOVANÉ OPRAVY ✅

### 1. Omezený fallback alert mechanismus
**Soubor:** `/src/utils/logoutNotifications.js`

```javascript
// PŘED: Zobrazoval alert pro všechny error/warning typy
if (logoutReason.type === 'error' || logoutReason.type === 'warning') {
  alert(`${logoutReason.title}\n\n${message}`);
}

// PO: Alert pouze pro kritické chyby
if (logoutReason.type === 'error' && 
    (logoutReason.code === 'ACCOUNT_DEACTIVATED' || logoutReason.code === 'SERVER_ERROR')) {
  window.alert(`${logoutReason.title}\n\n${message}`);
}
// Ostatní pouze loguj do console
```

### 2. Žádné toast při inicializaci
**Soubor:** `/src/context/AuthContext.js`

```javascript
// PŘED: Toast při detekci "poškozených dat" během init
showLogoutToast(showToast, LOGOUT_REASONS.DATA_CORRUPTION, {
  details: 'Neúplná data v úložišti'
});

// PO: Pouze console log, žádný toast
console.warn('⚠️ Poškozená auth data při inicializaci, čistím sessionStorage...');
// Nevypisuj toast při inicializaci - uživatel se ještě nepřihlašoval
```

### 3. Tichý cleanup při API selhání během init
```javascript
// PŘED: Logout s toast notifikací
const reason = detectLogoutReason(error);
logout(reason, { error: error.message });

// PO: Tichý cleanup bez notifikací
console.warn('🔓 Token validation failed during init:', error.message);
// Pouze vyčisti data a přejdi na login - bez toast
```

### 4. Volitelné toast notifikace
```javascript
// Přidán parametr showNotification
const logout = useCallback((reason, additionalInfo, showNotification = true) => {
  if (showNotification) {
    showLogoutToast(showToast, reason, additionalInfo);
  }
  // ... zbytek logout logiky
});
```

## NOVÉ DEBUG NÁSTROJE 🛠️

### `/src/utils/logoutToastDebug.js`
- **Bezpečné testování** toast notifikací bez skutečného logout
- **Browser console API:** `window.debugLogoutToasts.test(showToast, 'TOKEN_EXPIRED')`
- **Batch testing:** všechny typy najednou

### Debug panel tlačítko
- **Test Logout Toast** - testuje náhodný typ notifikace
- **Bez side-effects** - neovlivňuje přihlášení

## VÝSLEDEK ✅

### Co se NYNÍ zobrazuje:
- **Manuální logout** → Success toast
- **Skutečné token expired** → Warning toast  
- **Kritické server chyby** → Error toast (+ fallback alert)
- **Deaktivovaný účet** → Error toast (+ fallback alert)

### Co UŽ SE NEZOBRAZUJE:
- ❌ Alert při každém načtení stránky
- ❌ Toast při běžné inicializaci aplikace
- ❌ Notifikace při refreshu stránky (F5)
- ❌ Debug zprávy v produkci

### Pouze v development:
- Console warnings pro debug účely
- Extended logging informace

## TESTOVÁNÍ

### Pro ověření opravy:
1. **Refresh stránky (F5)** → žádný alert
2. **Nové otevření aplikace** → žádný alert  
3. **Skutečný logout** → správný toast podle důvodu
4. **Debug panel** → "Test Logout Toast" pro testování

### Browser console:
```javascript
// Test konkrétního typu
window.debugLogoutToasts.test(showToast, 'TOKEN_EXPIRED', 'Test zpráva');

// Test všech typů
window.debugLogoutToasts.testAll(showToast);
```

Alert dialog se již nebude zobrazovat při běžném používání aplikace! 🎉