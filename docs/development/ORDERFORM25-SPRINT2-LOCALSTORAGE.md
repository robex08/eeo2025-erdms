# 🔄 OrderForm25 - SPRINT 2: localStorage → draftManager Migration

**Datum:** 10. prosince 2025  
**Prerekvizita:** Sprint 1 dokončen  
**Odhadovaný čas:** 3-4 hodiny  
**Riziko:** 🟡 STŘEDNÍ (mění persistence logiku)

---

## 📊 Audit localStorage

**Celkem přímých localStorage volání: 28**

### Kategorie použití:

1. **activeOrderEditId** (6 použití) - 🔴 PRIORITA
2. **Templates storage** (12 použití) - 🟡 STŘEDNÍ
3. **Cleanup/Remove operations** (7 použití) - 🟢 NÍZKÁ
4. **user_id reads** (3 použití) - 🟢 KEEP (readonly)

---

## ✅ SPRINT 2 CHECKLIST

### Fáze A: activeOrderEditId → draftManager (1 hodina)

**Problém:** Přímé localStorage volání pro tracking editovaného ID

**Lokace:**

```javascript
// Řádek 4068:
const editOrderIdFromLS = localStorage.getItem('activeOrderEditId');

// Řádek 4074:
localStorage.setItem('activeOrderEditId', editOrderIdFromUrl);

// Řádek 4752:
localStorage.setItem('activeOrderEditId', String(savedOrderId));

// Řádek 5249:
localStorage.setItem('activeOrderEditId', String(loadedData.id));

// Řádek 15188, 15261:
localStorage.removeItem('activeOrderEditId');
```

**Řešení:**

#### A1. Zkontrolovat draftManager API

```bash
# Otevřít DraftManager.js
code /var/www/erdms-dev/apps/eeo-v2/client/src/services/DraftManager.js

# Hledat activeOrderEditId metody
grep -n "activeOrderEditId" /var/www/erdms-dev/apps/eeo-v2/client/src/services/DraftManager.js
```

**Očekávané metody v DraftManager:**
```javascript
// Pravděpodobně už existují:
draftManager.setActiveEditId(orderId)
draftManager.getActiveEditId()
draftManager.removeActiveEditId()
```

#### A2. Pokud metody EXISTUJÍ v draftManager

**NAHRADIT:**

```javascript
// ❌ PŘED:
localStorage.setItem('activeOrderEditId', String(savedOrderId));

// ✅ PO:
draftManager.setActiveEditId(savedOrderId);
```

```javascript
// ❌ PŘED:
const editOrderIdFromLS = localStorage.getItem('activeOrderEditId');

// ✅ PO:
const editOrderIdFromLS = draftManager.getActiveEditId();
```

```javascript
// ❌ PŘED:
localStorage.removeItem('activeOrderEditId');

// ✅ PO:
draftManager.removeActiveEditId();
```

#### A3. Pokud metody NEEXISTUJÍ v draftManager

**OPTION 1: Přidat do DraftManager (DOPORUČENO)**

```javascript
// V DraftManager.js přidat:

class DraftManager {
  // ... existující kód
  
  /**
   * Set active editing order ID
   */
  setActiveEditId(orderId) {
    if (!orderId) return;
    localStorage.setItem('activeOrderEditId', String(orderId));
  }
  
  /**
   * Get active editing order ID
   */
  getActiveEditId() {
    return localStorage.getItem('activeOrderEditId');
  }
  
  /**
   * Remove active editing order ID
   */
  removeActiveEditId() {
    localStorage.removeItem('activeOrderEditId');
  }
}
```

**OPTION 2: Ponechat localStorage (NE DOPORUČENO)**

Pokud activeOrderEditId je používáno i jinde v aplikaci, můžeme ho zatím ponechat.

---

### Fáze B: Template storage → Unified approach (2 hodiny)

**Problém:** 12 přímých localStorage volání pro ukládání templates

**Lokace:**

```javascript
// Řádek 16351, 16465, 16487, 16505, 16589, 16728, 17008:
localStorage.setItem(key, JSON.stringify(updatedTemplates));
localStorage.setItem(key, JSON.stringify(processedUserTemplates));
```

