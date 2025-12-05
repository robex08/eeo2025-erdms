# Notes Persistence Debug Investigation

## Problém
Uživatel hlásí, že poznámky jsou "zapomínány" nebo zbytečně mazány z databáze.

## Analýza kódu

### Tok ukládání poznámek

1. **NotesPanel** → uživatel píše text
2. **useFloatingPanels.persistNotes()** (line 271) → debounced auto-save (15s)
3. **NotesAPI.saveNotes(content, notesID)** → wrapper
4. **api2auth.saveNotesData()** (line 2516) → volá saveUserData s typ='NOTES'
5. **api2auth.saveUserData()** (line 2331) → formátuje data a posílá na server

### Formát ukládaných dat

```javascript
// Payload odesílaný na server (line 2402)
{
  username: "...",
  token: "...",
  typ: "NOTES",
  user_id: 123,
  id: null, // nebo ID pro UPDATE
  obsah: {
    text: "obsah poznámky",
    settings: {
      lastModified: 1234567890,
      length: 15
    }
  }
}
```

**Backend endpoint:** `POST /api.php?endpoint=todonotes/save`

### Tok načítání poznámek

1. **useFloatingPanels.syncFromServer()** (line 601) → při přihlášení/refresh
2. **NotesAPI.loadNotes()** → wrapper
3. **api2auth.loadNotesData()** → volá loadUserData s typ='NOTES'
4. **api2auth.loadUserData()** (line 2196) → načítá ze serveru
5. **Parsing response** (line 2268) → extrahuje text z různých možných struktur

**Backend endpoint:** `POST /api.php?endpoint=todonotes/load`

### Identifikovaný problém

Původní kód v `loadUserData` (line 2268-2276) kontroloval:
1. `result.content.text` ❌ (neexistuje)
2. `result.content` ❌ (neexistuje)
3. `result` jako string ❌ (je objekt)
4. Vrátil prázdný string → **ZTRÁTA DAT**

Backend pravděpodobně vrací data ve struktuře:
```javascript
{
  status: "ok",
  data: {
    obsah: {
      text: "obsah poznámky",
      settings: {...}
    }
  },
  ID: 123
}
```

### Implementované řešení

Přidány nové kontroly v `loadUserData` (priorita):

```javascript
// Priorita 1: result.content.text (nový formát - původní)
if (result.content && result.content.text !== undefined) { ... }

// Priorita 2: result.obsah.text (backend vrací co jsme poslali) ✅ NOVÉ
else if (result.obsah && result.obsah.text !== undefined) { ... }

// Priorita 3: result.text (přímý text v objektu) ✅ NOVÉ
else if (result.text !== undefined) { ... }

// Priorita 4: result.content jako string
else if (result.content !== undefined && typeof result.content === 'string') { ... }

// Priorita 5: result.obsah jako string ✅ NOVÉ
else if (result.obsah !== undefined && typeof result.obsah === 'string') { ... }

// Priorita 6: result jako string (fallback)
else if (typeof result === 'string') { ... }
```

### Debug logy

Přidány console.log pro sledování:

1. **Při ukládání:**
   - `📝 [NOTES SAVE] Saving string content, length: X`
   
2. **Při načítání:**
   - `📥 [USER DATA LOAD] Backend response for NOTES: {...}` - celý response
   - `🔍 [NOTES LOAD] Raw result structure: {...}` - struktura result objektu
   - `✅ [NOTES LOAD] Found obsah.text` - který formát byl nalezen
   - `📤 [NOTES LOAD] Returning data length: X` - délka vrácených dat

## Testovací postup

1. Otevři aplikaci a přihlaš se
2. Otevři DevTools (F12) → Console tab
3. Otevři Notes panel
4. Napiš nějaký testovací text (např. "Test poznámky 123")
5. Počkej 15 sekund na auto-save nebo refresh stránku (F5)
6. Sleduj konzoli:
   - Měly by se objevit logy `📝 [NOTES SAVE]` a `📥 [USER DATA LOAD]`
   - Zkontroluj strukturu v `🔍 [NOTES LOAD] Raw result structure`
7. Zkopíruj výstup z konzole a pošli mi ho

## Očekávané výsledky

### Správné chování
```
📝 [NOTES SAVE] Saving string content, length: 18
📥 [USER DATA LOAD] Backend response for NOTES: {
  "status": "ok",
  "data": {
    "obsah": {
      "text": "Test poznámky 123",
      "settings": { ... }
    }
  },
  "ID": 123
}
🔍 [NOTES LOAD] Raw result structure: {
  "obsah": {
    "text": "Test poznámky 123",
    "settings": { ... }
  }
}
✅ [NOTES LOAD] Found obsah.text
📤 [NOTES LOAD] Returning data length: 18
```

### Problematické chování
- `⚠️ [NOTES LOAD] No recognized structure` → backend vrací neznámý formát
- `📤 [NOTES LOAD] Returning data length: 0` → data se ztratila

## Další možné příčiny problému

1. **Backend mazání:**
   - Možná backend automaticky maže staré záznamy
   - Kontrola: zkontroluj backend tabulku `todonotes` v DB

2. **Konflikt localStorage vs DB:**
   - Při načítání preferujeme DB data (line 647-656)
   - Pokud DB vrací NULL, lokální data se NEPŘEPISUJÍ

3. **Race condition:**
   - Pokud dojde k DELETE operaci během auto-save
   - Kontrola: `deletingRef.current` (line 275)

4. **Chybné ID:**
   - Pokud se neuloží ID z response, další save vytvoří nový záznam místo UPDATE
   - Kontrola: logy `Notes ID uloženo:` (line 316)

## Souborý změněny

- `src/services/api2auth.js` (line 2268-2298, 2372-2378, 2227-2229)
  - Přidány nové kontroly pro `result.obsah.text`
  - Přidány debug logy

## Status

✅ Debugging logy přidány
🔄 Čeká se na testování uživatelem
⏳ Další krok: analýza backend response struktury

## Další kroky

Po získání console logs:
1. Identifikovat přesnou strukturu backend response
2. Případně upravit prioritu kontrol v loadUserData
3. Zkontrolovat backend kód (PHP) pro endpoint `todonotes/load`
4. Ověřit DB tabulku `todonotes` a její sloupce

---

**Vytvořeno:** 2025-01-XX  
**Autor:** GitHub Copilot  
**Related:** BACKEND-NOTIFICATION-FIX-REQUIRED.md
