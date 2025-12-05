# Finanční kontrola - PDF dokument

## 📋 Přehled

Implementace profesionálního PDF dokumentu **"Záznam o předběžné řídící kontrole"** podle zákona č. 320/2001 Sb., o finanční kontrole ve veřejné správě.

## ✅ Implementováno

### 1. **PDF Komponenta** (`FinancialControlPDF.js`)

Deklarativní React komponenta pro generování PDF pomocí `@react-pdf/renderer`.

#### Klíčové vlastnosti:
- ✅ **A4 formát na výšku** (portrait)
- ✅ **Podpora diakritiky** - fonty Roboto s plnou češtinou
- ✅ **Logo organizace** - ZZS Středočeského kraje
- ✅ **Profesionální design** - moderní layout s barevným kódováním sekcí
- ✅ **Právní základ** - odkazy na zákon č. 320/2001 Sb.
- ✅ **Více stránek** - automatické stránkování

#### Struktura dokumentu:

```
┌─────────────────────────────────────┐
│ HLAVIČKA                            │
│ - Logo                              │
│ - Název organizace                  │
│ - Název dokumentu                   │
│ - Datum generování                  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ ZÁKLADNÍ ÚDAJE (zelená sekce)      │
│ - Objednávka č.                     │
│ - Vyřizuje                          │
│ - Garant                            │
│ - Předmět                           │
│ - Příkazce operace                  │
│ - Cena bez DPH / s DPH              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ KONTROLA PŘED VZNIKEM ZÁVAZKU      │
│ (modrá sekce)                       │
│ - Příkazce operace                  │
│ - Komentář                          │
│ - Schváleno dne                     │
│ - Financování                       │
│ - Dodavatel (název, adresa, IČO)    │
│ - Odesláno dodavateli               │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ KONTROLA PO VZNIKU ZÁVAZKU         │
│ (žlutá sekce)                       │
│ - Variabilní symbol                 │
│ - Středisko                         │
│ - Splatnost                         │
│ - Kontrolu věcné správnosti provedl │
│ - Dne                               │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ VARIABILNÍ SYMBOL (zvýrazněný box)  │
│ - VS                                │
│ - Středisko                         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ SCHVÁLENÍ PŘÍKAZCEM OPERACE        │
│ - Podpis                            │
│ - Datum a razítko                   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ REGISTR SMLUV (pokud existuje)      │
│ - ID smlouvy                        │
│ - URL                               │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ PATIČKA                             │
│ - Název organizace                  │
│ - IČO, email, adresa                │
│ - Spisová značka                    │
└─────────────────────────────────────┘
```

### 2. **Modal s náhledem** (`FinancialControlModal.js`)

Moderní modal s live náhledem PDF před tiskem/stažením.

#### Funkce:
- ✅ **Live náhled** - iframe s PDF dokumentem
- ✅ **Stažení PDF** - download jako soubor
- ✅ **Tisk** - přímý tisk z náhledu
- ✅ **Responsive** - adaptivní layout
- ✅ **Loading state** - animace při generování
- ✅ **ESC zavření** - klávesová zkratka

#### Design:
- Zelená hlavička (corporate color)
- Ikony pro akce
- Animace při načítání
- Smooth transitions

### 3. **Integrace do Orders25List.js**

- ✅ Lazy loading modalu (výkon)
- ✅ State management
- ✅ Callback handlery
- ✅ Context menu integrace
- ✅ Zobrazení pouze pro stav "Dokončena"

### 4. **Context Menu** (`OrderContextMenu.js`)

