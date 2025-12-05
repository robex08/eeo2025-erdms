# Multi-User Session Management & Data Isolation

## 📋 Přehled

Tento dokument popisuje implementaci **bezpečné izolace dat mezi uživateli** v rámci jednoho prohlížeče. Systém zajišťuje, že každý uživatel má vlastní izolovaná data v `localStorage` a při změně uživatele se automaticky vyčistí data předchozího uživatele.

## 🎯 Cíle

1. **Single Session** - Všechny záložky v prohlížeči sdílejí stejnou session (login)
2. **Data Isolation** - Každý uživatel vidí pouze svoje vlastní data (koncepty, drafts, settings)
3. **Security** - Při odhlášení/změně uživatele se citlivá data automaticky mažou
4. **Multi-Tab Sync** - Změny v jedné záložce se promítnou do všech ostatních

## 🏗️ Architektura

### 1. Core Utilities

#### `src/utils/userStorage.js`
Základní správa user-specific dat v localStorage.

**Klíčové funkce:**
- `getCurrentUserId()` - Vrátí ID aktuálně přihlášeného uživatele
- `setCurrentUserId(userId)` - Nastaví ID aktuálního uživatele
- `getUserSpecificData(key, userId)` - **STRICT** načtení dat s validací vlastnictví
- `setUserSpecificData(key, data, userId)` - **STRICT** uložení dat s auto-přidáním user_id
- `checkAndCleanUserChange(newUserId)` - Detekce změny uživatele + cleanup
- `clearUserData(userId)` - Vyčistí všechna data konkrétního uživatele
- `clearAllUserData()` - Vyčistí všechna user-specific data (při logout)

**Bezpečnostní mechanismy:**
```javascript
// ✅ Validace 1: Klíč MUSÍ obsahovat user_id
if (!key.includes(String(currentUserId))) {
  return null; // ZAMÍTNUTO
}

// ✅ Validace 2: Data mohou obsahovat __draftOwner metadata
if (parsed.__draftOwner !== currentUserId) {
  return null; // ZAMÍTNUTO
}
```

#### `src/utils/safeDraftStorage.js`
Vysokoúrovňový wrapper pro bezpečnou práci s koncepty (drafts).

**Klíčové funkce:**
- `saveDraft(userId, draftData, options)` - Uloží koncept s validací vlastnictví
- `loadDraft(userId)` - Načte koncept POUZE pokud patří userId
- `hasDraft(userId)` - Zkontroluje existenci konceptu
- `clearDraft(userId)` - Vymaže koncept
- `getAllUserDrafts(userId)` - Vrátí všechny koncepty uživatele
- `getDraftInfo(userId)` - Vrátí metadata o konceptu (pro debug)
- `migrateOldDraft(userId)` - Migrace starých konceptů bez user_id

**Formát klíče:**
```javascript
order25-draft-{userId}
// Příklad: order25-draft-123
```

**Metadata v konceptech:**
```javascript
{
  ...draftData,
  __draftOwner: userId,        // Vlastník konceptu
  __timestamp: Date.now(),     // Čas uložení
  __version: '2.0',           // Verze s user_id validací
  __isAutoSave: false         // Typ uložení
}
```

### 2. Integration Points

#### `src/context/AuthContext.js`

**Při přihlášení (login):**
```javascript
// 1. Zkontroluj změnu uživatele a vyčisti data předchozího
checkAndCleanUserChange(loginData.id);

// 2. Migrace starých dat bez user_id
migrateOldUserData(loginData.id);

// 3. Broadcast login ostatním záložkám
broadcastLogin(loginData.id, loginData.username);
```

**Při odhlášení (logout):**
```javascript
// 1. Vyčisti všechna user-specific data
clearAllUserData();

// 2. Broadcast logout ostatním záložkám
broadcastLogout();
```

**Broadcast synchronizace:**
```javascript
// Poslouchá zprávy z ostatních záložek
onTabSyncMessage((message) => {
  switch (message.type) {
    case BROADCAST_TYPES.LOGIN:
      // Reload session z localStorage
      break;
    case BROADCAST_TYPES.LOGOUT:
      // Odhlásit i tuto záložku
      logout();
      break;
    case BROADCAST_TYPES.USER_CHANGED:
      // Force logout + reload
      logout();
      window.location.reload();
      break;
  }
});
```