**Analýza:**

```bash
# Najít všechny template storage patterns
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms
grep -B 3 -A 1 "localStorage.setItem.*[Tt]emplate" OrderForm25.js | head -40
```

**Řešení:**

#### B1. Zkontrolovat existující template management

```bash
# Hledat template funkce v kódu
grep -n "savedTemplates\|serverTemplates" OrderForm25.js | head -20
```

**Zjištění:**
- Používá se `savedTemplates` state (řádek ~4906)
- Používá se `serverTemplates` state (řádek ~4907)
- Templates se načítají přes `fetchTemplatesListWithMeta` (API)

#### B2. Vytvořit helper funkce pro templates

**V OrderForm25.js přidat helper funkce:**

```javascript
// 🎯 Template Storage Helpers
const saveTemplatesToLocalStorage = useCallback((templates, userId) => {
  const key = `order25_templates_user_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save templates to localStorage:', error);
  }
}, []);

const loadTemplatesFromLocalStorage = useCallback((userId) => {
  const key = `order25_templates_user_${userId}`;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load templates from localStorage:', error);
    return [];
  }
}, []);

const removeTemplatesFromLocalStorage = useCallback((userId) => {
  const key = `order25_templates_user_${userId}`;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove templates from localStorage:', error);
  }
}, []);
```

#### B3. Nahradit přímá localStorage volání

**PŘED:**
```javascript
localStorage.setItem(key, JSON.stringify(updatedTemplates));
```

**PO:**
```javascript
saveTemplatesToLocalStorage(updatedTemplates, user_id);
```

**Výhoda:**
- Centralizované error handling
- Jednotná key generation
- Snadnější pozdější migrace na jiný storage

---

### Fáze C: Cleanup operations - použít draftManager (30 min)

**Lokace:**

```javascript
// Řádek 6624-6633: Cleanup old localStorage keys
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key.startsWith('order25_form_data_') || 
      key.startsWith('order_form_draft_') ||
      key.startsWith('savedOrderId-')) {
    localStorage.removeItem(key);
  }
}

// Řádek 15192-15194: Remove specific keys
localStorage.removeItem(`order_form_savedOrderId_${user_id}`);
localStorage.removeItem(`savedOrderId-${user_id}`);
localStorage.removeItem(`highlightOrderId-${user_id}`);
```

**Řešení:**

#### C1. Zkontrolovat draftManager cleanup metody

```bash
grep -n "cleanup\|clear\|remove" /var/www/erdms-dev/apps/eeo-v2/client/src/services/DraftManager.js
```

#### C2. Pokud existuje `draftManager.cleanup()` nebo podobná metoda

**NAHRADIT:**

```javascript
// ❌ PŘED:
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key.startsWith('order25_form_data_')) {
    localStorage.removeItem(key);
  }
}

