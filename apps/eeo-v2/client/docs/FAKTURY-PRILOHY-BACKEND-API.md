# 🔧 BACKEND API: Přílohy k fakturám - Specifikace

**Datum:** 2025-10-27  
**API verze:** 1.0  
**MySQL:** 5.5.43  
**Feature:** Upload, list, download a delete příloh k fakturám s podporou ISDOC  

---

## 📋 PŘEHLED

Tento dokument specifikuje Backend API pro správu příloh k fakturám objednávek.

**Hlavní funkce:**
- ✅ Upload souborů (PDF, ISDOC, obrázky)
- ✅ Automatická detekce ISDOC formátu
- ✅ Seznam příloh faktury/objednávky
- ✅ Download souborů
- ✅ Smazání příloh
- ✅ Validace a bezpečnost

---

## 🗄️ DATABÁZE

### Tabulka: `25a_faktury_prilohy`

Viz soubor: `create_faktury_prilohy_table.sql`

**Poznámka k chybě errno 150:**
```sql
-- PROBLÉM: Foreign key constraint selhává
-- ŘEŠENÍ: Zkontrolovat datové typy v referenčních tabulkách

-- Pro faktura_id:
SHOW CREATE TABLE `25a_faktury_objednavek`;
-- Ověřit: typ sloupce `id` musí být INT(10) nebo INT(10) UNSIGNED

-- Pro objednavka_id:
SHOW CREATE TABLE `25a_objednavky`;
-- Ověřit: typ sloupce `id` musí být INT(10) nebo INT(10) UNSIGNED

-- Pro nahrano_uzivatel_id:
SHOW CREATE TABLE `25_uzivatele`;
-- Ověřit: typ sloupce `id` musí být INT(10) nebo INT(10) UNSIGNED
```

**FIX pro errno 150:**
```sql
-- Pokud jsou referenční sloupce INT(10) bez UNSIGNED:
ALTER TABLE `25a_faktury_prilohy` 
  MODIFY `id` INT(10) NOT NULL AUTO_INCREMENT; -- Odstranit UNSIGNED
```

---

## 🌐 API ENDPOINTY

### Base URL:
```
https://api.example.com/api25/faktury/prilohy/
```

---

## 1️⃣ UPLOAD PŘÍLOHY

### **POST** `/upload`

Nahraje nový soubor k faktuře.

#### Request:

**Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer {token}
X-Username: {username}
```

**Body (multipart/form-data):**
```javascript
{
  objednavka_id: 1234,           // INT - Required
  faktura_id: 5678,              // INT - Required
  file: [Binary File],           // File - Required
  typ_prilohy: "FAKTURA"         // String - Optional (auto pro ISDOC)
}
```

**Příklad (cURL):**
```bash
curl -X POST "https://api.example.com/api25/faktury/prilohy/upload" \
  -H "Authorization: Bearer abc123token" \
  -H "X-Username: jan.novak" \
  -F "objednavka_id=1234" \
  -F "faktura_id=5678" \
  -F "file=@/path/to/FA-2025-001.pdf" \
  -F "typ_prilohy=FAKTURA"
```

#### Backend processing:

```php
// 1. Validace
$allowed_types = ['pdf', 'isdoc', 'jpg', 'jpeg', 'png'];
$max_size = 10 * 1024 * 1024; // 10 MB

// 2. Detekce ISDOC
$extension = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
$je_isdoc = (strtolower($extension) === 'isdoc') ? 1 : 0;

// Pokud ISDOC a není typ_prilohy, nastav automaticky
if ($je_isdoc && empty($_POST['typ_prilohy'])) {
    $_POST['typ_prilohy'] = 'FAKTURA';
}

// 3. Generuj GUID
$guid = sprintf('%s-%s-%s-%s-%s',
    bin2hex(random_bytes(4)),
    bin2hex(random_bytes(2)),
    bin2hex(random_bytes(2)),
    bin2hex(random_bytes(2)),
    bin2hex(random_bytes(6))
);

// 4. Systemový název souboru
$systemovy_nazev = $guid . '_' . basename($_FILES['file']['name']);

// 5. Cesta k uložení
$base_path = '/uploads/orders25/faktury/';
$order_dir = $base_path . $_POST['objednavka_id'] . '/';
$faktura_dir = $order_dir . $_POST['faktura_id'] . '/';

// 6. Vytvoř adresáře (rekurzivně)
if (!is_dir($faktura_dir)) {
    mkdir($faktura_dir, 0755, true);
}

// 7. Přesuň soubor
$full_path = $faktura_dir . $systemovy_nazev;
move_uploaded_file($_FILES['file']['tmp_name'], $full_path);

