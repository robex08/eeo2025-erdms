# 🚨 BACKEND - URGENTNÍ KONTROLA A DOPLNĚNÍ
**Datum:** 11. listopadu 2025  
**Frontend build:** Hotový a připravený k nasazení  
**Backend status:** CHYBÍ ENDPOINTY / 404 ERRORS

---

## ❌ KRITICKÉ CHYBY - NEFUNKČNÍ ENDPOINTY

### 1. **Pokladna - Update položky (404)**

**Chyba:**
```
POST https://eeo.zachranka.cz/api.eeo/cashbook-entry-update 404 (Not Found)
```

**Frontend volá:**
```javascript
// src/services/cashbookService.js:241
const response = await axios.post(`${API_BASE}/cashbook-entry-update`, {
  username: username,
  token: token,
  entry_id: entryId,
  book_id: bookId,
  datum_zapisu: '2025-11-09',
  cislo_dokladu: 'P006',
  obsah_zapisu: 'Dotace Kladno',
  komu_od_koho: 'Město Kladno',
  castka_prijem: 5000,
  castka_vydaj: 0,
  lp_kod: 'LP001',
  poznamka: ''
});
```

**Co je potřeba:**

#### ✅ Ověřit existenci souboru:
```
/api.eeo/cashbook-entry-update.php
```

#### ✅ Minimální funkcionalita:
```php
<?php
/**
 * Soubor: /api.eeo/cashbook-entry-update.php
 * Úprava položky v pokladní knize
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/db.php';

// Autentizace
$auth = authenticate();
if (!$auth['success']) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$username = $auth['username'];
$user_id = $auth['user_id'];

// Načíst vstupní data
$input = json_decode(file_get_contents('php://input'), true);

$entry_id = $input['entry_id'] ?? null;
$book_id = $input['book_id'] ?? null;

if (!$entry_id || !$book_id) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
    exit;
}

// 1. Načíst knihu a zkontrolovat oprávnění
$stmt = $pdo->prepare("
    SELECT pk.*, ppu.uzivatel_id, ppu.opravneni_typ
    FROM pokladni_knihy pk
    JOIN pokladny_prirazeni_uzivatele ppu ON pk.prirazeni_pokladny_id = ppu.id
    WHERE pk.id = :book_id
");
$stmt->execute(['book_id' => $book_id]);
$book = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$book) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Kniha nenalezena']);
    exit;
}

// 2. Kontrola oprávnění
$canEdit = false;

// Vlastník knihy může editovat
if ($book['uzivatel_id'] == $user_id) {
    $canEdit = true;
}

// Admin/správce může editovat
if (hasPermission($user_id, ['CASHBOOK_EDIT_ALL', 'CASHBOOK_MANAGE'])) {
    $canEdit = true;
}

if (!$canEdit) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Nemáte oprávnění upravit tuto položku']);
    exit;
}

// 3. Kontrola stavu knihy (nesmí být uzavřená ani zamčená)
if ($book['stav_knihy'] === 'uzavrena') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Kniha je uzavřena uživatelem - nelze upravovat']);
    exit;
}

if ($book['stav_knihy'] === 'zamknuta') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Kniha je zamčena správcem - nelze upravovat']);
    exit;
}

// 4. Načíst položku a zkontrolovat, že patří k této knize
$stmt = $pdo->prepare("
    SELECT * FROM pokladni_knihy_polozky
    WHERE id = :entry_id AND book_id = :book_id AND deleted = FALSE
");
$stmt->execute(['entry_id' => $entry_id, 'book_id' => $book_id]);
$entry = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$entry) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Položka nenalezena']);
    exit;
}

// 5. Aktualizovat položku
$updateFields = [];
$params = ['entry_id' => $entry_id];

if (isset($input['datum_zapisu'])) {
    $updateFields[] = "datum_zapisu = :datum_zapisu";
    $params['datum_zapisu'] = $input['datum_zapisu'];
}

if (isset($input['cislo_dokladu'])) {
    $updateFields[] = "cislo_dokladu = :cislo_dokladu";
    $params['cislo_dokladu'] = $input['cislo_dokladu'];
}

if (isset($input['obsah_zapisu'])) {
    $updateFields[] = "obsah_zapisu = :obsah_zapisu";
    $params['obsah_zapisu'] = $input['obsah_zapisu'];
}

if (isset($input['komu_od_koho'])) {
    $updateFields[] = "komu_od_koho = :komu_od_koho";
    $params['komu_od_koho'] = $input['komu_od_koho'];
}

if (isset($input['castka_prijem'])) {
    $updateFields[] = "castka_prijem = :castka_prijem";
    $params['castka_prijem'] = $input['castka_prijem'];
}

if (isset($input['castka_vydaj'])) {
    $updateFields[] = "castka_vydaj = :castka_vydaj";
    $params['castka_vydaj'] = $input['castka_vydaj'];
}

if (isset($input['lp_kod'])) {
    $updateFields[] = "lp_kod = :lp_kod";
    $params['lp_kod'] = $input['lp_kod'];
}

if (isset($input['poznamka'])) {
    $updateFields[] = "poznamka = :poznamka";
    $params['poznamka'] = $input['poznamka'];
}

if (empty($updateFields)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Žádná pole k aktualizaci']);
    exit;
}

// Aktualizovat timestamp
$updateFields[] = "aktualizovano = NOW()";

$sql = "UPDATE pokladni_knihy_polozky SET " . implode(', ', $updateFields) . " WHERE id = :entry_id";

$stmt = $pdo->prepare($sql);
$success = $stmt->execute($params);

if (!$success) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Chyba při aktualizaci položky']);
    exit;
}

// 6. Přepočítat zůstatky v knize (volat stored procedure nebo manuálně)
// TODO: Implementovat přepočet zůstatků

// 7. Vrátit aktualizovanou položku
$stmt = $pdo->prepare("
    SELECT * FROM pokladni_knihy_polozky
    WHERE id = :entry_id
");
$stmt->execute(['entry_id' => $entry_id]);
$updatedEntry = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    'status' => 'ok',
    'message' => 'Položka byla úspěšně aktualizována',
    'data' => [
        'entry' => $updatedEntry
    ]
]);
?>
```

