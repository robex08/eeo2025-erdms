# 📎 UI/UX DESIGN: Přílohy k fakturám

**Datum:** 2025-10-27  
**Komponenta:** OrderForm25.js - Sekce Faktury (FÁZE 5)  
**Feature:** Upload příloh k fakturám s detekcí ISDOC  

---

## 🎯 CÍLE

1. **Umožnit nahrání souborů přímo u každé faktury**
2. **Automatická detekce ISDOC formátu**
3. **Intuitivní UX - podobné existujícímu systému příloh**
4. **Jasná vazba soubor ↔ faktura**
5. **Příprava na budoucí ISDOC parsing**

---

## 📐 UMÍSTĚNÍ KOMPONENTY

### Pozice v UI:
```
┌─────────────────────────────────────────────┐
│ FÁZE 5: Fakturace                           │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ FAKTURA 1 *                     [+] │   │ ← Tlačítko přidat fakturu
│ ├─────────────────────────────────────┤   │
│ │ Datum doručení: [2025-10-27]        │   │
│ │ Číslo FA/VPD:   [FA-2025-001]       │   │
│ │ Částka:         [25000.00] Kč       │   │
│ │ Splatnost:      [2025-11-27]        │   │
│ │ Střediska:      [201, 305]          │   │
│ │ Poznámka:       [...]               │   │
│ │                                     │   │
│ │ ┌───────────────────────────────┐   │   │ ← 🆕 NOVÁ SEKCE
│ │ │ 📎 Přílohy faktury (2)        │   │   │
│ │ ├───────────────────────────────┤   │   │
│ │ │ [+] Přidat soubor             │   │   │
│ │ ├───────────────────────────────┤   │   │
│ │ │ 📄 FA-2025-001.pdf  [🗑️] [⬇️] │   │   │
│ │ │ 📄 FA-2025-001.isdoc [🗑️] [⬇️] │   │   │ ← ISDOC označen
│ │ │    ✅ ISDOC formát detekován   │   │   │
│ │ └───────────────────────────────┘   │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ FAKTURA 2                       [🗑️] │   │
│ │ ...                                 │   │
│ └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 🎨 DESIGN SPECIFIKACE

### 1️⃣ **Sekce příloh u faktury**

**Vzhled:**
- Světle šedý box s přerušovaným okrajem (dashed border)
- Minimalistický design - nezabírá moc místa
- Skrytelný (collapse) pokud není potřeba

**Barvy:**
```css
Background: #f9fafb
Border: 1px dashed #d1d5db
Text: #6b7280 (secondary)
```

**Stavy:**
- **Prázdná:** Zobrazí se pouze tlačítko "Přidat soubor"
- **S přílohami:** Seznam souborů + tlačítko přidat další

---

### 2️⃣ **Tlačítko "Přidat soubor"**

**Design:**
```
┌──────────────────────────┐
│ 📎 + Přidat soubor       │
└──────────────────────────┘
```

**Properties:**
- Background: `#e0f2fe` (light blue)
- Border: `1px solid #3b82f6`
- Icon: 📎 (Paperclip)
- Hover: Zvýraznění, cursor pointer
- Font-size: `0.875rem`

**Chování:**
- Click → otevře file picker
- Supported: `.pdf`, `.isdoc`, `.jpg`, `.jpeg`, `.png`
- Max size: 10MB (PDF), 5MB (ISDOC)

---

### 3️⃣ **Seznam příloh**

**Design položky:**
```
┌─────────────────────────────────────────────┐
│ 📄 FA-2025-001.pdf                     1.2MB │
│    Nahráno: 27.10.2025 14:35                │
│    Nahrál: Jan Novák                        │
│                              [🗑️] [⬇️]        │
└─────────────────────────────────────────────┘
```

**Properties:**
- Background: `#ffffff`
- Border: `1px solid #e5e7eb`
- Border-radius: `6px`
- Padding: `0.75rem`
- Margin-bottom: `0.5rem`

**Ikony podle typu:**
- 📄 PDF: `#ef4444` (červená)
- 📄 ISDOC: `#10b981` (zelená) + badge "ISDOC"
- 🖼️ Obrázek: `#3b82f6` (modrá)

---

### 4️⃣ **ISDOC Detekce - Dialog**

**Automatický dialog při uploadu .isdoc:**

```
┌───────────────────────────────────────────┐
│  📄 Detekován ISDOC formát!               │
├───────────────────────────────────────────┤
│                                           │
│  Soubor: FA-2025-001.isdoc                │
│  Velikost: 245 KB                         │
│                                           │
│  ✅ Klasifikace: FAKTURA (automaticky)    │
│                                           │
│  ℹ️ ISDOC je elektronický formát faktury. │
│                                           │
│  💡 Extrakce dat z ISDOC bude             │
│     implementována v budoucí verzi.       │
│                                           │
│  Prozatím bude soubor uložen jako         │
│  standardní příloha.                      │
│                                           │
│  [ Zrušit ]  [ Pokračovat v nahrání ]    │
└───────────────────────────────────────────┘
```