// 8. Relativní cesta do DB
$systemova_cesta = 'faktury/' . $_POST['objednavka_id'] . '/' . 
                   $_POST['faktura_id'] . '/' . $systemovy_nazev;

// 9. Vložit do DB
$sql = "INSERT INTO 25a_faktury_prilohy (
    faktura_id, 
    objednavka_id, 
    guid, 
    typ_prilohy,
    originalni_nazev_souboru, 
    systemova_cesta, 
    velikost_souboru_b,
    je_isdoc,
    nahrano_uzivatel_id,
    dt_vytvoreni
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    $_POST['faktura_id'],
    $_POST['objednavka_id'],
    $guid,
    $_POST['typ_prilohy'],
    basename($_FILES['file']['name']),
    $systemova_cesta,
    $_FILES['file']['size'],
    $je_isdoc,
    $user_id
]);

$priloha_id = $pdo->lastInsertId();
```

#### Response Success (200):

```json
{
  "status": "ok",
  "message": "Příloha úspěšně nahrána",
  "data": {
    "id": 789,
    "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "originalni_nazev": "FA-2025-001.pdf",
    "systemovy_nazev": "a1b2c3d4_FA-2025-001.pdf",
    "systemova_cesta": "faktury/1234/5678/a1b2c3d4_FA-2025-001.pdf",
    "velikost": 1234567,
    "typ_prilohy": "FAKTURA",
    "je_isdoc": false,
    "dt_vytvoreni": "2025-10-27 14:35:22"
  }
}
```

#### Response Error (400/500):

```json
{
  "status": "error",
  "message": "Soubor je příliš velký",
  "error_code": "FILE_TOO_LARGE",
  "details": {
    "max_size": 10485760,
    "uploaded_size": 15728640
  }
}
```

#### Error codes:

| Code | Popis |
|------|-------|
| `FILE_TOO_LARGE` | Soubor přesahuje max velikost |
| `INVALID_FILE_TYPE` | Nepodporovaný formát |
| `FAKTURA_NOT_FOUND` | Faktura neexistuje |
| `PERMISSION_DENIED` | Uživatel nemá oprávnění |
| `UPLOAD_FAILED` | Chyba při uploadu |
| `DB_ERROR` | Chyba databáze |

---

## 2️⃣ SEZNAM PŘÍLOH FAKTURY

### **GET** `/list/{faktura_id}`

Vrátí seznam všech příloh konkrétní faktury.

#### Request:

**Headers:**
```http
Authorization: Bearer {token}
X-Username: {username}
```

**URL Parameters:**
```
faktura_id: INT - Required
```

**Query Parameters:**
```
?include_metadata=true  // Zahrnout info o uživateli
```

**Příklad:**
```bash
curl -X GET "https://api.example.com/api25/faktury/prilohy/list/5678?include_metadata=true" \
  -H "Authorization: Bearer abc123token" \
  -H "X-Username: jan.novak"
```

#### Response Success (200):

```json
{
  "status": "ok",
  "data": {
    "faktura_id": 5678,
    "objednavka_id": 1234,
    "pocet_priloh": 2,
    "celkova_velikost": 1479567,
    "prilohy": [
      {
        "id": 789,
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "originalni_nazev": "FA-2025-001.pdf",
        "systemova_cesta": "faktury/1234/5678/a1b2c3d4_FA-2025-001.pdf",
        "velikost": 1234567,
        "typ_prilohy": "FAKTURA",
        "je_isdoc": false,
        "isdoc_parsed": false,
        "dt_vytvoreni": "2025-10-27 14:35:22",
        "nahrano_uzivatel": {
          "id": 42,
          "jmeno": "Jan",
          "prijmeni": "Novák"
        }
      },
      {
        "id": 790,
        "guid": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
        "originalni_nazev": "FA-2025-001.isdoc",
        "systemova_cesta": "faktury/1234/5678/b2c3d4e5_FA-2025-001.isdoc",
        "velikost": 245000,
        "typ_prilohy": "FAKTURA",
        "je_isdoc": true,
        "isdoc_parsed": false,
        "dt_vytvoreni": "2025-10-27 14:40:15",
        "nahrano_uzivatel": {
          "id": 42,
          "jmeno": "Jan",
          "prijmeni": "Novák"
        }
      }
    ]
  }
}
```

---

## 3️⃣ SEZNAM PŘÍLOH OBJEDNÁVKY (všechny faktury)

### **GET** `/list-by-order/{objednavka_id}`

Vrátí všechny přílohy všech faktur objednávky.

#### Request:

**URL Parameters:**
```
objednavka_id: INT - Required
```

**Query Parameters:**
```
?group_by_faktura=true  // Seskupit podle faktury
```

#### Response Success (200):

```json
{
  "status": "ok",
  "data": {
    "objednavka_id": 1234,
    "pocet_faktur": 2,
    "celkem_priloh": 4,
    "celkova_velikost": 3459567,
    "faktury": [
      {
        "faktura_id": 5678,
        "fa_cislo_vema": "FA-2025-001",
        "pocet_priloh": 2,
        "prilohy": [
          { /* ... přílohy faktury 5678 ... */ }
        ]
      },
      {
        "faktura_id": 5679,
        "fa_cislo_vema": "FA-2025-002",
        "pocet_priloh": 2,
        "prilohy": [
          { /* ... přílohy faktury 5679 ... */ }
        ]
      }
    ]
  }
}
```

---

## 4️⃣ DOWNLOAD PŘÍLOHY

### **GET** `/download/{priloha_id}`

Stáhne soubor přílohy.

**NEBO**

### **GET** `/download-by-guid/{guid}`

Stáhne soubor podle GUID.

#### Request:

**Headers:**
```http
Authorization: Bearer {token}
X-Username: {username}
```

**Příklad:**
```bash
curl -X GET "https://api.example.com/api25/faktury/prilohy/download/789" \
  -H "Authorization: Bearer abc123token" \
  -H "X-Username: jan.novak" \
  --output FA-2025-001.pdf
