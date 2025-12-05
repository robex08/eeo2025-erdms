# 📋 Funkce "Vytěžení rozpracovaného formuláře"

## Přehled
Nová funkce v NotesPanel umožňuje export aktuálně rozpracovaného formuláře do poznámek ve formě HTML tabulky s pokročilými funkcemi pro kopírování a export.

## 🆕 Nové funkce

### 1. **ID-to-Name Resolution**
Automatické převádění ID hodnot na čitelné názvy pomocí různých cache mechanismů:

- **Příkazce PO**: `EN` → `Jan Černohorský (EN)`
- **Garant**: `123` → `Karel Novák (123)`
- **Střediska**: `["KL", "KO"]` → `Kladno (KL), Kolín (KO)`
- **Dodavatel**: `12345678` → `ABC spol. s r.o. (12345678)`
- **Typ objednávky**: Načítá z orderTypes_cache
- **Zdroj financování**: Načítá z financing_cache

### 2. **Copy Buttons**
- Každá buňka tabulky má vlastní tlačítko 📋 pro zkopírování obsahu
- Okamžité zkopírování do schránky jedním kliknutím
- Vizuální feedback při kopírování

### 3. **CSV Export**
- Tlačítko 📊 CSV v pravém horním rohu tabulky
- Export celé tabulky ve formátu CSV s oddělovačem středník
- Správné escapování speciálních znaků

## 🔧 Technické detaily

### Cache systémy použité pro mapování:
```javascript
// Příkazci/Schvalovatelé
cached_approvers: [{ id, label, name, jmeno }]

// Garanti
cached_garants: [{ id, jmeno, name, label }]
userCache: { userId: { name } }

// Střediska/Centra
locations_cache: [{ id, name, nazev, kod }]

// Dodavatelé
suppliers_cache: [{ ico, nazev, name, id }]

// Typy objednávek
orderTypes_cache: [{ id, kod, nazev, name }]

// Zdroje financování
financing_cache: [{ id, kod, nazev, name }]
```

### Fallback mechanismy:
1. **Primární cache** - specifické cache pro každý typ dat
2. **FormData fallback** - hledání v aktuálních datech formuláře
3. **Statický mapping** - základní mapování pro PO kódy a střediska
4. **Původní hodnota** - pokud není nalezeno mapování

## 📄 Struktura exportované tabulky

```html
<div style="font-family: Arial, sans-serif;">
  <h3>📋 Rozpracovaný formulář - export
    <button onclick="exportToCSV()">📊 CSV</button>
  </h3>
  <table>
    <thead>
      <tr>
        <th>Pole</th>
        <th>Hodnota</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Předmět</td>
        <td>
          Testovací objednávka
          <button onclick="copyToClipboard(...)">📋</button>
        </td>
      </tr>
      <!-- ... další řádky ... -->
    </tbody>
  </table>
</div>
```

## 🎯 Použití

### Aktivace funkce:
1. Otevřete rozpracovaný formulář v OrderForm
2. Klikněte na ikonu tabulky 📋 v toolbaru NotesPanel
3. Automaticky se vygeneruje a vloží HTML tabulka s aktuálními daty

### Mapování polí:
```javascript
const fieldMapping = {
  predmet: 'Předmět',
  prikazce_id: 'Příkazce PO',
  garant_uzivatel_id: 'Garant',
  strediska: 'Střediska',
  dodavatel_ico: 'IČO dodavatele',
  dodavatel_nazev: 'Název dodavatele',
  druh_objednavky: 'Druh objednávky',
  zdroj_financovani: 'Zdroj financování',
  celkova_cena: 'Celková cena',
  poznamka: 'Poznámka',
  datum_dodani: 'Datum dodání',
  misto_dodani: 'Místo dodání',
  polozky: 'Položky objednávky'
  // ... další pole podle potřeby
};
```

## 🔍 Zdrojové soubory

### Hlavní implementace:
- `src/components/panels/NotesPanel.js` - hlavní funkce `buildFormDataHtml()`

### Funkce:
- `resolveIdToName()` - mapování ID na jména
- `copyToClipboard()` - kopírování buněk
- `exportToCSV()` - CSV export

## 🚀 Příklady použití

### Příklad 1: Základní export
```javascript
// Při kliknutí na ikonu tabulky se načte:
const formData = JSON.parse(localStorage.getItem(`order_draft_${storageId}`));
const htmlTable = buildFormDataHtml();
// Vloží se do rich text editoru
```

### Příklad 2: CSV export
```javascript
// Kliknutí na CSV tlačítko generuje:
"Pole";"Hodnota"
"Předmět";"Testovací objednávka IT vybavení"
"Příkazce PO";"Jan Černohorský (EN)"
"Garant";"Karel Novák (123)"
"Střediska";"Kladno (KL), Kolín (KO)"
```

### Příklad 3: Copy funkcionalita
```javascript
// Kliknutí na 📋 tlačítko u buňky:
copyToClipboard('Jan Černohorský (EN)', buttonElement);
// Zkopíruje obsah a zobrazí ✅ feedback
```

## 📊 Test Coverage

Test soubor: `test-form-export-enhanced.js`
- ✅ ID-to-name resolution pro všechny typy polí
- ✅ HTML tabulka generování
- ✅ CSV export funkcionalita
- ✅ Fallback mechanismy
- ✅ Cache správná funkcionalita

## 🐛 Řešení problémů

### Častá řešení:
1. **Nejsou zobrazená jména**: Zkontrolujte cache v localStorage
2. **Chybí data**: Ověřte, že formulář má uložený draft
3. **Copy nefunguje**: Zkontrolujte HTTPS (vyžaduje secure context)
4. **CSV prázdné**: Ověřte mapování polí v `fieldMapping`

### Debug:
```javascript
// Kontrola cache
console.log('Approvers cache:', localStorage.getItem('cached_approvers'));
console.log('User cache:', localStorage.getItem('userCache'));
console.log('Form data:', localStorage.getItem(`order_draft_${storageId}`));
```

## 📈 Budoucí vylepšení

Možná rozšíření:
- [ ] PDF export
- [ ] Filtrování zobrazených polí
- [ ] Vlastní mapování polí
- [ ] Batch copy více buněk
- [ ] Export do různých formátů (Excel, JSON)
- [ ] Historie exportů
- [ ] Templates pro různé typy formulářů

## 🎉 Shrnutí

Funkce "Vytěžení rozpracovaného formuláře" poskytuje:
- **Rychlý přehled** aktuálního stavu formuláře
- **Čitelné hodnoty** místo technických ID
- **Snadné kopírování** jednotlivých hodnot
- **Flexibilní export** do CSV formátu
- **Robustní fallback** mechanismy
- **Profesionální vzhled** HTML tabulky

Funkce je plně integrována do stávajícího workflow a využívá existující cache mechanismy aplikace pro optimální výkon.