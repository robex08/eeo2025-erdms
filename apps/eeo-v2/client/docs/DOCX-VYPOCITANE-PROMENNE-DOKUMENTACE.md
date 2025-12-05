# 📊 Vypočítané proměnné pro DOCX šablony

## 🎯 Účel
Automaticky vypočítané proměnné, které jsou dostupné při generování DOCX dokumentů z objednávek.

## 📋 Backend požadavek
Backend API endpoint `/api.eeo/sablona_docx/order-data` **MUSÍ** vrátit novou kategorii `vypocitane` s těmito poli:

## 💰 Finanční součty z položek objednávky

### `vypocitane.celkova_cena_bez_dph`
- **Typ**: `string` (formátovaná měna)
- **Formát**: `"123456.78"` (mezery jako oddělovač tisíců, 2 des. místa)
- **Výpočet**: Součet všech `polozky[*].celkova_cena_bez_dph`
- **Příklad**: `"1 234 567.89"`

### `vypocitane.celkova_cena_s_dph`
- **Typ**: `string` (formátovaná měna)
- **Formát**: `"123456.78"` (mezery jako oddělovač tisíců, 2 des. místa)
- **Výpočet**: Součet všech `polozky[*].celkova_cena_s_dph`
- **Příklad**: `"1 498 765.43"`

### `vypocitane.vypoctene_dph`
- **Typ**: `string` (formátovaná měna)
- **Formát**: `"123456.78"` (mezery jako oddělovač tisíců, 2 des. místa)
- **Výpočet**: `celkova_cena_s_dph - celkova_cena_bez_dph`
- **Příklad**: `"264 197.54"`

### `vypocitane.celkova_cena_bez_dph_kc`
- **Typ**: `string` (s jednotkou)
- **Formát**: `"123456.78 Kč"`
- **Výpočet**: `celkova_cena_bez_dph + " Kč"`
- **Příklad**: `"1 234 567.89 Kč"`

### `vypocitane.celkova_cena_s_dph_kc`
- **Typ**: `string` (s jednotkou)
- **Formát**: `"123456.78 Kč"`
- **Výpočet**: `celkova_cena_s_dph + " Kč"`
- **Příklad**: `"1 498 765.43 Kč"`

### `vypocitane.vypoctene_dph_kc`
- **Typ**: `string` (s jednotkou)
- **Formát**: `"123456.78 Kč"`
- **Výpočet**: `vypoctene_dph + " Kč"`
- **Příklad**: `"264 197.54 Kč"`

## 📊 Statistiky objednávky

### `vypocitane.pocet_polozek`
- **Typ**: `number` (nebo `string`)
- **Výpočet**: `polozky.length`
- **Příklad**: `5`

### `vypocitane.pocet_priloh`
- **Typ**: `number` (nebo `string`)
- **Výpočet**: `prilohy.length`
- **Příklad**: `3`

## 📅 Datum a čas generování dokumentu

### `vypocitane.datum_generovani`
- **Typ**: `string` (datum)
- **Formát**: `"DD.MM.YYYY"`
- **Výpočet**: Aktuální datum při generování
- **Příklad**: `"05.11.2025"`

### `vypocitane.cas_generovani`
- **Typ**: `string` (čas)
- **Formát**: `"HH:MM"`
- **Výpočet**: Aktuální čas při generování
- **Příklad**: `"14:23"`

### `vypocitane.datum_cas_generovani`
- **Typ**: `string` (datum + čas)
- **Formát**: `"DD.MM.YYYY HH:MM"`
- **Výpočet**: `datum_generovani + " " + cas_generovani`
- **Příklad**: `"05.11.2025 14:23"`

## 🎯 Speciální proměnné

### `vypocitane.uzivatelem_vybrany_text`
- **Typ**: `string`
- **Výpočet**: Uživatel vybere text z dropdownu před generováním
- **Výchozí**: `"[TEXT_VYBRAN_UŽIVATELEM]"` (placeholder)
- **Příklad**: `"Urgentní"`, `"Standardní"`, `"Ke schválení"` atd.
- **⚠️ Implementace**: Bude přidán dropdown v `DocxGeneratorModal` komponenta

## 📦 Příklad JSON response z BE

