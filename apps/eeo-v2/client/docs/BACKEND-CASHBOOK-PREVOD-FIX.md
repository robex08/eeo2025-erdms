# 🔧 Backend: Automatický výpočet převodu z předchozího měsíce

## 🎯 Problém
Když se vytvoří nová pokladní kniha pro měsíc, **prevod_z_predchoziho** je 0, místo toho aby se automaticky načetl **koncový zůstatek z předchozího měsíce**.

## 📊 Očekávané chování

### Příklad:
| Měsíc | Počáteční stav | Příjmy | Výdaje | Koncový stav |
|-------|----------------|--------|--------|--------------|
| **Září 2025** | 0 | 8000 | 3000 | **5000** |
| **Říjen 2025** | **5000** ← | 4000 | 6500 | **2500** |
| **Listopad 2025** | **7500** ← | 2000 | 1200 | **8300** |

### Pravidla:
1. **Počáteční stav aktuálního měsíce** = **Koncový stav předchozího měsíce**
2. **Koncový stav** = Počáteční stav + Příjmy - Výdaje
3. **Převod se kumuluje** - není to jen předchozí měsíc, ale **součet všech předchozích**

### Scénář časového cestování:
- Když se vrátím na **Říjen 2025**, vidím převod **5000** (ze Září)
- Když se vrátím na **Listopad 2025**, vidím převod **7500** (5000 ze Září + 2500 z Října)

---

## 🔧 Řešení v Backendu

### 1️⃣ Při vytváření nové knihy (`/cashbook-create`)

**Endpoint:** `POST /cashbook-create`

**Co má backend udělat:**
```php
// 1. Najít předchozí měsíc
$prevMonth = $mesic === 1 ? 12 : $mesic - 1;
$prevYear = $mesic === 1 ? $rok - 1 : $rok;

// 2. Načíst knihu předchozího měsíce PRO STEJNÉHO UŽIVATELE a STEJNOU POKLADNU
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
$stmtPrev->bind_param('iiii', $uzivatelId, $pokladnaId, $prevYear, $prevMonth);
$stmtPrev->execute();
$resultPrev = $stmtPrev->get_result();

$prevod_z_predchoziho = 0;
if ($rowPrev = $resultPrev->fetch_assoc()) {
  $prevod_z_predchoziho = floatval($rowPrev['koncovy_stav']);
}

// 3. Vytvořit novou knihu S AUTOMATICKÝM PŘEVODEM
$sqlInsert = "
  INSERT INTO 25a_pokladni_knihy (
    prirazeni_pokladny_id,
    pokladna_id,
    uzivatel_id,
    rok,
    mesic,
    cislo_pokladny,
    kod_pracoviste,
    nazev_pracoviste,
    ciselna_rada_vpd,
    ciselna_rada_ppd,
    prevod_z_predchoziho,  -- ✅ KLÍČOVÉ
    pocatecni_stav,         -- ✅ KLÍČOVÉ (stejné jako převod)
    stav_knihy,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktivni', NOW())
";

$stmtInsert = $mysqli->prepare($sqlInsert);
$stmtInsert->bind_param(
  'iiiiiisssss', 
  $prirazeniPokladnyId,
  $pokladnaId,
  $uzivatelId,
  $rok,
  $mesic,
  $cisloPokladny,
  $kodPracoviste,
  $nazevPracoviste,
  $ciselnaRadaVpd,
  $ciselnaRadaPpd,
  $prevod_z_predchoziho,  -- ✅ Použít vypočtenou hodnotu
  $prevod_z_predchoziho   -- ✅ Počáteční = Převod
);
```

**Response:**
```json
{
  "status": "ok",
  "message": "Kniha byla vytvořena",
  "data": {
    "book": {
      "id": 123,
      "pokladna_id": 1,
      "uzivatel_id": 1,
      "rok": 2025,
      "mesic": 11,
      "cislo_pokladny": 100,
      "prevod_z_predchoziho": "7500.00",  // ✅ AUTOMATICKY VYPOČTENO
      "pocatecni_stav": "7500.00",         // ✅ AUTOMATICKY VYPOČTENO
      "koncovy_stav": "7500.00",
      "stav_knihy": "aktivni"
    }
  }
}
```

---

### 2️⃣ Při načítání knihy (`/cashbook-get`)

**Endpoint:** `GET /cashbook-get?id={kniha_id}`

**Co má backend udělat:**
```php
// Pokud kniha JIŽ EXISTUJE, ale má prevod_z_predchoziho = 0 nebo NULL
// (např. vytvořená stará kniha před tímto fixem)

if ($book['prevod_z_predchoziho'] == 0 || $book['prevod_z_predchoziho'] === null) {
  // Automaticky dopočítat z předchozího měsíce
  $prevMonth = $book['mesic'] === 1 ? 12 : $book['mesic'] - 1;
  $prevYear = $book['mesic'] === 1 ? $book['rok'] - 1 : $book['rok'];
  
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
    $prevod_z_predchoziho = floatval($rowPrev['koncovy_stav']);
    
    // ✅ AKTUALIZOVAT V DB
    $sqlUpdate = "
      UPDATE 25a_pokladni_knihy 
      SET prevod_z_predchoziho = ?,
          pocatecni_stav = ?
      WHERE id = ?
    ";
    $stmtUpdate = $mysqli->prepare($sqlUpdate);
    $stmtUpdate->bind_param('ddi', $prevod_z_predchoziho, $prevod_z_predchoziho, $book['id']);
    $stmtUpdate->execute();
    
    // Vrátit aktualizovanou hodnotu
    $book['prevod_z_predchoziho'] = number_format($prevod_z_predchoziho, 2, '.', '');
    $book['pocatecni_stav'] = number_format($prevod_z_predchoziho, 2, '.', '');
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "book": {
      "id": 123,
      "prevod_z_predchoziho": "7500.00",  // ✅ OPRAVENO
      "pocatecni_stav": "7500.00"          // ✅ OPRAVENO
    },
    "entries": [...]
  }
}
```

