# 🔍 Fakturace: BE API - Vyhledávání (Global + Sloupcové filtry)

**Datum vytvoření:** 30. 11. 2025  
**Datum implementace:** 30. 11. 2025  
**Status:** ✅ IMPLEMENTOVÁNO (BE + FE)  
**Priorita:** ⭐⭐⭐⭐ KRITICKÁ  
**Autor požadavku:** Frontend (RH)

---

## ✅ ŘEŠENÍ IMPLEMENTOVÁNO

**Backend implementoval všechny požadované filtry!**

### Co je nyní funkční:
1. ✅ **Číslo faktury** (`columnFilters.cislo_faktury` → `fa_cislo_vema`) - LIKE search
2. ✅ **Číslo objednávky** (`columnFilters.cislo_objednavky` → `cislo_objednavky`) - LIKE search
3. ✅ **Datum vystavení** (`columnFilters.datum_vystaveni` → `filter_datum_vystaveni`) - přesná shoda
4. ✅ **Datum splatnosti** (`columnFilters.datum_splatnosti` → `filter_datum_splatnosti`) - přesná shoda
5. ✅ **Stav faktury** (`columnFilters.stav` → `filter_stav`) - paid/unpaid/overdue
6. ✅ **Jméno uživatele** (`columnFilters.vytvoril_uzivatel` → `filter_vytvoril_uzivatel`) - LIKE search
7. ✅ **Globální vyhledávání** (`search_term`) - 7 polí s OR logikou

---

## 📋 Popis požadavku

Implementovat **kompletní server-side filtrování** pro faktury včetně:

1. **Globální fulltextové vyhledávání** (`search_term`)
2. **Sloupcové filtry** (jako má Orders25List)

Vyhledávání by mělo fungovat **bez diakritiky** a **bez rozlišení velkých/malých písmen** (case-insensitive).

---

## 🎯 Referenční implementace

**Vzor:** Orders25List již má globální vyhledávání implementované na FE straně (client-side filtering).

**Důvod požadavku:** Server-side vyhledávání je výkonnější a umožní vyhledávat ve všech fakturách (i mimo aktuální stránku pagination).

---

## 📥 API Endpoint

```
POST /api/invoices25/list
```

### VŠECHNY parametry (současné + nové)

| Parametr | Typ | Povinný | Status | Popis |
|----------|-----|---------|--------|-------|
| `token` | `string` | ✅ Ano | ✅ OK | Autentizační token |
| `username` | `string` | ✅ Ano | ✅ OK | Uživatelské jméno |
| `page` | `int` | Ne | ✅ OK | Číslo stránky (pagination) |
| `per_page` | `int` | Ne | ✅ OK | Počet záznamů na stránku |
## 🔍 1. GLOBÁLNÍ VYHLEDÁVÁNÍ (`search_term`)

Parametr `search_term` by měl hledat v následujících polích (OR logika):

### Pole pro globální vyhledávání:

| # | Pole DB | Popis | SQL příklad |
|---|---------|-------|-------------|
| 1 | `fa_cislo_vema` | Číslo faktury | `fa_cislo_vema LIKE '%search_term%'` |
| 2 | `cislo_objednavky` | Číslo objednávky | `cislo_objednavky LIKE '%search_term%'` |
| 3 | `organizace_nazev` | Název organizace | `organizace_nazev LIKE '%search_term%'` |
| 4 | `objednavka_usek_zkr` | Zkratka úseku | `objednavka_usek_zkr LIKE '%search_term%'` |
| 5 | `vytvoril_uzivatel` | Celé jméno s tituly | `CONCAT(u.titul_pred, ' ', u.jmeno, ' ', u.prijmeni, ' ', u.titul_za) LIKE '%search_term%'` |
| 6 | `fa_poznamka` | Poznámka | `fa_poznamka LIKE '%search_term%'` |
| 7 | `fa_strediska_kod` | JSON pole středisek | `JSON_SEARCH(fa_strediska_kod, 'one', CONCAT('%', search_term, '%')) IS NOT NULL` |

### SQL implementace (příklad):

