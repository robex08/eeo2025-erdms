# 🔧 BACKEND API: Smlouvy - Implementační specifikace

**Verze:** 1.0  
**Datum:** 23. listopadu 2025  
**MySQL:** 5.5.43  
**PHP:** 5.6.33+  
**Base URL:** `https://eeo.zachranka.cz/api.eeo/ciselniky/`

---

## 📋 PŘEHLED

Tento dokument popisuje **backend API pro správu smluv** v číselníkách systému.

### Scope
- CRUD operace pro smlouvy
- Hromadný import z Excel/CSV
- Přepočet čerpání
- Vazba na objednávky
- Statistiky a reporting

### Tabulky
1. `25_smlouvy` - hlavní tabulka smluv
2. `25_smlouvy_import_log` - historie importů
3. `25_smlouvy_objednavky` - vazba smlouva ↔ objednávka

---

## 🌐 API ENDPOINTY

### Všechny endpointy:
- **Metoda:** POST
- **Base URL:** `https://eeo.zachranka.cz/api.eeo/ciselniky/`
- **Autentizace:** Povinné `username` + `token` v body
- **Response formát:** `{ "status": "ok|error", "data": {...}, "meta": {...} }`

---

## 1️⃣ SEZNAM SMLUV

**Endpoint:** `POST /ciselniky/smlouvy/list`

### Request

```json
{
  "username": "admin",
  "token": "xyz123...",
  "show_inactive": false,
  "usek_id": null,
  "druh_smlouvy": null,
  "stav": null,
  "search": null,
  "platnost_od": null,
  "platnost_do": null,
  "limit": 1000,
  "offset": 0
}
```

### Parametry

| Parametr | Typ | Povinný | Popis |
|----------|-----|---------|-------|
| username | string | ✅ | Uživatelské jméno |
| token | string | ✅ | Autentizační token |
| show_inactive | boolean | ❌ | true = i neaktivní, false = pouze aktivní (default: false) |
| usek_id | integer | ❌ | Filtr podle úseku (ID) |
| druh_smlouvy | string | ❌ | Filtr podle druhu (SLUŽBY, KUPNÍ, RÁMCOVÁ) |
| stav | string | ❌ | Filtr podle stavu (AKTIVNI, UKONCENA, PRERUSENA, PRIPRAVOVANA) |
| search | string | ❌ | Fulltextové vyhledávání v názvu, popisu, číslu smlouvy |
| platnost_od | date | ❌ | Filtr smluv platných od tohoto data |
| platnost_do | date | ❌ | Filtr smluv platných do tohoto data |
| limit | integer | ❌ | Max počet výsledků (default: 1000) |
| offset | integer | ❌ | Offset pro stránkování (default: 0) |

### Response

```json
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "cislo_smlouvy": "S-147/750309/26/23",
      "usek_id": 10,
      "usek_zkr": "ÚEko",
      "druh_smlouvy": "SLUŽBY",
      "nazev_firmy": "Alter Audit, s.r.o.",
      "ico": "29268931",
      "dic": null,
      "nazev_smlouvy": "Smlouva o poskytování poradenských služeb",
      "popis_smlouvy": "Smlouva o poskytování poradenských a konzultačních služeb",
      "platnost_od": "2023-06-05",
      "platnost_do": "2025-12-31",
      "hodnota_bez_dph": 500000.00,
      "hodnota_s_dph": 605000.00,
      "sazba_dph": 21.00,
      "cerpano_celkem": 150000.00,
      "zbyva": 455000.00,
      "procento_cerpani": 24.79,
      "aktivni": 1,
      "stav": "AKTIVNI",
      "dt_vytvoreni": "2025-11-23T10:00:00",
      "dt_aktualizace": "2025-11-23T10:00:00",
      "vytvoril_user_id": 1,
      "upravil_user_id": null,
      "posledni_prepocet": "2025-11-23T09:30:00",
      "poznamka": null,
      "cislo_dms": null,
      "kategorie": null,
      "pocet_objednavek": 3
    }
  ],
  "meta": {
    "total": 45,
    "limit": 1000,
    "offset": 0,
    "returned": 45
  }
}
```

### SQL Implementace

