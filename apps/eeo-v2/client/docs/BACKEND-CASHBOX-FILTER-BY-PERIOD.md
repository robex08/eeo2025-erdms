# 📅 Backend: Filtrovat pokladny podle měsíce/roku

## 🎯 Požadavek
Zobrazit v selectoru jen ty pokladny, které mají vytvořenou knihu v daném měsíci/roce.

## 📊 Databáze
**Tabulka:** `25a_pokladni_knihy`

Obsahuje záznamy o všech pokladních knihách:
- `id` - Primární klíč
- `pokladna_id` - ID pokladny (FK → 25a_pokladny)
- `uzivatel_id` - ID uživatele (majitel knihy)
- `rok` - Rok (např. 2025)
- `mesic` - Měsíc (1-12)
- `cislo_pokladny` - Denormalizované číslo pokladny
- `kod_pracoviste`, `nazev_pracoviste` - Denormalizované údaje
- `ciselna_rada_vpd`, `ciselna_rada_ppd` - Denormalizované prefxy
- `stav_knihy` - `aktivni` / `uzavrena_uzivatelem` / `zamknuta_spravcem`

---

## 🆕 Nový endpoint: `/cashbox-list-by-period`

### 📝 Popis
Vrátí seznam všech pokladen, které mají vytvořenou knihu v daném měsíci a roce.

### 📥 Request
```json
{
  "username": "admin",
  "token": "xyz",
  "rok": 2025,
  "mesic": 11,
  "active_only": true,
  "include_users": true
}
```

**Parametry:**
- `rok` (int, povinné) - Rok (např. 2025)
- `mesic` (int, povinné) - Měsíc 1-12
- `active_only` (bool, volitelné, default: true) - Jen aktivní pokladny
- `include_users` (bool, volitelné, default: false) - Zahrnout info o uživatelích

---

### 💾 SQL dotaz

#### Varianta A: Jen základní info (bez uživatelů)
```sql
SELECT DISTINCT
  p.id,
  p.nazev,
  p.kod_pracoviste,
  p.nazev_pracoviste,
  p.ciselna_rada_vpd,
  p.vpd_od_cislo,
  p.ciselna_rada_ppd,
  p.ppd_od_cislo,
  p.poznamka,
  p.aktivni,
  pk.cislo_pokladny,
  pk.rok,
  pk.mesic,
  pk.stav_knihy,
  pk.koncovy_stav,
  pk.pocet_zaznamu
FROM 25a_pokladny p
INNER JOIN 25a_pokladni_knihy pk 
  ON pk.pokladna_id = p.id
WHERE pk.rok = ?
  AND pk.mesic = ?
  AND p.aktivni = 1  -- Pokud active_only = true
ORDER BY p.id ASC;
```

#### Varianta B: S hlavním uživatelem (include_users = true)
```sql
SELECT DISTINCT
  p.id,
  p.nazev,
  p.kod_pracoviste,
  p.nazev_pracoviste,
  p.ciselna_rada_vpd,
  p.vpd_od_cislo,
  p.ciselna_rada_ppd,
  p.ppd_od_cislo,
  p.poznamka,
  p.aktivni,
  pk.cislo_pokladny,
  pk.rok,
  pk.mesic,
  pk.stav_knihy,
  pk.koncovy_stav,
  pk.pocet_zaznamu,
  -- Hlavní uživatel
  pu.prirazeni_id,
  pu.uzivatel_id,
  u.jmeno AS uzivatel_jmeno,
  u.prijmeni AS uzivatel_prijmeni,
  CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_cele_jmeno
FROM 25a_pokladny p
INNER JOIN 25a_pokladni_knihy pk 
  ON pk.pokladna_id = p.id
LEFT JOIN 25a_pokladny_uzivatele pu 
  ON pu.pokladna_id = p.id 
  AND pu.je_hlavni = 1
  AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
LEFT JOIN 25_uzivatele u 
  ON u.id = pu.uzivatel_id
WHERE pk.rok = ?
  AND pk.mesic = ?
  AND p.aktivni = 1  -- Pokud active_only = true
ORDER BY p.id ASC;
```

---

### 📤 Response

