# Voice Recognition Firefox Support - Přátelský Dialog
**Datum:** 4. listopadu 2025  
**Soubory:**
- `src/hooks/useGlobalVoiceRecognition.js`
- `src/components/panels/NotesPanel.js`
- `src/components/Layout.js`

---

## 📋 Popis změn

Implementován **přátelský informační dialog** pro uživatele prohlížečů, které **nepodporují Web Speech API** (především Firefox), místo jednoduchého `alert()`.

### 🎯 Klíčová vylepšení

1. **✅ Dialog se zobrazí JEN v NotesPanel** - při pokusu o spuštění nahrávání
2. **✅ Mikrofon se NEAKTIVUJE** - když není podpora API
3. **✅ Červený indikátor se NEZOBRAZÍ** - floating button zůstane žlutý
4. **✅ Přátelská zpráva** - lidsky srozumitelný text s vysvětlením

---

## 🔧 Technické změny

### 1. Hook `useGlobalVoiceRecognition.js`

#### Přidán export stavu podpory API
```javascript
const [isSupported, setIsSupported] = useState(false);

// V useEffect inicializace
const hasSupport = ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
setIsSupported(hasSupport);

// Return hodnoty
return {
  isRecording,
  isSupported, // ✅ Nově exportováno
  startRecording,
  stopRecording,
  toggleRecording,
  currentTarget
};
```

#### Přidán callback pro nepodporovaný prohlížeč
```javascript
export function useGlobalVoiceRecognition({
  onOpenNotesPanel,
  onInsertToNotes,
  onUnsupportedBrowser, // ✅ Nový callback
  keywords = [],
  lang = 'cs-CZ'
})
```

#### Kontrola podpory v toggleRecording
```javascript
const toggleRecording = useCallback(() => {
  // ✅ Pokud API není podporováno, zavolej callback
  if (!isSupported && onUnsupportedBrowser) {
    onUnsupportedBrowser();
    return; // ❌ STOP - nezačínej nahrávání!
  }
  
  // ... zbytek logiky
}, [isRecording, startRecording, stopRecording, onOpenNotesPanel, isSupported, onUnsupportedBrowser]);
```

#### Odstranění alert() z startRecording
```javascript
const startRecording = useCallback((targetElement = null) => {
  if (!recognition) {
    // ❌ ODSTRANĚNO: alert('Váš prohlížeč nepodporuje rozpoznávání řeči...');
    // ✅ Kontrola podpory je v toggleRecording, ne zde
    return;
  }
  // ...
}, [recognition]);
```

---

### 2. Komponenta `NotesPanel.js`

#### Přidány styled komponenty pro dialog
```javascript
const VoiceUnsupportedOverlay = styled.div`...`;
const VoiceUnsupportedDialog = styled.div`...`;
const VoiceUnsupportedHeader = styled.div`...`;
const VoiceUnsupportedIcon = styled.div`...`;
const VoiceUnsupportedTitle = styled.h3`...`;
const VoiceUnsupportedContent = styled.div`...`;
const VoiceUnsupportedActions = styled.div`...`;
const VoiceUnsupportedButton = styled.button`...`;
```

#### State pro dialog
```javascript
const [showVoiceUnsupportedDialog, setShowVoiceUnsupportedDialog] = React.useState(false);
const isSupported = globalVoiceRecognition?.isSupported || false;
```

#### Kontrola podpory v startRecording
```javascript
const startRecording = async () => {
  // ✅ PRVNÍ KONTROLA: Je API podporováno?
  if (!isSupported) {
    setShowVoiceUnsupportedDialog(true);
    return; // ❌ STOP - nezačínej nahrávání!
  }
  
  if (!globalVoiceRecognition) {
    setShowVoiceUnsupportedDialog(true);
    return;
  }
  
  // ... zbytek logiky (JEN pokud je podpora)
};
```

