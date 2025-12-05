# 📋 Funkce "Vytěžení rozpracovaného formuláře" - Čistá HTML verze

## Přehled
Upravená funkce v NotesPanel umožňuje export aktuálně rozpracovaného formuláře do poznámek ve formě čisté HTML tabulky bez JavaScript kódu, s možností CSV exportu přes toolbar.

## 🔄 Změny oproti předchozí verzi

### ✅ **Vylepšení:**
- **Bezpečnost**: Odstraněn veškerý JavaScript kód z HTML
- **Kompatibilita**: Lepší fungování s rich text editorem
- **Čitelnost**: Čistý a jednoduchý HTML kód
- **Stabilita**: Žádné problémy s inline event handlery

### ❌ **Odstraněné funkce:**
- Copy tlačítka u jednotlivých buněk (způsobovaly problémy v editoru)
- Inline CSV export tlačítko v tabulce

### 🆕 **Nové funkce:**
- **CSV Export tlačítko** 📊 v toolbaru NotesPanel
- **Čistá HTML tabulka** bez interaktivních prvků
- **Lepší integrace** s rich text editorem

## 🎯 Použití

### 1. **HTML Export**
- Klikněte na ikonu tabulky 📋 v toolbaru NotesPanel
- Automaticky se vygeneruje a vloží čistá HTML tabulka
- Tabulka obsahuje všechna vyplněná pole s převedenými ID na jména

### 2. **CSV Export**
- Klikněte na tlačítko 📊 v toolbaru NotesPanel
- CSV data se zkopírují do schránky
- Oddělovač: středník (;)
- Automaticky převádí ID na čitelné názvy

## 🔧 Technické detaily

### HTML struktura:
```html
<div class="form-export-header">
  📋 Vytěžená data formuláře (uživatelský draft)
  <br><small>7. 10. 2025 17:06</small>
</div>
<table style="width:100%; border-collapse:collapse; ...">
  <tr>
    <td>Předmět:</td>
    <td>Testovací objednávka IT vybavení</td>
  </tr>
  <tr>
    <td>Číslo objednávky:</td>
    <td>O-0042/75030926/2025/IT</td>
  </tr>
  <!-- ... další řádky ... -->
</table>
```

### CSV formát:
```csv
"Pole";"Hodnota"
"Předmět";"Testovací objednávka IT vybavení"
"Číslo objednávky";"O-0042/75030926/2025/IT"
"Příkazce PO";"Jan Černohorský (EN)"
"Garant";"Karel Novák (123)"
"Střediska";"Kladno (KL), Kolín (KO)"
```

## 🗂️ ID-to-Name Mapování

Zachováno z předchozí verze:

### Cache systémy:
- **cached_approvers** → Příkazci PO
- **userCache** → Garanti a uživatelé
- **locations_cache** → Střediska/centra
- **suppliers_cache** → Dodavatelé
- **orderTypes_cache** → Typy objednávek
- **financing_cache** → Zdroje financování

### Příklady mapování:
```javascript
// Příkazce PO
'EN' → 'Jan Černohorský (EN)'

// Garant
'123' → 'Karel Novák (123)'

// Střediska
['KL', 'KO'] → 'Kladno (KL), Kolín (KO)'
```

## 📄 Mapování polí

```javascript
const fieldMapping = {
  predmet: 'Předmět',
  cislo_objednavky: 'Číslo objednávky',
  prikazce_id: 'Příkazce PO',
  garant_uzivatel_id: 'Garant',
  strediska: 'Střediska',
  max_cena_s_dph: 'Max. cena s DPH',
  dodavatel_nazev: 'Název dodavatele',
  dodavatel_ico: 'IČO dodavatele',
  druh_objednavky: 'Druh objednávky',
  zdroj_financovani: 'Zdroj financování',
  datum_dodani: 'Datum dodání',
  misto_dodani: 'Místo dodání',
  poznamka: 'Poznámka'
  // ... další pole podle potřeby
};
```

## 🎨 Styling

### Tabulka:
- **Šedé záhlaví** pro názvy polí
- **Bílé pozadí** pro hodnoty
- **Ohraničení** a **stíny** pro profesionální vzhled
- **Responzivní** design

### CSS styly:
```css
/* Záhlaví polí */
td:first-child {
  background: #f8fafc;
  font-weight: 600;
  color: #1f2937;
}

/* Hodnoty */
td:last-child {
  background: #ffffff;
  color: #374151;
}
```

## 🔍 Zdrojové soubory

### Hlavní implementace:
- `src/components/panels/NotesPanel.js`

### Klíčové funkce:
- `buildFormDataHtml()` - generování čisté HTML tabulky
- `getFormDataForExport()` - načítání dat formuláře
- `generateFormCSV()` - generování CSV dat
- `resolveIdToName()` - mapování ID na jména

## 📊 Testování

### Test soubory:
- `test-clean-html-export.js` - test čisté HTML verze
- `test-form-export-enhanced.js` - původní test (pro porovnání)

### Spuštění testů:
```bash
node test-clean-html-export.js
```

## 🐛 Řešení problémů

### Časté problémy a řešení:

1. **HTML se nevkládá správně**
   - ✅ Opraveno: odstraněn JavaScript kód z HTML
   
2. **Chybějící ID-to-name mapování**
   - Zkontrolujte cache v localStorage
   - Ověřte správnost klíčů cache

3. **CSV export nefunguje**
   - Zkontrolujte HTTPS (clipboard API vyžaduje secure context)
   - Ověřte, že je formulář rozpracovaný

4. **Prázdná tabulka**
   - Zkontrolujte uložený draft: `localStorage.getItem('order_draft_${storageId}')`

## 🚀 Workflow

### Typické použití:
1. **Uživatel** vyplňuje formulář v OrderForm
2. **Data se ukládají** do localStorage jako draft
3. **Kliknutí na 📋** v NotesPanel vloží HTML tabulku
4. **Kliknutí na 📊** zkopíruje CSV data do schránky
5. **HTML zůstává** v poznámkách jako statický snapshot

## 🎉 Výhody nové implementace

### Bezpečnost:
- ✅ Žádný JavaScript v HTML
- ✅ Bezpečné vkládání do rich editoru
- ✅ Žádné XSS riziko

### Kompatibilita:
- ✅ Funguje se všemi rich text editory
- ✅ Nezávislé na DOM manipulaci
- ✅ Stabilní across browser updates

### Údržba:
- ✅ Jednodušší kód
- ✅ Méně komplexity
- ✅ Snadnější debugging

### Funkcionalita:
- ✅ Zachované ID-to-name mapování
- ✅ Profesionální vzhled
- ✅ CSV export přes toolbar
- ✅ Všechny původní funkce bez problémů

## 📈 Budoucí možnosti

### Možná rozšíření:
- [ ] PDF export
- [ ] Přizpůsobitelné mapování polí
- [ ] Více formátů exportu (Excel, JSON)
- [ ] Drag & drop pro přeuspořádání polí
- [ ] Templates pro různé typy formulářů

---

**Shrnutí**: Čistá HTML verze poskytuje všechny původní funkce bez problémů spojených s JavaScript kódem v rich text editoru. Export je nyní bezpečnější, stabilnější a lépe integrovaný do workflow aplikace.