---

## 🪙 CRYPTO RATES PROXY - NOVÝ ENDPOINT

### 2. **CoinGecko API Proxy (CORS fix)**

**Účel:**
- Obejít CORS problém při volání CoinGecko API z frontendu
- Cache kurzů na 30 minut (snížení rate limiting)
- Centrální error handling

**Frontend bude volat:**
```javascript
// src/services/backgroundTasks.js:393
const API_BASE_URL = 'https://eeo2025.zachranka.cz';
const cryptoApiUrl = `${API_BASE_URL}/api.eeo/crypto-rates-proxy.php`;

const response = await fetch(cryptoApiUrl, {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}` // volitelné
  }
});

// Očekávaná response:
{
  "success": true,
  "rates": {
    "BTC": 1234567.89,
    "ETH": 89012.34,
    "ADA": 23.45,
    "XRP": 12.34,
    "LTC": 2345.67,
    "DOT": 234.56,
    "DOGE": 1.23,
    "SOL": 3456.78
  },
  "timestamp": "2025-11-11T12:34:56+01:00",
  "cached": false,
  "source": "CoinGecko API v3"
}
```

**Implementace:**
- Soubor již vytvořen: `/BACKEND-CRYPTO-RATES-PROXY-API.php`
- Obsahuje kompletní PHP kód s cache mechanismem
- Nutno nahrát na server jako `/api.eeo/crypto-rates-proxy.php`
- Vytvořit složku `/api.eeo/cache/` s právy 755

**Testování:**
```bash
# Test 1: Základní request
curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php"

