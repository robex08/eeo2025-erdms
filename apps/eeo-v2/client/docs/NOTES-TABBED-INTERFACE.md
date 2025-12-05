# NotesPanel - Tabbed Interface

## Přehled

NotesPanel nyní obsahuje tabbed interface se dvěma samostatnými záložkami:

1. **Poznámka** - Standardní poznámky s plným toolbarem a všemi formátovacími možnostmi
2. **Okamžitý přepis** - Dedikovaná záložka pro speech-to-text přepis

## Struktura

### Komponenty

#### TabsContainer
```javascript
const TabsContainer = styled.div`
	display: flex;
	gap: 0.25rem;
	background: #fef3c7;
	padding: 0.3rem 0.5rem;
	border: 1px solid #fbbf24;
	border-radius: 6px 6px 0 0;
`;
```

#### TabButton
```javascript
const TabButton = styled.button`
	background: ${props => props.active ? '#fde68a' : '#fff8e1'};
	border: 1px solid ${props => props.active ? '#f4c542' : 'transparent'};
	color: ${props => props.active ? '#92400e' : '#7c4a02'};
	padding: 0.4rem 0.8rem;
	border-radius: 5px;
	font-size: 0.7rem;
	font-weight: ${props => props.active ? '700' : '600'};
	// ... další styling
`;
```

### State Management

```javascript
// Aktivní tab ('notes' nebo 'transcription')
const [activeTab, setActiveTab] = React.useState('notes');

// Text okamžitého přepisu (separátní od notesText)
const [transcriptionText, setTranscriptionText] = React.useState(() => {
  try {
    return localStorage.getItem('notes-transcription') || '';
  } catch {
    return '';
  }
});

// Ref pro transcription editor
const transcriptionRef = useRef(null);
```

### Persistence

#### LocalStorage
- **Poznámky**: `notesText` ukládán přes existující mechanismus (auto-save + DB sync)
- **Okamžitý přepis**: `transcriptionText` ukládán do `localStorage.getItem('notes-transcription')` s 500ms debounce

#### Auto-save
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    try {
      localStorage.setItem('notes-transcription', transcriptionText);
    } catch (error) {
      console.error('Chyba při ukládání přepisu:', error);
    }
  }, 500);
  
  return () => clearTimeout(timer);
}, [transcriptionText]);
```

## Chování Speech Recognition

### Základní nahrávání (Ctrl+Mezerník)
- Text jde do **aktivního tabu**
- Pokud je aktivní "Poznámka" → text jde do `notesRef`
- Pokud je aktivní "Okamžitý přepis" → text jde do `transcriptionRef`

```javascript
recognitionInstance.onresult = (event) => {
  // ... zpracování
  if (finalTranscript) {
    if (activeTab === 'transcription' && transcriptionRef.current) {
      transcriptionRef.current.focus();
      document.execCommand('insertText', false, finalTranscript);
      setTranscriptionText(transcriptionRef.current.innerHTML);
    } else if (activeTab === 'notes' && notesRef.current) {
      notesRef.current.focus();
      document.execCommand('insertText', false, finalTranscript);
      setNotesText(notesRef.current.innerHTML);
    }
  }
};
```

### Vymazat a nový přepis (Ctrl+Shift+Mezerník)
1. **Vymaže JEN Okamžitý přepis** (ne Poznámky!)
2. **Přepne na tab "Okamžitý přepis"**
3. **Spustí nahrávání**

```javascript
const clearAndStartRecording = async () => {
  // Vymazat JEN okamžitý přepis
  if (transcriptionRef.current) {
    transcriptionRef.current.innerHTML = '';
    setTranscriptionText('');
  }
  
  // Přepnout na tab Okamžitého přepisu
  setActiveTab('transcription');
  
  // Spustit nahrávání
  if (!isRecording) {
    startRecording();
  }
};
```

## Klávesové zkratky

| Zkratka | Akce |
|---------|------|
| `Ctrl+Mezerník` | Zapnout/vypnout přepis řeči → aktivní tab |
| `Ctrl+Shift+Mezerník` | Vymazat "Okamžitý přepis", přepnout na něj a začít nahrávat |

## UI/UX Flow

### Scénář 1: Běžné poznámky
1. Uživatel má aktivní tab "Poznámka"
2. Stiskne `Ctrl+Mezerník` → začne mluvit
3. Text se zapisuje do "Poznámky"
4. Auto-save ukládá do DB (existující mechanismus)

### Scénář 2: Rychlý přepis
1. Uživatel má aktivní tab "Okamžitý přepis"
2. Stiskne `Ctrl+Mezerník` → začne mluvit
3. Text se zapisuje do "Okamžitého přepisu"
4. Auto-save ukládá do localStorage

### Scénář 3: Nový přepis od začátku
1. Uživatel má nějaký text v "Okamžitém přepisu"
2. Stiskne `Ctrl+Shift+Mezerník`
3. "Okamžitý přepis" se vymaže
4. Tab se přepne na "Okamžitý přepis" (pokud nebyl)
5. Nahrávání se automaticky spustí
6. **DŮLEŽITÉ**: "Poznámka" zůstává nedotčená!

## Technické poznámky

### Dva samostatné editory
- Používají se **dva `<NotesEditable>` elementy**
- Renderují se **podmíněně** podle `activeTab`
- Každý má vlastní ref (`notesRef` vs `transcriptionRef`)
- Každý má vlastní state (`notesText` vs `transcriptionText`)

### DOM Synchronizace
```javascript
// Sync notesText
useEffect(() => {
  if (notesRef.current && notesRef.current.innerHTML !== notesText) {
    isSyncingRef.current = true;
    notesRef.current.innerHTML = notesText || '';
    setTimeout(() => { isSyncingRef.current = false; }, 0);
  }
}, [notesText, notesRef]);

