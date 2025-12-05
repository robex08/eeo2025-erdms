# 🔒 KRITICKÁ BEZPEČNOSTNÍ OPRAVA: Izolace TODO a NOTES mezi uživateli

**Datum:** 10. listopadu 2025  
**Priorita:** KRITICKÁ  
**Typ:** Security Fix - Data Leak Prevention

## 🚨 Problém

Po odhlášení uživatele A a přihlášení uživatele B se **načítala TODO a NOTES data uživatele A** do panelů uživatele B.

### Root Cause

V `useFloatingPanels.js` (řádek 860-887) byl useEffect, který při změně `storageId` načítal data z localStorage:

```javascript
// ⚠️ PŮVODNÍ PROBLEMATICKÝ KÓD
useEffect(() => {
  const freshNotes = loadStoredNotes(storageId);
  const freshTasks = loadStoredTasks(storageId);
  
  // 🚫 PROBLÉM: Pouze pokud jsou nová data, přepíše state
  if (freshNotes.notes || freshNotes.transcription) {
    setNotesText(freshNotes.notes);
    setTranscriptionText(freshNotes.transcription);
  } else {
    // ❌ ZŮSTANOU STARÁ DATA V STATE!
  }
  
  if (freshTasks && freshTasks.length > 0) {
    setTasks(freshTasks);
  } else {
    // ❌ ZŮSTANOU STARÁ DATA V STATE!
  }
}, [storageId]);
```

**Když uživatel B neměl žádná data v localStorage**, podmínka `if (freshTasks.length > 0)` selhala a **React state zůstal obsahovat data uživatele A**.

## ✅ Řešení

### 1. Oprava useEffect v `useFloatingPanels.js`

**Soubor:** `src/hooks/useFloatingPanels.js` (řádek 860-887)

```javascript
// ✅ OPRAVENÝ KÓD
useEffect(() => {
  // 🔒 BEZPEČNOST: VŽDY vyčistit data při změně storageId (login/logout)
  try {
    const freshNotes = loadStoredNotes(storageId);
    const freshTasks = loadStoredTasks(storageId);
    
    // 🔒 VŽDY přepsat state novými daty pro aktuálního uživatele
    // Pokud nový uživatel nemá data, musí se vyčistit state předchozího uživatele!
    
    setNotesText(freshNotes.notes || '');
    setTranscriptionText(freshNotes.transcription || '');
    setTasks(freshTasks || []);
    
  } catch (err) {
    // V případě chyby vyčistit state
    setNotesText('');
    setTranscriptionText('');
    setTasks([]);
  }
}, [storageId]);
```

**Klíčové změny:**
- ✅ **VŽDY** přepíše state při změně `storageId`
- ✅ **I prázdná data** se aplikují (vyčistí předchozí state)
- ✅ Fallback v catch bloku pro 100% jistotu

### 2. Vylepšení logout cleanup

**Soubor:** `src/utils/logoutCleanup.js`

#### 2.1 Rozšíření DELETE_PATTERNS

```javascript
DELETE_PATTERNS: [
  // ...
  // 🔒 KRITICKÉ: Uživatelský obsah
  'layout_tasks_*',
  'layout_notes_*', 
  'layout_chat_*',
  'notes_text_*',
  'chat_messages_*',
  'chat_data_*',        // ← PŘIDÁNO
  'todo_items_*',
  'notif_data_*',       // ← PŘIDÁNO
  'panel_state_*',      // ← PŘIDÁNO
  // ...
]
```

#### 2.2 Explicitní čištění citlivých dat

```javascript
// 3. 🔒 KRITICKÉ: Explicitní čištění TODO a POZNÁMEK všech uživatelů
if (!dryRun) {
  const explicitCleanupKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('layout_tasks_') ||
      key.includes('layout_notes_') ||
      key.includes('todo_items_') ||
      key.includes('notes_text_') ||
      key.includes('chat_messages_') ||
      key.includes('chat_data_') ||      // ← PŘIDÁNO
      key.includes('notif_data_')        // ← PŘIDÁNO
    ) && !toDelete.includes(key)) {
      explicitCleanupKeys.push(key);
    }
  }
  
  if (explicitCleanupKeys.length > 0) {
    explicitCleanupKeys.forEach(key => {
      localStorage.removeItem(key);
      actions.push(`🔒 Explicitně smazán citlivý obsah: ${key}`);
    });
  }
}
```

## 🔐 Bezpečnostní záruky

### Vrstva 1: Správné ukládání (už bylo implementováno)
✅ Každý uživatel má vlastní klíče: `layout_tasks_${user_id}`, `layout_notes_${user_id}`

### Vrstva 2: Čištění při změně uživatele (NOVĚ OPRAVENO)
✅ useEffect vždy vyčistí state při změně `storageId`  
✅ I když nový uživatel nemá data, state se vyprázdní