# Test 2: S tokenem
curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test 3: Kontrola cache
curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php" -i | grep "X-Cache"
```

---

## ✅ KONTROLNÍ SEZNAM PRO BACKEND TÝM

### **Pokladna (CashBook)**

- [ ] **1. Ověřit existenci souboru** `/api.eeo/cashbook-entry-update.php`
  - Pokud neexistuje → vytvořit dle kódu výše
  - Pokud existuje → zkontrolovat funkcionalita

- [ ] **2. Testovat endpoint**
  ```bash
  curl -X POST "https://eeo.zachranka.cz/api.eeo/cashbook-entry-update" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "testuser",
      "token": "test_token",
      "entry_id": 1,
      "book_id": 1,
      "obsah_zapisu": "Test update",
      "castka_prijem": 1000
    }'
  ```
  - Očekávaný výsledek: HTTP 200 + JSON response
  - NE HTTP 404!

- [ ] **3. Kontrola oprávnění**
  - Vlastník knihy (uzivatel_id) → může editovat vlastní položky
  - Admin (CASHBOOK_EDIT_ALL) → může editovat vše
  - Správce (CASHBOOK_MANAGE) → může editovat vše
  - Ostatní → HTTP 403 Forbidden

- [ ] **4. Kontrola stavu knihy**
  - `stav_knihy = 'aktivni'` → lze editovat ✅
  - `stav_knihy = 'uzavrena'` → nelze editovat ❌ (HTTP 400)
  - `stav_knihy = 'zamknuta'` → nelze editovat ❌ (HTTP 400)

- [ ] **5. Přepočet zůstatků**
  - Po update položky přepočítat `zustatek_po_operaci` pro všechny následující položky
  - Aktualizovat `koncovy_stav` v tabulce `pokladni_knihy`

- [ ] **6. Ostatní cashbook endpointy**
  - [ ] `/api.eeo/cashbook-entry-create.php` - vytvoření položky
  - [ ] `/api.eeo/cashbook-entry-delete.php` - smazání položky (soft delete)
  - [ ] `/api.eeo/cashbook-entry-restore.php` - obnovení smazané položky
  - [ ] `/api.eeo/cashbook-book-detail.php` - detail knihy včetně položek
  - [ ] `/api.eeo/cashbook-book-create.php` - vytvoření nové knihy
  - [ ] `/api.eeo/cashbook-book-update.php` - update metadat knihy
  - [ ] `/api.eeo/cashbook-change-lock-status.php` - změna stavu (uzavřít/zamknout)

---

### **Crypto Rates Proxy**

- [ ] **1. Nahrát soubor na server**
  - Zkopírovat obsah z `/BACKEND-CRYPTO-RATES-PROXY-API.php`
  - Vytvořit `/api.eeo/crypto-rates-proxy.php`

- [ ] **2. Vytvořit cache složku**
  ```bash
  mkdir -p /api.eeo/cache
  chmod 755 /api.eeo/cache
  ```

- [ ] **3. Testovat endpoint**
  ```bash
  curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php"
  ```
  - Očekávaný výsledek: JSON s kurzy kryptoměn
  - Kontrola cache: `X-Cache: HIT` nebo `X-Cache: MISS`

- [ ] **4. Monitoring**
  ```bash
  # Sledovat cache soubor
  ls -lah /api.eeo/cache/crypto_rates_cache.json
  
  # Zobrazit obsah
  cat /api.eeo/cache/crypto_rates_cache.json
  
  # Smazat cache (vynutit fresh fetch)
  rm /api.eeo/cache/crypto_rates_cache.json
  ```

---

## 📊 PRIORITA ÚKOLŮ

### **P0 - KRITICKÉ (BLOKUJE PRODUKCI)**
1. ❌ Fix `/api.eeo/cashbook-entry-update.php` (404)
2. ❌ Ověřit všechny cashbook endpointy (create, delete, restore)

### **P1 - VYSOKÁ (POTŘEBNÉ PRO STABILITU)**
3. ⚠️ Implementovat `/api.eeo/crypto-rates-proxy.php` (CORS fix)
4. ⚠️ Přepočet zůstatků po update položky

### **P2 - STŘEDNÍ (NICE TO HAVE)**
5. 📝 Logování změn v pokladně (audit trail)
6. 📝 Notifikace při změně stavu knihy

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### **Test 1: Update položky**
```javascript
// Frontend požadavek
{
  "username": "admin",
  "token": "xxx",
  "entry_id": 1,
  "book_id": 1,
  "datum_zapisu": "2025-11-11",
  "cislo_dokladu": "P001",
  "obsah_zapisu": "Testovací příjem",
  "komu_od_koho": "Testovací subjekt",
  "castka_prijem": 5000,
  "castka_vydaj": 0,
  "lp_kod": "LP001",
  "poznamka": "Test poznámka"
}