```php
<?php
// ciselniky/smlouvy/list

function getSmlouvyList($params) {
    global $db;
    
    // Verify token
    $user = verify_token_v2($params['username'], $params['token']);
    if (!$user) {
        return json_response(['err' => 'Neplatný token'], 401);
    }
    
    // Check permission
    if (!check_permission($user['id'], 'SMLOUVY_VIEW')) {
        return json_response(['err' => 'Nemáte oprávnění'], 403);
    }
    
    // Build WHERE clause
    $where = [];
    $bind_params = [];
    $bind_types = '';
    
    if (!$params['show_inactive']) {
        $where[] = 's.aktivni = 1';
    }
    
    if ($params['usek_id']) {
        $where[] = 's.usek_id = ?';
        $bind_params[] = $params['usek_id'];
        $bind_types .= 'i';
    }
    
    if ($params['druh_smlouvy']) {
        $where[] = 's.druh_smlouvy = ?';
        $bind_params[] = $params['druh_smlouvy'];
        $bind_types .= 's';
    }
    
    if ($params['stav']) {
        $where[] = 's.stav = ?';
        $bind_params[] = $params['stav'];
        $bind_types .= 's';
    }
    
    if ($params['search']) {
        $where[] = '(s.cislo_smlouvy LIKE ? OR s.nazev_smlouvy LIKE ? OR s.popis_smlouvy LIKE ? OR s.nazev_firmy LIKE ?)';
        $search_term = '%' . $params['search'] . '%';
        $bind_params[] = $search_term;
        $bind_params[] = $search_term;
        $bind_params[] = $search_term;
        $bind_params[] = $search_term;
        $bind_types .= 'ssss';
    }
    
    if ($params['platnost_od']) {
        $where[] = 's.platnost_od >= ?';
        $bind_params[] = $params['platnost_od'];
        $bind_types .= 's';
    }
    
    if ($params['platnost_do']) {
        $where[] = 's.platnost_do <= ?';
        $bind_params[] = $params['platnost_do'];
        $bind_types .= 's';
    }
    
    $where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Count query
    $count_sql = "
        SELECT COUNT(*) as total
        FROM 25_smlouvy s
        $where_sql
    ";
    
    $stmt = $db->prepare($count_sql);
    if ($bind_params) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];
    
    // Main query with pagination
    $limit = $params['limit'] ?? 1000;
    $offset = $params['offset'] ?? 0;
    
    $sql = "
        SELECT 
            s.*,
            COUNT(DISTINCT o.id) AS pocet_objednavek
        FROM 25_smlouvy s
        LEFT JOIN 25a_objednavky o ON s.cislo_smlouvy = o.cislo_smlouvy
        $where_sql
        GROUP BY s.id
        ORDER BY s.dt_vytvoreni DESC
        LIMIT ? OFFSET ?
    ";
    
    $bind_params[] = $limit;
    $bind_params[] = $offset;
    $bind_types .= 'ii';
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param($bind_types, ...$bind_params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $data = [];
    while ($row = $result->fetch_assoc()) {
        // Convert numeric strings to proper types
        $row['aktivni'] = (int)$row['aktivni'];
        $row['pocet_objednavek'] = (int)$row['pocet_objednavek'];
        $row['hodnota_bez_dph'] = (float)$row['hodnota_bez_dph'];
        $row['hodnota_s_dph'] = (float)$row['hodnota_s_dph'];
        $row['cerpano_celkem'] = (float)$row['cerpano_celkem'];
        $row['zbyva'] = (float)$row['zbyva'];
        $row['procento_cerpani'] = (float)$row['procento_cerpani'];
        
        $data[] = $row;
    }
    
    return json_response([
        'status' => 'ok',
        'data' => $data,
        'meta' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'returned' => count($data)
        ]
    ]);
}
```

---

## 2️⃣ DETAIL SMLOUVY

**Endpoint:** `POST /ciselniky/smlouvy/detail`

### Request

```json
{
  "username": "admin",
  "token": "xyz123...",
  "id": 1
}
```

### Response

```json
{
  "status": "ok",
  "data": {
    "smlouva": {
      "id": 1,
      "cislo_smlouvy": "S-147/750309/26/23",
      // ... všechna pole jako v list
    },
    "objednavky": [
      {
        "id": 123,
        "ev_cislo": "2025/001",
        "predmet": "Konzultace ekonomika",
        "castka_s_dph": 50000.00,
        "dt_prirazeni": "2025-11-01T10:00:00",
        "stav": "SCHVALENA"
      }
    ],
    "statistiky": {
      "pocet_objednavek": 3,
      "celkem_cerpano": 150000.00,
      "prumerna_objednavka": 50000.00,
      "nejvetsi_objednavka": 80000.00,
      "nejmensi_objednavka": 20000.00
    }
  }
}
```

### SQL Implementace

