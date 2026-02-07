# 🏦 ANALÝZA MODULU POKLADNA - TOK DAT A VÝPOČET ZŮSTATKŮ

**Datum:** 8. ledna 2026  
**Autor:** Analýza kódu  
**Účel:** Zdokumentovat, jak funguje ukládání dat do DB a LS, výpočet zůstatků a problém s jejich špatným vyhodnocováním

**Poslední úprava:** 8. ledna 2026  
- Přidán LP requirement badge do přehledu pokladny
- Implementováno force reload z DB při změně pokladny
- Vyčištění localStorage cache při přepnutí pokladny
- Per-user & per-pokladna localStorage izolace

---

## 🆕 NOVÁ FUNKCE: LP Requirement Badge

### Popis
Do přehledu pokladny byl přidán vizuální indikátor, který ukazuje, zda je LP kód u výdajů povinný nebo volitelný.

### Umístění
- **Hlavní přehled** - vedle badge "Aktivní" u nadpisu "Přehled pokladny"
- **Sticky summary** - v horní části při scrollování

### Komponenta
- **Soubor:** `/apps/eeo-v2/client/src/components/cashbook/LpRequirementBadge.js`
- **CSS:** `/apps/eeo-v2/client/src/components/cashbook/LpRequirementBadge.css`

### Vizuální stavy
1. **LP povinné** (červený badge)
   - Ikona: ⚠
   - Text: "LP povinné"
   - Popis: "U výdajů z této pokladny je LP kód povinný"

2. **LP volitelné** (šedý badge)
   - Ikona: ⓘ
   - Text: "LP volitelné"
   - Popis: "LP kód u výdajů z této pokladny je volitelný"

### Datový zdroj
- LP povinnost se načítá z DB pole `25a_pokladny.lp_kod_povinny`
- Hodnota se ukládá do React state: `lpKodPovinny` (boolean)
- Načítá se při otevření knihy přes API: `book.pokladna_lp_kod_povinny`

### Použití
```jsx
import LpRequirementBadge from '../components/cashbook/LpRequirementBadge';

<LpRequirementBadge isRequired={lpKodPovinny} />
```

---

## 🔄 FORCE RELOAD PŘI ZMĚNĚ POKLADNY

### Problém
Při přepnutí na jinou pokladnu (admin nebo uživatel s více pokladnami) zůstávaly v localStorage a memory cache staré data z předchozí pokladny, což vedlo k:
- Zobrazení položek z jiné pokladny
- Nekonzistentním zůstatkům
- Pomatení uživatele

### Řešení

#### 1. **Detekce změny pokladny**
```javascript
// useRef pro sledování předchozího assignmentu
const prevAssignmentIdRef = useRef(null);

// V loadDataFromDB
const currentAssignmentId = mainAssignment?.id;
const isCashboxChange = prevAssignmentIdRef.current !== null && 
                        prevAssignmentIdRef.current !== currentAssignmentId;

prevAssignmentIdRef.current = currentAssignmentId;
```

#### 2. **Vyčištění cache při změně**
```javascript
const clearCashbookCacheForAssignment = (assignmentId) => {
  const userId = userDetail.id;
  const keysToRemove = [];

  // Najít všechny klíče pro tuto pokladnu
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`cashbook_${userId}_${assignmentId}_`)) {
      keysToRemove.push(key);
    }
  }

  // Smazat všechny nalezené klíče
  keysToRemove.forEach(key => localStorage.removeItem(key));
};
```

#### 3. **Force reload z DB**
```javascript
const handleCashboxChange = async (newAssignment) => {
  // 1️⃣ Vyčistit cache staré pokladny
  if (mainAssignment?.id) {
    clearCashbookCacheForAssignment(mainAssignment.id);
  }

  // 2️⃣ Vyčistit memory cache (React state)
  setCashBookEntries([]);
  setCurrentBookId(null);
  setCurrentBookData(null);
  setCarryOverAmount(0);
  setBookStatus('aktivni');
  setLpKodPovinny(false);
  setLastSyncTimestamp(null);

  // 3️⃣ Nastavit novou pokladnu
  setMainAssignment(newAssignment);

  // 4️⃣ Data se načtou v useEffect → VŽDY Z DB
};
```

#### 4. **Pravidla načítání dat**

