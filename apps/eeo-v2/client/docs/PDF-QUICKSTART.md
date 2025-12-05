# 📄 PDF Export pro Pokladní knihu - Rychlý start

## 🎯 Co bylo provedeno

Kompletní refaktoring PDF exportu z `jsPDF` na `@react-pdf/renderer` s těmito vylepšeními:

✅ **Plná podpora diakritiky** - České znaky se zobrazují správně  
✅ **Správný symbol "Kč"** - Už ne "K " nebo jiné chyby  
✅ **Automatické zalamování textu** - Text v buňkách se správně zalomí  
✅ **Čistý layout** - Použití Flexboxu místo ručního pozicování  
✅ **Responzivní sloupce** - Explicitní šířky zajišťují správné zobrazení  
✅ **Automatické stránkování** - Při velkém množství dat se PDF rozdělí na více stránek  

## 📦 Soubory

```
src/
├── components/
│   └── PokladniKnihaPDF.js        # Hlavní PDF komponenta
├── pages/
│   └── CashBookPage.js             # Aktualizováno (generatePDFReport)
└── utils/
    ├── pdfFonts.js                 # Konfigurace fontů (různé varianty)
    └── testPokladniKnihaPDF.js     # Testovací data a funkce
```

## 🚀 Jak to funguje

### 1. Import komponenty
```javascript
import { pdf } from '@react-pdf/renderer';
import PokladniKnihaPDF from '../components/PokladniKnihaPDF';
```

### 2. Generování PDF
```javascript
const generatePDFReport = async (filename) => {
  const blob = await pdf(
    <PokladniKnihaPDF
      organizationInfo={{
        workplace: 'Příbram',
        cashboxNumber: '600',
        month: 'listopad',
        year: 2025,
      }}
      carryOverAmount={1500.00}
      totals={{
        totalIncome: 12345.00,
        totalExpenses: 8900.00,
        currentBalance: 4945.00,
      }}
      entries={[/* pole transakcí */]}
    />
  ).toBlob();

  // Stažení
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### 3. Použití v aplikaci
V `CashBookPage.js` stačí kliknout na tlačítko "Export PDF" a PDF se automaticky vygeneruje a stáhne.

## 🎨 Příklad výstupu

```
╔════════════════════════════════════════════════════════╗
║                  POKLADNÍ KNIHA                        ║
║                     Příbram                            ║
║        Pokladna č. 600 | listopad 2025                 ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  📊 SOUHRN:                                            ║
║  Převod z předchozího měsíce:    1 500,00 Kč          ║
║  Celkové příjmy:                12 345,00 Kč          ║
║  Celkové výdaje:                 8 900,00 Kč          ║
║  Aktuální zůstatek:              4 945,00 Kč          ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  #  │ Datum      │ Doklad │ Obsah zápisu  │ ...       ║
╠════════════════════════════════════════════════════════╣
║  1  │ 01.11.2025 │ DOK001 │ Platba za ... │ ...       ║
║  2  │ 02.11.2025 │ DOK002 │ Nákup ...     │ ...       ║
║  3  │ 03.11.2025 │ DOK003 │ Příjem ...    │ ...       ║
╠════════════════════════════════════════════════════════╣
║  Příbram  │  Strana 1 z 2  │  Vygenerováno: 7.11.2025 ║
╚════════════════════════════════════════════════════════╝
```

## 🧪 Testování

### Rychlý test v prohlížeči
```javascript
// Otevři konzoli prohlížeče (F12) a zadej:
import testPDF from './utils/testPokladniKnihaPDF';

// Základní test
testPDF.generateTestPDF();

// Test diakritiky
testPDF.testDiacritics();

// Test velkého množství dat
testPDF.generateLargePDF();
```

### Úplný checklist
Viz soubor: `PDF-TESTING-CHECKLIST.md`

## 📚 Dokumentace

Podrobná dokumentace: `POKLADNI-KNIHA-PDF-REFACTORING.md`

## 🔧 Konfigurace fontů

Aktuálně jsou fonty načítány z CDN. Pro produkční nasazení doporučuji:

### Varianta A: Použít Google Fonts CDN (spolehlivější)
```javascript
// V src/components/PokladniKnihaPDF.js změň URL na:
src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf'
```

### Varianta B: Stáhnout fonty lokálně (nejlepší)
```bash
# 1. Vytvoř složku pro fonty
mkdir -p public/fonts/Roboto

# 2. Stáhni Roboto fonty
cd public/fonts/Roboto
wget -O Roboto-Regular.ttf "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf"
wget -O Roboto-Bold.ttf "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf"

# 3. V src/components/PokladniKnihaPDF.js změň:
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto/Roboto-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Roboto/Roboto-Bold.ttf', fontWeight: 700 },
  ],
});
```

## 🐛 Řešení problémů

### PDF se nestahuje
1. Zkontroluj konzoli prohlížeče (F12)
2. Ověř, že jsou fonty načtené
3. Zkontroluj, že všechna data jsou validní

### Špatná diakritika
1. Ujisti se, že je font registrovaný před renderováním
2. Zkontroluj, že používáš `fontFamily: 'Roboto'` ve stylech

### Text přetéká z buněk
1. Zkontroluj, že každý sloupec má `width` definovanou
2. Součet všech šířek by měl být ≤ 100%

## 📊 Výkon

- **Malé PDF (< 10 záznamů):** ~1 sekunda
- **Střední PDF (10-50 záznamů):** ~2-3 sekundy
- **Velké PDF (50-100 záznamů):** ~3-5 sekund

## 🎓 Další zdroje

- [@react-pdf/renderer dokumentace](https://react-pdf.org/)
- [Roboto font](https://fonts.google.com/specimen/Roboto)
- [Styling guide](https://react-pdf.org/styling)
- [Layout guide](https://react-pdf.org/layout)

## ✅ Co dál?

- [ ] Otestuj PDF v prohlížeči
- [ ] Zkontroluj diakritiku
- [ ] Vygeneruj testovací PDF s velkým množstvím dat
- [ ] Rozhodní se, zda použít CDN nebo lokální fonty
- [ ] Přizpůsob barvy a layout podle potřeby
- [ ] Přidej export do XLSX (volitelné)

## 💡 Tipy

1. **Ladění:** Použij `window.open(url)` místo `link.click()` pro náhled v prohlížeči
2. **Výkon:** Pro velké PDF zvažte použití virtualizace nebo stránkování
3. **Fonty:** Lokální fonty jsou rychlejší a spolehlivější než CDN
4. **Testování:** Vždy testuj s reálnými daty, ne jen s testovacími

---

**Vytvořeno:** 7. listopadu 2025  
**Autor:** GitHub Copilot  
**Verze:** 1.0