```php
<?php
function getSmlouvaDetail($params) {
    global $db;
    
    $user = verify_token_v2($params['username'], $params['token']);
    if (!$user) {
        return json_response(['err' => 'Neplatný token'], 401);
    }
    
    if (!check_permission($user['id'], 'SMLOUVY_VIEW')) {
        return json_response(['err' => 'Nemáte oprávnění'], 403);
    }
    
    $id = (int)$params['id'];
    
    // Get contract
    $sql = "SELECT * FROM 25_smlouvy WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $smlouva = $stmt->get_result()->fetch_assoc();
    
    if (!$smlouva) {
        return json_response(['err' => 'Smlouva nenalezena'], 404);
    }
    
    // Get related orders (via cislo_smlouvy field)
    $sql_objednavky = "
        SELECT 
            o.id,
            o.ev_cislo,
            o.predmet,
            o.stav_objednavky AS stav,
            o.max_cena_s_dph AS castka_s_dph,
            o.dt_vytvoreni AS dt_prirazeni
        FROM 25a_objednavky o
        WHERE o.cislo_smlouvy = ?
        ORDER BY o.dt_vytvoreni DESC
    ";
    
    $stmt = $db->prepare($sql_objednavky);
    $stmt->bind_param('s', $smlouva['cislo_smlouvy']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $objednavky = [];
    while ($row = $result->fetch_assoc()) {
        $objednavky[] = $row;
    }
    
    // Statistics (from orders)
    $sql_stats = "
        SELECT 
            COUNT(*) as pocet_objednavek,
            SUM(max_cena_s_dph) as celkem_cerpano,
            AVG(max_cena_s_dph) as prumerna_objednavka,
            MAX(max_cena_s_dph) as nejvetsi_objednavka,
            MIN(max_cena_s_dph) as nejmensi_objednavka
        FROM 25a_objednavky
        WHERE cislo_smlouvy = ?
          AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
    ";
    
    $stmt = $db->prepare($sql_stats);
    $stmt->bind_param('s', $smlouva['cislo_smlouvy']);
    $stmt->execute();
    $statistiky = $stmt->get_result()->fetch_assoc();
    
    return json_response([
        'status' => 'ok',
        'data' => [
            'smlouva' => $smlouva,
            'objednavky' => $objednavky,
            'statistiky' => $statistiky
        ]
    ]);
}
```

---

## 3️⃣ VYTVOŘENÍ SMLOUVY

**Endpoint:** `POST /ciselniky/smlouvy/insert`

### Request

```json
{
  "username": "admin",
  "token": "xyz123...",
  "cislo_smlouvy": "S-124/750309/2025",
  "usek_id": 10,
  "druh_smlouvy": "RÁMCOVÁ",
  "nazev_firmy": "Firma s.r.o.",
  "ico": "12345678",
  "dic": "CZ12345678",
  "nazev_smlouvy": "Název smlouvy",
  "popis_smlouvy": "Popis smlouvy...",
  "platnost_od": "2025-01-01",
  "platnost_do": "2025-12-31",
  "hodnota_bez_dph": 1000000.00,
  "hodnota_s_dph": 1210000.00,
  "sazba_dph": 21.00,
  "aktivni": 1,
  "stav": "PRIPRAVOVANA",
  "poznamka": "Interní poznámka",
  "cislo_dms": "DMS-2025-123",
  "kategorie": "IT"
}
```

### Validace

