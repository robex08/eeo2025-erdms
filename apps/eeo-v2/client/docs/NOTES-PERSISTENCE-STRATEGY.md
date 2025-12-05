# NotesPanel - Persistence Strategy

## Přehled

NotesPanel má dvě záložky s **různými persistence strategiemi**:

### 1. Poznámka (Notes)
- **LocalStorage**: `layout_notes_${storageId}`
- **Database**: API `/api/user-settings` (pokud je uživatel přihlášený)
- **Auto-save**: 15 sekund (debounce)
- **Backup**: `layout_notes_backup_${storageId}` (pro F5 recovery)
- **Metadata**: `layout_notes_meta_${storageId}` (timestamp, hash, délka)
- **Timestamp**: `layout_notes_timestamp_${storageId}`

#### Flow
```
notesText změna
    ↓
persistNotes() (15s debounce)
    ↓
├─→ localStorage.setItem('layout_notes_...')
├─→ localStorage.setItem('layout_notes_backup_...')
├─→ localStorage.setItem('layout_notes_meta_...')
├─→ localStorage.setItem('layout_notes_timestamp_...')
└─→ notesAPI.saveNotes() → Database (pokud isLoggedIn)
```

### 2. Okamžitý přepis (Transcription)
- **LocalStorage**: `notes-transcription` (jednoduchý klíč)
- **Database**: ❌ NENÍ ukládán do DB
- **Auto-save**: 500ms debounce
- **Backup**: ❌ Není
- **Metadata**: ❌ Není

#### Flow
```
transcriptionText změna
    ↓
useEffect debounce (500ms)
    ↓
localStorage.setItem('notes-transcription', transcriptionText)
```

## Důvod rozdílné strategie

### Proč Poznámka má DB persistence?
- **Dlouhodobý obsah** - důležité poznámky, které uživatel chce zachovat
- **Multi-device sync** - přístup z různých zařízení
- **Backup** - ochrana proti ztrátě dat
- **Historie** - možnost rollbacku (budoucí feature)

### Proč Okamžitý přepis NEMÁ DB persistence?
- **Dočasný obsah** - rychlé přepisy, které se často mažou (Ctrl+Shift+Space)
- **Velký objem dat** - může generovat mnoho textu rychle
- **Lokální použití** - typicky se používá na jednom zařízení
- **Performance** - není potřeba zatěžovat server každých 500ms
- **Simplicity** - jednodušší implementace bez komplikací s merge konflikty

## MutationObserver Fix

### Původní problém
```javascript
// ❌ CHYBA: notesRef.current může být null při přepnutí tabu
useEffect(() => {
  if (!notesRef.current) return;
  const observer = new MutationObserver(() => {
    const currentHtml = notesRef.current.innerHTML; // 💥 NULL!
    // ...
  });
  // ...
}, [notesRef, notesText, setNotesText]);
```

Když se přepne tab z "Poznámka" na "Okamžitý přepis", `notesRef.current` se stane `null` (není v DOM), ale MutationObserver callback může být volán později → **crash**.

### Řešení
```javascript
// ✅ OPRAVENO: Dva samostatné MutationObservery + null check
// Observer pro NOTES tab
useEffect(() => {
  if (!notesRef.current || activeTab !== 'notes') return;
  const observer = new MutationObserver(() => {
    if (isSyncingRef.current) return;
    if (!notesRef.current) return; // ✨ Extra check uvnitř callbacku
    const currentHtml = notesRef.current.innerHTML;
    // ...
  });
  observer.observe(notesRef.current, { /* ... */ });
  return () => observer.disconnect(); // ✨ Cleanup při unmount
}, [notesRef, notesText, setNotesText, activeTab]);

// Observer pro TRANSCRIPTION tab
useEffect(() => {
  if (!transcriptionRef.current || activeTab !== 'transcription') return;
  const observer = new MutationObserver(() => {
    if (isSyncingRef.current) return;
    if (!transcriptionRef.current) return; // ✨ Extra check
    const currentHtml = transcriptionRef.current.innerHTML;
    // ...
  });
  observer.observe(transcriptionRef.current, { /* ... */ });
  return () => observer.disconnect(); // ✨ Cleanup
}, [transcriptionRef, transcriptionText, activeTab]);
```

#### Klíčové změny:
1. **Dva separate observers** - jeden pro každý tab
2. **activeTab dependency** - re-initialize při změně tabu
3. **Null check uvnitř callback** - extra ochrana
4. **Proper cleanup** - disconnect při unmount

## Budoucí vylepšení

### Možnost 1: DB Persistence pro Transcription
Pokud by bylo potřeba ukládat přepisy do DB:

```javascript
// V useFloatingPanels.js přidat:
const persistTranscription = useCallback(async (content) => {
  if (notesAPI && isLoggedIn) {
    // Uložit jako separátní pole v user_settings
    await notesAPI.saveTranscription(content, transcriptionID);
  }
}, [notesAPI, isLoggedIn, transcriptionID]);
```

### Možnost 2: Combined JSON Storage
Uložit oba obsahy jako jeden JSON objekt:

```javascript
// DB structure:
{
  "notes": "<p>Poznámky HTML...</p>",
  "transcription": "<p>Přepis HTML...</p>",
  "activeTab": "notes",
  "lastModified": 1234567890
}
```

**Nevýhoda**: Zvýšená complexity, merge konflikty při multi-tab editing.

### Možnost 3: IndexedDB pro Transcription
Pro větší objemy dat použít IndexedDB místo localStorage:

```javascript
// Using IndexedDB API
const db = await openDB('NotesDB', 1, {
  upgrade(db) {
    db.createObjectStore('transcriptions');
  }
});

await db.put('transcriptions', transcriptionText, 'current');
```

**Výhoda**: Neomezená kapacita (localStorage má ~5-10MB limit).

## Aktuální doporučení

**PONECHAT současnou strategii** - jednoduchá, funguje, není přetěžována DB.

Pokud uživatelé budou žádat sync přepisů mezi zařízeními → implementovat **Možnost 1** (separátní API endpoint).