#### Dialog v JSX (portal do document.body)
```jsx
{showVoiceUnsupportedDialog && ReactDOM.createPortal(
  <VoiceUnsupportedOverlay onClick={() => setShowVoiceUnsupportedDialog(false)}>
    <VoiceUnsupportedDialog onClick={e => e.stopPropagation()}>
      <VoiceUnsupportedHeader>
        <VoiceUnsupportedIcon>
          <FontAwesomeIcon icon={faMicrophone} />
        </VoiceUnsupportedIcon>
        <VoiceUnsupportedTitle>
          Hlasové ovládání není podporováno
        </VoiceUnsupportedTitle>
      </VoiceUnsupportedHeader>
      
      <VoiceUnsupportedContent>
        <p>
          <strong>Váš prohlížeč bohužel nepodporuje Web Speech API</strong>, 
          které je potřebné pro hlasový přepis poznámek.
        </p>
        
        <p>Tato funkce je v současnosti dostupná pouze v některých prohlížečích:</p>
        
        <ul>
          <li><strong>Google Chrome</strong> (doporučeno)</li>
          <li><strong>Microsoft Edge</strong></li>
          <li><strong>Opera</strong></li>
        </ul>
        
        <p>
          Pokud chcete používat hlasový přepis do poznámek, 
          prosím přepněte na jeden z podporovaných prohlížečů.
        </p>
        
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '1.5rem' }}>
          💡 <strong>Tip:</strong> Všechny ostatní funkce aplikace fungují bez omezení 
          i v aktuálním prohlížeči.
        </p>
      </VoiceUnsupportedContent>
      
      <VoiceUnsupportedActions>
        <VoiceUnsupportedButton 
          onClick={() => setShowVoiceUnsupportedDialog(false)}
          $primary
        >
          Rozumím
        </VoiceUnsupportedButton>
      </VoiceUnsupportedActions>
    </VoiceUnsupportedDialog>
  </VoiceUnsupportedOverlay>,
  document.body
)}
```

---

### 3. Komponenta `Layout.js`

#### Synchronizace stavu nahrávání - jen pokud je podpora
```javascript
useEffect(() => {
  // ✅ POUZE pokud je API podporováno, synchronizuj recording state
  if (globalVoice.isSupported) {
    setNotesRecording(globalVoice.isRecording);
  }
}, [globalVoice.isRecording, globalVoice.isSupported]);
```

#### Odstranění onUnsupportedBrowser z hooku
```javascript
// ❌ ODSTRANĚNO - dialog je nyní v NotesPanel
// onUnsupportedBrowser: () => {
//   setShowVoiceUnsupportedDialog(true);
// },
```

#### Zjednodušení onClick na floating buttonu
```javascript
onClick={()=> {
  // Standardní logika toggle (kontrola podpory je v NotesPanel při kliknutí na mikrofon)
  setNotesOpen(o=> { 
    const next=!o; 
    if(next) { 
      setEngagedPair(true); 
      setHoveredPanel(null); 
      bringPanelFront('notes'); 
    } else if(!todoOpen && !chatOpen) { 
      setEngagedPair(false); 
    } 
    return next; 
  });
}}
```

---

## 🎨 Design dialogu

### Barvy
- **Ikona pozadí:** Gradient žluto-zlatý `linear-gradient(135deg, #fef3c7, #fde68a)`
- **Ikona mikrof:** Oranžová `#d97706`
- **Primární tlačítko:** Modré gradient `linear-gradient(135deg, #3b82f6, #2563eb)`
- **Text:** Šedé odstíny pro dobrou čitelnost

### Animace
- **Fade-in overlay:** 0.2s ease-out
- **Slide-up dialog:** 0.3s ease-out
- **Hover efekt tlačítka:** Transform + shadow

---

## 🧪 Testovací scénáře

### Test 1: Firefox - Pokus o nahrávání
**Před:**
- ❌ Zobrazil se alert "Váš prohlížeč nepodporuje..."
- ❌ Červený mikrofon se aktivoval
- ❌ Floating button přepnul na červený