## 🔒 Security Features

### 1. Strict User ID Validation

Všechny user-specific operace validují vlastnictví dat:

```javascript
// ❌ ZAMÍTNUTO: Pokus o načtení dat jiného uživatele
loadDraft(otherUserId); // → null

// ❌ ZAMÍTNUTO: Klíč neobsahuje správný user_id
getUserSpecificData('order25-draft-999', userId='123'); // → null

// ❌ ZAMÍTNUTO: Data obsahují __draftOwner jiného uživatele
const data = { __draftOwner: 999, ... };
getUserSpecificData('key', userId='123'); // → null
```

### 2. Automatic Cleanup on User Change

Při přihlášení jiného uživatele se automaticky vyčistí data předchozího:

```javascript
// User A přihlášen
setCurrentUserId('user-A');
saveDraft('user-A', { secret: 'confidential' });

// User B se přihlásí
checkAndCleanUserChange('user-B');

// ✅ Data User A jsou SMAZÁNA
loadDraft('user-A'); // → null
```

### 3. Cross-Tab Synchronization

Všechny záložky sdílejí stejnou session:

```javascript
// Tab 1: User se přihlásí
login('user123', 'password');
→ broadcastLogin('user123')

// Tab 2: Automaticky detekuje přihlášení
→ Načte auth data z localStorage
→ Nastaví stejný stav (user, token)

// Tab 1: User se odhlásí
logout();
→ broadcastLogout()

// Tab 2: Automaticky se odhlásí
→ Vymaže lokální stav
→ Vyčistí citlivá data
```

## 📝 Usage Examples

### Příklad 1: Uložení konceptu

```javascript
import { saveDraft, loadDraft } from '../utils/safeDraftStorage';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

function MyComponent() {
  const { user_id } = useContext(AuthContext);
  
  const handleSaveDraft = () => {
    const draftData = {
      orderType: 'NÁKUP',
      sections: { ... },
      phase: 1
    };
    
    const success = saveDraft(user_id, draftData, { isAutoSave: false });
    
    if (success) {
      console.log('Koncept uložen');
    }
  };
  
  const handleLoadDraft = () => {
    const draft = loadDraft(user_id);
    
    if (draft) {
      // Načti data do formuláře
      setFormData(draft);
    }
  };
}
```

### Příklad 2: Migrace starých konceptů

```javascript
// V AuthContext při login
import { migrateOldDraft } from '../utils/safeDraftStorage';

const login = async (username, password) => {
  const loginData = await loginApi2(username, password);
  
  // Automatická migrace starých konceptů bez user_id
  migrateOldDraft(loginData.id);
  
  // ... rest of login
};
```

### Příklad 3: Debug - Info o konceptech

```javascript
import { getDraftInfo, getAllUserDrafts } from '../utils/safeDraftStorage';

// Info o jednom konceptu
const info = getDraftInfo(user_id);
console.log('Koncept info:', {
  owner: info.owner,
  timestamp: info.timestampFormatted,
  version: info.version,
  dataKeys: info.dataKeys
});

// Všechny koncepty uživatele
const drafts = getAllUserDrafts(user_id);
console.log(`Uživatel má ${drafts.length} konceptů`);
drafts.forEach(draft => {
  console.log(`- ${draft.key} (${draft.version})`);
});
```

## 🧪 Testing

### Automatické testy

Spusťte test suite pro ověření izolace dat:

```javascript
// V konzoli prohlížeče
runUserIsolationTests();
```

Test suite pokrývá:
1. ✅ Základní izolace uživatelů
2. ✅ Validace vlastnictví konceptů
3. ✅ Čištění dat při změně uživatele
4. ✅ Synchronizace mezi záložkami
5. ✅ Ochrana proti úniku dat mezi uživateli

### Manuální test

1. **Přihlaste se jako User A**
   - Vytvořte koncept
   - Ověřte že se uložil: `localStorage.getItem('order25-draft-{userA_id}')`

2. **Otevřete novou záložku**
   - Ověřte že vidíte stejnou session
   - Ověřte že vidíte koncept z Tab 1

3. **Přihlaste se jako User B**
   - Ověřte že koncept User A je smazán
   - Vytvořte koncept pro User B
   - Ověřte že User B nevidí koncept User A