```

#### Backend processing:

```php
// 1. Načti záznam z DB
$sql = "SELECT * FROM 25a_faktury_prilohy WHERE id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$priloha_id]);
$priloha = $stmt->fetch();

// 2. Ověř existenci souboru
$full_path = '/uploads/orders25/' . $priloha['systemova_cesta'];
if (!file_exists($full_path)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Soubor nenalezen']);
    exit;
}

// 3. Nastav headers
header('Content-Type: ' . mime_content_type($full_path));
header('Content-Disposition: attachment; filename="' . $priloha['originalni_nazev_souboru'] . '"');
header('Content-Length: ' . filesize($full_path));
header('Cache-Control: must-revalidate');
header('Pragma: public');

// 4. Odešli soubor
readfile($full_path);
exit;
```

#### Response:

**Success (200):**
- Binary file stream

**Error (404):**
```json
{
  "status": "error",
  "message": "Příloha nenalezena"
}
```

---

## 5️⃣ SMAZÁNÍ PŘÍLOHY

### **DELETE** `/delete/{priloha_id}`

Smaže přílohu (DB + disk).

#### Request:

**Headers:**
```http
Authorization: Bearer {token}
X-Username: {username}
```

**Příklad:**
```bash
curl -X DELETE "https://api.example.com/api25/faktury/prilohy/delete/789" \
  -H "Authorization: Bearer abc123token" \
  -H "X-Username: jan.novak"
```

#### Backend processing:

```php
// 1. Načti záznam
$sql = "SELECT * FROM 25a_faktury_prilohy WHERE id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$priloha_id]);
$priloha = $stmt->fetch();

// 2. Smaž fyzický soubor
$full_path = '/uploads/orders25/' . $priloha['systemova_cesta'];
if (file_exists($full_path)) {
    unlink($full_path);
}

// 3. Smaž záznam z DB
$sql = "DELETE FROM 25a_faktury_prilohy WHERE id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$priloha_id]);

// 4. Zkontroluj jestli složka faktury je prázdná
$faktura_dir = dirname($full_path);
$files = scandir($faktura_dir);
if (count($files) == 2) { // pouze . a ..
    rmdir($faktura_dir);
}