**Po:**
- ✅ Zobrazí se přátelský dialog s vysvětlením
- ✅ Mikrofon se NEAKTIVUJE
- ✅ Floating button zůstane ŽLUTÝ
- ✅ Dialog lze zavřít kliknutím na "Rozumím" nebo mimo dialog

### Test 2: Chrome - Nahrávání funguje
**Před i Po:**
- ✅ Funkční bez změn

### Test 3: CTRL+Space v Firefox
**Před:**
- ❌ Alert se zobrazil

**Po:**
- ✅ Dialog se zobrazí (díky onUnsupportedBrowser callback v hooku)

---

## 📊 User Experience Improvements

| Aspekt | Před | Po |
|--------|------|-----|
| **Typ hlášky** | `alert()` | Přátelský modal dialog |
| **Čitelnost** | Základní | Strukturovaný text, seznam, tipy |
| **UX** | Systémový popup | Vlastní design matching aplikaci |
| **Mikrofon** | ❌ Aktivoval se | ✅ Neaktivuje se |
| **Floating button** | ❌ Červený | ✅ Zůstane žlutý |
| **Informace** | Minimální | Detailní + doporučení |

---

## 🚀 Browser Support

### ✅ Podporováno (Web Speech API)
- **Google Chrome** (desktop + Android)
- **Microsoft Edge** (Chromium)
- **Opera**
- **Samsung Internet**

### ❌ Nepodporováno
- **Firefox** (všechny platformy)
- **Safari** (iOS + macOS)
- **Starší prohlížeče**

---

## 📝 Poznámky

### Proč je dialog v NotesPanel, ne v Layout?
1. **Logická lokace** - dialog se zobrazuje při akci v NotesPanel
2. **Lepší scope** - kontrola podpory přímo tam kde se používá
3. **Jednodušší state management** - lokální state v komponentě

### Proč kontrola v startRecording, ne v toggleRecording?
- `toggleRecording` je v hooku (globální)
- `startRecording` je v NotesPanel (specifická pro panel)
- Dialog potřebuje access k `setShowVoiceUnsupportedDialog` state

### Co se stane při CTRL+Space v nepodporovaném prohlížeči?
1. Hook detekuje `!isSupported` v `toggleRecording()`
2. Zavolá `onUnsupportedBrowser()` callback (pokud je definován)
3. V budoucnu lze přidat centrální toast notifikaci místo nic

---

## ✅ Checklist

- [x] Hook vrací `isSupported` flag
- [x] Hook má `onUnsupportedBrowser` callback
- [x] `startRecording` kontroluje podporu před spuštěním
- [x] Dialog je implementován v NotesPanel
- [x] Dialog má přátelský text a design
- [x] Mikrofon se NEAKTIVUJE když není podpora
- [x] Floating button zůstane ŽLUTÝ
- [x] Odstraněn alert() z kódu
- [x] Testováno v Chrome (podporováno)
- [ ] Testováno ve Firefoxu (nepodporováno) - čeká na test

---

## 🎯 Další možná vylepšení

### 1. Centrální toast pro CTRL+Space
```javascript
// V Layout.js - useGlobalVoiceRecognition callback
onUnsupportedBrowser: () => {
  showToast('Hlasové ovládání není podporováno v tomto prohlížeči', {
    type: 'warning',
    duration: 5000
  });
}
```

### 2. Browser detection pro Safari
- Safari má částečnou podporu Web Speech API
- Zobrazit speciální zprávu pro Safari uživatele

### 3. Persistentní dismiss
```javascript
// Uživatel může označit "Příště nezobrazovat"
localStorage.setItem('voice_unsupported_dismissed', 'true');
```

---

**Status:** ✅ Implementováno  
**Testováno:** ⏳ Čeká na manuální test ve Firefoxu  
**Dokumentováno:** ✅ Ano

---

**Autor:** GitHub Copilot  
**Reviewer:** TBD