4. **Odhlaste se**
   - Ověřte že všechny koncepty jsou smazány
   - Ověřte že všechny záložky se odhlásily

## 🚨 Common Issues

### Problem: Data persist po logout

**Příčina:** Nesprávné čištění localStorage

**Řešení:**
```javascript
// Ujistěte se že se volá clearAllUserData()
logout() {
  clearAllUserData(); // ✅ Vyčistí všechna user-specific data
  clearAuthData.all(); // ✅ Vyčistí auth tokeny
}
```

### Problem: Uživatel vidí data předchozího uživatele

**Příčina:** Chybí checkAndCleanUserChange při login

**Řešení:**
```javascript
login(username, password) {
  const loginData = await loginApi2(username, password);
  
  // ✅ CRITICAL: Vyčisti data předchozího uživatele
  checkAndCleanUserChange(loginData.id);
  
  // ... rest of login
}
```

### Problem: Koncepty nejsou synchronizované mezi záložkami

**Příčina:** Nesprávný broadcast nebo chybí tabSync listener

**Řešení:**
```javascript
// V AuthContext useEffect
useEffect(() => {
  initTabSync(); // ✅ Inicializuj broadcast channel
  
  const cleanup = onTabSyncMessage((message) => {
    // ✅ Poslouchej změny z ostatních záložek
    if (message.type === BROADCAST_TYPES.LOGIN) {
      // Reload auth data
    }
  });
  
  return () => {
    cleanup();
    closeTabSync();
  };
}, []);
```

## 📊 Storage Keys Format

### User-Specific Keys (s user_id)

```
order25-draft-{userId}          → Hlavní koncept uživatele
order25-sections-{userId}       → Stav sekcí formuláře
order25-scroll-{userId}         → Scroll pozice
order25-phase2-unlocked-{userId} → Odemčení fáze 2
```

### Auth Keys (persistent, ale ne user-specific)

```
auth_token_persistent           → Auth token (šifrovaný)
auth_user_persistent            → User data (šifrovaný)
auth_user_detail_persistent     → User detail (šifrovaný)
auth_user_permissions_persistent → User permissions
app_current_user_id             → ID aktuálně přihlášeného uživatele
```

### UI/Global Keys (sdílené, ne user-specific)

```
ui_theme                        → Světlý/tmavý režim
ui_language                     → Jazyk aplikace
suppliers_cache                 → Cache dodavatelů
```

## 🔄 Migration Strategy

Při upgradu na nový systém se automaticky migrují stará data:

```javascript
// Stará data BEZ user_id
localStorage['order_draft'] = '...'

// ↓ Migrace při login

// Nová data S user_id
localStorage['order25-draft-123'] = '...'
```

Migrace se provede automaticky v `AuthContext` při login:
```javascript
migrateOldUserData(loginData.id);    // Obecná migrace
migrateOldDraft(loginData.id);       // Migrace konceptů
```

## 📚 Best Practices

### ✅ DO

- Vždy používejte `saveDraft()` / `loadDraft()` pro práci s koncepty
- Validujte `user_id` před jakoukoliv operací s user-specific daty
- Vollejte `checkAndCleanUserChange()` při každém login
- Používejte broadcast pro synchronizaci mezi záložkami
- Testujte izolaci dat mezi uživateli

### ❌ DON'T

- Nikdy nepoužívejte přímý přístup k localStorage pro user-specific data
- Neukládejte citlivá data bez validace vlastnictví
- Nezapomeňte čistit data při logout/změně uživatele
- Nepoužívejte globální klíče pro user-specific data
- Nepřeskakujte validaci user_id "pro zjednodušení"

## 🎓 Conclusion

Tento systém zajišťuje **STRICT** izolaci dat mezi uživateli v rámci jednoho prohlížeče. Všechny operace s user-specific daty jsou validovány a při změně uživatele se automaticky vyčistí citlivá data předchozího uživatele.

**Klíčové principy:**
1. **Single Source of Truth**: `app_current_user_id` v localStorage
2. **Strict Validation**: Každá operace validuje vlastnictví dat
3. **Automatic Cleanup**: Data se automaticky mažou při změně uživatele
4. **Multi-Tab Sync**: Broadcast komunikace mezi záložkami

---

**Autor:** GitHub Copilot  
**Datum:** 15. října 2025  
**Verze:** 2.0 (STRICT user_id validation)