```php
<?php
function validateSmlouvaData($data, $is_insert = true) {
    $errors = [];
    
    // Required fields
    if ($is_insert || isset($data['cislo_smlouvy'])) {
        if (empty($data['cislo_smlouvy'])) {
            $errors[] = 'Číslo smlouvy je povinné';
        }
    }
    
    if ($is_insert || isset($data['usek_id'])) {
        if (empty($data['usek_id']) || !is_numeric($data['usek_id'])) {
            $errors[] = 'ID úseku je povinné a musí být číslo';
        }
    }
    
    if ($is_insert || isset($data['druh_smlouvy'])) {
        if (empty($data['druh_smlouvy'])) {
            $errors[] = 'Druh smlouvy je povinný';
        }
    }
    
    if ($is_insert || isset($data['nazev_firmy'])) {
        if (empty($data['nazev_firmy'])) {
            $errors[] = 'Název firmy je povinný';
        }
    }
    
    if ($is_insert || isset($data['nazev_smlouvy'])) {
        if (empty($data['nazev_smlouvy'])) {
            $errors[] = 'Název smlouvy je povinný';
        }
    }
    
    // Date validation
    if ($is_insert || isset($data['platnost_od'])) {
        if (empty($data['platnost_od']) || !strtotime($data['platnost_od'])) {
            $errors[] = 'Platnost od je povinná a musí být datum';
        }
    }
    
    if ($is_insert || isset($data['platnost_do'])) {
        if (empty($data['platnost_do']) || !strtotime($data['platnost_do'])) {
            $errors[] = 'Platnost do je povinná a musí být datum';
        }
    }
    
    // Date range validation
    if (isset($data['platnost_od']) && isset($data['platnost_do'])) {
        if (strtotime($data['platnost_do']) < strtotime($data['platnost_od'])) {
            $errors[] = 'Datum platnosti do musí být po datu platnosti od';
        }
    }
    
    // Financial validation
    if ($is_insert || isset($data['hodnota_s_dph'])) {
        if (empty($data['hodnota_s_dph']) || !is_numeric($data['hodnota_s_dph']) || $data['hodnota_s_dph'] <= 0) {
            $errors[] = 'Hodnota s DPH je povinná a musí být kladné číslo';
        }
    }
    
    // IČO validation (8 digits)
    if (isset($data['ico']) && !empty($data['ico'])) {
        if (!preg_match('/^\d{8}$/', $data['ico'])) {
            $errors[] = 'IČO musí obsahovat 8 číslic';
        }
    }
    
    return $errors;
}

function createSmlouva($params) {
    global $db;
    
    $user = verify_token_v2($params['username'], $params['token']);
    if (!$user) {
        return json_response(['err' => 'Neplatný token'], 401);
    }
    
    if (!check_permission($user['id'], 'SMLOUVY_CREATE')) {
        return json_response(['err' => 'Nemáte oprávnění'], 403);
    }
    
    // Validate
    $errors = validateSmlouvaData($params);
    if ($errors) {
        return json_response(['err' => implode(', ', $errors)], 400);
    }
    
    // Check duplicate cislo_smlouvy
    $sql = "SELECT id FROM 25_smlouvy WHERE cislo_smlouvy = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('s', $params['cislo_smlouvy']);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        return json_response(['err' => 'Smlouva s tímto číslem již existuje'], 409);
    }
    
    // Get usek_zkr
    $sql = "SELECT usek_zkr FROM 25_useky WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $params['usek_id']);
    $stmt->execute();
    $usek = $stmt->get_result()->fetch_assoc();
    $usek_zkr = $usek ? $usek['usek_zkr'] : null;
    
    // Insert
    $sql = "
        INSERT INTO 25_smlouvy (
            cislo_smlouvy, usek_id, usek_zkr, druh_smlouvy,
            nazev_firmy, ico, dic, nazev_smlouvy, popis_smlouvy,
            platnost_od, platnost_do,
            hodnota_bez_dph, hodnota_s_dph, sazba_dph,
            aktivni, stav, poznamka, cislo_dms, kategorie,
            dt_vytvoreni, vytvoril_user_id,
            cerpano_celkem, zbyva, procento_cerpani
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            NOW(), ?,
            0, ?, 0
        )
    ";
    
    $hodnota_s_dph = (float)$params['hodnota_s_dph'];
    $hodnota_bez_dph = (float)($params['hodnota_bez_dph'] ?? 0);
    $sazba_dph = (float)($params['sazba_dph'] ?? 21.00);
    $aktivni = (int)($params['aktivni'] ?? 1);
    $stav = $params['stav'] ?? 'AKTIVNI';
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param(
        'sisssssssssdddisissdi',
        $params['cislo_smlouvy'],
        $params['usek_id'],
        $usek_zkr,
        $params['druh_smlouvy'],
        $params['nazev_firmy'],
        $params['ico'],
        $params['dic'],
        $params['nazev_smlouvy'],
        $params['popis_smlouvy'],
        $params['platnost_od'],
        $params['platnost_do'],
        $hodnota_bez_dph,
        $hodnota_s_dph,
        $sazba_dph,
        $aktivni,
        $stav,
        $params['poznamka'],
        $params['cislo_dms'],
        $params['kategorie'],
        $user['id'],
        $hodnota_s_dph // zbyva = hodnota_s_dph na začátku
    );
    
    if ($stmt->execute()) {
        $new_id = $db->insert_id;
        
        return json_response([
            'status' => 'ok',
            'data' => [
                'id' => $new_id,
                'message' => 'Smlouva byla úspěšně vytvořena'
            ]
        ]);
    } else {
        return json_response(['err' => 'Chyba při vytváření smlouvy: ' . $db->error], 500);
    }
}
```

### Response

```json
{
  "status": "ok",
  "data": {
    "id": 15,
    "message": "Smlouva byla úspěšně vytvořena"
  }
}
```

