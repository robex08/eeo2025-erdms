# 🔍 Analýza problémů filtrování Orders V3

Datum: 7. února 2026

## 🚨 Zjištěné kritické problémy:

### 1. **Nekonzistence názvů filtrů mezi komponentami**

#### OrdersFiltersV3Full.js používá:
```javascript
filters = {
  objednatel: [],        // Array of IDs
  garant: [],           // Array of IDs  
  prikazce: [],         // Array of IDs
  schvalovatel: [],     // Array of IDs
  stav: [],             // Array of status codes
  dateFrom: '',
  dateTo: '',
  amountFrom: '',
  amountTo: '',
  maBytZverejneno: false,
  byloZverejneno: false,
  mimoradneObjednavky: false,
}
```

#### useOrdersV3.js hook používá:
```javascript
columnFilters = {
  cislo_objednavky: '',
  predmet: '',
  dodavatel_nazev: '',
  objednatel_jmeno: '',    // ❌ NESHODUJE SE!
  garant_jmeno: '',        // ❌ NESHODUJE SE!
  prikazce_jmeno: '',      // ❌ NESHODUJE SE!
  schvalovatel_jmeno: '',  // ❌ NESHODUJE SE!
  financovani: '',
  stav_workflow: '',       // ❌ NESHODUJE SE!
  datum_od: '',            // ❌ NESHODUJE SE!
  datum_do: '',            // ❌ NESHODUJE SE!
  cena_max: '',            // ❌ NESHODUJE SE!
  // ... další
}
```

#### Backend orderV3Handlers.php očekává:
```php
$filters = array(
    'cislo_objednavky' => '',
    'dodavatel_nazev' => '',
    'predmet' => '',
    'objednatel_jmeno' => '',    // Hledá v CONCAT(u1.jmeno, ' ', u1.prijmeni)
    'garant_jmeno' => '',        // Hledá v CONCAT(u2.jmeno, ' ', u2.prijmeni)
    'prikazce_jmeno' => '',      // Hledá v CONCAT(u3.jmeno, ' ', u3.prijmeni)
    'schvalovatel_jmeno' => '',  // Hledá v CONCAT(u4.jmeno, ' ', u4.prijmeni)
    'financovani' => '',         // Hledá v JSON poli o.financovani
    'stav_workflow' => '',       // Mapuje na workflow kód
    'datum_od' => '',            // DATE(o.dt_objednavky) >= ?
    'datum_do' => '',            // DATE(o.dt_objednavky) <= ?
    'cena_max' => '',            // o.max_cena_s_dph s operátory
    'cena_polozky' => '',        // SUM položek s operátory
    'cena_faktury' => '',        // SUM faktur s operátory
    'moje_objednavky' => bool,
    'mimoradne_udalosti' => bool,
    's_fakturou' => bool,
    's_prilohami' => bool,
);
```

---

### 2. **Problém s multiselect filtry (ID vs. jméno)**

**OrdersFiltersV3Full** posílá **pole ID** (např. `objednatel: ['123', '456']`), ale:
- **useOrdersV3 hook** očekává **string s jménem** (`objednatel_jmeno: 'Jan Novák'`)
- **Backend** očekává také **string s jménem** a hledá přes `LIKE`

**Řešení:**
- Buď změnit backend aby filtroval podle ID (lepší výkon)
- Nebo změnit frontend aby posílal jména místo ID (horší UX, složitější)

---

### 3. **Chybí mapování mezi FilterV3Full a useOrdersV3**

Komponenta volá `onFilterChange()` s objektem, ale hook očekává zcela jiné názvy:

```javascript
// OrdersFiltersV3Full posílá:
onFilterChange({
  objednatel: ['123'],
  garant: ['456'],
  stav: ['SCHVALENA'],
  dateFrom: '2026-01-01',
  // ...
})

// useOrdersV3 očekává:
{
  objednatel_jmeno: 'Jan Novák',
  garant_jmeno: 'Petr Dvořák', 
  stav_workflow: 'schvalena',
  datum_od: '2026-01-01',
  // ...
}
```

---

