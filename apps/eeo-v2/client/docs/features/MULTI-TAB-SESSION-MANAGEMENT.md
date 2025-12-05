# Multi-Tab Session Management - Best Practices

## 📋 Přehled

Aplikace podporuje práci ve více záložkách prohlížeče s **jednou sdílenou session** na uživatele. Všechny záložky sdílejí:
- ✅ Přihlášení (token, user data)
- ✅ Koncept objednávky (draft)
- ✅ UI preferences
- ✅ Notifikace a synchronizaci stavu

## 🎯 Klíčové požadavky

### 1. Jedna session v rámci prohlížeče
- **Požadavek**: V jednom prohlížeči by měl mít uživatel v rámci záložek jen jednu svou session
- **Implementace**: Session je vázána na `user_id` a ukládá se do `localStorage` (ne `sessionStorage`!)
- **Benefit**: Otevřete-li novou záložku, zůstanete přihlášeni se stejnými daty

### 2. Synchronizace mezi záložkami
- **Technologie**: `BroadcastChannel API` + fallback na `localStorage events`
- **Události**:
  - `LOGIN` - přihlášení v jiné záložce → načíst data z localStorage
  - `LOGOUT` - odhlášení v jiné záložce → odhlásit všechny záložky
  - `DRAFT_UPDATED` - změna konceptu → refresh menu baru
  - `DRAFT_DELETED` - smazání konceptu → refresh menu baru
  - `ORDER_SAVED` - uložení objednávky → refresh seznamu

### 3. Izolace dat mezi uživateli
- **Požadavek**: Pokud se odhlásí a přihlásí jiný uživatel, nesmí dojít k tomu, že by sdíleli svoje data
- **Implementace**: 
  - Každý draft je uložen s klíčem obsahujícím `user_id`: `order25-draft-{user_id}`
  - Při změně uživatele se automaticky vyčistí data předchozího uživatele
  - Šifrování citlivých dat (tokeny, user detail) pomocí Web Crypto API

### 4. Šifrování dat
- **Co je šifrováno**:
  - ✅ Auth token (24h expiration)
  - ✅ User data (username, id)
  - ✅ User detail (jméno, příjmení, oddělení, oprávnění)
  - ✅ User permissions
- **Co NENÍ šifrováno**:
  - ❌ Koncepty objednávek (pod user_id, ale plain JSON pro performance)
  - ❌ UI preferences (neškodná data)
  - ❌ Cache dodavatelů (veřejná data)

**Důvod**: Koncepty obsahují pracovní data, která jsou přiřazena k user_id. Pokud se přihlásí jiný uživatel, koncepty předchozího uživatele jsou automaticky vyčištěny.

## 🔧 Technické detaily

### localStorage vs sessionStorage

| Storage | Použití | Důvod |
|---------|---------|-------|
| `localStorage` | Auth data, koncepty, preferences | Sdílení mezi záložkami, persistence |
| `sessionStorage` | ~~Deprecated~~ | ❌ Nepoužívá se - každá záložka by měla vlastní session |

**Důležité**: Aplikace dříve používala `sessionStorage`, což způsobovalo ztrátu session mezi záložkami a po F5. Nyní vše běží přes `localStorage` s explicitní expirací.

### Koncept vs. více konceptů

**Current implementation**: **Jeden koncept na uživatele**

- ✅ Uživatel může mít pouze jeden aktivní koncept (draft) objednávky
- ✅ Koncept je sdílený mezi všemi záložkami
- ✅ Změny v jedné záložce se projeví ve všech ostatních

**Proč ne více konceptů?**
1. **Simplifikace**: Jednodušší logika, méně chyb
2. **Workflow**: Uživatel by měl dokončit jednu objednávku před zahájením další
3. **UI**: Menu bar jasně ukazuje stav (Nová/Koncept/Editace)
4. **Refresh**: Po odhlášení se načte poslední rozpracovaný koncept

**Use case**: Uživatel může pracovat ve více záložkách, ale s **jedním konceptem**:
- Záložka 1: Editace konceptu objednávky
- Záložka 2: Vyhledávání v seznamu objednávek
- Záložka 3: Adresář dodavatelů (kopírování kontaktů)
- Záložka 4: Číselníky (kontrola kódů)

Všechny záložky vidí stejný koncept a automaticky se aktualizují při změnách.

## 🎨 UI Synchronizace

### Menu Bar - Tlačítko objednávky
Automaticky se aktualizuje při změnách:

```javascript
// Stavy tlačítka
"Nová objednávka"      // Žádný draft
"Koncept objednávka"   // Draft bez ID (nová objednávka)
"Editace objednávky"   // Draft s ID (editace existující)
```

**Ikony**:
- ➕ Plus - Nová objednávka (zelená)
- ✏️ Edit - Koncept/Editace (oranžová)

**Broadcast events** zajišťují, že všechny záložky vidí stejný stav.

### Postup při zavření/smazání konceptu
1. Uživatel klikne "Zrušit objednávku" nebo "Smazat koncept"
2. Draft se smaže z `localStorage`
3. Odešle se `broadcastDraftDeleted(user_id)`
4. Všechny záložky přijmou broadcast a aktualizují menu bar
5. Tlačítko se změní na "Nová objednávka" ➕

## 🔐 Bezpečnost

