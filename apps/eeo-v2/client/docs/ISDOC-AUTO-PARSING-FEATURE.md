# 📄 ISDOC Auto-parsing Feature - Dokumentace

## 🎯 Přehled

Implementována **automatická detekce a extrakce dat z ISDOC faktur** při nahrávání do systému.

### Klíčové funkce:

1. ✅ **Automatická detekce ISDOC** - Systém rozpozná `.isdoc` soubory
2. ✅ **Automatická klasifikace** - ISDOC faktury jsou automaticky označeny jako "FAKTURA"
3. ✅ **Dotaz uživatele** - Dialog s náhledem dat a možností vyplnit fakturu
4. ✅ **Datum doručení** - Automaticky nastaveno na aktuální datum
5. ✅ **Info tooltip** - Zobrazení počtu položek a dalších informací z ISDOC

---

## 🔧 Implementované soubory

### 1. **`src/utils/isdocParser.js`** - ISDOC parser utility

Parsuje XML strukturu ISDOC a extrahuje:
- Číslo faktury, data (vystavení, splatnost, zdanitelné plnění)
- Dodavatel (název, IČO, DIČ, adresa)
- Odběratel (pro kontrolu)
- Položky faktury (popis, množství, ceny)
- Částky (bez DPH, s DPH, DPH celkem)
- Platební údaje (účet, IBAN, variabilní symbol)

**Hlavní funkce:**
```javascript
parseISDOCFile(file) // Parsuje ISDOC soubor
mapISDOCToFaktura(isdocData, formData) // Mapuje ISDOC data na strukturu faktury
createISDOCSummary(isdocData) // Vytvoří souhrn pro dialog
isISDOCFile(file) // Detekce ISDOC souboru
```

---

### 2. **`src/components/invoices/ISDOCParsingDialog.js`** - Potvrzovací dialog

Krásně navržený dialog s:
- **Náhled dat** - Číslo faktury, dodavatel, částka, počet položek
- **3 akce:**
  - ✅ **Vyplnit údaje faktury** - Extrahuje a vyplní data
  - 📎 **Nahrát bez extrakce** - Nahraje soubor, ale nevyplní fakturu
  - ❌ **Zrušit** - Zruší celý proces

**Props:**
```javascript
<ISDOCParsingDialog
  isdocSummary={summary}    // Souhrn dat z ISDOC
  onConfirm={handleConfirm} // Vyplnit fakturu
  onCancel={handleCancel}   // Zrušit
  onUploadWithoutParsing={handleUpload} // Nahrát bez parsingu
/>
```

---

### 3. **`src/components/invoices/InvoiceAttachmentsCompact.js`** - Aktualizace

**Přidáno:**
- Import `ISDOCParsingDialog`, `parseISDOCFile`, `mapISDOCToFaktura`
- Props: `onISDOCParsed`, `formData`
- State: `showISDOCDialog`, `pendingISDOCFile`, `isdocSummary`
- Handlery: `handleISDOCConfirm`, `handleISDOCUploadWithoutParsing`, `handleISDOCCancel`

**Logika v `handleFileUpload`:**
```javascript
// 1. Detekce ISDOC souborů
const isdocFiles = files.filter(f => isISDOCFile(f.name));

// 2. Pokud je právě 1 ISDOC a máme callback → Parsovat a zobrazit dialog
if (isdocFiles.length === 1 && onISDOCParsed) {
  const isdocData = await parseISDOCFile(file);
  const summary = createISDOCSummary(isdocData);
  setShowISDOCDialog(true);
  return; // Čeká na rozhodnutí uživatele
}

// 3. Běžné ISDOC bez callbacku → Auto-klasifikace na "FAKTURA" + auto-upload
// 4. Ostatní soubory → Standardní proces
```

---

### 4. **`src/forms/OrderForm25.js`** - Integrace do faktur

**Přidáno:**

#### Handler pro ISDOC parsing:
```javascript
const handleISDOCParsed = (isdocData) => {
  // 1. Aktualizuje fakturaFormData
  setFakturaFormData(prev => ({
    ...prev,
    fa_cislo_vema: isdocData.fa_cislo_vema,
    fa_datum_vystaveni: isdocData.fa_datum_vystaveni,
    fa_splatnost: isdocData.fa_datum_splatnosti,
    fa_datum_doruceni: isdocData.fa_datum_doruceni, // DNEŠNÍ DATUM
    fa_castka: isdocData.fa_castka,
    fa_castka_bez_dph: isdocData.fa_castka_bez_dph,
    fa_dph: isdocData.fa_dph,
    fa_poznamka: isdocData.fa_poznamka,
    fa_strediska_kod: isdocData.fa_strediska_kod,
    fa_dorucena: 1
  }));
  
  // 2. Okamžitá aktualizace faktury v seznamu
  const updatedFaktury = formData.faktury.map(f => 
    f.id === editingFaktura.id ? { ...f, ...isdocData, _isdoc_parsed: true } : f
  );
  updateFaktury(updatedFaktury);
  
  // 3. Toast + autosave
  showToast('✅ ISDOC faktura načtena - zkontrolujte vyplněné údaje');
  triggerAutosave(true);
};
```

