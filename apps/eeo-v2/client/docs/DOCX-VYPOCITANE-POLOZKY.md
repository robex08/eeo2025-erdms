# 📊 DOCX - Vypočítané položky

**Datum:** 16. listopadu 2025  
**Verze:** 1.0  
**Autor:** GitHub Copilot

---

## 🎯 Účel

Tento dokument popisuje kategorii **Vypočítané položky** v DOCX šablonách, která umožňuje automaticky počítat a vkládat sumarizační hodnoty z objednávek.

---

## 📋 Dostupná vypočítaná pole

Všechna vypočítaná pole jsou dostupná pod kategorií `vypocitane.*`:

### 💰 Cenové součty

| Pole | Popis | Příklad |
|------|-------|------|
| `vypocitane.celkova_cena_bez_dph` | Součet všech položek bez DPH | `82644,63` |
| `vypocitane.celkova_cena_s_dph` | Součet všech položek s DPH | `100000,00` |
| `vypocitane.vypoctene_dph` | Vypočtené DPH (rozdíl) | `17355,37` |
| `vypocitane.celkova_cena_bez_dph_kc` | Součet bez DPH s jednotkou | `82 644,63 Kč` |
| `vypocitane.celkova_cena_s_dph_kc` | Součet s DPH s jednotkou | `100 000,00 Kč` |
| `vypocitane.vypoctene_dph_kc` | DPH s jednotkou | `17 355,37 Kč` |

### 📊 Statistiky

| Pole | Popis | Příklad |
|------|-------|---------|
| `vypocitane.pocet_polozek` | Počet položek v objednávce | `5` |
| `vypocitane.pocet_priloh` | Počet příloh | `3` |

### 📅 Časové údaje

| Pole | Popis | Příklad |
|------|-------|---------|
| `vypocitane.datum_generovani` | Datum vytvoření dokumentu | `16.11.2025` |
| `vypocitane.cas_generovani` | Čas vytvoření dokumentu | `14:30` |
| `vypocitane.datum_cas_generovani` | Datum a čas vytvoření | `16.11.2025 14:30` |

### � Vybraný uživatel (z dialogu pro generování)

| Pole | Popis | Příklad |
|------|-------|---------|
| `vypocitane.vybrany_uzivatel_cele_jmeno` | Celé jméno s tituly | `Ing. Jan Novák Ph.D.` |
| `vypocitane.vybrany_uzivatel_jmeno` | Jméno | `Jan` |
| `vypocitane.vybrany_uzivatel_prijmeni` | Příjmení | `Novák` |
| `vypocitane.vybrany_uzivatel_titul_pred` | Titul před jménem | `Ing.` |
| `vypocitane.vybrany_uzivatel_titul_za` | Titul za jménem | `Ph.D.` |
| `vypocitane.vybrany_uzivatel_email` | Email | `jan.novak@firma.cz` |
| `vypocitane.vybrany_uzivatel_telefon` | Telefon | `+420 123 456 789` |

### �🔤 Speciální pole

| Pole | Popis | Příklad |
|------|-------|---------|
| `vypocitane.uzivatelem_vybrany_text` | Placeholder pro text vybraný uživatelem | `[TEXT_VYBRAN_UŽIVATELEM]` |

---

## 🔧 Použití v DOCX šabloně

### Krok 1: Vložení pole do Word šablony

1. Otevřete Word šablonu
2. Umístěte kurzor na místo, kde chcete vložit vypočítanou hodnotu
3. Stiskněte `Ctrl+F9` (vytvoří se `{ }`)
4. Do závorek napište: `DOCVARIABLE vypocitane.celkova_cena_s_dph \* MERGEFORMAT`

**Příklad:**
```
{ DOCVARIABLE vypocitane.celkova_cena_s_dph \* MERGEFORMAT }
```

### Krok 2: Mapování v číselníkách

1. Přejděte do **Číselníky** → **DOCX Šablony**
2. Upravte šablonu nebo vytvořte novou
3. V JSON mapování přidejte:

```json
{
  "vypocitane.celkova_cena_s_dph": "vypocitane.celkova_cena_s_dph",
  "vypocitane.celkova_cena_bez_dph": "vypocitane.celkova_cena_bez_dph",
  "vypocitane.vypoctene_dph": "vypocitane.vypoctene_dph"
}
```

### Krok 3: Generování dokumentu

Při generování DOCX se:
1. Otevře dialog pro generování
2. **Vyberete uživatele** (garant, příkazce, schvalovatel...) pro podpis
3. Načtou položky objednávky
4. Automaticky se spočítají všechny součty
5. Doplní se údaje vybraného uživatele
6. Vše se vloží do šablony podle mapování