// ✅ PO:
draftManager.cleanupOldDrafts(user_id);
```

#### C3. Pokud NEEXISTUJE, můžeme PONECHAT

- Cleanup operace jsou méně kritické
- Můžeme migrovat později
- Fokus na aktivní read/write operace

---

### Fáze D: user_id reads - PONECHAT (5 min)

**Lokace:**

```javascript
// Řádek 8095, 21679, 21707:
const user_id = parseInt(localStorage.getItem('user_id'), 10);
const user_id = localStorage.getItem('user_id');
```

**Rozhodnutí:** ✅ **PONECHAT**

**Důvod:**
- `user_id` je globální user context
- Není specifické pro OrderForm25
- Mělo by být v AuthContext, ne localStorage
- Migrace user_id storage je SEPARATE TASK

---

## 🧪 Testing After Migration

### 1. Test activeOrderEditId

```bash
# Spustit dev server
npm run dev
```

**Checklist:**
- [ ] Vytvořit novou objednávku
- [ ] Zkontrolovat že se nastaví activeOrderEditId
- [ ] Obnovit stránku (F5)
- [ ] Ověřit že se načte správná objednávka
- [ ] Zkontrolovat localStorage v DevTools:
  ```javascript
  localStorage.getItem('activeOrderEditId')
  ```

### 2. Test template storage

**Checklist:**
- [ ] Uložit novou template
- [ ] Zkontrolovat že se objeví v seznamu
- [ ] Obnovit stránku
- [ ] Ověřit že template je stále v seznamu
- [ ] Zkontrolovat localStorage:
  ```javascript
  localStorage.getItem('order25_templates_user_XXX')
  ```

### 3. Test cleanup

**Checklist:**
- [ ] Vytvořit draft
- [ ] Zrušit formulář
- [ ] Ověřit že draft byl odstraněn
- [ ] Zkontrolovat localStorage - mělo by být čisté

---

## 📈 Očekávané výsledky Sprint 2

### PŘED:
```
localStorage přímé volání: 28
draftManager použití: 81
Consistency: NÍZKÁ (mix approaches)
```

### PO:
```
localStorage přímé volání: ~5 (jen user_id a kritické)
draftManager použití: ~100+
Helper funkce: 3 (templates)
Consistency: VYSOKÁ ✅
```

### Impact:
- ✅ **Centralizované storage** - Vše přes draftManager
- ✅ **Lepší error handling** - V jednom místě
- ✅ **Snadnější migrace** - Na IndexedDB nebo backend v budoucnu
- ✅ **Testovatelnost** - Mocknutí draftManager místo localStorage

---

## 🎯 Git Workflow

```bash
cd /var/www/erdms-dev

# Pokračovat na stejném branchi (nebo nový)
git checkout feature/orderform25-sprint1-cleanup
# nebo
git checkout -b feature/orderform25-sprint2-localstorage

# Po dokončení změn
git add .
git commit -m "refactor(OrderForm25): Sprint 2 - migrate localStorage to draftManager

Changes:
- Replace activeOrderEditId localStorage calls with draftManager
- Create template storage helper functions
- Improve cleanup operations
- Reduce direct localStorage usage from 28 to ~5 calls

Impact:
- Better consistency
- Centralized storage management
- Easier future migration to IndexedDB

Risk: MEDIUM (changes persistence logic, requires thorough testing)"

git push origin feature/orderform25-sprint2-localstorage
```

---

## ⚠️ Rizika a Mitigation

### Riziko 1: activeOrderEditId nefunguje
**Symptom:** Po obnovení stránky se nenačte editovaná objednávka  
**Mitigation:**
```javascript
// Fallback logic
const editId = draftManager.getActiveEditId() || localStorage.getItem('activeOrderEditId');
```

### Riziko 2: Templates zmizí
**Symptom:** Uložené templates nejsou vidět po obnovení  
**Mitigation:**
```javascript
// Zkusit načíst z obou míst
const templates = loadTemplatesFromLocalStorage(user_id) || 
                  JSON.parse(localStorage.getItem(`order25_templates_user_${user_id}`) || '[]');
```

### Riziko 3: Race condition při cleanup
**Symptom:** Draft se smaže předčasně  
**Mitigation:**
```javascript
// Přidat delay nebo confirm
setTimeout(() => draftManager.cleanup(), 500);
```

---

## 📝 Notes

- Migrace je **postupná** - můžeme migrovat po částech
- Zachovat **backward compatibility** kde je to možné
- **Testovat po každé změně** - ne všechno najednou
- V případě problémů - **revert lze snadno přes Git**

---

**⏱️ Čas:** 3-4 hodiny  
**🎯 Cíl:** Centralizované storage přes draftManager  
**✅ Status:** Ready to start (po Sprint 1)

---

## 🚀 QUICK START Commands

```bash
# 1. Zkontrolovat DraftManager API
code /var/www/erdms-dev/apps/eeo-v2/client/src/services/DraftManager.js

# 2. Najít všechny localStorage volání
cd /var/www/erdms-dev/apps/eeo-v2/client/src/forms
grep -n "localStorage\." OrderForm25.js | grep -v "//"

# 3. Otevřít OrderForm25 pro editaci
code OrderForm25.js

# 4. Po změnách - test
npm run dev

# 5. Commit
git add .
git commit -m "refactor: migrate localStorage to draftManager"
git push
```