**Properties:**
- Modal overlay
- Background: `rgba(0, 0, 0, 0.5)`
- Dialog: White box, shadow, centered
- Buttons: 
  - Zrušit: Gray outline
  - Pokračovat: Blue solid

---

### 5️⃣ **ISDOC Badge u přílohy**

**Pro ISDOC soubory:**
```
┌─────────────────────────────────────────────┐
│ 📄 FA-2025-001.isdoc               [ISDOC]  │
│    ✅ ISDOC formát detekován                │
│    ℹ️ Extrakce dat: Připraveno             │
│                              [🗑️] [⬇️]        │
└─────────────────────────────────────────────┘
```

**Badge design:**
```css
background: #d1fae5;
color: #065f46;
padding: 2px 8px;
border-radius: 4px;
font-size: 0.75rem;
font-weight: 600;
```

---

### 6️⃣ **Upload Progress**

**Během nahrávání:**
```
┌─────────────────────────────────────────────┐
│ 📄 FA-2025-001.pdf                          │
│    ▓▓▓▓▓▓▓░░░░░░░░░  45%                   │
│    Nahrávám... 540 KB / 1.2 MB             │
└─────────────────────────────────────────────┘
```

**Properties:**
- Progress bar: `#3b82f6`
- Background: `#e5e7eb`
- Height: `6px`
- Animated shimmer effect

---

### 7️⃣ **Error States**

**Upload failed:**
```
┌─────────────────────────────────────────────┐
│ ❌ FA-2025-001.pdf                          │
│    Chyba: Soubor je příliš velký (15 MB)   │
│    Max povoleno: 10 MB                      │
│                              [Zkusit znovu] │
└─────────────────────────────────────────────┘
```

**Invalid file type:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ dokument.docx                            │
│    Nepodporovaný formát                     │
│    Podporováno: PDF, ISDOC, JPG, PNG       │
│                              [Zavřít]       │
└─────────────────────────────────────────────┘
```

---

## 🔄 INTERAKČNÍ FLOW

### **Flow 1: Nahrání PDF faktury**

```
1. Uživatel klikne na "📎 + Přidat soubor"
   ↓
2. Otevře se file picker
   ↓
3. Vybere FA-2025-001.pdf (1.2 MB)
   ↓
4. Soubor se začne nahrávat
   - Zobrazí se progress bar
   - Status: "Nahrávám..."
   ↓
5. Upload dokončen
   - Progress bar zmizí
   - Zobrazí se v seznamu příloh
   - Status: "Nahráno"
   - Toast: "✅ Soubor nahrán: FA-2025-001.pdf"
   ↓
6. Automatické uložení do konceptu
   - Příloha přiřazena k faktuře
   - Klasifikace: "FAKTURA"
```

### **Flow 2: Nahrání ISDOC faktury**

```
1. Uživatel klikne na "📎 + Přidat soubor"
   ↓
2. Vybere FA-2025-001.isdoc (245 KB)
   ↓
3. 🔍 AUTO-DETEKCE: Detekována přípona .isdoc
   ↓
4. Zobrazí se ISDOC dialog:
   "📄 Detekován ISDOC formát!"
   "Klasifikace: FAKTURA (automaticky)"
   "Extrakce dat bude v budoucnu"
   ↓
5. Uživatel klikne "Pokračovat v nahrání"
   ↓
6. Soubor se nahraje s:
   - klasifikace = "FAKTURA"
   - je_isdoc = true
   - isdoc_parsed = false
   ↓
7. Zobrazí se v seznamu s:
   - Badge [ISDOC]
   - Ikona 📄 (zelená)
   - Text: "✅ ISDOC formát detekován"
   ↓
8. Toast: "✅ ISDOC soubor nahrán: FA-2025-001.isdoc"
```

### **Flow 3: Smazání přílohy**

```
1. Uživatel klikne na 🗑️ u přílohy
   ↓
2. Zobrazí se confirm dialog:
   "Opravdu chcete smazat přílohu?"
   "FA-2025-001.pdf"
   ↓
3. Uživatel potvrdí "Ano"
   ↓
4. Backend smaže:
   - Fyzický soubor z disku
   - Záznam z DB
   ↓
5. Frontend odebere z UI
   ↓
6. Toast: "🗑️ Příloha smazána"
   ↓