// Sync transcriptionText
useEffect(() => {
  if (transcriptionRef.current && transcriptionRef.current.innerHTML !== transcriptionText) {
    const wasSyncing = isSyncingRef.current;
    isSyncingRef.current = true;
    transcriptionRef.current.innerHTML = transcriptionText || '';
    setTimeout(() => { isSyncingRef.current = wasSyncing; }, 0);
  }
}, [transcriptionText]);
```

### Floating Button Indikace
- Floating button zůstává **červený během nahrávání** bez ohledu na aktivní tab
- `onRecordingChange` callback informuje Layout.js o stavu nahrávání

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   NotesPanel                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐     ┌──────────────────────────┐ │
│  │  Tab: Notes  │     │  Tab: Transcription      │ │
│  └──────────────┘     └──────────────────────────┘ │
│         │                       │                   │
│         ▼                       ▼                   │
│  ┌─────────────┐         ┌──────────────┐          │
│  │  notesRef   │         │transcriptionRef│        │
│  │  notesText  │         │transcriptionText│       │
│  └─────────────┘         └──────────────┘          │
│         │                       │                   │
│         ▼                       ▼                   │
│  ┌─────────────┐         ┌──────────────┐          │
│  │ API + DB    │         │ localStorage │          │
│  │ auto-save   │         │ (500ms)      │          │
│  └─────────────┘         └──────────────┘          │
│                                                     │
│  Speech Recognition (Ctrl+Space)                   │
│         │                                           │
│         ├─→ activeTab === 'notes'                  │
│         │      → notesRef.insertText()             │
│         │                                           │
│         └─→ activeTab === 'transcription'          │
│                → transcriptionRef.insertText()     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Migrace z původního stavu

### Co zůstalo stejné
- `notesText` a `notesRef` fungují identicky jako před změnou
- Všechny toolbar funkce (bold, italic, atd.) jsou zachovány
- Auto-save do DB pro poznámky funguje beze změny
- Keyboard shortcuts pro nahrávání

### Co se změnilo
1. **Přidány komponenty**: `TabsContainer`, `TabButton`
2. **Nový state**: `activeTab`, `transcriptionText`, `transcriptionRef`
3. **Ctrl+Shift+Space** nyní maže jen přepis (ne všechny poznámky!)
4. **Speech recognition** směřuje text podle aktivního tabu
5. **Persistence**: Přepis se ukládá jen do localStorage, ne DB

## Budoucí vylepšení

### Možné feature requests
- [ ] Export přepisu do poznámek (copy/paste)
- [ ] Časové značky v přepisu
- [ ] Historie přepisů
- [ ] Nastavení jazyka přepisu (nyní固定 cs-CZ)
- [ ] Clear button přímo v tabu přepisu
- [ ] Konfigurovatelné zkratky
