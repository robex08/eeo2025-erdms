# Fix: Status Bar LastSaved Timestamp

## Problém

Po F5 refresh se v status baru zobrazovalo **"Uloženo: nikdy"**, což bylo matoucí, protože data byla načtena z localStorage nebo DB.

## Příčina

`autoSaveStatus.notes.lastSaved` a `autoSaveStatus.todo.lastSaved` se nastavovaly pouze při **aktivním ukládání**, ne při načtení dat.

## Řešení

### 1. ✅ Načtení timestamp při load ze serveru

Když se data načítají ze serveru (po přihlášení), nastavíme `lastSaved` timestamp:

**Soubor:** `src/hooks/useFloatingPanels.js`

**Notes (line ~653):**
```javascript
if (serverContent) {
  // ... načtení dat ...
  
  // Nastav lastSaved timestamp pro zobrazení v UI
  setAutoSaveStatus(prev => ({
    ...prev,
    notes: { ...prev.notes, lastSaved: Date.now() }
  }));
  console.log('📥 [NOTES LOAD] Data loaded from server, lastSaved updated');
}
```

**TODO (line ~719):**
```javascript
if (todoList.length > 0) {
  // ... načtení dat ...
  
  // Nastav lastSaved timestamp pro zobrazení v UI
  setAutoSaveStatus(prev => ({
    ...prev,
    todo: { ...prev.todo, lastSaved: Date.now() }
  }));
  console.log('📥 [TODO LOAD] Data loaded from server, lastSaved updated');
}
```

### 2. ✅ Načtení timestamp z localStorage při F5 refresh

Nový useEffect, který při mount/refresh načte uložený timestamp z localStorage:

```javascript
// 🔄 Načtení lastSaved timestamp z localStorage při F5 refresh
useEffect(() => {
  try {
    // Načti timestamp z localStorage pro Notes
    const notesTimestamp = localStorage.getItem(`layout_notes_timestamp_${storageId}`);
    if (notesTimestamp) {
      const ts = parseInt(notesTimestamp);
      if (!isNaN(ts)) {
        setAutoSaveStatus(prev => ({
          ...prev,
          notes: { ...prev.notes, lastSaved: ts }
        }));
        console.log('📥 [NOTES] Loaded timestamp from localStorage:', new Date(ts).toLocaleTimeString('cs-CZ'));
      }
    }
    
    // Načti timestamp z localStorage pro TODO
    const tasksTimestamp = localStorage.getItem(`layout_tasks_timestamp_${storageId}`);
    if (tasksTimestamp) {
      const ts = parseInt(tasksTimestamp);
      if (!isNaN(ts)) {
        setAutoSaveStatus(prev => ({
          ...prev,
          todo: { ...prev.todo, lastSaved: ts }
        }));
        console.log('📥 [TODO] Loaded timestamp from localStorage:', new Date(ts).toLocaleTimeString('cs-CZ'));
      }
    }
  } catch (error) {
    console.error('❌ Failed to load timestamps from localStorage:', error);
  }
}, [storageId]); // Pouze při změně storageId (mount/login)
```

### 3. ✅ Vylepšená formatTime funkce

Upravena funkce `formatTime()`, aby zobrazovala i datum, pokud je timestamp starší než dnes:

```javascript
const formatTime = useCallback((timestamp) => {
  if (!timestamp) return 'nikdy';
  const date = new Date(timestamp);
  const now = new Date();
  
  // Kontrola, zda je timestamp ze stejného dne
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    // Dnes - zobraz pouze čas
    return date.toLocaleTimeString('cs-CZ', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  } else {
    // Starší - zobraz datum i čas
    return date.toLocaleString('cs-CZ', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
}, []);
```

## Výsledek

### Před změnou:
```
Uloženo: nikdy
```

### Po změně:
```
// Dnes:
Uloženo: 14:35:42

// Včera nebo starší:
Uloženo: 24.10.2025, 18:20
```

## Tok dat

### Při přihlášení:
1. `syncFromServer()` načte data z DB
2. Uloží do localStorage + **uloží timestamp**
3. Nastaví `autoSaveStatus.notes.lastSaved` = aktuální čas
4. UI zobrazí: "Uloženo: 14:35:42"

### Při F5 refresh:
1. Nový useEffect se spustí při mount
2. Načte `layout_notes_timestamp_${storageId}` z localStorage
3. Nastaví `autoSaveStatus.notes.lastSaved` = načtený timestamp
4. UI zobrazí: "Uloženo: 14:35:42" (čas posledního uložení)

### Při auto-save:
1. `persistNotes()` uloží data
2. Uloží timestamp do localStorage
3. Nastaví `autoSaveStatus.notes.lastSaved` = aktuální čas
4. UI zobrazí aktualizovaný čas

### Při zavření panelu:
1. `flushNotesSave()` uloží data
2. Uloží timestamp do localStorage
3. Nastaví lastSaved
4. Panel se zavře

### Při beforeunload (F5):
1. Handler uloží data + **timestamp** do localStorage
2. Při refresh useEffect načte timestamp
3. UI zobrazí správný čas

## Testování

1. **Přihlášení:**
   - Přihlaš se → otevři Notes/TODO
   - Status bar by měl zobrazit čas načtení (např. "Uloženo: 14:35:42")

2. **F5 Refresh:**
   - Napiš text do Notes
   - Počkej na auto-save (nebo zavři panel)
   - Stiskni F5
   - Po refresh by status bar měl zobrazit čas posledního uložení

3. **Starší timestamp:**
   - Změň v DevTools console:
     ```javascript
     localStorage.setItem('layout_notes_timestamp_anon', String(Date.now() - 86400000)); // včera
     ```
   - Refresh stránky
   - Status bar by měl zobrazit: "Uloženo: 24.10.2025, 14:35"

4. **Console logy:**
   - Po F5 by se měly objevit:
     ```
     📥 [NOTES] Loaded timestamp from localStorage: 14:35:42
     📥 [TODO] Loaded timestamp from localStorage: 14:35:42
     ```

## Console Logy

- `📥 [NOTES LOAD] Data loaded from server, lastSaved updated`
- `📥 [TODO LOAD] Data loaded from server, lastSaved updated`
- `📥 [NOTES] Loaded timestamp from localStorage: 14:35:42`
- `📥 [TODO] Loaded timestamp from localStorage: 14:35:42`

## Soubory změněny

- ✅ `src/hooks/useFloatingPanels.js`
  - Přidán `setAutoSaveStatus()` při load ze serveru (Notes + TODO)
  - Nový useEffect pro načtení timestamp z localStorage
  - Vylepšená `formatTime()` funkce

## Related

- `NOTES-AUTO-SAVE-IMPROVEMENTS.md` - F5 protection implementace
- `NOTES-PERSISTENCE-DEBUG.md` - Debug notes persistence

---

**Implementováno:** 25. 10. 2025  
**Status:** ✅ Hotovo, žádné chyby