- ✅ Nová položka "Finanční kontrola (PDF/tisk)"
- ✅ Sytá zelená barva (#059669)
- ✅ Ikona faktury (faFileInvoice)
- ✅ Podmíněné zobrazení (pouze DOKONCENA)
- ✅ Tooltip s nápovědou

## 🎨 Barevné schéma

```css
Zelená (primární):  #059669  /* Tailwind emerald-600 */
Zelená (hover):     #047857  /* Tailwind emerald-700 */
Zelená světlá:      #d1fae5  /* Tailwind emerald-100 */

Modrá (sekce):      #1e40af  /* Tailwind blue-700 */
Modrá světlá:       #eff6ff  /* Tailwind blue-50 */

Žlutá (sekce):      #f59e0b  /* Tailwind amber-500 */
Žlutá světlá:       #fef3c7  /* Tailwind amber-100 */

Šedá (text):        #374151  /* Tailwind gray-700 */
Šedá světlá:        #6b7280  /* Tailwind gray-500 */
```

## 📝 Právní základ

Dokument je založen na:
- **Zákon č. 320/2001 Sb.** - o finanční kontrole ve veřejné správě
- Vyhláška č. 416/2004 Sb.
- Metodika finanční kontroly ve veřejné správě

### Důležité prvky finanční kontroly:

1. **Kontrola před vznikem závazku** (ex-ante)
   - Schválení příkazcem operace
   - Ověření účelu a oprávněnosti výdaje
   - Kontrola dokladů

2. **Kontrola po vzniku závazku** (ex-post)
   - Věcná správnost
   - Formální správnost
   - Úplnost dokladů

## 🚀 Použití

### V kontextovém menu objednávky:

```javascript
// Pravý klik na řádek objednávky ve stavu "Dokončena"
// → zobrazí se položka "Finanční kontrola (PDF/tisk)"
// → kliknutím se otevře modal s náhledem
// → možnost stáhnout nebo vytisknout
```

### Programatické volání:

```javascript
import FinancialControlModal from '../components/FinancialControlModal';

<FinancialControlModal
  order={order}
  onClose={() => setModalOpen(false)}
  generatedBy={{
    fullName: "Ing. Jan Novák",
    position: "Vedoucí oddělení"
  }}
/>
```

## 📦 Závislosti

- `@react-pdf/renderer` ^4.3.1 - generování PDF
- `@emotion/styled` - styled components
- `@fortawesome/react-fontawesome` - ikony

## 🔧 Technické detaily

### Fonty
Používá se **Roboto** s plnou podporou češtiny:
- Light (300)
- Regular (400)
- Medium (500)
- Bold (700)

Fonty jsou načítány z CDN (ink 3.1.10).

### Formátování
- Měna: `Intl.NumberFormat('cs-CZ')` + " Kč"
- Datum: `toLocaleDateString('cs-CZ')`
- DateTime: `toLocaleString('cs-CZ')`

### Performance
- Lazy loading modalů
- Memo hooks pro optimalizaci
- URL.createObjectURL pro blob handling
- Cleanup při unmount

## 📄 Soubory

```
src/
├── components/
│   ├── FinancialControlPDF.js      # PDF komponenta (720 řádků)
│   ├── FinancialControlModal.js    # Modal s náhledem (300 řádků)
│   └── OrderContextMenu.js         # + finanční kontrola položka
├── pages/
│   └── Orders25List.js             # + integrace
└── utils/
    └── orderFiltersAdvanced.js     # + oprava fulltextu
```

## ✅ Testování

### Checklist:
- [ ] Otevření modalu z context menu
- [ ] Náhled PDF v iframe
- [ ] Stažení PDF souboru
- [ ] Tisk PDF dokumentu
- [ ] Zobrazení pouze pro stav "Dokončena"
- [ ] Diakritika v PDF
- [ ] Logo v hlavičce
- [ ] Správné formátování dat
- [ ] Responsive layout
- [ ] ESC zavření modalu

## 🔮 Budoucí vylepšení

1. **Digitální podpis** - integrace s eID
2. **Archivace** - automatické ukládání do systému
3. **Email** - odeslání PDF emailem
4. **Šablony** - vlastní šablony pro různé typy kontrol
5. **Historie** - log všech vygenerovaných kontrol
6. **Multilanguage** - angličtina, němčina

## 📚 Reference

- [Zákon č. 320/2001 Sb.](https://www.zakonyprolidi.cz/cs/2001-320)
- [@react-pdf/renderer dokumentace](https://react-pdf.org/)
- [Roboto Font](https://fonts.google.com/specimen/Roboto)

---

**Autor:** GitHub Copilot  
**Datum:** 24. listopadu 2025  
**Verze:** 1.0.0