---

## 4️⃣ AKTUALIZACE SMLOUVY

**Endpoint:** `POST /ciselniky/smlouvy/update`

### Request

Stejné pole jako insert + povinné `id`

```json
{
  "username": "admin",
  "token": "xyz123...",
  "id": 15,
  "cislo_smlouvy": "S-124/750309/2025",
  // ... další pole
}
```

### Response

```json
{
  "status": "ok",
  "data": {
    "message": "Smlouva byla úspěšně aktualizována"
  }
}
```

---

## 5️⃣ SMAZÁNÍ SMLOUVY

**Endpoint:** `POST /ciselniky/smlouvy/delete`

### Request

```json
{
  "username": "admin",
  "token": "xyz123...",
  "id": 15
}
```

### Response

```json
{
  "status": "ok",
  "data": {
    "message": "Smlouva byla úspěšně smazána"
  }
}
```

### Poznámka

- CASCADE delete automaticky smaže i vazby v `25_smlouvy_objednavky`
- Zvážit soft delete (`aktivni = 0`) místo hard delete

---

## 6️⃣ HROMADNÝ IMPORT

**Endpoint:** `POST /ciselniky/smlouvy/bulk-import`

### Request

```json
{
  "username": "admin",
  "token": "xyz123...",
  "data": [
    {
      "cislo_smlouvy": "S-147/750309/26/23",
      "usek_zkr": "ÚEko",
      "druh_smlouvy": "SLUŽBY",
      "nazev_firmy": "Alter Audit, s.r.o.",
      "ico": "29268931",
      "nazev_smlouvy": "Smlouva o poskytování služeb",
      "popis_smlouvy": "...",
      "platnost_od": "2023-06-05",
      "platnost_do": "2025-12-31",
      "hodnota_bez_dph": 500000.00,
      "hodnota_s_dph": 605000.00
    }
    // ... další záznamy
  ],
  "overwrite_existing": false
}
```

### Response

```json
{
  "status": "ok",
  "data": {
    "celkem_radku": 150,
    "uspesne_importovano": 145,
    "aktualizovano": 0,
    "preskoceno_duplicit": 5,
    "chyb": 0,
    "chybove_zaznamy": [],
    "import_log_id": 5,
    "cas_importu_ms": 2500
  }
}
```

### SQL Implementace

