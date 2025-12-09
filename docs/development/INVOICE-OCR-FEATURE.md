# 📄 Automatická OCR Extrakce z PDF Faktur

## 🎯 Přehled

Nová funkce automatického vytěžení údajů z PDF faktur pomocí OCR (Optical Character Recognition). Po nahrání PDF faktury může uživatel kliknout na ikonku ✨ (Sparkles) a systém automaticky rozpozná a vyplní základní údaje faktury.

## ✨ Funkce

### Automatické rozpoznávání polí

Systém rozpoznává tyto údaje z PDF faktury:

1. **Variabilní symbol** (aliasy: Číslo faktury, Faktura číslo, VS, Faktura č.)
2. **Datum vystavení** (různé formáty: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY)
3. **Datum splatnosti**
4. **Částka včetně DPH** (v Kč)

### UI/UX

- **Umístění**: ✨ OCR tlačítko vedle PDF tagu v floating panelu Spisovky
- **Design**: Fialový gradient tlačítko s ikonou Sparkles a textem "OCR"
- **Progress Overlay**: Překryvná vrstva s animací a progress barem (0-100%)
- **Auto-fill**: Vytěžené údaje se automaticky vyplní do formuláře
- **Error Handling**: Informativní chybové hlášky

#### Umístění OCR tlačítka

OCR tlačítko se zobrazuje **pouze u PDF příloh** ve floating panelu Spisovky:

```
┌─────────────────────────────────┐
│ 📄 Faktura_2025.pdf  │ PDF │ OCR │
│ 📝 Poznamka.txt      │ TXT │     │
└─────────────────────────────────┘
```

## 🔧 Technická implementace

### Použité technologie

- **Tesseract.js** - OCR engine s podporou češtiny (`ces` language)
- **pdf-lib** - Práce s PDF soubory
- **React Components** - InvoiceAttachmentsCompact.js, InvoiceEvidencePage.js
- **Lucide Icons** - Sparkles icon pro vizuální identifikaci

### Klíčové soubory

```
/var/www/erdms-dev/
├── apps/eeo-v2/client/src/
│   ├── utils/
│   │   └── invoiceOCR.js                    # OCR logika + extrakce dat
│   ├── components/
│   │   ├── invoices/
│   │   │   └── InvoiceAttachmentsCompact.js # (backup OCR tlačítko)
│   │   └── panels/
│   │       └── SpisovkaInboxPanel.js        # ✨ HLAVNÍ OCR UI - floating panel
│   └── pages/
│       └── InvoiceEvidencePage.js           # Integrace OCR dat do formuláře
```

### Workflow

```
1. Uživatel otevře Spisovka floating panel (📖 tlačítko)
   ↓
2. Zobrazí se seznam faktur ze spisovky s přílohami
   ↓
3. U PDF příloh se zobrazí fialové tlačítko "OCR"
   ↓
4. Klik na OCR → stáhne PDF ze spisovky
   ↓
5. Zobrazí progress overlay (0-100%)
   ↓
6. Tesseract.js provede OCR rozpoznání textu (česky)
   ↓
7. extractInvoiceData() parsuje text a hledá klíčové údaje
   ↓
8. handleOCRDataExtracted() vyplní data do formuláře InvoiceEvidencePage
   ↓
9. Progress overlay zmizí, data jsou vyplněna v polích
```

## 📋 API

### `extractTextFromPDF(pdfFile, onProgress)`

Hlavní funkce pro OCR extrakci z PDF.

**Parametry:**
- `pdfFile` (File) - PDF soubor k analýze
- `onProgress` (Function) - Callback pro update progress (progress: 0-100, message: string)

**Vrací:**
- `Promise<string>` - Extrahovaný text z PDF

**Příklad:**
```javascript
const text = await extractTextFromPDF(pdfFile, (progress, message) => {
  console.log(`${progress}%: ${message}`);
});
```

### `extractInvoiceData(text)`

Parsuje vytěžený text a hledá údaje faktury.

**Parametry:**
- `text` (string) - Text z OCR

**Vrací:**
- `Object` s následujícími vlastnostmi:
  ```javascript
  {
    variabilniSymbol: string | null,  // Např. "12345678"
    datumVystaveni: string | null,    // ISO formát "YYYY-MM-DD"
    datumSplatnosti: string | null,   // ISO formát "YYYY-MM-DD"
    castka: number | null             // Např. 25000.50
  }
  ```

**Příklad:**
```javascript
const data = extractInvoiceData(ocrText);
console.log(data);
// {
//   variabilniSymbol: "12345678",
//   datumVystaveni: "2025-12-09",
//   datumSplatnosti: "2026-01-09",
//   castka: 25000.50
// }
```

### `handleOCRDataExtracted(ocrData)`

Callback funkce v InvoiceEvidencePage pro aplikaci OCR dat do formuláře.