#### Props v InvoiceAttachmentsCompact:
```jsx
<InvoiceAttachmentsCompact
  fakturaId={faktura.id}
  objednavkaId={persistedOrderId}
  fakturaTypyPrilohOptions={fakturaTypyPrilohOptions}
  readOnly={shouldLockSections || formData.stav_stornovano}
  onISDOCParsed={handleISDOCParsed}  // 🆕
  formData={formData}                // 🆕
/>
```

---

## 🎬 Uživatelský flow

### Scénář 1: Upload ISDOC s extrakcí dat

1. **Uživatel otevře fakturu** v FÁZI 5+
2. **Nahraje ISDOC soubor** přes drag & drop nebo file picker
3. **Systém detekuje ISDOC** → Automaticky naparsuje XML
4. **Zobrazí se dialog** s náhledem:
   - Číslo faktury: `FA-2025-001`
   - Dodavatel: `Firma s.r.o.`
   - Částka: `125 000,00 Kč`
   - Počet položek: `3`
5. **Uživatel klikne "Vyplnit údaje faktury"**
6. **Systém vyplní:**
   - Číslo Fa/VPD
   - Datum vystavení
   - Datum splatnosti
   - **Datum doručení = DNEŠNÍ DATUM** ✅
   - Částku s DPH
   - Částku bez DPH
   - DPH
   - Střediska (zkopíruje z objednávky)
7. **ISDOC soubor je nahrán** jako příloha s typem "FAKTURA"
8. **Toast**: "✅ ISDOC faktura načtena - zkontrolujte vyplněné údaje"
9. **Autosave** uloží změny do konceptu

---

### Scénář 2: Upload ISDOC bez extrakce

1. Stejné kroky 1-4 jako výše
2. **Uživatel klikne "Nahrát bez extrakce"**
3. **ISDOC soubor je nahrán** jako příloha (typ "FAKTURA")
4. **Faktura zůstává prázdná** - uživatel vyplní ručně
5. **Toast**: "ISDOC soubor byl nahrán bez extrakce dat"

---

### Scénář 3: Zrušení

1. Stejné kroky 1-4 jako výše
2. **Uživatel klikne "Zrušit"**
3. **Dialog se zavře**, soubor není nahrán
4. **Toast**: "Nahrání ISDOC zrušeno"

---

## 💡 Tooltip s informacemi z ISDOC

Vedle názvu faktury (např. "FAKTURA 1") je ikona `?` (HelpCircle).

**Po najetí myší se zobrazí:**
```
Číslo faktury: FA-2025-001
Částka: 125 000 Kč
Datum vystavení: 2025-01-15
Datum splatnosti: 2025-02-15
Datum doručení: 2025-01-27
Střediska: IT001, FIN002
```

**Dodatečné informace uložené v `_isdoc_*` polích:**
- `_isdoc_polozky` - Pole položek z ISDOC
- `_isdoc_pocet_polozek` - Počet položek
- `_isdoc_dodavatel` - Údaje o dodavateli
- `_isdoc_platba` - Bankovní údaje
- `_isdoc_parsed` - Flag, že data byla naparsována

---

## 🔒 Validace a bezpečnost

### XML Parsing:
- ✅ Použit `DOMParser` (nativní browser API)
- ✅ Kontrola parsing errors
- ✅ Fallback na prázdné hodnoty při chybě

### Soubory:
- ✅ Validace typu (`.isdoc` extension)
- ✅ Validace velikosti (max 5 MB)
- ✅ Try-catch pro všechny operace

### Data:
- ✅ Všechna pole jsou optional
- ✅ Parseování čísel s fallback na 0
- ✅ Datum doručení vždy = aktuální datum

---

## 🚀 Testování

### Test 1: Základní ISDOC upload
```javascript
// 1. Otevřít objednávku v FÁZI 5
// 2. Kliknout na fakturu
// 3. Nahrát ISDOC soubor
// 4. Ověřit dialog
// 5. Kliknout "Vyplnit údaje"
// 6. Ověřit vyplněná pole
// 7. Ověřit datum doručení = dnešní datum
// 8. Ověřit ISDOC přílohu v seznamu
```

### Test 2: Upload bez extrakce
```javascript
// 1-4. Stejné jako Test 1
// 5. Kliknout "Nahrát bez extrakce"
// 6. Ověřit prázdná pole faktury
// 7. Ověřit ISDOC přílohu v seznamu
```