```sql
WHERE (
  -- Pokud je search_term zadán, musí být splněna alespoň jedna podmínka
  (:search_term IS NULL OR :search_term = '')
  OR (
    LOWER(fa_cislo_vema) LIKE CONCAT('%', LOWER(:search_term), '%')
    OR LOWER(o.cislo_objednavky) LIKE CONCAT('%', LOWER(:search_term), '%')
    OR LOWER(org.nazev) LIKE CONCAT('%', LOWER(:search_term), '%')
    OR LOWER(u_sec.zkratka) LIKE CONCAT('%', LOWER(:search_term), '%')
    OR LOWER(CONCAT(u.titul_pred, ' ', u.jmeno, ' ', u.prijmeni, ' ', u.titul_za)) LIKE CONCAT('%', LOWER(:search_term), '%')
    OR LOWER(fa_poznamka) LIKE CONCAT('%', LOWER(:search_term), '%')
    OR JSON_SEARCH(fa_strediska_kod, 'one', CONCAT('%', :search_term, '%')) IS NOT NULL
  )
)
```

---

## 🔍 2. SLOUPCOVÉ FILTRY

Tyto parametry by měly fungovat **současně** s `search_term` (AND logika mezi filtry).

### 2.1 **Číslo faktury** (`fa_cislo_vema`)

**Frontend odesílá:** `columnFilters.cislo_faktury` → API parametr `fa_cislo_vema`

**SQL:**
```sql
WHERE fa_cislo_vema LIKE CONCAT('%', :fa_cislo_vema, '%')
```

**⚠️ Status:** Parametr existuje v API, ale **NEFUNGUJE** (BE ho ignoruje?)

---

### 2.2 **Číslo objednávky** (`cislo_objednavky`)

**Frontend odesílá:** `columnFilters.cislo_objednavky` → API parametr `cislo_objednavky`

**SQL:**
```sql
WHERE o.cislo_objednavky LIKE CONCAT('%', :cislo_objednavky, '%')
```

**⚠️ Status:** Parametr **NEEXISTUJE** v API

---

### 2.3 **Datum vystavení** (`filter_datum_vystaveni`)

**Frontend odesílá:** `columnFilters.datum_vystaveni` → API parametr `filter_datum_vystaveni`

**SQL:**
```sql
WHERE DATE(fa_datum_vystaveni) = :filter_datum_vystaveni
```

**⚠️ Status:** Parametr **NEEXISTUJE** v API

---

### 2.4 **Datum splatnosti** (`filter_datum_splatnosti`)

**Frontend odesílá:** `columnFilters.datum_splatnosti` → API parametr `filter_datum_splatnosti`

**SQL:**
```sql
WHERE DATE(fa_datum_splatnosti) = :filter_datum_splatnosti
```

**⚠️ Status:** Parametr **NEEXISTUJE** v API

---

### 2.5 **Stav faktury** (`filter_stav`)

**Frontend odesílá:** `columnFilters.stav` → API parametr `filter_stav`
## 📤 Příklady požadavků

### Příklad 1: Globální vyhledávání

```json
{
  "token": "abc123...",
  "username": "john.doe",
  "page": 1,
  "per_page": 50,
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "search_term": "faktura123"
}
```

### Příklad 2: Sloupcové filtry (bez globálního search)

```json
{
  "token": "abc123...",
  "username": "john.doe",
  "page": 1,
  "per_page": 50,
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "fa_cislo_vema": "2025",
  "cislo_objednavky": "OBJ-001",
  "filter_datum_vystaveni": "2025-11-30",
  "filter_stav": "unpaid",
  "filter_vytvoril_uzivatel": "novak"
}
```

### Příklad 3: Kombinace globálního search + sloupcových filtrů

```json
{
  "token": "abc123...",
  "username": "john.doe",
  "page": 1,
  "per_page": 50,
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "search_term": "vema",
  "filter_stav": "overdue",
  "filter_datum_splatnosti": "2025-11-15"
}
```

### Příklad 4: Dashboard filter + sloupcové filtry

