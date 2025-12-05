# Quick Reference: Multi-User Session Isolation

## 🔧 Základní API

### Import
```javascript
// User storage
import { 
  getCurrentUserId, 
  checkAndCleanUserChange,
  clearAllUserData 
} from '../utils/userStorage';

// Safe draft storage
import { 
  saveDraft, 
  loadDraft, 
  hasDraft, 
  clearDraft 
} from '../utils/safeDraftStorage';
```

### Uložení konceptu
```javascript
const { user_id } = useContext(AuthContext);

// Uložit koncept
const success = saveDraft(user_id, {
  orderType: 'NÁKUP',
  sections: { ... },
  phase: 1
});

if (success) {
  console.log('Koncept uložen');
}
```

### Načtení konceptu
```javascript
const draft = loadDraft(user_id);

if (draft) {
  // Načti data do formuláře
  setFormData(draft);
} else {
  console.log('Žádný koncept nenalezen');
}
```

### Kontrola existence
```javascript
if (hasDraft(user_id)) {
  console.log('Uživatel má uložený koncept');
}
```

### Vymazání konceptu
```javascript
const success = clearDraft(user_id);
if (success) {
  console.log('Koncept vymazán');
}
```

## 🔐 Bezpečnostní pravidla

### ✅ DO
```javascript
// Vždy používej safeDraftStorage
saveDraft(user_id, data);
loadDraft(user_id);

// Validuj user_id před operací
if (user_id) {
  saveDraft(user_id, data);
}

// Volej cleanup při změně uživatele
checkAndCleanUserChange(newUserId);
```

### ❌ DON'T
```javascript
// NIKDY nepoužívej přímý přístup
localStorage.setItem('order_draft', JSON.stringify(data)); // ❌

// NIKDY neukládej bez user_id
saveDraft(null, data); // ❌

// NIKDY nezapo menuj cleanup
login() { // ❌ Chybí checkAndCleanUserChange
  setUser(data);
}
```

## 🧪 Testing

### V konzoli prohlížeče
```javascript
// Spustit všechny testy
runUserIsolationTests();

// Info o konceptu
getDraftInfo(user_id);

// Všechny koncepty uživatele
getAllUserDrafts(user_id);
```

### Manuální test
```javascript
// 1. Přihlaš se jako User A
// 2. Ulož koncept
saveDraft('userA', { name: 'Test A' });

// 3. Přihlaš se jako User B
checkAndCleanUserChange('userB');

// 4. Ověř že User B nevidí koncept User A
loadDraft('userA'); // → null ✅
```

## 📊 Storage Keys

```
order25-draft-{userId}           → Hlavní koncept
order25-sections-{userId}        → Stav sekcí
order25-scroll-{userId}          → Scroll pozice
app_current_user_id              → ID aktuálního uživatele
```

## 🚨 Common Errors

### "Žádný přihlášený uživatel"
```javascript
// Příčina: user_id není nastaven
// Řešení: Ujisti se že je user přihlášen
const { user_id } = useContext(AuthContext);
if (!user_id) {
  console.error('User není přihlášen!');
  return;
}
```

### "Pokus o načtení konceptu jiného uživatele"
```javascript
// Příčina: Snaha načíst data jiného uživatele
// Řešení: Načítej POUZE vlastní data
loadDraft(user_id); // ✅ Vlastní user_id
loadDraft(otherUserId); // ❌ Cizí user_id
```

### Data persist po logout
```javascript
// Příčina: Chybí cleanup
// Řešení: Volej clearAllUserData()
const logout = () => {
  clearAllUserData(); // ✅
  // ... rest of logout
};
```

## 📚 Další zdroje

- **Plná dokumentace:** `docs/features/MULTI-USER-SESSION-ISOLATION.md`
- **Implementation guide:** `docs/implementation/MULTI-USER-ISOLATION-IMPLEMENTATION.md`
- **Test suite:** `test-debug/test-user-isolation.js`
- **Source code:** `src/utils/safeDraftStorage.js`
