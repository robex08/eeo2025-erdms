# 🔧 Backend: Implementace force_recalc parametru pro /cashbook-get

## 🎯 Problém
Když uživatel upraví položky v **předchozím měsíci** (např. Říjen), **koncový stav** se změní v DB, ale **převod v následujícím měsíci** (Listopad) se automaticky neaktualizuje.

**Scénář:**
1. Říjen: Příjem 10000 → koncovy_stav = 10000
2. Listopad: prevod_z_predchoziho = 10000 ✅
3. **Vrátím se do Října, přidám výdaj 3500** → koncovy_stav = 6500 ✅
4. **Vrátím se do Listopadu** → prevod_z_predchoziho stále = 10000 ❌

## 🔧 Řešení: Parametr `force_recalc`

Frontend nyní posílá parametr `force_recalc=1`, který říká backendu:
> **"Vždy přepočítej převod z předchozího měsíce, i když už v DB nějaká hodnota je"**

---

## 📋 Implementace v PHP

### Endpoint: `/cashbook-get`

**Request:**
```json
POST /api.eeo/cashbook-get
{
  "username": "admin",
  "token": "xyz...",
  "book_id": 123,
  "force_recalc": 1  // ✅ NOVÝ parametr
}
```

**PHP Kód:**
```php
<?php
// /cashbook-get endpoint

// Získat parametry
$bookId = $_POST['book_id'] ?? null;
$forceRecalc = isset($_POST['force_recalc']) ? intval($_POST['force_recalc']) : 0;

if (!$bookId) {
    echo json_encode(['status' => 'error', 'message' => 'Chybí book_id']);
    exit;
}

// Načíst knihu z DB
$sql = "SELECT * FROM 25a_pokladni_knihy WHERE id = ? LIMIT 1";
$stmt = $mysqli->prepare($sql);
$stmt->bind_param('i', $bookId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Kniha nenalezena']);
    exit;
}

$book = $result->fetch_assoc();

// ✅ KLÍČOVÁ ČÁST: Přepočítat převod pokud:
// 1. force_recalc = 1 (vždy)
// 2. NEBO prevod_z_predchoziho je 0 nebo NULL (starší knihy)
if ($forceRecalc == 1 || $book['prevod_z_predchoziho'] == 0 || $book['prevod_z_predchoziho'] === null) {
    
    // Vypočítat předchozí měsíc/rok
    $prevMonth = $book['mesic'] === 1 ? 12 : $book['mesic'] - 1;
    $prevYear = $book['mesic'] === 1 ? $book['rok'] - 1 : $book['rok'];
    
    // Načíst koncový stav z předchozího měsíce
    $sqlPrev = "
        SELECT koncovy_stav 
        FROM 25a_pokladni_knihy 
        WHERE uzivatel_id = ? 
          AND pokladna_id = ?
          AND rok = ? 
          AND mesic = ?
        LIMIT 1
    ";
    
    $stmtPrev = $mysqli->prepare($sqlPrev);
    $stmtPrev->bind_param('iiii', $book['uzivatel_id'], $book['pokladna_id'], $prevYear, $prevMonth);
    $stmtPrev->execute();
    $resultPrev = $stmtPrev->get_result();
    
    if ($rowPrev = $resultPrev->fetch_assoc()) {
        // ✅ DŮLEŽITÉ: Koncový stav předchozího měsíce už OBSAHUJE převod z ještě staršího měsíce
        // Pokud Říjen měl převod 25000 (ze Září) a žádné transakce, koncový stav = 25000
        // Takže Listopad dostane převod = 25000 (kumulativní od začátku)
        $prevod_z_predchoziho = floatval($rowPrev['koncovy_stav']);
        
        // ✅ PŘEPOČÍTAT koncový stav aktuální knihy
        // Načíst součet příjmů a výdajů z položek
        $sqlSums = "
            SELECT 
                COALESCE(SUM(prijmy), 0) as total_income,
                COALESCE(SUM(vydaje), 0) as total_expenses
            FROM 25a_pokladni_polozky 
            WHERE kniha_id = ?
        ";
        $stmtSums = $mysqli->prepare($sqlSums);
        $stmtSums->bind_param('i', $book['id']);
        $stmtSums->execute();
        $resultSums = $stmtSums->get_result();
        $sums = $resultSums->fetch_assoc();
        
        $totalIncome = floatval($sums['total_income']);
        $totalExpenses = floatval($sums['total_expenses']);
        $koncovy_stav = $prevod_z_predchoziho + $totalIncome - $totalExpenses;
        
        // ✅ AKTUALIZOVAT V DB (převod + přepočtený koncový stav)
        $sqlUpdate = "
            UPDATE 25a_pokladni_knihy 
            SET prevod_z_predchoziho = ?,
                pocatecni_stav = ?,
                koncovy_stav = ?,
                celkove_prijmy = ?,
                celkove_vydaje = ?
            WHERE id = ?
        ";
        $stmtUpdate = $mysqli->prepare($sqlUpdate);
        $stmtUpdate->bind_param('dddddi', 
            $prevod_z_predchoziho, 
            $prevod_z_predchoziho, 
            $koncovy_stav,
            $totalIncome,
            $totalExpenses,
            $book['id']
        );
        $stmtUpdate->execute();
        
        // Vrátit aktualizované hodnoty
        $book['prevod_z_predchoziho'] = number_format($prevod_z_predchoziho, 2, '.', '');
        $book['pocatecni_stav'] = number_format($prevod_z_predchoziho, 2, '.', '');
        $book['koncovy_stav'] = number_format($koncovy_stav, 2, '.', '');
        $book['celkove_prijmy'] = number_format($totalIncome, 2, '.', '');
        $book['celkove_vydaje'] = number_format($totalExpenses, 2, '.', '');
    } else {
        // Předchozí měsíc neexistuje - první měsíc
        $book['prevod_z_predchoziho'] = '0.00';
        $book['pocatecni_stav'] = '0.00';
    }
}

// Načíst položky knihy
$sqlEntries = "SELECT * FROM 25a_pokladni_polozky WHERE kniha_id = ? ORDER BY datum ASC, id ASC";
$stmtEntries = $mysqli->prepare($sqlEntries);
$stmtEntries->bind_param('i', $bookId);
$stmtEntries->execute();
$resultEntries = $stmtEntries->get_result();

$entries = [];
while ($row = $resultEntries->fetch_assoc()) {
    $entries[] = $row;
}

// Vrátit response
echo json_encode([
    'status' => 'ok',
    'data' => [
        'book' => $book,
        'entries' => $entries
    ]
]);
?>
```