```json
{
  "token": "abc123...",
  "username": "john.doe",
  "page": 1,
  "per_page": 50,
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "filter_status": "my_invoices",
  "fa_cislo_vema": "2025",
  "filter_vytvoril_uzivatel": "jan"
}
```R (:filter_stav = 'overdue' AND fa_zaplacena = 0 AND fa_datum_splatnosti < CURDATE())
)
```

**⚠️ Status:** Současné řešení přes `fa_dorucena` je **NEDOSTATEČNÉ** (nerozlišuje unpaid vs overdue)

---

### 2.6 **Uživatel (Zaevidoval)** (`filter_vytvoril_uzivatel`)

**Frontend odesílá:** `columnFilters.vytvoril_uzivatel` → API parametr `filter_vytvoril_uzivatel`

**SQL:**
```sql
WHERE (
  LOWER(u.jmeno) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
  OR LOWER(u.prijmeni) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
  OR LOWER(CONCAT(u.jmeno, ' ', u.prijmeni)) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
  OR LOWER(CONCAT(u.titul_pred, ' ', u.jmeno, ' ', u.prijmeni, ' ', u.titul_za)) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
)
```

**⚠️ Status:** Parametr **NEEXISTUJE** v APIsql
objednavka_usek_zkr LIKE '%search_term%'
```

### 5. **Uživatel, který fakturu vytvořil** (celé jméno s tituly)
```sql
vytvoril_uzivatel LIKE '%search_term%'
-- Nebo
CONCAT(u.titul_pred, ' ', u.jmeno, ' ', u.prijmeni, ' ', u.titul_za) LIKE '%search_term%'
```

### 6. **Poznámka k faktuře**
```sql
fa_poznamka LIKE '%search_term%'
```

### 7. **Kódy středisek** (pole fa_strediska_kod - JSON pole)
```sql
JSON_SEARCH(fa_strediska_kod, 'one', CONCAT('%', search_term, '%')) IS NOT NULL
```

---

## 💡 Doporučení k implementaci

### 1. **Bez diakritiky**
Použít MySQL funkci pro odstranění diakritiky:
```sql
WHERE LOWER(REPLACE(REPLACE(REPLACE(...), 'č', 'c'), 'ř', 'r', ...)) LIKE '%search_term%'
```

Nebo vytvořit stored funkci `remove_diacritics()` pro čistší kód.

## ✅ Checklist pro BE vývojáře

### ČÁST 1: Globální vyhledávání (`search_term`)

- [ ] Přidat parametr `search_term` do `invoices25/list` API
- [ ] Implementovat fulltextové vyhledávání (OR logika) v těchto polích:
  - [ ] `fa_cislo_vema` (číslo faktury)
  - [ ] `cislo_objednavky` (číslo objednávky)
  - [ ] `organizace_nazev` (název organizace)
  - [ ] `objednavka_usek_zkr` (zkratka úseku)
  - [ ] `vytvoril_uzivatel` (celé jméno uživatele s tituly)
  - [ ] `fa_poznamka` (poznámka)
  - [ ] `fa_strediska_kod` (JSON pole středisek)
- [ ] Vyhledávání **bez diakritiky** (remove_diacritics nebo normalizace)
- [ ] Vyhledávání **case-insensitive** (LOWER/UPPER)

### ČÁST 2: Sloupcové filtry (FIX + nové)

- [ ] **FIX:** Opravit `fa_cislo_vema` - **NEFUNGUJE** (BE ho ignoruje?)
- [ ] **NOVÝ:** Přidat `cislo_objednavky` - částečná shoda (LIKE)
- [ ] **NOVÝ:** Přidat `filter_datum_vystaveni` - přesná shoda (DATE)
- [ ] **NOVÝ:** Přidat `filter_datum_splatnosti` - přesná shoda (DATE)
- [ ] **FIX:** Přidat `filter_stav` místo `fa_dorucena`:
  - [ ] `paid` - fa_zaplacena = 1
  - [ ] `unpaid` - fa_zaplacena = 0 AND splatnost >= dnes (nebo NULL)
  - [ ] `overdue` - fa_zaplacena = 0 AND splatnost < dnes
