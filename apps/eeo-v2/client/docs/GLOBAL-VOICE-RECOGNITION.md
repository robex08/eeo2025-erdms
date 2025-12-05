# Globální Hlasový Přepis (Global Voice Recognition)

## 📝 Přehled

Implementace globálního hlasového přepisu pomocí Web Speech API, který funguje kdekoli v aplikaci - nejen v NotesPanel.

## 🎯 Funkce

### 1. **Globální klávesová zkratka**
- **CTRL + Space** (nebo **CMD + Space** na Mac) kdekoli v aplikaci
- Spustí/zastaví hlasové rozpoznávání
- Funguje i když NotesPanel není otevřený

### 2. **Inteligentní cílení textu**

#### A) Focus na INPUT/TEXTAREA
```javascript
// Když je focus na editovatelném poli:
- Nahrává hlasový přepis
- Vkládá text přímo do aktivního pole
- Respektuje pozici kurzoru
- Trigger React events (onChange)
```

**Podmínky:**
- Element musí být `<input>` nebo `<textarea>`
- Nesmí být `disabled` nebo `readOnly`
- Typ nesmí být: `password`, `file`, `radio`, `checkbox`, `submit`, `button`

#### B) Focus jinde nebo nikde
```javascript
// Když není focus na editovatelném poli:
- Automaticky otevře NotesPanel
- Vkládá text do aktivního tabu (Poznámka nebo Okamžitý přepis)
- Podporuje HTML formátování
```

### 3. **Zvýraznění klíčových slov**

Automaticky zvýrazňuje důležitá slova v textu:

```javascript
keywords: [
  'urgentní', 'havárie', 'zranění', 'sanitka', 
  'priorita', 'okamžitě', 'důležité', 'kritické', 
  'pozor', 'varování', 'alarm'
]
```

**Výstup:**
```html
<mark style="background:#fef08a; color:#854d0e; padding:2px 4px; border-radius:3px;">
  urgentní
</mark>
```

## 🏗️ Architektura

### 1. Hook: `useGlobalVoiceRecognition.js`
```javascript
export function useGlobalVoiceRecognition({
  onOpenNotesPanel,    // Callback pro otevření NotesPanel
  onInsertToNotes,     // Callback pro vložení do NotesPanel
  keywords,            // Klíčová slova pro zvýraznění
  lang                 // Jazyk (default: 'cs-CZ')
})
```

**Vrací:**
```javascript
{
  isRecording,        // boolean - stav nahrávání
  startRecording,     // function - spustit nahrávání
  stopRecording,      // function - zastavit nahrávání
  toggleRecording,    // function - přepnout nahrávání
  currentTarget       // HTMLElement | null - aktivní cíl
}
```

### 2. NotesPanel úpravy

**Nové props:**
```javascript
onExternalInsert={(callback) => {
  // Registrace callback funkce pro externí vkládání
}}
```

**Interní handler:**
```javascript
const insertHandler = (htmlText) => {
  if (activeTab === 'transcription') {
    // Vložit do Okamžitého přepisu
  } else if (activeTab === 'notes') {
    // Vložit do Poznámky
  }
};
```

### 3. Layout.js integrace

**State:**
```javascript
const [notesExternalInsertCallback, setNotesExternalInsertCallback] = useState(null);
```

**Hook použití:**
```javascript
const globalVoice = useGlobalVoiceRecognition({
  onOpenNotesPanel: () => {
    if (!notesOpen) {
      setNotesOpen(true);
      setEngagedPair(true);
      bringPanelFront('notes');
    }
  },
  onInsertToNotes: (htmlText) => {
    if (notesExternalInsertCallback) {
      notesExternalInsertCallback(htmlText);
    }
  },
  keywords: [...],
  lang: 'cs-CZ'
});
```

## 🔄 Flow diagramy

### Scénář A: Focus na INPUT
```
Uživatel zmáčkne CTRL+Space
         ↓
useGlobalVoiceRecognition detekuje event
         ↓
Zkontroluje document.activeElement
         ↓
Je to INPUT/TEXTAREA? → ANO
         ↓
Spustí recognition s target = input element
         ↓
Speech API vrací text
         ↓
insertText() vloží do input.value na pozici kurzoru
         ↓
Trigger input event pro React
```

### Scénář B: Focus nikde / na tlačítku
```
Uživatel zmáčkne CTRL+Space
         ↓
useGlobalVoiceRecognition detekuje event
         ↓
Zkontroluje document.activeElement
         ↓
Není editovatelný input? → ANO
         ↓
Zavolá onOpenNotesPanel() → Layout otevře panel
         ↓
Spustí recognition s target = null
         ↓
Speech API vrací text
         ↓
insertText() volá onInsertToNotes()
         ↓
Layout zavolá notesExternalInsertCallback()
         ↓
NotesPanel vloží text do aktivního tabu
```

## 🎨 Vizuální feedback

### 1. Floating button (Notes)
```javascript
style={{ 
  background: notesRecording 
    ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
    : '#ca8a04',
  animation: notesRecording 
    ? 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
    : 'none' 
}}
```