```php
<?php
function bulkImportSmlouvy($params) {
    global $db;
    
    $user = verify_token_v2($params['username'], $params['token']);
    if (!$user) {
        return json_response(['err' => 'Neplatný token'], 401);
    }
    
    if (!check_permission($user['id'], 'SMLOUVY_IMPORT')) {
        return json_response(['err' => 'Nemáte oprávnění'], 403);
    }
    
    $data = $params['data'];
    $overwrite = $params['overwrite_existing'] ?? false;
    
    $celkem = count($data);
    $uspesne = 0;
    $aktualizovano = 0;
    $preskoceno = 0;
    $chyby = [];
    
    $start_time = microtime(true);
    
    // Start transaction
    $db->begin_transaction();
    
    try {
        foreach ($data as $index => $row) {
            // Map usek_zkr to usek_id
            $sql = "SELECT id, usek_zkr FROM 25_useky WHERE usek_zkr = ?";
            $stmt = $db->prepare($sql);
            $stmt->bind_param('s', $row['usek_zkr']);
            $stmt->execute();
            $usek = $stmt->get_result()->fetch_assoc();
            
            if (!$usek) {
                $chyby[] = [
                    'row' => $index + 1,
                    'cislo_smlouvy' => $row['cislo_smlouvy'],
                    'error' => 'Úsek nenalezen: ' . $row['usek_zkr']
                ];
                continue;
            }
            
            $row['usek_id'] = $usek['id'];
            
            // Validate
            $validation_errors = validateSmlouvaData($row);
            if ($validation_errors) {
                $chyby[] = [
                    'row' => $index + 1,
                    'cislo_smlouvy' => $row['cislo_smlouvy'],
                    'error' => implode(', ', $validation_errors)
                ];
                continue;
            }
            
            // Check if exists
            $sql = "SELECT id FROM 25_smlouvy WHERE cislo_smlouvy = ?";
            $stmt = $db->prepare($sql);
            $stmt->bind_param('s', $row['cislo_smlouvy']);
            $stmt->execute();
            $existing = $stmt->get_result()->fetch_assoc();
            
            if ($existing && !$overwrite) {
                $preskoceno++;
                continue;
            }
            
            if ($existing && $overwrite) {
                // Update
                // ... update logic
                $aktualizovano++;
            } else {
                // Insert
                $sql = "
                    INSERT INTO 25_smlouvy (
                        cislo_smlouvy, usek_id, usek_zkr, druh_smlouvy,
                        nazev_firmy, ico, nazev_smlouvy, popis_smlouvy,
                        platnost_od, platnost_do,
                        hodnota_bez_dph, hodnota_s_dph,
                        aktivni, stav, dt_vytvoreni, vytvoril_user_id,
                        cerpano_celkem, zbyva, procento_cerpani
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'AKTIVNI', NOW(), ?, 0, ?, 0)
                ";
                
                $stmt = $db->prepare($sql);
                $stmt->bind_param(
                    'sissssssssddid',
                    $row['cislo_smlouvy'],
                    $row['usek_id'],
                    $row['usek_zkr'],
                    $row['druh_smlouvy'],
                    $row['nazev_firmy'],
                    $row['ico'],
                    $row['nazev_smlouvy'],
                    $row['popis_smlouvy'],
                    $row['platnost_od'],
                    $row['platnost_do'],
                    $row['hodnota_bez_dph'],
                    $row['hodnota_s_dph'],
                    $user['id'],
                    $row['hodnota_s_dph']
                );
                
                if ($stmt->execute()) {
                    $uspesne++;
                } else {
                    $chyby[] = [
                        'row' => $index + 1,
                        'cislo_smlouvy' => $row['cislo_smlouvy'],
                        'error' => 'DB error: ' . $db->error
                    ];
                }
            }
        }
        
        // Log import
        $sql = "
            INSERT INTO 25_smlouvy_import_log (
                dt_importu, user_id, username,
                pocet_radku, pocet_uspesnych, pocet_aktualizovanych,
                pocet_preskoceno, pocet_chyb,
                chybove_zaznamy, status, overwrite_existing
            ) VALUES (
                NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        ";
        
        $status = count($chyby) == 0 ? 'SUCCESS' : (count($chyby) < $celkem ? 'PARTIAL' : 'FAILED');
        $chyby_json = json_encode($chyby);
        
        $stmt = $db->prepare($sql);
        $stmt->bind_param(
            'isiiiiissi',
            $user['id'],
            $user['username'],
            $celkem,
            $uspesne,
            $aktualizovano,
            $preskoceno,
            count($chyby),
            $chyby_json,
            $status,
            $overwrite
        );
        $stmt->execute();
        
        $log_id = $db->insert_id;
        
        $db->commit();
        
        $elapsed_ms = round((microtime(true) - $start_time) * 1000);
        
        return json_response([
            'status' => 'ok',
            'data' => [
                'celkem_radku' => $celkem,
                'uspesne_importovano' => $uspesne,
                'aktualizovano' => $aktualizovano,
                'preskoceno_duplicit' => $preskoceno,
                'chyb' => count($chyby),
                'chybove_zaznamy' => $chyby,
                'import_log_id' => $log_id,
                'cas_importu_ms' => $elapsed_ms
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        return json_response(['err' => 'Import selhal: ' . $e->getMessage()], 500);
    }
}
```

---

## 7️⃣ PŘEPOČET ČERPÁNÍ

**Endpoint:** `POST /ciselniky/smlouvy/prepocet-cerpani`

### Request

```json
{
  "username": "admin",
  "token": "xyz123...",
  "cislo_smlouvy": null,
  "usek_id": null
}
```

**Parametry:**
- `cislo_smlouvy` (string|null) - Přepočítat konkrétní smlouvu (např. "S-147/750309/26/23")
- `usek_id` (int|null) - Přepočítat všechny smlouvy daného úseku
- Pokud oba `null` = přepočítat **všechny aktivní smlouvy**

**Použití:**
```json
// Jedna konkrétní smlouva
{"cislo_smlouvy": "S-147/750309/26/23", "usek_id": null}

// Všechny smlouvy úseku 5
{"cislo_smlouvy": null, "usek_id": 5}

// Všechny smlouvy (manuální přepočet admin)
{"cislo_smlouvy": null, "usek_id": null}
```

### Response

```json
{
  "status": "ok",
  "data": {
    "prepocitano_smluv": 45,
    "cas_vypoctu_ms": 1250,
    "dt_prepoctu": "2025-11-23T10:30:00"
  }
}
```

### 🔄 Automatický vs. Manuální přepočet