- [ ] **NOVÝ:** Přidat `filter_vytvoril_uzivatel` - částečná shoda v celém jméně

### ČÁST 3: Logika kombinace filtrů

- [ ] AND logika mezi všemi filtry (global search + sloupcové + dashboard)
- [ ] Pokud parametr není zadán nebo je prázdný, ignorovat ho (nefiltrovat)
- [ ] Statistiky správně reflektují všechny filtry
- [ ] Pagination správně počítá total po všech filtrech

### ČÁST 4: Testování

- [ ] Test 1: Pouze `search_term` (prázdný, s diakritikou, číslo faktury, organizace)
- [ ] Test 2: Pouze sloupcové filtry (každý zvlášť)
- [ ] Test 3: Kombinace `search_term` + sloupcové filtry
- [ ] Test 4: Kombinace `filter_status` (dashboard) + sloupcové filtry
- [ ] Test 5: Všechny filtry najednou
- [ ] Test 6: Statistiky a pagination po filtrování
- [ ] Test 7: User isolation (my_invoices) + ostatní filtry

### ČÁST 5: Dokumentace

- [ ] Updatovat API dokumentaci (všechny nové parametry)
- [ ] Příklady požadavků/odpovědí
- [ ] Changelog / release notes
### 4. **Optimalizace**
- Pokud `search_term` je prázdný nebo NULL, **NE**přidávat WHERE klauzuli
- Zvážit FULLTEXT index pro lepší výkon (volitelné)

---

## 📤 Příklad požadavku

```json
{
  "token": "abc123...",
  "username": "john.doe",
  "page": 1,
  "per_page": 50,
  "year": 2025,
  "search_term": "faktura123"
}
```

---

## 📥 Očekávaná odpověď

Standardní formát `invoices25/list` s přidaným filtrováním podle `search_term`.

```json
{
  "success": true,
  "faktury": [...],  // Pouze faktury odpovídající search_term
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 3,  // Počet faktur odpovídajících vyhledávání
    "total_pages": 1
  },
  "statistiky": {
    "pocet_zaplaceno": 1,
    "pocet_nezaplaceno": 2,
    ...
  }
}
```

---

## 🧪 Frontend Reference

### Orders25List - globální vyhledávání (client-side)

**Soubor:** `src/pages/Orders25List.js`  
**State:** `const [globalFilter, setGlobalFilter] = useState('');`  
**UI komponenta:** `FilterInput` s placeholder "Hledar v evidenčním čísle, předmětu, objednateli..."

**Funkce:** `filterByGlobalSearch()` v `src/utils/orderFilters.js`

```javascript
// Frontend filtrování (reference pro BE implementaci)
export function filterByGlobalSearch(order, globalFilter, getUserDisplayName, getOrderDisplayStatus) {
  if (!globalFilter || !globalFilter.trim()) return true;
  
  const search = globalFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Hledá v: číslo objednávky, předmět, objednatel, organizace, úsek
  const fields = [
    order.cislo_objednavky,
    order.predmet,
    getUserDisplayName(order.uzivatel_id),
    order.organizace_nazev,
    order.usek_zkr,
    getOrderDisplayStatus(order)
  ];
  
  return fields.some(field => {
    if (!field) return false;
    const normalized = String(field).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized.includes(search);
  });
}
```

---

## 🚀 Frontend implementace (po BE dodání)

### 1. State
```javascript
const [globalSearchTerm, setGlobalSearchTerm] = useState('');
```

### 2. UI komponenta
```jsx
<FilterInput
  type="text"
  placeholder="Hledat v čísle faktury, objednávky, organizaci..."
  value={globalSearchTerm}
  onChange={(e) => setGlobalSearchTerm(e.target.value)}
/>
```

### 3. API volání
```javascript
const apiParams = {
  token,
  username,
  page: currentPage,
  per_page: itemsPerPage,
  year: selectedYear,
  search_term: globalSearchTerm  // ← NOVÝ parametr
};

const response = await listInvoices25(apiParams);
```