**Parametry:**
- `ocrData` (Object) - Objekt s vytěženými daty (viz extractInvoiceData)

**Mapování polí:**
- `ocrData.variabilniSymbol` → `formData.fa_cislo_vema`
- `ocrData.datumVystaveni` → `formData.fa_datum_vystaveni`
- `ocrData.datumSplatnosti` → `formData.fa_datum_splatnosti`
- `ocrData.castka` → `formData.fa_castka`

## 🎨 Styling

### OCR Button ve Spisovka Panelu

```jsx
<button
  onClick={(e) => {
    e.stopPropagation();
    handleOCRExtraction(priloha);
  }}
  style={{
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    color: 'white',
    fontSize: '0.65rem',
    fontWeight: '600',
    boxShadow: '0 1px 3px rgba(139, 92, 246, 0.3)',
    transition: 'all 0.2s ease'
  }}
  title="Vytěžit údaje pomocí OCR"
>
  <Sparkles size={12} />
  <span>OCR</span>
</button>
```

**Interakce:**
- Hover efekt: Scale 1.05, zvýšený shadow
- Animace: Smooth transition 0.2s

### Progress Overlay

Zobrazuje se nad Spisovka panelem během OCR extrakce:

- **Background**: rgba(255, 255, 255, 0.95) - bílý semi-transparent
- **Ikona**: Sparkles s rotační animací (spin 2s)
- **Progress Bar**: 
  - Background: #e9d5ff (light purple)
  - Fill: #8b5cf6 (purple)
  - Transition: width 0.3s ease
- **Text**: 
  - Title: #1a1a1a, 1rem, font-weight 600
  - Message: #6b7280, 0.875rem
  - Percentage: #8b5cf6, 0.75rem, font-weight 600

## 🧪 Testování

### Manuální test

1. Otevřete InvoiceEvidencePage
2. Klikněte na 📖 tlačítko pro otevření Spisovka panelu
3. Počkejte na načtení faktur ze spisovky
4. Najděte fakturu s PDF přílohou
5. Klikněte na fialové tlačítko **"OCR"** vedle PDF tagu
6. Sledujte progress overlay (0-100%)
7. Zkontrolujte, zda se údaje automaticky vyplnily do formuláře:
   - Variabilní symbol → pole "Číslo faktury"
   - Datum vystavení → pole "Datum vystavení"
   - Datum splatnosti → pole "Datum splatnosti"
   - Částka → pole "Částka vč. DPH"
8. Ověřte správnost vytěžených dat

### Test cases

- ✅ PDF s jasně čitelnými údaji
- ✅ PDF s různými formáty datumu (., /, -)
- ✅ PDF s českými znaky a diakritikou
- ✅ PDF s různými variantami "Variabilní symbol"
- ❌ Rozmazaný nebo nekvalitní PDF (očekávaná chyba)
- ❌ PDF bez faktury (prázdné nebo jiný dokument)

## 🐛 Známé limitace

1. **Kvalita OCR závisí na kvalitě PDF**
   - Skenované dokumenty s nízkou kvalitou mohou mít horší výsledky
   - Doporučeno min. 300 DPI

2. **Pouze první strana**
   - Aktuálně se zpracovává pouze první strana PDF
   - Pro vícestránkové faktury může být nutná úprava

3. **Variabilita layoutu**
   - Různé faktury mají různé layouty
   - Regex patterns pokrývají běžné varianty, ale nemusí fungovat pro všechny

4. **Performance**
   - OCR může trvat 5-15 sekund podle velikosti PDF
   - Doporučeno zobrazit progress uživateli

## 🚀 Budoucí vylepšení

1. **Multi-page support** - Zpracování všech stran PDF
2. **AI/ML model** - Použití specifického modelu pro české faktury
3. **Confidence score** - Zobrazení míry jistoty u každého pole
4. **Manual review** - Možnost manuálně opravit vytěžená data před aplikací
5. **Caching** - Ukládání OCR výsledků pro opakované použití
6. **Batch processing** - Vytěžení více PDF najednou

## 📦 Závislosti

```json
{
  "tesseract.js": "^5.x",
  "pdf-lib": "^1.x"
}
```

Instalace:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm install tesseract.js pdf-lib
```

## 📝 Poznámky

- Tesseract.js používá WebAssembly, takže funguje i v prohlížeči bez serveru
- České znaky jsou podporovány díky `ces` language pack
- OCR data jsou pouze návrh - uživatel by měl vždy zkontrolovat správnost

## 🔗 Související dokumentace

- [InvoiceAttachmentsCompact.js](../../apps/eeo-v2/client/src/components/invoices/InvoiceAttachmentsCompact.js)
- [InvoiceEvidencePage.js](../../apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js)
- [invoiceOCR.js](../../apps/eeo-v2/client/src/utils/invoiceOCR.js)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