// Očekávaná response
{
  "status": "ok",
  "message": "Položka byla úspěšně aktualizována",
  "data": {
    "entry": {
      "id": 1,
      "book_id": 1,
      "datum_zapisu": "2025-11-11",
      "cislo_dokladu": "P001",
      "obsah_zapisu": "Testovací příjem",
      "komu_od_koho": "Testovací subjekt",
      "castka_prijem": 5000,
      "castka_vydaj": 0,
      "zustatek_po_operaci": 5000,
      "lp_kod": "LP001",
      "poznamka": "Test poznámka",
      "vytvoreno": "2025-11-10 10:00:00",
      "aktualizovano": "2025-11-11 14:23:45",
      "deleted": false
    }
  }
}
```

### **Test 2: Update uzavřené knihy (ERROR)**
```javascript
// Request stejný jako Test 1, ale kniha má stav_knihy = 'uzavrena'

// Očekávaná response: HTTP 400
{
  "status": "error",
  "message": "Kniha je uzavřena uživatelem - nelze upravovat"
}
```

### **Test 3: Update bez oprávnění (ERROR)**
```javascript
// Request od uživatele, který není vlastník ani admin

// Očekávaná response: HTTP 403
{
  "status": "error",
  "message": "Nemáte oprávnění upravit tuto položku"
}
```

### **Test 4: Crypto rates proxy**
```bash
curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php"

# Očekávaná response: HTTP 200
{
  "success": true,
  "rates": {
    "BTC": 1234567.89,
    "ETH": 89012.34,
    "ADA": 23.45,
    "XRP": 12.34,
    "LTC": 2345.67,
    "DOT": 234.56,
    "DOGE": 1.23,
    "SOL": 3456.78
  },
  "timestamp": "2025-11-11T14:30:00+01:00",
  "cached": false,
  "source": "CoinGecko API v3"
}
```

---

## 📝 POZNÁMKY

- Frontend je **HOTOVÝ a READY** k nasazení
- Všechny změny jsou v buildu (main.41d8ee5d.js)
- Po opravě backendu není nutný rebuild frontendu
- Backend endpointy musí být funkční **PŘED** nasazením nového buildu

---

## 🚀 DEPLOYMENT CHECKLIST

**PŘED NASAZENÍM:**
- [ ] Backend: Fix `/api.eeo/cashbook-entry-update.php`
- [ ] Backend: Ověřit všechny cashbook endpointy
- [ ] Backend: Nahrát `/api.eeo/crypto-rates-proxy.php`
- [ ] Backend: Vytvořit `/api.eeo/cache/` složku
- [ ] Backend: Otestovat všechny endpointy

**NASAZENÍ:**
- [ ] Nahrát build složku na produkci
- [ ] Vyčistit browser cache (Ctrl+F5)
- [ ] Otestovat login
- [ ] Otestovat pokladnu (create, edit, delete)
- [ ] Otestovat kurzovní lístek (čekat 30 minut nebo spustit manuálně)

**PO NASAZENÍ:**
- [ ] Monitoring error logů (PHP + JavaScript console)
- [ ] Sledovat 404 errors v access logu
- [ ] Sledovat CoinGecko API rate limiting
- [ ] Ověřit cache funguje (X-Cache header)

---

**Vytvořeno:** 11. listopadu 2025  
**Frontend developer:** ✅ HOTOVO  
**Backend developer:** ⏳ ČEKÁ NA IMPLEMENTACI  
**Status:** 🚨 BLOKOVÁNO - 404 ERRORS