### 4. Debouncing (volitelné)
Pro optimalizaci počtu API requestů při psaní:
```javascript
const debouncedSearchTerm = useDebounce(globalSearchTerm, 500);

useEffect(() => {
  loadData();
}, [debouncedSearchTerm]);
```

---

## ✅ Checklist pro BE vývojáře

- [ ] Přidat parametr `search_term` do `invoices25/list` API
- [ ] Implementovat fulltextové vyhledávání v těchto polích:
  - [ ] `fa_cislo_vema` (číslo faktury)
  - [ ] `cislo_objednavky` (číslo objednávky)
  - [ ] `organizace_nazev` (název organizace)
  - [ ] `objednavka_usek_zkr` (zkratka úseku)
  - [ ] `vytvoril_uzivatel` (celé jméno uživatele)
  - [ ] `fa_poznamka` (poznámka)
  - [ ] `fa_strediska_kod` (JSON pole středisek)
- [ ] Vyhledávání **bez diakritiky** (remove_diacritics)
- [ ] Vyhledávání **case-insensitive** (LOWER/UPPER)
- [ ] OR logika mezi všemi poli
- [ ] Statistiky a pagination správně reflektují filtrované výsledky
- [ ] Testování s různými search terms (prázdný, s diakritikou, mix)
- [ ] Dokumentace API updatována

---

## 📝 Poznámky

- **Priorita:** Vysoká - uživatelé potřebují rychle najít faktury
- **Vliv na FE:** Minimální - pouze přidání 1 parametru a UI komponenty
- **Výkon:** Server-side search je rychlejší než client-side při velkém množství dat
- **UX:** Lepší než sloupcové filtry pro rychlé hledání konkrétní faktury

---

## 🔗 Související dokumentace

- [BE-API-INVOICES-FILTER-STATUS-REQUEST.md](./BE-API-INVOICES-FILTER-STATUS-REQUEST.md) - Dashboard filtry (IMPLEMENTOVÁNO)
- [BE-API-INVOICES-LIST.md](./BE-API-INVOICES-LIST.md) - Základní dokumentace API (pokud existuje)

---

**Status:** ✅ HOTOVO - BE + FE implementace kompletní  
**Čas implementace:** BE: ~3 hodiny, FE: ~30 minut

---

## 📦 Frontend implementace (DOKONČENO)

### Soubory změněny:

#### 1. `src/pages/Invoices25List.js`
- ✅ Přidán state `globalSearchTerm`
- ✅ Přidán `SearchPanel` s input pro globální vyhledávání
- ✅ Přidán handler `handleClearAllFilters`
- ✅ Opraveny API parametry pro sloupcové filtry:
  - `fa_cislo_vema` (číslo faktury)
  - `cislo_objednavky` (číslo objednávky) ← NOVÝ
  - `filter_datum_vystaveni` (datum vystavení) ← NOVÝ
  - `filter_datum_splatnosti` (datum splatnosti) ← NOVÝ
  - `filter_stav` (paid/unpaid/overdue) ← NOVÝ (místo fa_dorucena)
  - `filter_vytvoril_uzivatel` (uživatel) ← NOVÝ
- ✅ Přidán `search_term` do API volání
- ✅ Přidán `globalSearchTerm` do useCallback dependencies
- ✅ Styled komponenty pro SearchPanel

#### 2. `src/services/api25invoices.js`
- ✅ Přidány nové parametry do `listInvoices25`:
  - `search_term` - globální vyhledávání
  - `cislo_objednavky` - sloupcový filtr
  - `filter_datum_vystaveni` - sloupcový filtr
  - `filter_datum_splatnosti` - sloupcový filtr
  - `filter_stav` - sloupcový filtr
  - `filter_vytvoril_uzivatel` - sloupcový filtr
- ✅ Podmíněné přidání parametrů do payload

---

## 🧩 SQL Pseudokód (kompletní příklad)