7. Auto-save konceptu
```

---

## 📱 RESPONSIVE DESIGN

### Desktop (>1200px):
- Faktura full width
- Přílohy inline, 2 sloupce
- Všechny detaily viditelné

### Tablet (768px - 1200px):
- Faktura full width
- Přílohy 1 sloupec
- Zkrácené názvy souborů

### Mobile (<768px):
- Faktura stack vertikálně
- Přílohy 1 sloupec
- Pouze ikona + název
- Tlačítka jako ikony (bez textu)

---

## 🎭 ANIMACE & TRANSITIONS

### Přidání přílohy:
```css
animation: slideIn 0.3s ease-out;

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Odstranění přílohy:
```css
animation: slideOut 0.2s ease-in;

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}
```

### Upload progress:
```css
.progress-bar::after {
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
```

---

## 🔐 VALIDACE & BEZPEČNOST

### Frontend validace:
```javascript
const ALLOWED_TYPES = [
  'application/pdf',           // PDF
  'application/isdoc+xml',     // ISDOC
  'image/jpeg',                // JPG
  'image/png'                  // PNG
];

const MAX_SIZE = {
  pdf: 10 * 1024 * 1024,      // 10 MB
  isdoc: 5 * 1024 * 1024,     // 5 MB
  image: 5 * 1024 * 1024      // 5 MB
};

const validateFile = (file) => {
  // 1. Kontrola typu
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Nepodporovaný formát souboru'
    };
  }
  
  // 2. Kontrola velikosti
  const maxSize = getMaxSize(file.type);
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Soubor je příliš velký (${formatSize(file.size)}). Max: ${formatSize(maxSize)}`
    };
  }
  
  // 3. Kontrola názvu
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    return {
      valid: false,
      error: 'Název souboru obsahuje nepovolené znaky'
    };
  }
  
  return { valid: true };
};
```

### ISDOC detekce:
```javascript
const isISDOC = (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  return extension === 'isdoc';
};

const detectFileMetadata = (file) => {
  const isIsdoc = isISDOC(file);
  
  return {
    klasifikace: isIsdoc ? 'FAKTURA' : null, // Auto pro ISDOC
    je_isdoc: isIsdoc,
    typ_souboru: file.type,
    velikost: file.size,
    autoDetected: isIsdoc,
    requiresDialog: isIsdoc
  };
};
```

---

## 📊 STAVY KOMPONENTY

### State management:
```javascript
const [fakturaAttachments, setFakturaAttachments] = useState({
  // Struktura: { [faktura_id]: [attachments] }
  '123': [
    {
      id: 'temp-1',
      name: 'FA-2025-001.pdf',
      size: 1234567,
      type: 'application/pdf',
      status: 'uploading', // uploading | uploaded | error
      progress: 45,
      error: null,
      klasifikace: 'FAKTURA',
      je_isdoc: false,
      serverId: null,
      uploadedBy: null,
      uploadedAt: null
    }
  ]
});
```

### Status transitions:
```
pending → uploading → uploaded
              ↓
            error
```

---

## 🎯 ACCESSIBILITY (A11Y)

### ARIA labels:
```html
<button 
  aria-label="Přidat přílohu k faktuře FA-2025-001"
  role="button"
>
  📎 + Přidat soubor
</button>

<div 
  role="list" 
  aria-label="Seznam příloh faktury"
>
  <div role="listitem">...</div>
</div>
```

### Keyboard navigation:
- `Tab` → Focus na tlačítko "Přidat soubor"
- `Enter/Space` → Otevře file picker
- `Tab` → Focus na přílohy
- `Delete` → Smaže vybranou přílohu
- `Esc` → Zavře dialogy

### Screen reader support:
```html
<span class="sr-only">
  Příloha FA-2025-001.pdf, velikost 1.2 megabajty, 
  formát PDF, nahráno 27. října 2025 v 14:35 
  uživatelem Jan Novák