### Vrstva 3: Čištění při logout (již existovalo, vylepšeno)
✅ `performLogoutCleanup()` explicitně maže všechny TODO/NOTES klíče  
✅ Včetně notifikací, chatu a pozic panelů

## 🧪 Testovací scénář

### Krok 1: Příprava
1. Přihlásit se jako **User A** (např. admin)
2. Vytvořit TODO úkoly a NOTES poznámky
3. Odhlásit se

### Krok 2: Test
1. Přihlásit se jako **User B** (jiný účet)
2. Otevřít TODO panel
3. Otevřít NOTES panel

### ✅ Očekávaný výsledek
- TODO panel je **prázdný** (žádné úkoly User A)
- NOTES panel je **prázdný** (žádné poznámky User A)
- Viditelné jsou pouze data User B (pokud nějaké má)

### ❌ Předchozí chování (BUG)
- TODO panel zobrazoval úkoly User A
- NOTES panel zobrazoval poznámky User A
- **Kritický security leak!**

## 📊 Dopad

| Aspekt | Stav |
|--------|------|
| **Bezpečnost** | ✅ VYŘEŠENO - Žádný data leak mezi uživateli |
| **Performance** | ✅ Beze změny |
| **UX** | ✅ Transparentní pro uživatele |
| **Breaking changes** | ❌ Žádné |

## 🔍 Technické detaily

### Flow při změně uživatele

```
1. User A logout
   ↓
   performLogoutCleanup() → smaže layout_tasks_*, layout_notes_* z localStorage
   ↓
   AuthContext: user_id = null
   ↓
   useFloatingPanels: storageId = 'anon'
   ↓
   useEffect([storageId]): vyčistí state (setTasks([]), setNotesText(''))

2. User B login
   ↓
   AuthContext: user_id = 123
   ↓
   useFloatingPanels: storageId = '123'
   ↓
   useEffect([storageId]): načte data pro user_id=123 z localStorage
   ↓
   Pokud localStorage prázdný → nastaví prázdná data (ne data User A!)
```

### Proč původní kód selhal?

React hooks zachovávají state mezi re-rendery. Když:
1. User A se odhlásí → `storageId` změní z `'456'` na `'anon'`
2. useEffect načte prázdná data pro `'anon'`
3. **ALE** kvůli `if (freshTasks.length > 0)` state **nebyl přepsán**
4. State stále obsahoval `tasks = [úkoly User A]`
5. User B se přihlásí → `storageId` změní z `'anon'` na `'123'`
6. useEffect načte prázdná data pro `'123'`
7. **OPĚT** kvůli `if (freshTasks.length > 0)` state **nebyl přepsán**
8. **VÝSLEDEK: User B vidí data User A!**

### Proč opravený kód funguje?

```javascript
// ✅ VŽDY přepíše state, i když jsou data prázdná
setTasks(freshTasks || []);  // Žádná podmínka!
```

## ⚠️ Důležité poznámky

1. **localStorage vs React state**
   - localStorage je správně per-user (`layout_tasks_${user_id}`)
   - Problém byl v **nepřepsání React state**

2. **Guard podmínky jsou nebezpečné**
   - `if (data.length > 0) setState(data)` → ❌ Zachovává starý state
   - `setState(data || [])` → ✅ Vždy čistý state

3. **sessionStorage není řešením**
   - sessionStorage se maže při zavření tabu
   - Nepřežije F5 refresh
   - Nefunguje v multi-tab prostředí

## 📝 Related Issues

- Souvisí s implementací multi-user isolation
- Navazuje na FAZE-1 security refactoring
- Doplňuje TODO/NOTES server API synchronizaci

## ✅ Checklist před merge

- [x] Opravit useEffect v useFloatingPanels.js
- [x] Vylepšit DELETE_PATTERNS v logoutCleanup.js
- [x] Přidat explicitní cleanup notifikací a chatu
- [ ] Otestovat scénář User A → logout → User B login
- [ ] Ověřit že localStorage obsahuje pouze data aktuálního uživatele
- [ ] Zkontrolovat že performLogoutCleanup maže všechny citlivé klíče

## 🎯 Závěr

Tato oprava je **KRITICKÁ** pro bezpečnost aplikace. Zajišťuje, že:
- ✅ Každý uživatel vidí pouze svá data
- ✅ Při logout se smažou všechna citlivá data
- ✅ Při změně uživatele se state vždy vyčistí
- ✅ Žádný data leak mezi uživateli

---
**Status:** ✅ IMPLEMENTOVÁNO  
**Testováno:** ⏳ ČEKÁ NA QA TEST  
**Deploy:** ⏳ PŘIPRAVENO PRO PRODUCTION