```sql
-- =============================================================================
-- HLAVNÍ DOTAZ PRO SEZNAM FAKTUR
-- =============================================================================
SELECT 
  f.*,
  o.cislo_objednavky,
  org.nazev AS organizace_nazev,
  u_sec.zkratka AS objednavka_usek_zkr,
  CONCAT(u.titul_pred, ' ', u.jmeno, ' ', u.prijmeni, ' ', u.titul_za) AS vytvoril_uzivatel,
  -- Další enriched data (prilohy, atd.)...
FROM faktury f
LEFT JOIN objednavky o ON f.objednavka_id = o.id
LEFT JOIN organizace org ON f.organizace_id = org.id
LEFT JOIN useky u_sec ON o.usek_id = u_sec.id
LEFT JOIN uzivatele u ON f.vytvoril_uzivatel_id = u.id
WHERE 1=1
  -- User isolation (my_invoices jen pro konkrétního uživatele)
  AND (
    :user_has_invoice_manage = 1 
    OR f.vytvoril_uzivatel_id = :current_user_id
  )
  
  -- Rok (datum_od / datum_do)
  AND (:datum_od IS NULL OR f.fa_datum_vystaveni >= :datum_od)
  AND (:datum_do IS NULL OR f.fa_datum_vystaveni <= :datum_do)
  
  -- ==========================================================================
  -- DASHBOARD FILTER (filter_status) - předdefinované kombinace filtrů
  -- ==========================================================================
  AND (
    :filter_status IS NULL 
    OR :filter_status = ''
    OR (:filter_status = 'paid' AND f.fa_zaplacena = 1)
    OR (:filter_status = 'unpaid' AND f.fa_zaplacena = 0 AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL))
    OR (:filter_status = 'overdue' AND f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE())
    OR (:filter_status = 'without_order' AND f.objednavka_id IS NULL)
    OR (:filter_status = 'my_invoices' AND f.vytvoril_uzivatel_id = :current_user_id)
  )
  
  -- ==========================================================================
  -- 🔍 GLOBÁLNÍ VYHLEDÁVÁNÍ (search_term) - OR logika mezi všemi poli
  -- ==========================================================================
  AND (
    :search_term IS NULL 
    OR :search_term = ''
    OR (
      LOWER(f.fa_cislo_vema) LIKE CONCAT('%', LOWER(:search_term), '%')
      OR LOWER(o.cislo_objednavky) LIKE CONCAT('%', LOWER(:search_term), '%')
      OR LOWER(org.nazev) LIKE CONCAT('%', LOWER(:search_term), '%')
      OR LOWER(u_sec.zkratka) LIKE CONCAT('%', LOWER(:search_term), '%')
      OR LOWER(CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za)) LIKE CONCAT('%', LOWER(:search_term), '%')
      OR LOWER(f.fa_poznamka) LIKE CONCAT('%', LOWER(:search_term), '%')
      OR JSON_SEARCH(f.fa_strediska_kod, 'one', CONCAT('%', :search_term, '%')) IS NOT NULL
    )
  )
  
  -- ==========================================================================
  -- 📋 SLOUPCOVÉ FILTRY - AND logika mezi všemi
  -- ==========================================================================
  
  -- Číslo faktury (LIKE - částečná shoda)
  AND (
    :fa_cislo_vema IS NULL 
    OR :fa_cislo_vema = ''
    OR LOWER(f.fa_cislo_vema) LIKE CONCAT('%', LOWER(:fa_cislo_vema), '%')
  )
  
  -- Číslo objednávky (LIKE - částečná shoda)
  AND (
    :cislo_objednavky IS NULL 
    OR :cislo_objednavky = ''
    OR LOWER(o.cislo_objednavky) LIKE CONCAT('%', LOWER(:cislo_objednavky), '%')
  )
  
  -- Datum vystavení (přesná shoda na den)
  AND (
    :filter_datum_vystaveni IS NULL 
    OR DATE(f.fa_datum_vystaveni) = :filter_datum_vystaveni
  )
  
  -- Datum splatnosti (přesná shoda na den)
  AND (
    :filter_datum_splatnosti IS NULL 
    OR DATE(f.fa_datum_splatnosti) = :filter_datum_splatnosti
  )
  
  -- Stav faktury (sloupcový filtr - přesnější než dashboard filter_status)
  AND (
    :filter_stav IS NULL
    OR :filter_stav = ''
    OR (:filter_stav = 'paid' AND f.fa_zaplacena = 1)
    OR (:filter_stav = 'unpaid' AND f.fa_zaplacena = 0 AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL))
    OR (:filter_stav = 'overdue' AND f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE())
  )
  
  -- Uživatel - celé jméno (LIKE - hledá v jméně, příjmení nebo celém jméně)
  AND (
    :filter_vytvoril_uzivatel IS NULL
    OR :filter_vytvoril_uzivatel = ''
    OR LOWER(u.jmeno) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
    OR LOWER(u.prijmeni) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
    OR LOWER(CONCAT(u.jmeno, ' ', u.prijmeni)) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
    OR LOWER(CONCAT_WS(' ', u.titul_pred, u.jmeno, u.prijmeni, u.titul_za)) LIKE CONCAT('%', LOWER(:filter_vytvoril_uzivatel), '%')
  )

ORDER BY f.dt_vytvoreni DESC
LIMIT :per_page OFFSET :offset;

-- =============================================================================
-- POČET CELKEM (pro pagination) - STEJNÉ WHERE podmínky!
-- =============================================================================
SELECT COUNT(*) AS total 
FROM faktury f
LEFT JOIN objednavky o ON f.objednavka_id = o.id
LEFT JOIN organizace org ON f.organizace_id = org.id
LEFT JOIN useky u_sec ON o.usek_id = u_sec.id
LEFT JOIN uzivatele u ON f.vytvoril_uzivatel_id = u.id
WHERE ... (VŠECHNY STEJNÉ WHERE PODMÍNKY JAKO VÝŠE);

-- =============================================================================
-- STATISTIKY (pro dashboard) - STEJNÉ WHERE podmínky!
-- =============================================================================
SELECT 
  COUNT(*) AS total,
  SUM(CASE WHEN f.fa_zaplacena = 1 THEN 1 ELSE 0 END) AS pocet_zaplaceno,
  SUM(CASE WHEN f.fa_zaplacena = 0 THEN 1 ELSE 0 END) AS pocet_nezaplaceno,
  SUM(CASE WHEN f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE() THEN 1 ELSE 0 END) AS pocet_po_splatnosti,
  SUM(CASE WHEN f.objednavka_id IS NULL THEN 1 ELSE 0 END) AS pocet_bez_objednavky,
  SUM(CASE WHEN f.vytvoril_uzivatel_id = :current_user_id THEN 1 ELSE 0 END) AS pocet_moje_faktury,
  SUM(f.fa_castka) AS celkova_castka,
  SUM(CASE WHEN f.fa_zaplacena = 1 THEN f.fa_castka ELSE 0 END) AS castka_zaplaceno,
  SUM(CASE WHEN f.fa_zaplacena = 0 THEN f.fa_castka ELSE 0 END) AS castka_nezaplaceno,
  SUM(CASE WHEN f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE() THEN f.fa_castka ELSE 0 END) AS castka_po_splatnosti
FROM faktury f
LEFT JOIN objednavky o ON f.objednavka_id = o.id
LEFT JOIN organizace org ON f.organizace_id = org.id
LEFT JOIN useky u_sec ON o.usek_id = u_sec.id
LEFT JOIN uzivatele u ON f.vytvoril_uzivatel_id = u.id
WHERE ... (VŠECHNY STEJNÉ WHERE PODMÍNKY JAKO VÝŠE - BEZ filter_status!);
```

### ⚠️ Důležité poznámky k SQL:

1. **STEJNÉ WHERE podmínky** musí být v hlavním dotazu, COUNT dotazu i statistikách
2. **Statistiky NEFILTROVAT podle filter_status** - jinak by se zobrazovaly chybně (např. když filtr = 'paid', nezaplacené by byly 0)
3. **User isolation** musí být vždy aktivní (INVOICE_MANAGE nebo vlastní faktury)
4. **NULL/prázdné parametry** = ignorovat (nefiltrovat)
5. **CONCAT_WS** je lepší než CONCAT (ignoruje NULL hodnoty)
6. **JSON_SEARCH** může být pomalý - zvážit materialized column