### Test 3: Zrušení
```javascript
// 1-4. Stejné jako Test 1
// 5. Kliknout "Zrušit"
// 6. Ověřit že soubor není nahrán
// 7. Ověřit prázdná pole faktury
```

### Test 4: Chybný ISDOC
```javascript
// 1-2. Stejné jako Test 1
// 3. Nahrát poškozený ISDOC soubor
// 4. Ověřit warning toast
// 5. Ověřit běžný upload (bez parsingu)
```

---

## 📊 Mapování ISDOC → Faktura

| ISDOC pole | Faktura pole | Poznámka |
|------------|--------------|----------|
| `Invoice/ID` | `fa_cislo_vema` | Číslo faktury |
| `Invoice/IssueDate` | `fa_datum_vystaveni` | Datum vystavení |
| `Invoice/TaxPointDate` | `fa_datum_zdanitelneho_plneni` | Datum zdanitelného plnění |
| `Invoice/PaymentMeans/.../DueDate` | `fa_splatnost`, `fa_datum_splatnosti` | Datum splatnosti |
| `new Date()` | `fa_datum_doruceni` | **DNEŠNÍ DATUM** ✅ |
| `Invoice/LegalMonetaryTotal/TaxInclusiveAmount` | `fa_castka` | Částka s DPH |
| `Invoice/LegalMonetaryTotal/TaxExclusiveAmount` | `fa_castka_bez_dph` | Částka bez DPH |
| `Invoice/TaxTotal/TaxAmount` | `fa_dph` | DPH celkem |
| `Invoice/Note` | `fa_poznamka` | Poznámka |
| `formData.strediska_kod` | `fa_strediska_kod` | Zkopíruje z objednávky |
| `Invoice/InvoiceLine[]` | `_isdoc_polozky` | Položky (pro tooltip) |
| `Invoice/AccountingSupplierParty/Party/...` | `_isdoc_dodavatel` | Dodavatel (pro tooltip) |

---

## 🎨 Design

### Dialog:
- **Hlavička**: Zelený gradient (`#10b981` → `#059669`)
- **Ikona**: FileText v kruhovém pozadí
- **Sekce**: Základní údaje, Dodavatel, Částky a položky
- **Warning box**: Žlutý gradient s upozorněním na datum doručení
- **Tlačítka**: 
  - Primární (zelená): "Vyplnit údaje faktury"
  - Sekundární (bílá): "Nahrát bez extrakce", "Zrušit"

### Animace:
- Fade-in overlay (0.2s)
- Slide-up modal (0.3s)
- Hover efekty na tlačítkách

---

## 🔮 Budoucí rozšíření

### Možná vylepšení:

1. **Validace dodavatele** - Kontrola IČO z ISDOC vs. dodavatel z objednávky
2. **Auto-párovací položek** - Mapování ISDOC položek na položky objednávky
3. **Kontrola částek** - Porovnání celkové částky ISDOC vs. objednávka
4. **Export do účetnictví** - Přímý export ISDOC dat do účetního systému
5. **Batch upload** - Nahrání více ISDOC najednou
6. **OCR fallback** - Pro PDF faktury bez ISDOC

---

## 📝 Poznámky pro vývojáře

### Důležité:
- ⚠️ **Datum doručení** je vždy aktuální datum (požadováno v zadání)
- ⚠️ **Klasifikace** na "FAKTURA" je automatická pro ISDOC
- ⚠️ Parsing může selhat → Vždy fallback na běžný upload
- ⚠️ Callback `onISDOCParsed` je optional → Funguje i bez něj

### Performance:
- Parsing probíhá asynchronně (Promise)
- Velikost ISDOC max 5 MB (dostatečné pro XML)
- Dialog je lazy-loaded přes `ReactDOM.createPortal`

### Browser Support:
- DOMParser - všechny moderní prohlížeče
- Promise/async-await - všechny moderní prohlížeče
- File API - všechny moderní prohlížeče

---

## ✅ Checklist implementace

- [x] ISDOC parser (`src/utils/isdocParser.js`)
- [x] ISDOC dialog (`src/components/invoices/ISDOCParsingDialog.js`)
- [x] Aktualizace InvoiceAttachmentsCompact
- [x] Handler v OrderForm25
- [x] Props propojení
- [x] Auto-klasifikace na "FAKTURA"
- [x] Datum doručení = dnešní datum
- [x] Toast notifikace
- [x] Autosave po parsingu
- [x] Tooltip s ISDOC info
- [x] Error handling
- [x] Dokumentace

---

**Implementováno:** 27. října 2025  
**Autor:** GitHub Copilot  
**Status:** ✅ HOTOVO - Připraveno k testování