- **Normální stav:** Žlutá (#ca8a04)
- **Během nahrávání:** Červený gradient + pulse animace

### 2. Input pole během nahrávání
```javascript
// Můžeš přidat CSS třídu na currentTarget
if (globalVoice.currentTarget) {
  globalVoice.currentTarget.classList.add('voice-recording-active');
}
```

**CSS:**
```css
.voice-recording-active {
  border: 2px solid #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
  animation: pulse 1.5s ease-in-out infinite;
}
```

## 🔧 Použití

### Základní použití
```javascript
import { useGlobalVoiceRecognition } from '../hooks/useGlobalVoiceRecognition';

const MyComponent = () => {
  const voice = useGlobalVoiceRecognition({
    onOpenNotesPanel: () => console.log('Open notes'),
    onInsertToNotes: (text) => console.log('Insert:', text),
    keywords: ['urgent', 'critical'],
    lang: 'cs-CZ'
  });
  
  return (
    <button onClick={voice.toggleRecording}>
      {voice.isRecording ? 'Stop' : 'Start'} nahrávání
    </button>
  );
};
```

### Vlastní keywords
```javascript
const customKeywords = [
  // Zdravotní termíny
  'ambulance', 'lékař', 'nemocnice', 'zranění',
  
  // Technické termíny
  'selhání', 'porucha', 'výpadek', 'restart',
  
  // Projekty
  'deadline', 'milestone', 'urgent', 'asap'
];

useGlobalVoiceRecognition({
  keywords: customKeywords,
  // ...
});
```

## 🐛 Debugging

### Console logs
```javascript
// Hook loguje:
console.log('🎤 Recording started', targetElement);
console.log('🎤 Recognition ended');
console.log('🎤 Speech recognition error:', event.error);
console.log('✅ Text vložen do input:', element.name);
```

### Testování
```javascript
// 1. Test s input polem
<input type="text" placeholder="Zkus CTRL+Space" />

// 2. Test s textarea
<textarea placeholder="Zkus CTRL+Space"></textarea>

// 3. Test bez focusu
// Klikni mimo všechny inputy a zkus CTRL+Space
```

## 📱 Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Plná | Web Speech API native |
| Edge | ✅ Plná | Web Speech API native |
| Safari | ⚠️ Částečná | iOS: pouze v secure context |
| Firefox | ❌ Ne | Web Speech API není podporováno |

## 🔒 Security

### 1. Mikrofon permissions
```javascript
// User musí povolit mikrofon
navigator.mediaDevices.getUserMedia({ audio: true })
```

### 2. Input validace
```javascript
// Nesmí se vkládat do password polí
const isValidType = !['password', 'file', ...].includes(element.type);
```

### 3. XSS prevence
```javascript
// Pro INPUT/TEXTAREA: prostý text (ne HTML)
element.value = text;

// Pro NotesPanel: HTML je sanitizovaný
// (zvýraznění keywords je kontrolované)
```

## 🚀 Future Improvements

### 1. Fuzzy matching keywords
```javascript
import Fuse from 'fuse.js';

const fuse = new Fuse(keywords, {
  threshold: 0.3,
  distance: 100
});
```

### 2. Multi-language support
```javascript
const languages = {
  cs: ['urgentní', 'havárie'],
  en: ['urgent', 'emergency'],
  de: ['dringend', 'notfall']
};
```

### 3. Auto-fill form fields
```javascript
// Rozpoznat kontext a vyplnit více polí najednou
"Dodavatel ABC, částka 50000, termín 31.12.2025"
  ↓
supplierName = "ABC"
amount = 50000
deadline = "2025-12-31"
```

### 4. Voice commands
```javascript
// Speciální příkazy
"nová objednávka" → otevře formulář
"uložit" → save current form
"zrušit" → cancel current action
```

## 📚 Související dokumentace

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechRecognition Interface](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [NotesPanel dokumentace](./NOTES-TABBED-INTERFACE.md)

## ✅ Soubory změněny

1. **NOVÝ:** `src/hooks/useGlobalVoiceRecognition.js`
   - Hlavní hook pro globální voice recognition
   - CTRL+Space listener na document úrovni
   - Inteligentní cílení (input vs NotesPanel)
   - Zvýraznění klíčových slov

2. **UPRAVENO:** `src/components/panels/NotesPanel.js`
   - Přidán prop `onExternalInsert`
   - Odstranění lokálního CTRL+Space listeneru
   - Podpora pro externí vkládání textu
   - CTRL+Shift+Space stále funguje (clear & record)

3. **UPRAVENO:** `src/components/Layout.js`
   - Import `useGlobalVoiceRecognition`
   - State `notesExternalInsertCallback`
   - Konfigurace keywords
   - Synchronizace `notesRecording` state

4. **NOVÝ:** `docs/GLOBAL-VOICE-RECOGNITION.md`
   - Tato dokumentace

---

**Autor:** GitHub Copilot  
**Datum:** 25. října 2025  
**Verze:** 1.0