#### Success:
```json
{
  "status": "ok",
  "data": {
    "pokladny": [
      {
        "id": 1,
        "nazev": "Pokladna 100",
        "cislo_pokladny": 100,
        "kod_pracoviste": "IT",
        "nazev_pracoviste": "Oddělení informačních technologií",
        "ciselna_rada_vpd": "599",
        "vpd_od_cislo": 1,
        "ciselna_rada_ppd": "499",
        "ppd_od_cislo": 1,
        "aktivni": 1,
        "rok": 2025,
        "mesic": 11,
        "stav_knihy": "aktivni",
        "koncovy_stav": "8288.00",
        "pocet_zaznamu": 6,
        "uzivatel_id": 1,
        "uzivatel_cele_jmeno": "Jan Novák",
        "prirazeni_id": 10
      },
      {
        "id": 3,
        "nazev": "Pokladna 102",
        "cislo_pokladny": 102,
        "kod_pracoviste": "IT",
        "nazev_pracoviste": "IT oddělení",
        "ciselna_rada_vpd": "597",
        "vpd_od_cislo": 1,
        "ciselna_rada_ppd": "497",
        "ppd_od_cislo": 1,
        "aktivni": 1,
        "rok": 2025,
        "mesic": 11,
        "stav_knihy": "aktivni",
        "koncovy_stav": "15000.00",
        "pocet_zaznamu": 1,
        "uzivatel_id": 100,
        "uzivatel_cele_jmeno": "Marie Svobodová",
        "prirazeni_id": 4
      }
    ],
    "count": 2,
    "period": {
      "rok": 2025,
      "mesic": 11,
      "mesic_nazev": "listopad"
    }
  }
}
```

#### Error (žádné pokladny):
```json
{
  "status": "ok",
  "data": {
    "pokladny": [],
    "count": 0,
    "period": {
      "rok": 2025,
      "mesic": 12,
      "mesic_nazev": "prosinec"
    },
    "message": "V daném měsíci nejsou žádné pokladny"
  }
}
```

---

## 🔧 PHP implementace

```php
<?php
/**
 * Endpoint: /cashbox-list-by-period
 * Vrátí seznam pokladen s knihami v daném měsíci/roce
 */

// Autentizace
$username = $_POST['username'] ?? null;
$token = $_POST['token'] ?? null;

if (!$username || !$token) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí username nebo token'
    ]);
    exit;
}

// TODO: Ověřit token

// Parametry
$rok = isset($_POST['rok']) ? intval($_POST['rok']) : null;
$mesic = isset($_POST['mesic']) ? intval($_POST['mesic']) : null;
$active_only = isset($_POST['active_only']) ? (bool)$_POST['active_only'] : true;
$include_users = isset($_POST['include_users']) ? (bool)$_POST['include_users'] : false;

// Validace
if (!$rok || !$mesic) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí povinné parametry: rok a mesic'
    ]);
    exit;
}

if ($mesic < 1 || $mesic > 12) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Neplatný měsíc (musí být 1-12)'
    ]);
    exit;
}

// Měsíce v češtině
$mesice = [
    1 => 'leden', 2 => 'únor', 3 => 'březen', 4 => 'duben',
    5 => 'květen', 6 => 'červen', 7 => 'červenec', 8 => 'srpen',
    9 => 'září', 10 => 'říjen', 11 => 'listopad', 12 => 'prosinec'
];

// SQL dotaz
if ($include_users) {
    $sql = "
        SELECT DISTINCT
          p.id,
          p.nazev,
          p.kod_pracoviste,
          p.nazev_pracoviste,
          p.ciselna_rada_vpd,
          p.vpd_od_cislo,
          p.ciselna_rada_ppd,
          p.ppd_od_cislo,
          p.poznamka,
          p.aktivni,
          pk.cislo_pokladny,
          pk.rok,
          pk.mesic,
          pk.stav_knihy,
          pk.koncovy_stav,
          pk.pocet_zaznamu,
          pu.prirazeni_id,
          pu.uzivatel_id,
          u.jmeno AS uzivatel_jmeno,
          u.prijmeni AS uzivatel_prijmeni,
          CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_cele_jmeno
        FROM 25a_pokladny p
        INNER JOIN 25a_pokladni_knihy pk 
          ON pk.pokladna_id = p.id
        LEFT JOIN 25a_pokladny_uzivatele pu 
          ON pu.pokladna_id = p.id 
          AND pu.je_hlavni = 1
          AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
        LEFT JOIN 25_uzivatele u 
          ON u.id = pu.uzivatel_id
        WHERE pk.rok = ?
          AND pk.mesic = ?
    ";
} else {
    $sql = "
        SELECT DISTINCT
          p.id,
          p.nazev,
          p.kod_pracoviste,
          p.nazev_pracoviste,
          p.ciselna_rada_vpd,
          p.vpd_od_cislo,
          p.ciselna_rada_ppd,
          p.ppd_od_cislo,
          p.poznamka,
          p.aktivni,
          pk.cislo_pokladny,
          pk.rok,
          pk.mesic,
          pk.stav_knihy,
          pk.koncovy_stav,
          pk.pocet_zaznamu
        FROM 25a_pokladny p
        INNER JOIN 25a_pokladni_knihy pk 
          ON pk.pokladna_id = p.id
        WHERE pk.rok = ?
          AND pk.mesic = ?
    ";
}

// Přidat podmínku pro aktivní pokladny
if ($active_only) {
    $sql .= " AND p.aktivni = 1";
}

$sql .= " ORDER BY p.id ASC";

// Připravit statement
$stmt = $mysqli->prepare($sql);
$stmt->bind_param('ii', $rok, $mesic);
$stmt->execute();
$result = $stmt->get_result();

// Načíst výsledky
$pokladny = [];
while ($row = $result->fetch_assoc()) {
    $pokladny[] = $row;
}

// Response
echo json_encode([
    'status' => 'ok',
    'data' => [
        'pokladny' => $pokladny,
        'count' => count($pokladny),
        'period' => [
            'rok' => $rok,
            'mesic' => $mesic,
            'mesic_nazev' => $mesice[$mesic]
        ],
        'message' => count($pokladny) === 0 
            ? 'V daném měsíci nejsou žádné pokladny' 
            : null
    ]
]);
?>
```

