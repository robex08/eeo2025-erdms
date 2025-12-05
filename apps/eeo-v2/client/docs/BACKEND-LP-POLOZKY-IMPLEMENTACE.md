# 🔧 Backend Implementace: LP kódy na úrovni položek

**Datum:** 29. listopadu 2025  
**Frontend Status:** ✅ HOTOVO  
**Backend Status:** ⏳ ČEKÁ NA IMPLEMENTACI

---

## 📋 Přehled

Frontend je připraven odesílat `lp_id` na úrovni jednotlivých položek objednávky. Backend nyní potřebuje:

1. ✅ Přidat sloupec `lp_id` do tabulky `25a_objednavky_polozky`
2. ✅ Vytvořit PHP handlery pro práci s LP na položkách
3. ✅ Rozšířit OrderV2 CRUD endpointy
4. ✅ Vytvořit endpoint `POST /order-v2/lp-options` pro načtení seznamu LP
5. ✅ Enrichovat položky o LP data při GET requestech

---

## 🎯 Co frontend NYNÍ posílá

### CREATE/UPDATE objednávky

```json
POST /order-v2/create
POST /order-v2/update/{id}

{
  "username": "...",
  "token": "...",
  "predmet": "Test objednávka",
  "financovani": {
    "typ": "LIMITOVANY_PRISLIB",
    "lp_kody": [15, 16]
  },
  "polozky": [
    {
      "popis": "Notebook",
      "cena_bez_dph": 25000,
      "sazba_dph": 21,
      "cena_s_dph": 30250,
      "lp_id": 15  // 🎯 NOVÉ POLE!
    },
    {
      "popis": "Monitor",
      "cena_bez_dph": 10000,
      "sazba_dph": 21,
      "cena_s_dph": 12100,
      "lp_id": 16  // 🎯 NOVÉ POLE!
    },
    {
      "popis": "Myš",
      "cena_bez_dph": 500,
      "sazba_dph": 21,
      "cena_s_dph": 605,
      "lp_id": null  // Položka BEZ LP
    }
  ]
}
```

### Co frontend očekává v GET response

```json
GET /order-v2/get

Response:
{
  "status": "ok",
  "data": {
    "id": 12345,
    "cislo_objednavky": "2025/TEST",
    "polozky": [
      {
        "id": 5001,
        "popis": "Notebook",
        "cena_s_dph": 30250,
        "lp_id": 15,
        // 🎯 Enriched LP data z backendu:
        "lp_kod": "LPIT1",
        "lp_nazev": "IT Hardware 2025",
        "lp_kategorie": "IT",
        "lp_limit": 500000,
        "lp_rok": 2025,
        "lp_je_platne": true
      },
      {
        "id": 5002,
        "popis": "Monitor",
        "cena_s_dph": 12100,
        "lp_id": 16,
        "lp_kod": "LPIT2",
        "lp_nazev": "IT Monitory 2025",
        "lp_je_platne": true
      },
      {
        "id": 5003,
        "popis": "Myš",
        "cena_s_dph": 605,
        "lp_id": null
        // Žádné LP fields
      }
    ]
  }
}
```

### Nový endpoint pro LP options

```json
POST /order-v2/lp-options

Request:
{
  "username": "testuser",
  "token": "xxx",
  "lp_ids": [15, 16],  // Filtr podle lp_kody z objednávky
  "rok": 2025
}

Expected Response:
{
  "status": "ok",
  "data": [
    {
      "id": 15,
      "kod": "LPIT1",
      "nazev": "IT Hardware 2025",
      "kategorie": "IT",
      "limit": 500000,
      "rok": 2025,
      "label": "LPIT1 - IT Hardware 2025"  // Pro zobrazení v selectu
    },
    {
      "id": 16,
      "kod": "LPIT2",
      "nazev": "IT Monitory 2025",
      "kategorie": "IT",
      "limit": 300000,
      "rok": 2025,
      "label": "LPIT2 - IT Monitory 2025"
    }
  ],
  "meta": {
    "count": 2,
    "rok": 2025,
    "filtered": true,
    "timestamp": "2025-11-29T12:00:00Z"
  }
}
```