Při načítání dat v `loadDataFromDB`:

```javascript
// PRAVIDLO 1: Page reload (F5) → VŽDY z DB
if (isPageReload) {
  setCashBookEntries(dbEntries);
  saveToLocalStorage(dbEntries, ...);
}

// PRAVIDLO 1B: Změna pokladny → VŽDY z DB
else if (isCashboxChange) {
  console.log('✅ Změna pokladny → FORCE RELOAD Z DB');
  setCashBookEntries(dbEntries);
  saveToLocalStorage(dbEntries, ...);
}

// PRAVIDLO 2: DB má novější data → použít DB
else if (dbIsNewer) {
  setCashBookEntries(dbEntries);
}

// PRAVIDLO 3: Standardní načtení → preferovat DB
else if (dbEntries.length > 0) {
  setCashBookEntries(dbEntries);
}

// PRAVIDLO 4: Offline režim → localStorage fallback
else if (localEntries.length > 0 && isValidCache) {
  setCashBookEntries(localEntries);
  syncLocalChangesToDB(localEntries);
}
```

### LocalStorage klíč - per user & per pokladna

```javascript
const STORAGE_KEY = `cashbook_${userId}_${assignmentId}_${year}_${month}`;
```

**Příklad:**
- User 42, Pokladna 103, Leden 2026: `cashbook_42_103_2026_1`
- User 42, Pokladna 105, Leden 2026: `cashbook_42_105_2026_1`

Každá kombinace uživatele a pokladny má vlastní izolovaný cache.

### Výhody

✅ **Žádné "pohrobky"** - staré cache klíče se mažou při přepnutí  
✅ **Force reload** - vždy čerstvá data z DB při změně pokladny  
✅ **Per-user izolace** - každý uživatel má vlastní cache  
✅ **Per-pokladna izolace** - každá pokladna má vlastní cache  
✅ **Offline režim** - localStorage stále funguje jako fallback  

### Testovací scénáře

1. **Admin přepne pokladnu**
   - ✅ Cache staré pokladny se smaže
   - ✅ Načtou se data z DB pro novou pokladnu
   - ✅ Žádné mix položek

2. **Uživatel s 2 pokladnami přepíná mezi nimi**
   - ✅ Každá pokladna má vlastní cache
   - ✅ Při přepnutí force reload z DB
   - ✅ Správné zůstatky a položky

3. **F5 refresh stránky**
   - ✅ Ignoruje localStorage
   - ✅ Načte čerstvá data z DB
   - ✅ Aktualizuje cache novými daty

4. **Změna měsíce**
   - ✅ Používá cache pro daný měsíc (pokud existuje)
   - ✅ Jinak načte z DB
   - ✅ Respektuje per-měsíc klíče

---

## 📊 ARCHITEKTURA A TOK DAT

### 1. Struktura systému

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  /apps/eeo-v2/client/src/pages/CashBookPage.js             │
│                                                              │
│  State:                                                      │
│  - cashBookEntries (pole položek)                           │
│  - carryOverAmount (převod z minulého měsíce)              │
│  - bookStatus (aktivni/uzavrena/zamknuta)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ ✅ Hlavní tok dat
                   │
        ┌──────────┴───────────┐
        │                      │
        ▼                      ▼
┌──────────────┐      ┌────────────────┐
│ localStorage │      │  API Service   │
│   (backup)   │      │ cashbookAPI    │
└──────────────┘      └───────┬────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │   BACKEND (PHP)      │
                    │   cashbookHandlers   │
                    │   BalanceCalculator  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   DATABÁZE (MySQL)   │
                    │ 25a_pokladni_knihy   │
                    │ 25a_pokladni_polozky │
                    └──────────────────────┘