---

## 🧪 Testovací scénář

### Test 1: Vytvoření nové knihy
```bash
# 1. Vytvořit knihu pro Říjen 2025
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-create \
  -d "username=admin&token=xyz&prirazeni_id=1&rok=2025&mesic=10&uzivatel_id=100"

# Výsledek: book_id = 10
```

### Test 2: Přidat příjem v Říjnu
```bash
# 2. Přidat příjem 10000
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-entry-create \
  -d "username=admin&token=xyz&kniha_id=10&datum=2025-10-15&prijmy=10000"

# 3. Aktualizovat koncový stav
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-update \
  -d "username=admin&token=xyz&book_id=10&koncovy_stav=10000"
```

### Test 3: Vytvořit Listopad - měl by mít převod 10000
```bash
# 4. Vytvořit knihu pro Listopad 2025
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-create \
  -d "username=admin&token=xyz&prirazeni_id=1&rok=2025&mesic=11&uzivatel_id=100"

# Výsledek: book_id = 11, prevod_z_predchoziho = 10000 ✅
```

### Test 4: Upravit Říjen - přidat výdaj
```bash
# 5. Přidat výdaj 3500 v Říjnu
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-entry-create \
  -d "username=admin&token=xyz&kniha_id=10&datum=2025-10-20&vydaje=3500"

# 6. Aktualizovat koncový stav v Říjnu
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-update \
  -d "username=admin&token=xyz&book_id=10&koncovy_stav=6500"
```

### Test 5: Načíst Listopad s force_recalc - měl by mít převod 6500
```bash
# 7. Načíst Listopad S FORCE RECALC
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-get \
  -d "username=admin&token=xyz&book_id=11&force_recalc=1"

# ✅ Očekávaný výsledek:
{
  "status": "ok",
  "data": {
    "book": {
      "id": 11,
      "prevod_z_predchoziho": "6500.00",  // ✅ PŘEPOČTENO!
      "pocatecni_stav": "6500.00",
      "koncovy_stav": "6500.00"  // ✅ Přepočteno i koncový (pro další měsíc)
    },
    "entries": []
  }
}
```

---

### Test 6: Kumulativní převod přes prázdné měsíce 🆕

**Scénář:** Ověření že převod se kumuluje i přes prázdné měsíce