---

## 🗄️ Backend TODO

### 1. SQL Migrace

```sql
-- Přidat sloupec lp_id do položek
ALTER TABLE `25a_objednavky_polozky` 
ADD COLUMN `lp_id` INT(11) DEFAULT NULL AFTER `poznamka`;

-- Přidat indexy
ALTER TABLE `25a_objednavky_polozky`
ADD INDEX `idx_polozky_lp_id` (`lp_id`),
ADD INDEX `idx_polozky_lp_objednavka` (`lp_id`, `objednavka_id`);

-- Foreign key (volitelné)
ALTER TABLE `25a_objednavky_polozky`
ADD CONSTRAINT `fk_polozky_lp`
FOREIGN KEY (`lp_id`) REFERENCES `25_limitovane_prisliby` (`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
```

### 2. PHP Handler soubor

Vytvořit: `v2025.03_25/lib/orderV2PolozkyLPHandlers.php`

```php
<?php
/**
 * LP Handlers pro položky objednávek
 */

// Uložit LP ID pro položky při CREATE/UPDATE
function ulozit_polozky_lp($conn, $objednavka_id, $polozky) {
    $errors = array();
    
    foreach ($polozky as $polozka) {
        if (!isset($polozka['id'])) continue;
        
        $polozka_id = intval($polozka['id']);
        $lp_id = isset($polozka['lp_id']) ? intval($polozka['lp_id']) : NULL;
        
        // UPDATE položky s LP ID
        $stmt = $conn->prepare("UPDATE 25a_objednavky_polozky SET lp_id = ? WHERE id = ?");
        $stmt->bind_param("ii", $lp_id, $polozka_id);
        
        if (!$stmt->execute()) {
            $errors[] = "Chyba při ukládání LP pro položku {$polozka_id}: " . $stmt->error;
        }
        $stmt->close();
    }
    
    return array(
        'status' => empty($errors) ? 'ok' : 'error',
        'errors' => $errors
    );
}