```

---

## 🗄️ DATABÁZOVÁ STRUKTURA

### Tabulka: `25a_pokladni_knihy` (hlavičky měsíců)

```sql
CREATE TABLE 25a_pokladni_knihy (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pokladna_id INT,                    -- FK na 25a_pokladny
  uzivatel_id INT,                    -- FK na uzivatele
  rok INT,                            -- Rok (2026)
  mesic INT,                          -- Měsíc (1-12)
  
  -- ZŮSTATKY
  pocatecni_stav DECIMAL(10,2),       -- Převod z minulého měsíce
  prevod_z_predchoziho DECIMAL(10,2), -- Kopie počátečního stavu
  celkove_prijmy DECIMAL(10,2),       -- Součet všech příjmů
  celkove_vydaje DECIMAL(10,2),       -- Součet všech výdajů
  koncovy_stav DECIMAL(10,2),         -- Konečný zůstatek
  pocet_zaznamu INT,                  -- Počet položek
  
  -- STAVY
  stav_knihy ENUM('aktivni', 'uzavrena_uzivatelem', 'zamknuta_spravcem'),
  uzavrena_uzivatelem_kdy DATETIME,
  uzavrena_uzivatelem_kym INT,
  zamknuta_spravcem_kdy DATETIME,
  zamknuta_spravcem_kym INT,
  
  -- METADATA
  vytvoreno DATETIME,
  vytvoril INT,
  aktualizovano DATETIME,
  upravil INT
);
```

### Tabulka: `25a_pokladni_polozky` (položky/řádky)

```sql
CREATE TABLE 25a_pokladni_polozky (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pokladni_kniha_id INT,              -- FK na 25a_pokladni_knihy
  
  -- DOKLAD
  cislo_dokladu VARCHAR(50),          -- P001, V599-042 atd.
  datum_zapisu DATE,                  -- Datum operace
  poradi_radku INT,                   -- Pořadí v rámci dne
  
  -- ČÁSTKY
  castka_prijem DECIMAL(10,2),        -- Příjem (NULL pokud výdaj)
  castka_vydaj DECIMAL(10,2),         -- Výdaj (NULL pokud příjem)
  
  -- 🎯 KLÍČOVÉ POLE: ZŮSTATEK PO OPERACI
  zustatek_po_operaci DECIMAL(10,2),  -- Spočítaný zůstatek po této položce
  
  -- ÚČTOVÁNÍ
  lp_kod VARCHAR(10),                 -- LP kód (Limitované přísliby)
  lp_popis TEXT,                      -- Popis LP
  
  -- TEXT
  obsah_zapisu TEXT,                  -- Popis operace
  poznamka TEXT,                      -- Volitelná poznámka
  
  -- SOFT DELETE
  smazano TINYINT DEFAULT 0,
  smazano_kdy DATETIME,
  smazal INT,
  
  -- METADATA
  vytvoreno DATETIME,
  vytvoril INT,
  aktualizovano DATETIME,
  upravil INT
);

-- DŮLEŽITÉ INDEXY
CREATE INDEX idx_kniha_datum ON 25a_pokladni_polozky(pokladni_kniha_id, datum_zapisu, poradi_radku);
CREATE INDEX idx_zustatek ON 25a_pokladni_polozky(zustatek_po_operaci);
CREATE INDEX idx_smazano ON 25a_pokladni_polozky(smazano);
```

---

## 🔄 JAK FUNGUJE UKLÁDÁNÍ DAT

### A. DB → LS → State (Načítání)

**Krok 1: Načtení z databáze**

```javascript
// cashbookService.js - metoda getBook()
const bookResult = await cashbookAPI.getBook(bookId, forceRecalc);

// Backend vrací:
{
  status: "ok",
  data: {
    book: {
      id: 123,
      pokladna_id: 5,
      uzivatel_id: 42,
      rok: 2026,
      mesic: 1,
      pocatecni_stav: 15000.00,
      prevod_z_predchoziho: 15000.00,
      celkove_prijmy: 25000.00,
      celkove_vydaje: 18500.00,
      koncovy_stav: 21500.00,
      stav_knihy: "aktivni"
    },
    entries: [
      {
        id: 1,
        cislo_dokladu: "P001",
        datum_zapisu: "2026-01-05",
        castka_prijem: 5000.00,
        castka_vydaj: null,
        zustatek_po_operaci: 20000.00,  // ✅ Zůstatek po této operaci
        obsah_zapisu: "Dotace",
        lp_kod: "50101"
      },
      {
        id: 2,
        cislo_dokladu: "V599-001",
        datum_zapisu: "2026-01-06",
        castka_prijem: null,
        castka_vydaj: 3500.00,
        zustatek_po_operaci: 16500.00,  // ✅ Zůstatek po výdaji
        obsah_zapisu: "Nákup materiálu"
      }
      // ... další položky
    ]
  }
}
```

**Krok 2: Transformace do frontendu**

```javascript
// CashBookPage.js - řádek ~1195
const entries = dbEntries.map(dbEntry => ({
  id: dbEntry.id,
  documentNumber: dbEntry.cislo_dokladu,
  date: dbEntry.datum_zapisu,
  description: dbEntry.obsah_zapisu,
  income: parseFloat(dbEntry.castka_prijem || 0),
  expense: parseFloat(dbEntry.castka_vydaj || 0),
  balance: parseFloat(dbEntry.zustatek_po_operaci || 0),  // ✅ PŘEVZAT Z DB
  lpCode: dbEntry.lp_kod,
  lpDescription: dbEntry.lp_popis,
  note: dbEntry.poznamka,
  isDeleted: dbEntry.smazano === 1,
  isEditing: false
}));