```bash
# 1. Vytvořit Září s dotací 25000
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-create \
  -d "username=admin&token=xyz&prirazeni_id=1&rok=2025&mesic=9&uzivatel_id=100"
# book_id = 12

curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-entry-create \
  -d "username=admin&token=xyz&kniha_id=12&datum=2025-09-01&prijmy=25000"

# Aktualizovat koncový stav Září
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-update \
  -d "username=admin&token=xyz&book_id=12&koncovy_stav=25000"

# 2. Vytvořit prázdný Říjen (žádné transakce!)
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-create \
  -d "username=admin&token=xyz&prirazeni_id=1&rok=2025&mesic=10&uzivatel_id=100"
# book_id = 13

# 3. Načíst Říjen s force_recalc
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-get \
  -d "username=admin&token=xyz&book_id=13&force_recalc=1"

# ✅ Očekávaný výsledek:
{
  "book": {
    "prevod_z_predchoziho": "25000.00",  // ✅ Ze Září
    "koncovy_stav": "25000.00"            // ✅ Žádné transakce, ale koncový = převod
  }
}

# 4. Vytvořit Listopad
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-create \
  -d "username=admin&token=xyz&prirazeni_id=1&rok=2025&mesic=11&uzivatel_id=100"
# book_id = 14

# 5. Načíst Listopad s force_recalc
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-get \
  -d "username=admin&token=xyz&book_id=14&force_recalc=1"

# ✅ Očekávaný výsledek:
{
  "book": {
    "prevod_z_predchoziho": "25000.00",  // ✅ KUMULATIVNĚ ze Září přes Říjen!
    "koncovy_stav": "25000.00"
  }
}
```

**Klíčový princip:**
- Koncový stav každého měsíce MUSÍ obsahovat převod + příjmy - výdaje
- I prázdný měsíc má koncový stav = převod (přenáší dál)
- Tím se zajistí kumulace přes více měsíců

---

## 🎯 Klíčové body

1. **Parametr `force_recalc=1` je volitelný**
   - Pokud není přítomen, přepočet proběhne jen když `prevod_z_predchoziho` je 0 nebo NULL
   - Pokud je nastaven na 1, přepočet proběhne **VŽDY**

2. **Frontend teď volá `getBook(bookId, forceRecalc=true)` automaticky**
   - Při načtení knihy (změna měsíce/roku)
   - Při auto-refreshi (návrat do okna)
   - Při ručním refreshi

3. **Převod = Koncový stav předchozího měsíce** ⚠️ **KLÍČOVÉ!**
   - **NE jen poslední transakce**, ale **KONCOVÝ STAV** (který už obsahuje kumulativní převod)
   - Hledá se podle: `uzivatel_id`, `pokladna_id`, `rok`, `mesic`
   - **Příklad kumulace:**
     - Září: Dotace 25000 → Koncový stav = 25000
     - Říjen: (prázdný) → Převod = 25000, Koncový stav = 25000
     - Listopad: Převod = 25000 ✅ (ne 0!)

4. **Přepočet koncového stavu aktuální knihy** 🆕
   - Při force_recalc se přepočítá i `koncovy_stav` aktuální knihy
   - Vzorec: `koncovy_stav = prevod_z_predchoziho + celkove_prijmy - celkove_vydaje`
   - Zajišťuje správné přenesení do dalšího měsíce

4. **Počáteční stav = Převod z předchozího**
   - Obě pole by měly mít stejnou hodnotu
   - Duplicitní pro potřeby reportů

5. **První měsíc (žádný předchozí) = 0**
   - Pokud předchozí měsíc neexistuje, převod = 0

---

## 📋 Checklist pro backend

- [ ] Přidat podporu parametru `force_recalc` v `/cashbook-get`
- [ ] Implementovat logiku přepočtu převodu z předchozího měsíce
- [ ] Testovat scénář úpravy předchozího měsíce
- [ ] Testovat první měsíc (bez předchozího)
- [ ] Testovat přechod roku (Prosinec → Leden)
- [ ] Otestovat s více uživateli (izolace dat)

---

## 🚀 Priorita
🔴 **VYSOKÁ** - Kritický bug ovlivňující správnost finančních údajů při navigaci mezi měsíci

---

## 📅 Status
- ✅ Frontend připraven (posílá `force_recalc=1` ve všech `getBook()` voláních)
- ✅ **Backend implementováno** (9.11.2025)
  - Přepočet při `force_recalc=1` nebo `prevod_z_predchoziho=0/NULL`
  - Automatická aktualizace v DB
  - Vrací novou hodnotu ve response
- 📄 Dokumentace: viz `BACKEND-CASHBOOK-PREVOD-FIX.md` (základní logika)
- 📄 Test checklist: viz `TEST-PREVOD-MESICU.md`

## ✅ Verifikace
**Kdy se přepočet spustí:**
1. ✅ `force_recalc=1` (frontend explicitně žádá) → vždy aktualizuje DB
2. ✅ `prevod_z_predchoziho=0` nebo `NULL` → oprava starých záznamů

**Použití na frontendu:**
- ✅ Změna měsíce/roku → `getBook(bookId, true)`
- ✅ Vytvoření nové knihy → `getBook(bookId, true)`
- ✅ Auto-refresh (návrat do okna) → `getBook(bookId, true)`
- ✅ F5 reload stránky → `getBook(bookId, true)`
