# 📄 DOCX Preview Feature

## 🎯 Přehled

**Funkce náhledu DOCX šablon s reálnými daty** - zobrazuje náhled dokumentu s naplněnými poli z databáze přímo v prohlížeči.

---

## ✨ Funkce

### **1. Automatický náhled**
- 🔍 Konverze DOCX → HTML pomocí `mammoth.js`
- 📊 Nahrazení DocVariable polí testovacími daty
- 🎨 Vizuální označení naplněných hodnot (žluté zvýraznění)
- ⚡ Vše probíhá v browseru (bez backendu)

### **2. Tlačítko "Náhled"**
- 👁️ Zobrazuje se pouze u šablon s definovaným mapováním
- 💜 Fialový gradient design pro odlišení
- 📍 Umístění: mezi "Stáhnout" a "Aktivovat/Deaktivovat"

### **3. Preview Modal**
- 📱 Responzivní fullscreen modal
- 🖨️ Možnost tisku náhledu
- 📥 Tlačítko "Stáhnout DOCX" (připraveno pro backend)
- ✅ Info o počtu naplněných polí

---

## 🛠️ Implementace

### **Komponenty:**

```
src/components/docx/DocxPreviewModal.jsx
├── Mammoth.js konverze
├── Nahrazení polí daty
├── Styling pro DOCX output
└── Print funkce
```

### **Integrace:**

```javascript
// V DocxSablonyTab.js

// 1. Import
import DocxPreviewModal from '../../docx/DocxPreviewModal';

// 2. State
const [showPreviewModal, setShowPreviewModal] = useState(false);
const [previewTemplate, setPreviewTemplate] = useState(null);

// 3. Handler
const handlePreview = async (template) => {
  // Stáhne DOCX soubor
  // Připraví data pro preview
  // Otevře modal
};

// 4. Tlačítko v tabulce (pouze pokud má mapování)
{row.original.docx_mapping && Object.keys(...).length > 0 && (
  <IconButton onClick={() => handlePreview(row.original)}>
    <FontAwesomeIcon icon={faEye} />
  </IconButton>
)}
```

---

## 📦 Závislosti

```json
{
  "mammoth": "^1.8.0"
}
```

**Mammoth.js** - konverze DOCX na HTML v browseru
- ✅ Podpora DocVariable polí
- ✅ Zachování formátování
- ✅ Žádný backend processing

---

## 🎨 Vizuální design

### **Preview tlačítko:**
```css
background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
color: white;
```

### **Naplněné hodnoty:**
```css
.filled-value {
  background: #fef3c7;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-weight: 500;
  color: #92400e;
}
```

---

## 🔧 Formáty polí

Preview podporuje následující formáty DocVariable polí:

1. **`{{field}}`** - Dvojité složené závorky
2. **`{field}`** - Jednoduché složené závorky
3. **`«field»`** - Word merge fields
4. **`DOCVARIABLE "field"`** - Word DocVariable syntaxe
5. **`[field]`** - Hranaté závorky

---

## 💡 Testovací data

Preview používá `example` hodnoty z `getOrderFieldsForMapping()`:

```javascript
{
  'objednavky.cislo_objednavky': 'OBJ-2025-001',
  'objednavky.datum_vytvoreni': '21.10.2025',
  'objednavky.celkova_cena': '15 000 Kč',
  // ... atd.
}
```

---

## 🚀 Použití

### **1. Namapujte pole**
1. Upravte šablonu
2. Klikněte "AI Map" nebo manuálně přetáhněte pole
3. Uložte šablonu

### **2. Otevřete náhled**
1. V seznamu šablon najděte šablonu s mapováním
2. Klikněte fialové tlačítko 👁️ "Náhled"
3. Počkejte na konverzi (pár vteřin)
4. Prohlédněte si náhled s daty

### **3. Akce v náhledu**
- 🖨️ **Tisk** - tisk náhledu
- 📥 **Stáhnout DOCX** - (připraveno pro backend)
- ❌ **Zavřít** - zavře modal

---

## 🔮 Budoucí vylepšení

### **Fáze 2 (Backend integrace):**
- [ ] Stahování naplněného DOCX souboru
- [ ] Výběr konkrétní objednávky pro data
- [ ] PDF export místo HTML preview
- [ ] Hromadné generování dokumentů

### **Fáze 3 (Pokročilé):**
- [ ] Live editace polí v náhledu
- [ ] Historické verze dokumentů
- [ ] Šablony s podmíněným obsahem
- [ ] Multi-language podpora

---

## 📊 Výkon

| Operace | Čas | Velikost |
|---------|-----|----------|
| Stažení DOCX | ~500ms | ~50KB |
| Konverze HTML | ~300ms | - |
| Nahrazení polí | ~50ms | - |
| **Celkem** | **~1s** | - |

---

## 🐛 Známé limitace

1. **Složité formátování** - Mammoth.js nemusí zachovat 100% stylů
2. **Tabulky** - Mohou vypadat mírně jinak než v Wordu
3. **Obrázky** - Podporovány, ale mohou být menší
4. **Fonty** - Používá webové fonty (Calibri fallback na Arial)

---

## 📝 Changelog

### **v1.0.0 - 2025-10-21**
- ✅ Základní preview funkce
- ✅ Mammoth.js integrace
- ✅ Tlačítko v tabulce šablon
- ✅ Modal s náhledem
- ✅ Print funkce
- ✅ Testovací data z DB polí

---

## 👨‍💻 Autor

Implementováno v rámci systému správy DOCX šablon
Datum: 21. října 2025