</span>
```

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### Test 1: Základní upload PDF
1. Otevřít fakturu
2. Kliknout "Přidat soubor"
3. Vybrat PDF soubor (< 10 MB)
4. ✅ Soubor se nahraje
5. ✅ Zobrazí se v seznamu
6. ✅ Automatické uložení konceptu

### Test 2: ISDOC detekce
1. Přidat soubor .isdoc
2. ✅ Zobrazí se ISDOC dialog
3. Potvrdit upload
4. ✅ Badge [ISDOC] viditelný
5. ✅ Klasifikace = FAKTURA

### Test 3: Validace velikosti
1. Pokusit se nahrát 20 MB PDF
2. ✅ Chybová hláška
3. ✅ Soubor není nahrán

### Test 4: Multiple files
1. Nahrát 3 různé soubory
2. ✅ Všechny v seznamu
3. ✅ Správná vazba na fakturu

### Test 5: Smazání
1. Smazat přílohu
2. ✅ Confirm dialog
3. ✅ Odebráno z UI
4. ✅ Smazáno z DB

### Test 6: Offline mode
1. Odpojit síť
2. Pokusit se nahrát soubor
3. ✅ Chybová hláška
4. ✅ Možnost zkusit znovu

---

## 📦 KOMPONENTY K IMPLEMENTACI

### Nové komponenty:
1. **`FakturaAttachmentsSection`** - Hlavní sekce příloh
2. **`FakturaAttachmentUploadButton`** - Tlačítko upload
3. **`FakturaAttachmentItem`** - Položka přílohy v seznamu
4. **`ISDOCDetectionDialog`** - Dialog pro ISDOC
5. **`AttachmentProgressBar`** - Progress bar uploadu
6. **`AttachmentErrorMessage`** - Error stav

### Reusable utility:
1. **`useFileUpload`** - Hook pro upload
2. **`validateFileForFaktura`** - Validace
3. **`detectISDOC`** - ISDOC detekce
4. **`formatFileSize`** - Formátování velikosti

---

## 🎨 STYLE TOKENS

```javascript
const FAKTURY_PRILOHY_STYLES = {
  colors: {
    sectionBg: '#f9fafb',
    sectionBorder: '#d1d5db',
    itemBg: '#ffffff',
    itemBorder: '#e5e7eb',
    uploadBtn: '#e0f2fe',
    uploadBtnBorder: '#3b82f6',
    isdocBadge: '#d1fae5',
    isdocText: '#065f46',
    errorBg: '#fee2e2',
    errorText: '#991b1b',
    progressBar: '#3b82f6',
    progressBg: '#e5e7eb'
  },
  spacing: {
    sectionPadding: '0.75rem',
    itemPadding: '0.75rem',
    itemMargin: '0.5rem',
    buttonPadding: '0.5rem 1rem'
  },
  borderRadius: {
    section: '6px',
    item: '6px',
    button: '6px',
    badge: '4px'
  },
  fontSize: {
    small: '0.75rem',
    regular: '0.875rem',
    title: '1rem'
  }
};
```

---

## 📝 POZNÁMKY PRO IMPLEMENTACI

### 1. Integrace do OrderForm25.js:
- Přidat sekci příloh do každé faktury (uvnitř map loop)
- Umístit pod posledním FormRow (poznámka)
- Zachovat inline editaci faktury

### 2. State management:
- Rozšířit `formData.faktury[]` o pole `prilohy: []`
- NEBO použít flat strukturu s `faktura_id` v attachments
- Synchronizovat s auto-save

### 3. API calls:
- Reuse existující `uploadAttachment25()` - rozšířit o `faktura_id`
- Nové: `uploadFakturaAttachment25()`
- Nové: `deleteFakturaAttachment25()`
- Nové: `listFakturaAttachments25()`

### 4. Koncepty:
- Přílohy faktur se ukládají do konceptu
- Vazba přes `faktura_id` (temp ID pro nové faktury)
- Při uložení objednávky se přemapují na server ID

### 5. ISDOC parsing (budoucnost):
- Připravit strukturu `isdoc_data_json`
- Hook pro parsing: `useISDOCParser()`
- Mapování polí na fakturu (podobně jako DOCX šablony)

---

## ✅ CHECKLIST PRO FRONTEND DEV

- [ ] Vytvořit komponentu `FakturaAttachmentsSection`
- [ ] Implementovat file upload button
- [ ] Implementovat drag & drop (bonus)
- [ ] ISDOC auto-detekce
- [ ] ISDOC dialog
- [ ] Progress bar
- [ ] Error handling
- [ ] Seznam příloh
- [ ] Download funkce
- [ ] Delete funkce
- [ ] Responsive design
- [ ] Accessibility (ARIA)
- [ ] Animace
- [ ] Validace
- [ ] Auto-save integrace
- [ ] Toast notifikace
- [ ] Unit testy
- [ ] E2E testy

---

## 🚀 ROADMAP

### FÁZE 1: Základní funkcionalita (TEĎKA)
- ✅ UI komponenta
- ✅ Upload PDF
- ✅ ISDOC detekce (vizuální)
- ✅ Seznam příloh
- ✅ Delete

### FÁZE 2: ISDOC parsing (POZDĚJI)
- ⏳ XML parser
- ⏳ Mapování polí
- ⏳ Auto-vyplnění faktury
- ⏳ Validace dat

### FÁZE 3: Rozšíření (BUDOUCNOST)
- ⏳ Drag & drop upload
- ⏳ Batch upload
- ⏳ Preview souboru
- ⏳ OCR pro PDF
- ⏳ Verzování

---

**Připravil:** GitHub Copilot  
**Datum:** 27. října 2025  
**Status:** ✅ Připraveno k implementaci