setCashBookEntries(entries); // Nastavit do React state
```

**Krok 3: Uložení do localStorage (backup)**

```javascript
// CashBookPage.js - řádek ~1366
const saveToLocalStorage = (entries, status, carryOver) => {
  const STORAGE_KEY = `cashbook_${userId}_${assignmentId}_${year}_${month}`;
  
  const dataToSave = {
    entries: entries,
    bookStatus: status,
    carryOverAmount: carryOver,
    lastModified: new Date().toISOString(),
    lastSyncTimestamp: new Date().toISOString()
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  console.log('✅ Uloženo do localStorage:', STORAGE_KEY);
};
```

---

### B. State → API → DB (Ukládání změn)

**Krok 1: Editace položky ve frontendu**

```javascript
// CashBookPage.js - funkce saveEditing()
const saveEditing = async (id) => {
  const editedEntry = cashBookEntries.find(e => e.id === id);
  
  // ⚠️ PROBLÉM: Balance se NEPOČÍTÁ na frontendu!
  // Frontend posílá jen částky, backend musí spočítat balance
  
  const payload = {
    entry_id: id,
    datum_zapisu: editedEntry.date,
    obsah_zapisu: editedEntry.description,
    castka_prijem: editedEntry.income > 0 ? editedEntry.income : null,
    castka_vydaj: editedEntry.expense > 0 ? editedEntry.expense : null,
    lp_kod: editedEntry.lpCode,
    lp_popis: editedEntry.lpDescription,
    poznamka: editedEntry.note
  };
  
  const result = await cashbookAPI.updateEntry(id, payload);
};
```

**Krok 2: Backend zpracování**

```php
// cashbookHandlers.php - handle_cashbook_entry_update_post()
function handle_cashbook_entry_update_post($config, $input) {
    $db = get_db($config);
    
    // 1. Načíst starý záznam
    $oldEntry = $entryModel->getEntryById($input['entry_id']);
    
    // 2. Aktualizovat data (BEZ balance - ten se přepočítá)
    $updateData = array(
        'datum_zapisu' => $input['datum_zapisu'],
        'obsah_zapisu' => $input['obsah_zapisu'],
        'castka_prijem' => $input['castka_prijem'],
        'castka_vydaj' => $input['castka_vydaj'],
        'lp_kod' => $input['lp_kod']
        // zustatek_po_operaci se NEPŘENÁŠÍ od frontendu!
    );
    
    $entryModel->updateEntry($input['entry_id'], $updateData);
    
    // 3. ✅ PŘEPOČÍTAT ZŮSTATKY OD TOHOTO DATUMU DÁL
    $balanceCalculator = new BalanceCalculator($db);
    $recalcDate = min($oldEntry['datum_zapisu'], $input['datum_zapisu']);
    $balanceCalculator->recalculateBalancesAfterDate(
        $oldEntry['pokladni_kniha_id'], 
        $recalcDate
    );
    
    // 4. Vrátit aktualizovanou položku s novým balance
    $updatedEntry = $entryModel->getEntryById($input['entry_id']);
    
    return api_ok(array('entry' => $updatedEntry));
}
```

**Krok 3: Přepočet zůstatků**

```php
// BalanceCalculator.php - recalculateBalancesAfterDate()
public function recalculateBalancesAfterDate($bookId, $entryDate) {
    // 1. Najít poslední položku PŘED změněným datem
    $stmt = $this->db->prepare("
        SELECT * FROM 25a_pokladni_polozky 
        WHERE pokladni_kniha_id = ? 
          AND datum_zapisu < ? 
          AND smazano = 0
        ORDER BY datum_zapisu DESC, poradi_radku DESC, id DESC
        LIMIT 1
    ");
    $stmt->execute(array($bookId, $entryDate));
    $lastBeforeEntry = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // 2. Výchozí zůstatek
    if ($lastBeforeEntry) {
        $runningBalance = floatval($lastBeforeEntry['zustatek_po_operaci']);
    } else {
        // Žádná položka před změnou → použít počáteční stav knihy
        $book = $this->getBook($bookId);
        $runningBalance = floatval($book['pocatecni_stav']);
    }
    
    // 3. Načíst VŠECHNY položky od změněného data (včetně)
    $stmt = $this->db->prepare("
        SELECT * FROM 25a_pokladni_polozky 
        WHERE pokladni_kniha_id = ? 
          AND datum_zapisu >= ? 
          AND smazano = 0
        ORDER BY datum_zapisu ASC, poradi_radku ASC, id ASC
    ");
    $stmt->execute(array($bookId, $entryDate));
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. ✅ PŘEPOČÍTAT ZŮSTATKY POSTUPNĚ
    foreach ($entries as $entry) {
        // Aktualizovat running balance
        if ($entry['castka_prijem']) {
            $runningBalance += floatval($entry['castka_prijem']);
        }
        if ($entry['castka_vydaj']) {
            $runningBalance -= floatval($entry['castka_vydaj']);
        }
        
        // 5. ULOŽIT NOVÝ ZŮSTATEK DO DB
        $updateStmt = $this->db->prepare("
            UPDATE 25a_pokladni_polozky 
            SET zustatek_po_operaci = ? 
            WHERE id = ?
        ");
        $updateStmt->execute(array($runningBalance, $entry['id']));
    }
    
    // 6. Aktualizovat souhrnné hodnoty v hlavičce knihy
    $this->updateBookTotals($bookId, $runningBalance);
    
    return true;
}
```

---

## 🚨 PROBLÉM: ŠPATNÉ VYHODNOCOVÁNÍ ZŮSTATKŮ

### Možné příčiny problému:

#### 1. **Race condition při souběžných úpravách**

```javascript
// ❌ PROBLÉM: Dva uživatelé editují položky současně

User A:                           User B:
│                                 │
├─ Edituje položku 5.1.          │
│  (datum_zapisu = 2026-01-05)   │
│                                 ├─ Edituje položku 10.1.
│                                 │  (datum_zapisu = 2026-01-10)
│                                 │
├─ Backend přepočítá od 5.1. →   │
│  Zůstatky 5.1.-31.1. OK        │
│                                 │
│                                 ├─ Backend přepočítá od 10.1. →
│                                 │  ⚠️ PROBLÉM: Nepřečetl změny od 5.1.!
│                                 │  Zůstatky 10.1.-31.1. ŠPATNĚ
```

**Řešení:** Použít transakce a row-level locking:

```php
// Před přepočtem uzamknout všechny ovlivněné řádky
$this->db->beginTransaction();

$stmt = $this->db->prepare("
    SELECT * FROM 25a_pokladni_polozky 
    WHERE pokladni_kniha_id = ? 
      AND datum_zapisu >= ? 
      AND smazano = 0
    FOR UPDATE  -- ✅ Zamkne řádky pro ostatní transakce
    ORDER BY datum_zapisu ASC, poradi_radku ASC, id ASC
");

// ... přepočet ...

$this->db->commit();
```

---

#### 2. **localStorage cache je zastaralý**

```javascript
// ❌ PROBLÉM: Frontend pracuje se starými daty z localStorage

Scénář:
1. Uživatel otevře pokladnu → načte data z DB do LS
2. Admin přečísluje doklady (backend)
3. Uživatel refreshne stránku (F5)
4. ⚠️ Načte se localStorage místo DB → STARÉ ZŮSTATKY

// ✅ ŘEŠENÍ: Timestamp check (již implementováno)
```

```javascript
// CashBookPage.js - řádek ~1510
const isPageReload = window.performance?.navigation?.type === 1;

if (isPageReload) {
  // F5 → VŽDY ignorovat localStorage a načíst z DB
  setCashBookEntries(dbEntries);
  saveToLocalStorage(dbEntries, book.stav_knihy, book.prevod_z_predchoziho);
}

// Kontrola timestamp DB vs LS
const dbIsNewer = book.aktualizovano && localTimestamp &&
                  new Date(book.aktualizovano) > new Date(localTimestamp);

if (dbIsNewer) {
  // DB má novější data → použít DB
  setCashBookEntries(dbEntries);
}
```

---

#### 3. **Chybí přepočet při změně data položky**

```javascript
// ❌ PROBLÉM: Položka se přesune v čase, ale zůstatky se nepřepočítají správně

Původní stav:
  5.1. P001 +5000 → zůstatek 20000
  10.1. V001 -3000 → zůstatek 17000
  15.1. P002 +2000 → zůstatek 19000

Změna: Posunout P002 z 15.1. na 8.1.

Správně by mělo být:
  5.1. P001 +5000 → zůstatek 20000
  8.1. P002 +2000 → zůstatek 22000  // ✅ Přepočteno
  10.1. V001 -3000 → zůstatek 19000  // ✅ Přepočteno
  
Ale backend počítá:
  recalcDate = min(old_date, new_date) = min(15.1., 8.1.) = 8.1.
  
  Přepočítá od 8.1., ale nezahrnuje položky MEZI 8.1. a 15.1.!
```

**Řešení:** Přepočítat od NEJSTARŠÍHO dotčeného data:

```php
// cashbookHandlers.php - oprava
function handle_cashbook_entry_update_post($config, $input) {
    // ...
    
    // ✅ OPRAVA: Přepočítat od nejstaršího dotčeného data
    $oldDate = $oldEntry['datum_zapisu'];
    $newDate = $input['datum_zapisu'];
    
    // Najít nejstarší datum (může být buď staré nebo nové)
    $recalcFromDate = min($oldDate, $newDate);
    
    // Přepočítat všechny zůstatky od tohoto data
    $balanceCalculator->recalculateBalancesAfterDate(
        $oldEntry['pokladni_kniha_id'], 
        $recalcFromDate
    );
    
    // ✅ DÁLE: Aktualizovat koncový stav v hlavičce knihy
    $this->updateBookEndBalance($oldEntry['pokladni_kniha_id']);
}
```

---

#### 4. **Chybějící přepočet převodu do následujícího měsíce**

```
❌ PROBLÉM:

Leden 2026:
  Počáteční: 15000
  Příjmy: +25000
  Výdaje: -18500
  Konečný: 21500  ✅ Správně

Únor 2026:
  Počáteční: 0      ❌ CHYBA! Mělo být 21500
  Příjmy: +10000
  Výdaje: -5000
  Konečný: 5000     ❌ CHYBA! Mělo být 26500
```

**Řešení:** Automaticky přepočítat `prevod_z_predchoziho` při načítání:

```php
// cashbookHandlers.php - handle_cashbook_get_post()
if ($forceRecalc == 1 || floatval($book['prevod_z_predchoziho']) == 0) {
    // Načíst koncový stav z předchozího měsíce
    $prevMonth = $book['mesic'] == 1 ? 12 : $book['mesic'] - 1;
    $prevYear = $book['mesic'] == 1 ? $book['rok'] - 1 : $book['rok'];
    
    $stmt = $db->prepare("
        SELECT koncovy_stav 
        FROM 25a_pokladni_knihy 
        WHERE uzivatel_id = ? 
          AND pokladna_id = ?
          AND rok = ? 
          AND mesic = ?
        LIMIT 1
    ");
    $stmt->execute(array(
        $book['uzivatel_id'], 
        $book['pokladna_id'], 
        $prevYear, 
        $prevMonth
    ));
    $prevBook = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($prevBook && $prevBook['koncovy_stav'] > 0) {
        // ✅ Aktualizovat převod v aktuálním měsíci
        $stmt = $db->prepare("
            UPDATE 25a_pokladni_knihy 
            SET prevod_z_predchoziho = ?, 
                pocatecni_stav = ?
            WHERE id = ?
        ");
        $stmt->execute(array(
            $prevBook['koncovy_stav'],
            $prevBook['koncovy_stav'],
            $book['id']
        ));
        
        $book['prevod_z_predchoziho'] = $prevBook['koncovy_stav'];
        $book['pocatecni_stav'] = $prevBook['koncovy_stav'];
        
        // ✅ Přepočítat všechny zůstatky v aktuálním měsíci
        $balanceCalculator->recalculateBookBalances($book['id']);
    }
}
```

---

## ✅ DOPORUČENÉ ŘEŠENÍ PROBLÉMU

### Krok 1: Implementovat row-level locking

```php
// services/BalanceCalculator.php
public function recalculateBalancesAfterDate($bookId, $entryDate) {
    try {
        // ✅ START TRANSAKCE
        $this->db->beginTransaction();
        
        // ✅ ZAMKNOUT KNIHU A VŠECHNY POLOŽKY
        $stmt = $this->db->prepare("
            SELECT * FROM 25a_pokladni_knihy 
            WHERE id = ? 
            FOR UPDATE
        ");
        $stmt->execute(array($bookId));
        $book = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$book) {
            throw new Exception('Pokladní kniha nenalezena');
        }
        
        // Zamknout všechny položky od daného data
        $stmt = $this->db->prepare("
            SELECT * FROM 25a_pokladni_polozky 
            WHERE pokladni_kniha_id = ? 
              AND datum_zapisu >= ? 
              AND smazano = 0
            FOR UPDATE
            ORDER BY datum_zapisu ASC, poradi_radku ASC, id ASC
        ");
        $stmt->execute(array($bookId, $entryDate));
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // ... přepočet zůstatků ...
        
        // ✅ COMMIT TRANSAKCE
        $this->db->commit();
        
        return true;
        
    } catch (Exception $e) {
        // ✅ ROLLBACK PŘI CHYBĚ
        $this->db->rollBack();
        error_log("Chyba při přepočítávání: " . $e->getMessage());
        return false;
    }
}
```

---

### Krok 2: Vynutit reload z DB po každé změně

```javascript
// CashBookPage.js - po uložení položky
const saveEditing = async (id) => {
  try {
    // 1. Uložit změny do DB
    const result = await cashbookAPI.updateEntry(id, payload);
    
    if (result.status === 'ok') {
      // 2. ✅ RELOAD CELÉ KNIHY Z DB (force refresh)
      const bookResult = await cashbookAPI.getBook(currentBookId, true);
      
      if (bookResult.status === 'ok') {
        // 3. Aktualizovat state z čerstvých dat
        const freshEntries = bookResult.data.entries.map(transformEntry);
        setCashBookEntries(freshEntries);
        
        // 4. Aktualizovat localStorage
        saveToLocalStorage(
          freshEntries, 
          bookResult.data.book.stav_knihy,
          bookResult.data.book.prevod_z_predchoziho
        );
        
        showToast('Položka uložena a zůstatky přepočítány', 'success');
      }
    }
  } catch (error) {
    showToast('Chyba při ukládání: ' + error.message, 'error');
  }
};
```

---

### Krok 3: Validace integrity dat

```php
// Nová metoda pro kontrolu konzistence zůstatků
public function validateBookBalances($bookId) {
    $stmt = $this->db->prepare("
        SELECT * FROM 25a_pokladni_polozky 
        WHERE pokladni_kniha_id = ? AND smazano = 0
        ORDER BY datum_zapisu ASC, poradi_radku ASC, id ASC
    ");
    $stmt->execute(array($bookId));
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Načíst počáteční stav
    $stmt = $this->db->prepare("
        SELECT pocatecni_stav FROM 25a_pokladni_knihy WHERE id = ?
    ");
    $stmt->execute(array($bookId));
    $book = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $expectedBalance = floatval($book['pocatecni_stav']);
    $errors = array();
    
    foreach ($entries as $entry) {
        // Vypočítat očekávaný zůstatek
        if ($entry['castka_prijem']) {
            $expectedBalance += floatval($entry['castka_prijem']);
        }
        if ($entry['castka_vydaj']) {
            $expectedBalance -= floatval($entry['castka_vydaj']);
        }
        
        // Porovnat s DB hodnotou
        $actualBalance = floatval($entry['zustatek_po_operaci']);
        
        if (abs($expectedBalance - $actualBalance) > 0.01) {
            $errors[] = array(
                'entry_id' => $entry['id'],
                'date' => $entry['datum_zapisu'],
                'document' => $entry['cislo_dokladu'],
                'expected' => $expectedBalance,
                'actual' => $actualBalance,
                'difference' => $expectedBalance - $actualBalance
            );
        }
    }
    
    return $errors;
}
```

---

## 📋 CHECKLIST PRO DEBUGGING

Pokud se objeví problém se špatnými zůstatky:

### 1. ✅ Kontrola DB integrity

```sql
-- Zkontrolovat zůstatky v konkrétní knize
SELECT 
    id,
    datum_zapisu,
    cislo_dokladu,
    castka_prijem,
    castka_vydaj,
    zustatek_po_operaci,
    @running_balance := COALESCE(@running_balance, 0) + 
                        COALESCE(castka_prijem, 0) - 
                        COALESCE(castka_vydaj, 0) as calculated_balance,
    zustatek_po_operaci - @running_balance as difference
FROM 25a_pokladni_polozky
CROSS JOIN (SELECT @running_balance := 
    (SELECT pocatecni_stav FROM 25a_pokladni_knihy WHERE id = 123)
) init
WHERE pokladni_kniha_id = 123 
  AND smazano = 0
ORDER BY datum_zapisu ASC, poradi_radku ASC, id ASC;
```

### 2. ✅ Kontrola localStorage vs DB

```javascript
// V konzoli prohlížeče
const STORAGE_KEY = `cashbook_${userId}_${assignmentId}_${year}_${month}`;
const cached = JSON.parse(localStorage.getItem(STORAGE_KEY));

console.log('📦 Cached entries:', cached.entries.length);
console.log('📦 Last sync:', cached.lastSyncTimestamp);
console.log('📦 Cached balance:', cached.entries[cached.entries.length - 1]?.balance);

// Porovnat s DB
const dbData = await cashbookAPI.getBook(bookId, true);
console.log('💾 DB entries:', dbData.data.entries.length);
console.log('💾 DB balance:', dbData.data.book.koncovy_stav);
```

### 3. ✅ Force přepočet celé knihy

```javascript
// Admin funkce - přečíslovat všechny doklady a přepočítat zůstatky
const forceRecalculate = async (bookId) => {
  try {
    // Backend metoda pro force přepočet
    const result = await cashbookAPI.forceRenumberDocuments(
      pokladnaId,
      year
    );
    
    console.log('✅ Přečíslováno položek:', result.data.total_renumbered);
    
    // Reload knihy
    await loadBookData();
  } catch (error) {
    console.error('❌ Chyba při force přepočtu:', error);
  }
};
```

### 4. ✅ Vyčistit localStorage cache

```javascript
// Smazat všechny cashbook cache klíče
const clearCashbookCache = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('cashbook_')) {
      keys.push(key);
    }
  }
  
  keys.forEach(key => {
    console.log('🗑️ Removing:', key);
    localStorage.removeItem(key);
  });
  
  console.log('✅ Vyčištěno klíčů:', keys.length);
  window.location.reload(); // Reload stránky
};

// Spustit v konzoli
clearCashbookCache();
```

---

## 🎯 ZÁVĚR

### Klíčové body:

1. **DB je VŽDY zdroj pravdy** - localStorage slouží pouze jako dočasný backup
2. **Backend počítá zůstatky** - frontend je NIKDY nepřepočítává sám
3. **Každá změna vyvolá přepočet** - všechny následující položky se automaticky přepočítají
4. **F5 vždy načte z DB** - ignoruje localStorage cache
5. **Transakce chrání konzistenci** - row-level locking zabrání race conditions

### Nejčastější příčiny špatných zůstatků:

| Problém | Příčina | Řešení |
|---------|---------|--------|
| Zůstatky nesedí po úpravě | Race condition, souběžné změny | Row-level locking v transakcích |
| Staré hodnoty po F5 | localStorage cache | Force reload z DB při F5 |
| Špatný převod mezi měsíci | Nulový `prevod_z_predchoziho` | Auto-fix při načítání knihy |
| Nesedí po změně data | Neúplný přepočet | Přepočítat od MIN(old, new) data |
| Frontend vs backend rozdíl | Cache vs aktuální DB | Timestamp check + reload |

---

**Doporučení:** Po každé změně položky provést **force reload z DB** a zkontrolovat, že zůstatky sedí s frontendovým výpočtem.