// 5. Zkontroluj jestli složka objednávky je prázdná
$order_dir = dirname($faktura_dir);
$files = scandir($order_dir);
if (count($files) == 2) {
    rmdir($order_dir);
}
```

#### Response Success (200):

```json
{
  "status": "ok",
  "message": "Příloha úspěšně smazána",
  "data": {
    "id": 789,
    "file_deleted": true,
    "db_deleted": true
  }
}
```

---

## 6️⃣ VERIFY EXISTENCE

### **POST** `/verify/{objednavka_id}`

Zkontroluje existenci všech souborů na disku.

#### Request:

**Headers:**
```http
Authorization: Bearer {token}
X-Username: {username}
```

#### Response Success (200):

```json
{
  "status": "ok",
  "data": {
    "objednavka_id": 1234,
    "celkem_priloh": 4,
    "existujici": 3,
    "chybejici": 1,
    "missing_files": [
      {
        "id": 791,
        "originalni_nazev": "FA-2025-003.pdf",
        "systemova_cesta": "faktury/1234/5680/c3d4e5f6_FA-2025-003.pdf",
        "faktura_id": 5680
      }
    ]
  }
}
```

---

## 7️⃣ AKTUALIZACE KLASIFIKACE

### **PATCH** `/update-classification/{priloha_id}`

Změní klasifikaci přílohy.

#### Request:

**Body (JSON):**
```json
{
  "typ_prilohy": "DOPLNEK_FA"
}
```

#### Response Success (200):

```json
{
  "status": "ok",
  "message": "Klasifikace aktualizována",
  "data": {
    "id": 789,
    "typ_prilohy": "DOPLNEK_FA",
    "dt_aktualizace": "2025-10-27 15:00:00"
  }
}
```

---

## 🔒 BEZPEČNOST

### 1. Autentizace:
```php
// Ověření tokenu
$token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$username = $_SERVER['HTTP_X_USERNAME'] ?? '';

if (empty($token) || empty($username)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// Validace tokenu proti DB
$user = validateToken($token, $username);
if (!$user) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Invalid token']);
    exit;
}
```

### 2. Autorizace:
```php
// Ověř že uživatel má přístup k objednávce
$sql = "SELECT COUNT(*) FROM 25a_objednavky 
        WHERE id = ? 
        AND (zadavatel_id = ? OR schvalil_uzivatel_id = ? OR ...)";
$stmt = $pdo->prepare($sql);
$stmt->execute([$objednavka_id, $user_id, $user_id]);

if ($stmt->fetchColumn() == 0) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Permission denied']);
    exit;
}
```

### 3. Validace file type:
```php
$allowed_mime_types = [
    'application/pdf',
    'application/isdoc+xml',
    'text/xml', // ISDOC může být i jako XML
    'image/jpeg',
    'image/png'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $_FILES['file']['tmp_name']);
finfo_close($finfo);

if (!in_array($mime_type, $allowed_mime_types)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Nepodporovaný formát souboru',
        'error_code' => 'INVALID_FILE_TYPE'
    ]);
    exit;
}
```

### 4. Validace velikosti:
```php
$max_sizes = [
    'application/pdf' => 10 * 1024 * 1024, // 10 MB
    'application/isdoc+xml' => 5 * 1024 * 1024, // 5 MB
    'image/jpeg' => 5 * 1024 * 1024,
    'image/png' => 5 * 1024 * 1024
];

$max_size = $max_sizes[$mime_type] ?? 5 * 1024 * 1024;

if ($_FILES['file']['size'] > $max_size) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Soubor je příliš velký',
        'error_code' => 'FILE_TOO_LARGE',
        'details' => [
            'max_size' => $max_size,
            'uploaded_size' => $_FILES['file']['size']
        ]
    ]);
    exit;
}
```

### 5. Ochrana proti path traversal:
```php
// Zakázané znaky v názvech souborů
$filename = basename($_FILES['file']['name']);
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);

// Ověř že cesta neobsahuje ../
if (strpos($filename, '..') !== false) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid filename']);
    exit;
}
```

### 6. Rate limiting:
```php
// Max 10 uploadů za minutu na uživatele
$redis = new Redis();
$redis->connect('localhost', 6379);

$key = "upload_limit:{$user_id}";
$count = $redis->incr($key);

if ($count == 1) {
    $redis->expire($key, 60); // 1 minuta
}

if ($count > 10) {
    http_response_code(429);
    echo json_encode([
        'status' => 'error',
        'message' => 'Rate limit exceeded',
        'error_code' => 'TOO_MANY_REQUESTS'
    ]);
    exit;
}
```

---

## 🧪 TESTOVÁNÍ

### Test 1: Upload PDF
```bash
curl -X POST "http://localhost/api25/faktury/prilohy/upload" \
  -H "Authorization: Bearer test_token" \
  -H "X-Username: test.user" \
  -F "objednavka_id=1" \
  -F "faktura_id=1" \
  -F "file=@test.pdf" \
  -F "typ_prilohy=FAKTURA"
```

**Očekávaný výsledek:**
- Status 200
- Soubor uložen v `/uploads/orders25/faktury/1/1/`
- Záznam v DB
- Response obsahuje ID, GUID

### Test 2: Upload ISDOC
```bash
curl -X POST "http://localhost/api25/faktury/prilohy/upload" \
  -H "Authorization: Bearer test_token" \
  -H "X-Username: test.user" \
  -F "objednavka_id=1" \
  -F "faktura_id=1" \
  -F "file=@test.isdoc"