### 1. Token Expiration
- Token má 24h platnost
- Po expiraci je automaticky smazán
- Uživatel je přesměrován na login

### 2. Network Error Handling
**Důležité**: Network errory (např. v incognito módu bez cookies) **NEVEDOU** k automatickému odhlášení!

```javascript
// ✅ Správně - používá cached data
if (isNetworkError) {
  console.warn('Network error - používám cached data');
  // Load from localStorage, DON'T logout
}

// ✅ Skutečné auth errory
if (error.status === 401 || error.status === 403) {
  console.warn('Token je neplatný - odhlašuji');
  logout();
}
```

### 3. User Data Cleanup
Při odhlášení:
- ✅ Vyčistí všechna user-specific data z `localStorage`
- ✅ Zachová neškodná nastavení (UI preferences)
- ✅ Odešle `broadcastLogout()` do všech záložek
- ✅ Všechny záložky se automaticky odhlásí

## 📊 Testovací scénáře

### Scénář 1: Otevření nové záložky
1. ✅ Přihlásit se v záložce A
2. ✅ Otevřít novou záložku B
3. ✅ **Očekáváno**: Záložka B je automaticky přihlášená se stejnými daty

### Scénář 2: F5 Refresh
1. ✅ Přihlásit se a vytvořit koncept
2. ✅ Stisknout F5
3. ✅ **Očekáváno**: Zůstat přihlášen, koncept zůstane načten

### Scénář 3: Změna konceptu v jiné záložce
1. ✅ Otevřít koncept v záložce A
2. ✅ Upravit koncept v záložce B
3. ✅ **Očekáváno**: Menu bar v záložce A se automaticky aktualizuje

### Scénář 4: Odhlášení v jiné záložce
1. ✅ Přihlášen ve 3 záložkách
2. ✅ Odhlásit se v záložce A
3. ✅ **Očekáváno**: Všechny 3 záložky se automaticky odhlásí

### Scénář 5: Změna uživatele
1. ✅ Přihlášen jako User A, vytvořen koncept
2. ✅ Odhlásit se a přihlásit jako User B
3. ✅ **Očekáváno**: Koncept User A je vyčištěn, User B má prázdný formulář

## 🛠️ Developer Notes

### Broadcast funkce (utils/tabSync.js)
```javascript
// Odeslat broadcast
broadcastLogin(userId, username);
broadcastLogout();
broadcastDraftUpdated(userId, draftData);
broadcastDraftDeleted(userId);
broadcastOrderSaved(orderId, orderNumber);

// Poslouchat broadcast
const cleanup = onTabSyncMessage((message) => {
  switch (message.type) {
    case BROADCAST_TYPES.LOGIN:
      // Načíst data z localStorage
      break;
    case BROADCAST_TYPES.LOGOUT:
      // Odhlásit
      break;
    // ...
  }
});
```

### Auth Storage (utils/authStorage.js)
```javascript
// Uložit (localStorage s 24h expirací)
await saveAuthData.token(token);
await saveAuthData.user(userData);

// Načíst (dešifrování + validace expirace)
const token = await loadAuthData.token();
const user = await loadAuthData.user();

// Smazat
clearAuthData.all();
```

### User Storage (utils/userStorage.js)
```javascript
// Zjistit aktuálního uživatele
const userId = getCurrentUserId();

// Vyčistit data předchozího uživatele
clearUserData(oldUserId);

// Zkontrolovat změnu uživatele
const changed = checkAndCleanUserChange(newUserId);
```

## ✅ Checklist pro nové features

Při implementaci nových features, které ukládají data:

- [ ] Používat `localStorage` (ne `sessionStorage`)
- [ ] Přidat `user_id` do klíče: `feature-data-${user_id}`
- [ ] Implementovat cleanup při změně uživatele
- [ ] Odeslat broadcast event při změně stavu
- [ ] Poslouchat broadcast eventy v UI komponentách
- [ ] Testovat ve více záložkách
- [ ] Testovat F5 refresh
- [ ] Testovat změnu uživatele

## 🐛 Debugging

### Dev Tools Console
```javascript
// Zobrazit všechny localStorage keys
Object.keys(localStorage).forEach(k => console.log(k, localStorage.getItem(k)));

// Zobrazit auth data
console.log('Token:', await loadAuthData.token());
console.log('User:', await loadAuthData.user());

// Broadcast test
broadcastDraftDeleted(123);
```

### Debug Panel
Aplikace má vestavěný debug panel (Alt+D) s:
- 📊 localStorage inspector
- 📡 Broadcast events monitor
- 🔍 Network requests log
- ⚠️ Error tracking

## 📚 Související dokumentace

- [MULTI-TAB-AUTH-FIX.md](../fixes/MULTI-TAB-AUTH-FIX.md) - Opravy autentifikace mezi záložkami
- [USER-STORAGE-ISOLATION.md](../fixes/USER-STORAGE-ISOLATION.md) - Izolace dat mezi uživateli
- [INCOGNITO-IMPLEMENTATION-SUMMARY.md](../features/INCOGNITO-IMPLEMENTATION-SUMMARY.md) - Incognito mode support

---

**Poslední aktualizace**: 15. října 2025  
**Autor**: GitHub Copilot + Holovsky  
**Status**: ✅ Implementováno a otestováno