---

## 🧮 Jak funguje výpočet

Výpočty provádí funkce `addCalculatedVariables` v souboru:
- `src/utils/docx/newDocxGenerator.js`

```javascript
// Výpočet celkové ceny z položek
let celkovaCenaBezDph = 0;
let celkovaCenaSdph = 0;

apiData.polozky.forEach((polozka) => {
  // Položky mají pole cena_bez_dph a cena_s_dph
  celkovaCenaBezDph += parseFloat(polozka.cena_bez_dph || 0);
  celkovaCenaSdph += parseFloat(polozka.cena_s_dph || 0);
});

const vypocteneDph = celkovaCenaSdph - celkovaCenaBezDph;
```

---

## ✅ Výhody vypočítaných polí

- ✅ **Automatické** - Nemusíte ručně sčítat položky
- ✅ **Přesné** - Počítá se z aktuálních dat objednávky
- ✅ **Konzistentní** - Stejný formát (mezery jako oddělovače tisíců)
- ✅ **Flexibilní** - S jednotkou nebo bez jednotky
- ✅ **Aktuální** - Datum a čas generování

---

## 🎨 Příklad použití v šabloně

```
Objednávka č.: { DOCVARIABLE cislo_objednavky }
Předmět: { DOCVARIABLE predmet }

┌─────────────────────────────────────────────┐
│ CENOVÁ REKAPITULACE                         │
├─────────────────────────────────────────────┤
│ Celková cena bez DPH:                       │
│ { DOCVARIABLE vypocitane.celkova_cena_bez_dph_kc } │
│                                             │
│ DPH (21%):                                  │
│ { DOCVARIABLE vypocitane.vypoctene_dph_kc }        │
│                                             │
│ Celková cena s DPH:                         │
│ { DOCVARIABLE vypocitane.celkova_cena_s_dph_kc }   │
└─────────────────────────────────────────────┘

Počet položek: { DOCVARIABLE vypocitane.pocet_polozek }
Vygenerováno: { DOCVARIABLE vypocitane.datum_cas_generovani }


Schválil(a):
_______________________________________
{ DOCVARIABLE vypocitane.vybrany_uzivatel_cele_jmeno }
{ DOCVARIABLE vypocitane.vybrany_uzivatel_email }
```

---

## 🔍 Kde najít v kódu

### Výpočet hodnot
- **Soubor:** `src/utils/docx/newDocxGenerator.js`
- **Funkce:** `addCalculatedVariables(apiData)`
- **Řádky:** 89-154

### Definice polí pro mapování
- **Soubor:** `src/utils/docx/docxProcessor.js`
- **Funkce:** `getOrderFieldsForMapping()`
- **Řádky:** 480-494

### Automatické přidání do dynamického mapování
- **Soubor:** `src/utils/docx/docxProcessor.js`
- **Funkce:** `generateFieldsFromApiData(apiData)`
- **Řádky:** 1278-1286

---

## 📝 Poznámky

1. **Formátování měny:** Používá mezery jako oddělovače tisíců a čárku jako desetinný oddělovač (např. `82 644,63`) - **český standard**, zabraňuje interpretaci MS Word jako data
2. **Datum:** Formát DD.MM.YYYY bez mezer za tečkou (např. `16.11.2025`)
3. **Čas:** Formát HH:MM (např. `14:30`)
4. **Počítání:** Sčítá se `cena_bez_dph` a `cena_s_dph` ze všech položek objednávky

---

## 🚨 Řešení problémů

### Pole se nezobrazuje v mapovacím rozhraní
- **Řešení:** Zkontrolujte, že máte aktuální verzi kódu s kategorií "Vypočítané"
- **Soubor:** `src/utils/docx/docxProcessor.js`

### Hodnoty jsou prázdné v dokumentu
1. Zkontrolujte, že mapování v šabloně je správně nastaveno
2. Ověřte, že objednávka má položky s cenami
3. Zkontrolujte konzoli prohlížeče pro chyby

### Hodnoty mají špatný formát
- **Řešení:** Použijte variantu `*_kc` pro formát s jednotkou
- **Příklad:** `vypocitane.celkova_cena_s_dph_kc` místo `vypocitane.celkova_cena_s_dph`

---

## 📚 Související dokumentace

- [DOCX Generátor - Nový systém](./DOCX-NEW-GENERATOR.md)
- [DOCX Mapování polí](./DOCX-MAPPING.md)
- [API DOCX Orders](./API-DOCX-ORDERS.md)