// Načíst LP ID položek (pokud ještě nejsou v items)
function nacist_polozky_lp($conn, $objednavka_id) {
    $stmt = $conn->prepare("SELECT id, lp_id FROM 25a_objednavky_polozky WHERE objednavka_id = ?");
    $stmt->bind_param("i", $objednavka_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $map = array();
    while ($row = $result->fetch_assoc()) {
        if ($row['lp_id']) {
            $map[$row['id']] = intval($row['lp_id']);
        }
    }
    $stmt->close();
    
    return $map;
}

// Enrichovat položky o LP data
function enrich_polozky_s_lp($conn, $polozky, $dostupne_lp_ids = array()) {
    if (empty($polozky)) return $polozky;
    
    // Získat unikátní LP IDs
    $lp_ids = array_unique(array_filter(array_map(function($p) {
        return isset($p['lp_id']) ? intval($p['lp_id']) : null;
    }, $polozky)));
    
    if (empty($lp_ids)) return $polozky;
    
    // Načíst LP data z DB
    $placeholders = implode(',', array_fill(0, count($lp_ids), '?'));
    $types = str_repeat('i', count($lp_ids));
    
    $stmt = $conn->prepare("
        SELECT 
            id,
            cislo_lp as kod,
            nazev_uctu as nazev,
            kategorie,
            celkovy_limit as `limit`,
            rok,
            status
        FROM 25_limitovane_prisliby
        WHERE id IN ($placeholders)
    ");
    $stmt->bind_param($types, ...$lp_ids);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $lp_data = array();
    while ($row = $result->fetch_assoc()) {
        $lp_data[$row['id']] = $row;
    }
    $stmt->close();
    
    // Enrichovat položky
    foreach ($polozky as &$polozka) {
        if (!isset($polozka['lp_id']) || !$polozka['lp_id']) continue;
        
        $lp_id = intval($polozka['lp_id']);
        
        if (isset($lp_data[$lp_id])) {
            $lp = $lp_data[$lp_id];
            
            $polozka['lp_kod'] = $lp['kod'];
            $polozka['lp_nazev'] = $lp['nazev'];
            $polozka['lp_kategorie'] = $lp['kategorie'];
            $polozka['lp_limit'] = floatval($lp['limit']);
            $polozka['lp_rok'] = intval($lp['rok']);
            
            // Validace: Je LP v dostupných LP?
            $polozka['lp_je_platne'] = empty($dostupne_lp_ids) || in_array($lp_id, $dostupne_lp_ids);
        } else {
            // LP neexistuje v DB
            $polozka['lp_je_platne'] = false;
        }
    }
    unset($polozka);
    
    return $polozky;
}

// Získat seznam LP pro výběr v položkách
function ziskat_lp_pro_vyber($conn, $lp_ids_filter = array(), $rok = null) {
    $rok = $rok ?: date('Y');
    
    $where = array("rok = ?");
    $params = array($rok);
    $types = "i";
    
    if (!empty($lp_ids_filter)) {
        $placeholders = implode(',', array_fill(0, count($lp_ids_filter), '?'));
        $where[] = "id IN ($placeholders)";
        $params = array_merge($params, $lp_ids_filter);
        $types .= str_repeat('i', count($lp_ids_filter));
    }
    
    $where_sql = implode(' AND ', $where);
    
    $stmt = $conn->prepare("
        SELECT 
            id,
            cislo_lp as kod,
            nazev_uctu as nazev,
            kategorie,
            celkovy_limit as `limit`,
            rok
        FROM 25_limitovane_prisliby
        WHERE $where_sql
        ORDER BY cislo_lp ASC
    ");
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $options = array();
    while ($row = $result->fetch_assoc()) {
        $options[] = array(
            'id' => intval($row['id']),
            'kod' => $row['kod'],
            'nazev' => $row['nazev'],
            'kategorie' => $row['kategorie'],
            'limit' => floatval($row['limit']),
            'rok' => intval($row['rok']),
            'label' => $row['kod'] . ' - ' . $row['nazev']
        );
    }
    $stmt->close();
    
    return $options;
}
?>
```

### 3. Rozšíření OrderV2Handler.php

```php
// V createOrder() - po uložení položek
if (!empty($polozky)) {
    require_once __DIR__ . '/orderV2PolozkyLPHandlers.php';
    $lp_result = ulozit_polozky_lp($this->conn, $objednavka_id, $polozky);
    
    if ($lp_result['status'] !== 'ok' && !empty($lp_result['errors'])) {
        error_log("LP save warnings: " . json_encode($lp_result['errors']));
    }
}

// V updateOrder() - po update položek
if (isset($order_data['polozky']) && !empty($order_data['polozky'])) {
    require_once __DIR__ . '/orderV2PolozkyLPHandlers.php';
    $lp_result = ulozit_polozky_lp($this->conn, $order_id, $order_data['polozky']);
    
    if ($lp_result['status'] !== 'ok' && !empty($lp_result['errors'])) {
        error_log("LP update warnings: " . json_encode($lp_result['errors']));
    }
}

// V enrichOrder() - enrichovat položky o LP data
if (isset($order_data['polozky']) && is_array($order_data['polozky'])) {
    require_once __DIR__ . '/orderV2PolozkyLPHandlers.php';
    
    // Získat dostupné LP z objednávky
    $dostupne_lp_ids = isset($order_data['lp_kody']) && is_array($order_data['lp_kody']) 
        ? $order_data['lp_kody'] 
        : array();
    
    // Načíst LP ID z databáze (pokud ještě nejsou v položkách)
    $lp_map = nacist_polozky_lp($this->conn, $order_id);
    foreach ($order_data['polozky'] as &$polozka) {
        if (isset($polozka['id']) && isset($lp_map[$polozka['id']])) {
            $polozka['lp_id'] = $lp_map[$polozka['id']];
        }
    }
    unset($polozka);
    
    // Enrich s LP daty
    $order_data['polozky'] = enrich_polozky_s_lp($this->conn, $order_data['polozky'], $dostupne_lp_ids);
}
```

### 4. Nový endpoint v api.php

```php
// POST /api.eeo/order-v2/lp-options
case 'order-v2/lp-options':
    if ($request_method === 'POST') {
        handle_order_v2_lp_options($input, $config, $queries);
    } else {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
    }
    break;
```

### 5. Handler v orderV2Endpoints.php

```php
function handle_order_v2_lp_options($input, $config, $queries) {
    // Ověření tokenu
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $db = new mysqli($config['host'], $config['username'], $config['password'], $config['database']);
    if ($db->connect_error) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Database connection failed'));
        return;
    }
    
    require_once __DIR__ . '/orderV2PolozkyLPHandlers.php';
    
    $lp_ids_filter = isset($input['lp_ids']) && is_array($input['lp_ids']) ? $input['lp_ids'] : array();
    $rok = isset($input['rok']) ? intval($input['rok']) : date('Y');
    
    $lp_list = ziskat_lp_pro_vyber($db, $lp_ids_filter, $rok);
    
    echo json_encode(array(
        'status' => 'ok',
        'data' => $lp_list,
        'meta' => array(
            'count' => count($lp_list),
            'rok' => $rok,
            'filtered' => !empty($lp_ids_filter),
            'timestamp' => date('c')
        )
    ));
    
    $db->close();
}
```

---

## ✅ Zpětná kompatibilita

- ✅ Položky BEZ `lp_id` fungují normálně (`lp_id` = NULL)
- ✅ Stávající objednávky nejsou ovlivněny
- ✅ API vrací `lp_id: null` pokud není nastaveno
- ✅ Frontend zobrazuje LP pouze když jsou data dostupná

---

## 🧪 Testování

### Test 1: Vytvoření objednávky s LP

```bash
curl -X POST http://localhost/api.eeo/order-v2/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "token": "xxx",
    "predmet": "Test LP na položkách",
    "financovani": {"typ": "LIMITOVANY_PRISLIB", "lp_kody": [15, 16]},
    "polozky": [
      {"popis": "Notebook", "cena_s_dph": 30250, "lp_id": 15},
      {"popis": "Monitor", "cena_s_dph": 12100, "lp_id": 16}
    ]
  }'
```

### Test 2: Načtení LP options

```bash
curl -X POST http://localhost/api.eeo/order-v2/lp-options \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "token": "xxx",
    "lp_ids": [15, 16],
    "rok": 2025
  }'
```

### Test 3: GET objednávky s enriched LP

```bash
curl -X POST http://localhost/api.eeo/order-v2/get \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "token": "xxx",
    "id": 12345
  }'
```

Očekávaný výsledek: Položky obsahují `lp_kod`, `lp_nazev`, `lp_je_platne` atd.

---

## 📝 Poznámky

1. **Frontend JE HOTOVÝ** - posílá `lp_id` v položkách a zobrazuje LP data
2. **Backend SQL** je potřeba vytvořit (`lp_id` sloupec + indexy)
3. **PHP handlery** jsou popsané výše - třeba vytvořit soubor
4. **Endpoint `/order-v2/lp-options`** je NOVÝ - potřeba přidat do api.php
5. **Enrichment** v `getOrder()` - přidat volání `enrich_polozky_s_lp()`

---

**Priorita:** 🔴 VYSOKÁ  
**Blokuje:** Produkční nasazení LP na položkách  
**ETA:** 1-2 hodiny práce (SQL + PHP handlery + testování)