```

**Očekávaný výsledek:**
- Status 200
- `je_isdoc = 1` v DB
- `typ_prilohy = "FAKTURA"` (automaticky)

### Test 3: Invalid file type
```bash
curl -X POST "http://localhost/api25/faktury/prilohy/upload" \
  -F "file=@test.exe"
```

**Očekávaný výsledek:**
- Status 400
- Error code: `INVALID_FILE_TYPE`

### Test 4: File too large
```bash
# Vytvořit 15 MB soubor
dd if=/dev/zero of=large.pdf bs=1M count=15

curl -X POST "http://localhost/api25/faktury/prilohy/upload" \
  -F "file=@large.pdf"
```

**Očekávaný výsledek:**
- Status 400
- Error code: `FILE_TOO_LARGE`

---

## 📊 LOGGING

### Struktura logu:
```json
{
  "timestamp": "2025-10-27T14:35:22Z",
  "level": "INFO",
  "action": "UPLOAD_ATTACHMENT",
  "user_id": 42,
  "username": "jan.novak",
  "objednavka_id": 1234,
  "faktura_id": 5678,
  "priloha_id": 789,
  "file_name": "FA-2025-001.pdf",
  "file_size": 1234567,
  "je_isdoc": false,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "duration_ms": 456
}
```

### Log events:
- `UPLOAD_ATTACHMENT` - Upload souboru
- `DOWNLOAD_ATTACHMENT` - Download souboru
- `DELETE_ATTACHMENT` - Smazání souboru
- `UPDATE_CLASSIFICATION` - Změna klasifikace
- `VERIFY_ATTACHMENTS` - Kontrola existence
- `UPLOAD_ERROR` - Chyba uploadu
- `PERMISSION_DENIED` - Odmítnutý přístup

---

## 🔧 KONFIGURACE

### PHP ini settings:
```ini
upload_max_filesize = 10M
post_max_size = 12M
max_file_uploads = 5
memory_limit = 128M
```

### Apache/Nginx:
```nginx
client_max_body_size 10M;
client_body_timeout 60s;
```

---

## 📦 STRUKTURA SOUBORŮ NA DISKU

```
/var/www/uploads/orders25/faktury/
├── 1234/                          # objednavka_id
│   ├── 5678/                      # faktura_id
│   │   ├── a1b2c3d4_FA-2025-001.pdf
│   │   └── b2c3d4e5_FA-2025-001.isdoc
│   └── 5679/
│       └── c3d4e5f6_FA-2025-002.pdf
└── 1235/
    └── 5680/
        └── d4e5f6g7_FA-2025-003.pdf
```

**Permissions:**
```bash
chmod 755 /var/www/uploads/orders25/faktury/
chown www-data:www-data /var/www/uploads/orders25/faktury/
```

---

## 🚨 ERROR HANDLING

### Error response format:
```json
{
  "status": "error",
  "message": "Popis chyby",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "value"
  },
  "timestamp": "2025-10-27T14:35:22Z"
}
```

### HTTP Status codes:

| Code | Význam | Kdy použít |
|------|--------|-----------|
| 200 | OK | Úspěch |
| 400 | Bad Request | Chybný vstup |
| 401 | Unauthorized | Chybí/špatný token |
| 403 | Forbidden | Nemá oprávnění |
| 404 | Not Found | Příloha neexistuje |
| 413 | Payload Too Large | Soubor příliš velký |
| 415 | Unsupported Media Type | Nepodporovaný formát |
| 429 | Too Many Requests | Rate limit |
| 500 | Internal Server Error | Chyba serveru |

---

## ✅ CHECKLIST PRO BACKEND DEV

- [ ] Opravit errno 150 (FK constraints)
- [ ] Implementovat `/upload` endpoint
- [ ] Implementovat `/list/{faktura_id}` endpoint
- [ ] Implementovat `/download/{priloha_id}` endpoint
- [ ] Implementovat `/delete/{priloha_id}` endpoint
- [ ] Implementovat `/verify/{objednavka_id}` endpoint
- [ ] ISDOC auto-detekce
- [ ] Validace file type
- [ ] Validace velikosti
- [ ] Security (auth, authz)
- [ ] Rate limiting
- [ ] Logging
- [ ] Error handling
- [ ] Unit testy
- [ ] Integration testy
- [ ] Dokumentace API (Swagger/OpenAPI)

---

**Připravil:** GitHub Copilot  
**Datum:** 27. října 2025  
**Status:** ✅ Připraveno k implementaci