**Automatický** (v API pro objednávky):
```php
// V apiv2Orders.php při uložení/update objednávky
if ($formData['zpusob_financovani'] === 'SMLOUVA' && !empty($formData['cislo_smlouvy'])) {
    // Přepočítat čerpání této smlouvy
    prepocetCerpaniSmlouvyAuto($formData['cislo_smlouvy']);
}
```

**Manuální** (v číselníkách nebo profilu):
- Tlačítko "♻️ Přepočítat čerpání" v detailu smlouvy
- Hromadný přepočet v admin rozhraní
- Zobrazení času posledního přepočtu

### SQL Implementace

```php
<?php
function prepocetCerpaniSmluv($params) {
    global $db;
    
    $user = verify_token_v2($params['username'], $params['token']);
    if (!$user) {
        return json_response(['err' => 'Neplatný token'], 401);
    }
    
    // Check permission
    if (!check_permission($user['id'], 'SMLOUVY_EDIT')) {
        return json_response(['err' => 'Nemáte oprávnění'], 403);
    }
    
    $start_time = microtime(true);
    $cislo_smlouvy = $params['cislo_smlouvy'] ?? null;
    $usek_id = $params['usek_id'] ?? null;
    
    // Call stored procedure
    $sql = "CALL sp_prepocet_cerpani_smluv(?, ?)";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('si', $cislo_smlouvy, $usek_id);
    $stmt->execute();
    
    // Get count of affected contracts
    $where = [];
    $types = '';
    $bind_params = [];
    
    if ($cislo_smlouvy) {
        $where[] = "cislo_smlouvy = ?";
        $types .= 's';
        $bind_params[] = $cislo_smlouvy;
    }
    if ($usek_id) {
        $where[] = "usek_id = ?";
        $types .= 'i';
        $bind_params[] = $usek_id;
    }
    if (empty($where)) {
        $where[] = "aktivni = 1";
    }
    
    $sql = "SELECT COUNT(*) as pocet FROM 25_smlouvy WHERE " . implode(' AND ', $where);
    $stmt = $db->prepare($sql);
    
    if (!empty($bind_params)) {
        $stmt->bind_param($types, ...$bind_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    $elapsed_ms = round((microtime(true) - $start_time) * 1000);
    
    return json_response([
        'status' => 'ok',
        'data' => [
            'prepocitano_smluv' => $result['pocet'],
            'cas_vypoctu_ms' => $elapsed_ms,
            'dt_prepoctu' => date('c')
        ]
    ]);
}

// Helper funkce pro automatický přepočet (volá se z apiv2Orders.php)
function prepocetCerpaniSmlouvyAuto($cislo_smlouvy) {
    global $db;
    
    $sql = "CALL sp_prepocet_cerpani_smluv(?, NULL)";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('s', $cislo_smlouvy);
    $stmt->execute();
}
```

---

## ~~8️⃣ PŘIŘAZENÍ OBJEDNÁVKY KE SMLOUVĚ~~ (DEPRECATED)

⚠️ **TENTO ENDPOINT NENÍ POTŘEBA IMPLEMENTOVAT**

Přiřazení smlouvy k objednávce se řeší v **OrderForm** přes dynamické financování:
- Uživatel v objednávce vybere zdroj financování: "Smlouva"
- Vyplní pole `cislo_smlouvy` (SELECT z číselníku smluv)
- Při uložení objednávky **BE automaticky přepočítá čerpání**

**Důvod zrušení:** Vazba mezi smlouvou a objednávkou je řešena přímým polem v objednávce, ne vazební tabulkou.

---

## 🔗 INTEGRACE DO API PRO OBJEDNÁVKY

**DŮLEŽITÉ:** V `apiv2Orders.php` (nebo podobný soubor) při ukládání/editaci objednávky:

```php
// V endpointu POST /orders/insert nebo /orders/update

function saveOrder($params) {
    global $db;
    
    // ... validace, autorizace ...
    
    $formData = $params['formData'];
    
    // Uložit objednávku
    $order_id = insertOrUpdateOrder($formData);
    
    // 🔄 AUTOMATICKÝ PŘEPOČET ČERPÁNÍ SMLOUVY
    if ($formData['zpusob_financovani'] === 'SMLOUVA' && !empty($formData['cislo_smlouvy'])) {
        // Include funkce z apiv2Dictionaries.php
        require_once(__DIR__ . '/apiv2Dictionaries.php');
        
        // Přepočítat čerpání této smlouvy
        prepocetCerpaniSmlouvyAuto($formData['cislo_smlouvy']);
        
        // ⚠️ Volitelné: Zkontrolovat, zda objednávka nepřekračuje zůstatek
        $smlouva = getSmlouvaDetail(['cislo_smlouvy' => $formData['cislo_smlouvy']]);
        if ($smlouva && $smlouva['zbyva'] < 0) {
            // Log varování (ale objednávku neblokujeme)
            error_log("⚠️ Smlouva {$formData['cislo_smlouvy']} překročila limit!");
        }
    }
    
    return json_response([
        'status' => 'ok',
        'data' => ['order_id' => $order_id]
    ]);
}
```