```json
{
  "status": "ok",
  "data": {
    "cislo_objednavky": "O-1741/75030926/2025/IT",
    "nazev_objednavky": "Nákup notebooků",
    "objednatel": { ... },
    "dodavatel": { ... },
    "polozky": [ ... ],
    "prilohy": [ ... ],
    
    "vypocitane": {
      "celkova_cena_bez_dph": "1 234 567.89",
      "celkova_cena_s_dph": "1 498 765.43",
      "vypoctene_dph": "264 197.54",
      "celkova_cena_bez_dph_kc": "1 234 567.89 Kč",
      "celkova_cena_s_dph_kc": "1 498 765.43 Kč",
      "vypoctene_dph_kc": "264 197.54 Kč",
      "pocet_polozek": 5,
      "pocet_priloh": 3,
      "datum_generovani": "05.11.2025",
      "cas_generovani": "14:23",
      "datum_cas_generovani": "05.11.2025 14:23",
      "uzivatelem_vybrany_text": "[TEXT_VYBRAN_UŽIVATELEM]"
    }
  }
}
```

## 🎨 Použití v DOCX šabloně

V Microsoft Word šabloně stačí použít:

```
Celková cena s DPH: {{vypocitane.celkova_cena_s_dph_kc}}
DPH: {{vypocitane.vypoctene_dph_kc}}
Počet položek: {{vypocitane.pocet_polozek}}
Datum generování: {{vypocitane.datum_generovani}}
```

## 🔧 Mapování v DOCX Generátoru

V modalu pro mapování polí by měla být nová kategorie:

**📊 Vypočítané (11)**
- `vypocitane.celkova_cena_bez_dph` - Celková cena bez DPH
- `vypocitane.celkova_cena_s_dph` - Celková cena s DPH
- `vypocitane.vypoctene_dph` - Vypočtené DPH
- `vypocitane.celkova_cena_bez_dph_kc` - Celková cena bez DPH (Kč)
- `vypocitane.celkova_cena_s_dph_kc` - Celková cena s DPH (Kč)
- `vypocitane.vypoctene_dph_kc` - Vypočtené DPH (Kč)
- `vypocitane.pocet_polozek` - Počet položek
- `vypocitane.pocet_priloh` - Počet příloh
- `vypocitane.datum_generovani` - Datum generování
- `vypocitane.cas_generovani` - Čas generování
- `vypocitane.datum_cas_generovani` - Datum a čas generování
- `vypocitane.uzivatelem_vybrany_text` - Text vybraný uživatelem

## ✅ Implementace

### Frontend
- ✅ `newDocxGenerator.js` - funkce `addCalculatedVariables()` počítá hodnoty
- ✅ `newDocxGenerator.js` - funkce `formatCurrency()` formátuje měnu
- ✅ Výpočet probíhá v KROK 4c před mapováním polí
- ⚠️ **TODO**: Přidat dropdown pro `uzivatelem_vybrany_text` do `DocxGeneratorModal.js`

### Backend
- ⚠️ **TODO**: Přidat kategorii `vypocitane` do response `/api.eeo/sablona_docx/order-data`
- ⚠️ **TODO**: Implementovat výpočty na backendu (NEBO nechat frontend, který je už hotový)

## 🎯 Backend implementace - 2 varianty:

### Varianta A: Backend počítá sám
Backend implementuje všechny výpočty a vrací hodnoty v response.

### Varianta B: Frontend přepočítává (DOPORUČENO)
- Backend vrací data BEZ kategorie `vypocitane`
- Frontend má už hotovou funkci `addCalculatedVariables()` která to dopočítá
- **VÝHODA**: Konzistence - výpočty už jsou implementovány a otestovány
- **NEVÝHODA**: Mírně pomalejší (ale rozdíl neznatelný)

## 📝 Poznámky pro vývojáře backendu

1. **Formát měny**: Použít mezeru jako oddělovač tisíců, tečku jako des. oddělovač
2. **Datum**: Formát DD.MM.YYYY (bez mezer za tečkou)
3. **Čas**: Formát HH:MM (24h)
4. **Kategorie**: Přidat jako `vypocitane` objekt na top-level response.data
5. **Konzistence**: Pokud backend přidá kategorii, frontend ji použije, jinak dopočítá sám

## 🧪 Testování

```javascript
// Test výpočtu
const testData = {
  polozky: [
    { celkova_cena_bez_dph: 1000.00, celkova_cena_s_dph: 1210.00 },
    { celkova_cena_bez_dph: 2000.00, celkova_cena_s_dph: 2420.00 }
  ],
  prilohy: [{}, {}, {}]
};

// Očekávaný výsledek:
vypocitane.celkova_cena_bez_dph = "3 000.00"
vypocitane.celkova_cena_s_dph = "3 630.00"
vypocitane.vypoctene_dph = "630.00"
vypocitane.pocet_polozek = 2
vypocitane.pocet_priloh = 3
```

---

**Datum vytvoření**: 5. listopadu 2025  
**Autor**: GitHub Copilot  
**Status**: ✅ Frontend implementován, ⚠️ Backend čeká na implementaci