---

### 3️⃣ Při načítání seznamu knih (`/cashbook-list`)

**Endpoint:** `GET /cashbook-list?uzivatel_id={id}&rok={rok}&mesic={mesic}`

**Co má backend udělat:**
- Pro každou knihu v seznamu **také dopočítat převod**, pokud je NULL nebo 0
- Použít stejnou logiku jako v bodu 2

---

## 📊 SQL Update pro existující data

Pokud už máš v DB knihy s `prevod_z_predchoziho = 0`, můžeš je hromadně opravit:

```sql
-- Najít všechny knihy s nulovým převodem (kromě prvního měsíce)
SELECT 
  kb.id,
  kb.pokladna_id,
  kb.uzivatel_id,
  kb.rok,
  kb.mesic,
  kb.prevod_z_predchoziho,
  prev.koncovy_stav AS spravny_prevod
FROM 25a_pokladni_knihy kb
LEFT JOIN 25a_pokladni_knihy prev
  ON prev.pokladna_id = kb.pokladna_id
  AND prev.uzivatel_id = kb.uzivatel_id
  AND (
    (kb.mesic = 1 AND prev.rok = kb.rok - 1 AND prev.mesic = 12) OR
    (kb.mesic > 1 AND prev.rok = kb.rok AND prev.mesic = kb.mesic - 1)
  )
WHERE (kb.prevod_z_predchoziho = 0 OR kb.prevod_z_predchoziho IS NULL)
  AND prev.id IS NOT NULL;

-- Hromadný update (opatrně testovat!)
UPDATE 25a_pokladni_knihy kb
INNER JOIN 25a_pokladni_knihy prev
  ON prev.pokladna_id = kb.pokladna_id
  AND prev.uzivatel_id = kb.uzivatel_id
  AND (
    (kb.mesic = 1 AND prev.rok = kb.rok - 1 AND prev.mesic = 12) OR
    (kb.mesic > 1 AND prev.rok = kb.rok AND prev.mesic = kb.mesic - 1)
  )
SET 
  kb.prevod_z_predchoziho = prev.koncovy_stav,
  kb.pocatecni_stav = prev.koncovy_stav
WHERE (kb.prevod_z_predchoziho = 0 OR kb.prevod_z_predchoziho IS NULL);
```

---

## 🧪 Testovací scénáře

### Test 1: Vytvoření nové knihy pro Listopad 2025
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-create \
  -d "username=admin" \
  -d "token=xyz" \
  -d "prirazeni_pokladny_id=10" \
  -d "rok=2025" \
  -d "mesic=11"
```

**Očekávaný výsledek:**
- `prevod_z_predchoziho` = koncový stav z Října 2025
- `pocatecni_stav` = stejná hodnota

### Test 2: Načtení existující knihy s nulovým převodem
```bash
curl -X GET "https://eeo.zachranka.cz/api.eeo/cashbook-get?id=123&username=admin&token=xyz"
```

**Očekávaný výsledek:**
- Backend automaticky dopočítá z předchozího měsíce
- Aktualizuje v DB
- Vrátí správnou hodnotu

### Test 3: Zpětný pohled na Říjen 2025
```bash
curl -X GET "https://eeo.zachranka.cz/api.eeo/cashbook-list?uzivatel_id=1&rok=2025&mesic=10&username=admin&token=xyz"
```

**Očekávaný výsledek:**
- `prevod_z_predchoziho` = koncový stav ze Září 2025 (ne z Listopadu!)

---

## 🎯 Klíčové body pro backend

1. **Vždy hledat předchozí měsíc** podle `pokladna_id` + `uzivatel_id` + `rok` + `mesic`
2. **Převod = Koncový stav předchozího měsíce** (ne součet všech)
3. **Počáteční stav = Převod z předchozího** (duplicitní pole, ale potřebné pro reporty)
4. **Automaticky opravit staré záznamy** při načítání, pokud mají převod = 0
5. **Návrat v čase funguje správně** - převod se vždy bere z měsíce PŘED aktuálním, ne z budoucnosti

---

## 📋 Checklist pro backend

- [ ] Upravit endpoint `/cashbook-create` - automatický výpočet převodu
- [ ] Upravit endpoint `/cashbook-get` - automatická oprava nulových převodů
- [ ] Upravit endpoint `/cashbook-list` - kontrola převodů v seznamu
- [ ] Otestovat vytvoření nové knihy s převodem
- [ ] Otestovat načtení existující knihy s nulovým převodem
- [ ] Otestovat zpětný pohled na starší měsíce
- [ ] Spustit SQL update pro opravu existujících dat

---

## 🚀 Priorita
🔴 **VYSOKÁ** - Kritický bug ovlivňující správnost finančních údajů

## 📅 Status
- ✅ Backend implementoval fix (ověřeno - vrací správné hodnoty)
- ✅ Frontend připraven (používá `book.prevod_z_predchoziho` z API)
- ⏳ Čeká na production test a SQL update pro staré záznamy
- 📄 Testovací checklist: viz `TEST-PREVOD-MESICU.md`