**Kdy přepočítat:**
- ✅ Po INSERT nové objednávky se smlouvou
- ✅ Po UPDATE objednávky (změna částky nebo smlouvy)
- ✅ Po změně stavu objednávky (STORNOVÁNA → nezapočítává se do čerpání)
- ❌ Při DELETE objednávky (soft delete) - stornovaná se nezapočítává

---

## 🔒 OPRÁVNĚNÍ

Kontrola oprávnění pro každý endpoint:

| Endpoint | Právo |
|----------|-------|
| `/list` | `SMLOUVY_VIEW` |
| `/detail` | `SMLOUVY_VIEW` |
| `/insert` | `SMLOUVY_CREATE` |
| `/update` | `SMLOUVY_EDIT` |
| `/delete` | `SMLOUVY_DELETE` |
| `/bulk-import` | `SMLOUVY_IMPORT` |
| `/prepocet-cerpani` | `SMLOUVY_EDIT` |
| ~~`/prirad-objednavku`~~ | ~~`SMLOUVY_EDIT`~~ (deprecated) |

---

## ⚠️ ERROR HANDLING

### Error Response Formát

```json
{
  "err": "Chybová zpráva",
  "code": 400
}
```

### HTTP Status Codes

- `200` - OK
- `400` - Bad Request (validace)
- `401` - Unauthorized (neplatný token)
- `403` - Forbidden (nemá oprávnění)
- `404` - Not Found (záznam nenalezen)
- `409` - Conflict (duplicita)
- `500` - Internal Server Error

---

## 📊 PERFORMANCE OPTIMALIZACE

### Indexy

Všechny potřebné indexy jsou v SQL souboru `SMLOUVY-DB-SCHEMA-MYSQL55.sql`

### Caching

- Číselníky úseků cachovat v memory
- Seznam smluv cachovat na 5 minut
- Přepočet čerpání asynchronně (cron)

### Pagination

- Default limit: 1000
- Max limit: 5000
- Vždy používat LIMIT + OFFSET

---

## 📝 TODO PRO BACKEND TÝM

### Priorita 1 (Nutné)
- [ ] Vytvořit tabulky v DB (`25_smlouvy`, `25_smlouvy_import_log`)
- [ ] Zjistit strukturu pole `cislo_smlouvy` v tabulce `25a_objednavky` (samostatný sloupec nebo JSON?)
- [ ] Implementovat 7 endpointů (list, detail, insert, update, delete, bulk-import, prepocet-cerpani)
- [ ] Vytvořit stored procedure `sp_prepocet_cerpani_smluv` (upravit SELECT podle zjištěné struktury!)
- [ ] **INTEGRACE:** Přidat automatický přepočet do `apiv2Orders.php` při uložení objednávky se smlouvou
- [ ] Přidat práva do tabulky `25_prava` (SMLOUVY_VIEW, SMLOUVY_CREATE, SMLOUVY_EDIT, SMLOUVY_DELETE, SMLOUVY_IMPORT)
- [ ] Testování všech endpointů

### Priorita 2 (Důležité)
- [ ] Error logging
- [ ] Performance monitoring
- [ ] Validace IČO (kontrolní součet)
- [ ] Export do Excelu/CSV

### Priorita 3 (Nice-to-have)
- [ ] Verzování smluv (historie změn)
- [ ] Přílohy ke smlouvám
- [ ] Automatické upozornění na blížící se expiraci
- [ ] Dashboard statistik

---

## 🧪 TESTOVÁNÍ

### Unit testy

Testovat:
- Validaci vstupních dat
- Kontrolu duplikátních čísel smluv
- Přepočet čerpání
- Import s chybami

### Integrační testy

Otestovat celý flow:
1. Vytvoření smlouvy
2. Přiřazení objednávky
3. Automatický přepočet čerpání
4. Kontrola zbývající částky

### Performance testy

- Import 1000 smluv najednou
- Seznam 5000 smluv s filtry
- Přepočet čerpání všech smluv

---

**Verze:** 1.0  
**Schválil:** [čeká na schválení]  
**Datum poslední aktualizace:** 23. listopadu 2025