---

## 🧪 Testování

### Test 1: Listopad 2025 (měl by vrátit 2 pokladny)
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbox-list-by-period \
  -d "username=admin" \
  -d "token=xyz" \
  -d "rok=2025" \
  -d "mesic=11" \
  -d "active_only=true" \
  -d "include_users=true"
```

**Očekávaný výsledek:**
- Pokladna 100 (ID 1, uživatel 1)
- Pokladna 102 (ID 3, uživatel 100)

### Test 2: Říjen 2025 (měl by vrátit 1 pokladnu)
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbox-list-by-period \
  -d "username=admin" \
  -d "token=xyz" \
  -d "rok=2025" \
  -d "mesic=10" \
  -d "active_only=true" \
  -d "include_users=true"
```

**Očekávaný výsledek:**
- Pokladna 100 (ID 1)

### Test 3: Prosinec 2025 (prázdný - žádné knihy)
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbox-list-by-period \
  -d "username=admin" \
  -d "token=xyz" \
  -d "rok=2025" \
  -d "mesic=12" \
  -d "active_only=true"
```

**Očekávaný výsledek:**
```json
{
  "status": "ok",
  "data": {
    "pokladny": [],
    "count": 0,
    "message": "V daném měsíci nejsou žádné pokladny"
  }
}
```

---

## 📋 Checklist pro backend

- [ ] Vytvořit endpoint `/cashbox-list-by-period`
- [ ] Implementovat SQL dotaz s INNER JOIN na `25a_pokladni_knihy`
- [ ] Validace parametrů `rok` a `mesic`
- [ ] Podpora pro `active_only` a `include_users`
- [ ] Vrátit název měsíce v češtině
- [ ] Testovat na datech z tabulky
- [ ] Ověřit výkon dotazu (měl by být rychlý díky indexům)

---

## 📊 Doporučené indexy

Pro rychlý dotaz:
```sql
-- Index na (rok, mesic) v tabulce 25a_pokladni_knihy
CREATE INDEX idx_knihy_period ON 25a_pokladni_knihy(rok, mesic);

-- Index na pokladna_id pro JOIN
CREATE INDEX idx_knihy_pokladna ON 25a_pokladni_knihy(pokladna_id);
```

---

## 🎯 Priorita
🟡 **STŘEDNÍ** - Nice-to-have feature pro lepší UX

## 📅 Status
- ⏳ Backend čeká na implementaci
- ✅ Frontend připraven (viz CashBookPage.js)