### 4. **Sloupcové filtry z tabulky**

`OrdersTableV3` volá `onColumnFilterChange(columnId, value)` který mapuje v hooku:

```javascript
const columnToFilterMapping = {
  'cislo_objednavky': 'cislo_objednavky',  // ✅ OK
  'dodavatel_nazev': 'dodavatel_nazev',    // ✅ OK
  'stav_objednavky': 'stav_workflow',      // ✅ OK s mapováním
  'objednatel_garant': 'objednatel_jmeno', // ⚠️ Použije STEJNOU hodnotu pro oba
  'prikazce_schvalovatel': 'prikazce_jmeno', // ⚠️ Použije STEJNOU hodnotu pro oba
  'max_cena_s_dph': 'cena_max',            // ✅ OK
  // ...
}
```

Backend správně řeší kombinované sloupce pomocí OR logiky.

---

## ✅ Správné řešení:

### Varianta A: Frontend posílá ID, backend filtruje podle ID (DOPORUČENO)

**Výhody:**
- Rychlejší SQL (index na ID místo LIKE na text)
- Přesnější filtrování
- Multiselect funguje přirozeně

**Úpravy:**
1. Backend přidá podporu pro filtry ve formátu `objednatel_id`, `garant_id`, atd.
2. Hook přidá konverzi z pole ID na správný formát pro backend
3. Backend použije `IN (?, ?, ?)` místo `LIKE`

### Varianta B: Frontend převede ID na jména (AKTUÁLNÍ, ale špatně implementováno)

**Nevýhody:**
- Pomalejší (LIKE na CONCAT)
- Složitější implementace multiselectu
- Možné problémy s diakrit ikou/formátováním

**Úpravy:**
1. OrdersFiltersV3Full musí převést ID na jména před odesláním
2. Použít getUserDisplayName() pro každé ID
3. Spojit více jmen čárkou nebo posílat jen první

---

## 🔧 Okamžité opravy (pro Variantu A):

### 1. Upravit useOrdersV3.js - přidat konverzi filtrů

### 2. Upravit orderV3Handlers.php - přidat podporu pro ID filtry

### 3. Upravit Orders25ListV3.js - propojit správně

---

## 📊 Mapovací tabulka (jak má být):

| OrdersFiltersV3Full | useOrdersV3 (temp) | Backend API | Backend SQL |
|---------------------|---------------------|-------------|-------------|
| `objednatel: ['123']` | `objednatel: ['123']` | `objednatel: ['123']` | `o.objednatel_id IN (123)` |
| `garant: ['456']` | `garant: ['456']` | `garant: ['456']` | `o.garant_uzivatel_id IN (456)` |
| `prikazce: ['789']` | `prikazce: ['789']` | `prikazce: ['789']` | `o.prikazce_id IN (789)` |
| `schvalovatel: ['111']` | `schvalovatel: ['111']` | `schvalovatel: ['111']` | `o.schvalovatel_id IN (111)` |
| `stav: ['SCHVALENA']` | `stav: ['SCHVALENA']` | `stav_workflow: 'schvalena'` | JSON extract |
| `dateFrom: '2026-01-01'` | `dateFrom: '2026-01-01'` | `datum_od: '2026-01-01'` | `DATE(o.dt_objednavky) >= ?` |
| `dateTo: '2026-12-31'` | `dateTo: '2026-12-31'` | `datum_do: '2026-12-31'` | `DATE(o.dt_objednavky) <= ?` |
| `amountFrom: '10000'` | `amountFrom: '10000'` | `cena_max: '>=10000'` | `o.max_cena_s_dph >= ?` |
| `amountTo: '50000'` | `amountTo: '50000'` | `cena_max: '<=50000'` | `o.max_cena_s_dph <= ?` |

---

## 🎯 Akční plán:

1. ✅ Analyzovat současný stav (HOTOVO)
2. ⏳ Upravit backend - přidat podporu pro ID filtry
3. ⏳ Upravit hook - přidat konverzi filtrů
4. ⏳ Otestovat všechny filtry
5. ⏳ Ověřit sloupcové filtry z tabulky

