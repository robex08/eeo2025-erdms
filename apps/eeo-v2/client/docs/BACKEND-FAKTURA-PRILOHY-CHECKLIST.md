# ⚡ BACKEND - RYCHLÝ IMPLEMENTAČNÍ CHECKLIST

**Úkol:** Opravit rozbité API pro přílohy faktur  
**Čas:** 2-4 hodiny  
**Databáze:** `25a_faktury_prilohy` (již vytvořena)

---

## 📋 CO IMPLEMENTOVAT (6 endpointů)

### ✅ 1. SEZNAM PŘÍLOH (PRIORITA 1)

```
POST /order-v2/invoices/{invoice_id}/attachments
```

**Body:**
```json
{
  "username": "admin",
  "token": "abc123",
  "order_id": 789
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attachments": [
      {
        "id": 123,
        "faktura_id": 456,
        "type": "FAKTURA",
        "original_name": "faktura.pdf",
        "file_size": 245760,
        "je_isdoc": 0,
        "upload_date": "2025-11-12 14:30:00",
        "file_exists": true
      }
    ]
  }
}
```

**SQL:**
```sql
-- ✅ BEZ LEFT JOIN - tabulka slovníku neexistuje!
SELECT 
  fp.id,
  fp.faktura_id,
  fp.objednavka_id,
  fp.typ_prilohy as type,
  fp.originalni_nazev_souboru as original_name,
  fp.velikost_souboru_b as file_size,
  fp.je_isdoc,
  fp.dt_vytvoreni as upload_date
FROM `25a_faktury_prilohy` fp
WHERE fp.faktura_id = :faktura_id
  AND fp.objednavka_id = :objednavka_id
ORDER BY fp.dt_vytvoreni DESC;
```

---

### ✅ 2. UPLOAD PŘÍLOHY (PRIORITA 1)

```
POST /order-v2/invoices/{invoice_id}/attachments/upload
Content-Type: multipart/form-data
```

**FormData:**
```
file: File
username: string
token: string
order_id: number
typ_prilohy: string (FAKTURA, ISDOC, ...)
```

**Response:**
```json
{
  "success": true,
  "message": "Příloha byla nahrána",
  "priloha": {
    "id": 123,
    "faktura_id": 456,
    "guid": "550e8400-e29b-41d4-a716-446655440000",
    "typ_prilohy": "FAKTURA",
    "originalni_nazev_souboru": "faktura.pdf",
    "systemova_cesta": "faktury/2025/11/faktura.pdf"
  }
}
```

**PHP Implementace:**
```php
// 1. Validace
if (!isset($_FILES['file'])) {
  throw new Exception('Chybí soubor');
}

// 2. Generuj GUID a cestu
$guid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
  mt_rand(0, 0xffff), mt_rand(0, 0xffff),
  mt_rand(0, 0xffff),
  mt_rand(0, 0x0fff) | 0x4000,
  mt_rand(0, 0x3fff) | 0x8000,
  mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
);

$year = date('Y');
$month = date('m');
$extension = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
$filename = $guid . '.' . $extension;

// 3. Vytvoř složky
$uploadDir = $_SERVER['DOCUMENT_ROOT'] . "/uploads/faktury/{$year}/{$month}";
if (!is_dir($uploadDir)) {
  mkdir($uploadDir, 0755, true);
}

// 4. Ulož soubor
$filePath = $uploadDir . '/' . $filename;
move_uploaded_file($_FILES['file']['tmp_name'], $filePath);

// 5. Ulož do DB
$relativePath = "faktury/{$year}/{$month}/{$filename}";
DB::query("
  INSERT INTO 25a_faktury_prilohy (
    faktura_id, objednavka_id, guid, typ_prilohy,
    originalni_nazev_souboru, systemova_cesta,
    velikost_souboru_b, je_isdoc, nahrano_uzivatel_id, dt_vytvoreni
  ) VALUES (
    :faktura_id, :objednavka_id, :guid, :typ_prilohy,
    :original_name, :path, :size, :is_isdoc, :user_id, NOW()
  )
", [
  ':faktura_id' => $invoiceId,
  ':objednavka_id' => $_POST['order_id'],
  ':guid' => $guid,
  ':typ_prilohy' => $_POST['typ_prilohy'],
  ':original_name' => $_FILES['file']['name'],
  ':path' => $relativePath,
  ':size' => $_FILES['file']['size'],
  ':is_isdoc' => (strpos($_FILES['file']['name'], '.isdoc') !== false ? 1 : 0),
  ':user_id' => $userId
]);
```

---

### ✅ 3. SMAZÁNÍ PŘÍLOHY (PRIORITA 2)

```
DELETE /order-v2/invoices/{invoice_id}/attachments/{attachment_id}
```

**Body:**
```json
{
  "username": "admin",
  "token": "abc123"
}
```

**PHP Implementace:**
```php
// 1. Načti přílohu
$attachment = DB::queryOne("
  SELECT systemova_cesta FROM 25a_faktury_prilohy 
  WHERE id = :id AND faktura_id = :faktura_id
", [':id' => $attachmentId, ':faktura_id' => $invoiceId]);

// 2. Smaž soubor
$filePath = $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $attachment['systemova_cesta'];
if (file_exists($filePath)) {
  unlink($filePath);
}

// 3. Smaž z DB
DB::query("
  DELETE FROM 25a_faktury_prilohy 
  WHERE id = :id AND faktura_id = :faktura_id
", [':id' => $attachmentId, ':faktura_id' => $invoiceId]);
```

---

### ✅ 4. DOWNLOAD PŘÍLOHY (PRIORITA 2)

```
POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download
```

**Body:**
```json
{
  "username": "admin",
  "token": "abc123"
}
```

**PHP Implementace:**
```php
// 1. Načti přílohu
$attachment = DB::queryOne("
  SELECT originalni_nazev_souboru, systemova_cesta 
  FROM 25a_faktury_prilohy 
  WHERE id = :id AND faktura_id = :faktura_id
", [':id' => $attachmentId, ':faktura_id' => $invoiceId]);

// 2. Cesta k souboru
$filePath = $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $attachment['systemova_cesta'];

// 3. Kontrola existence
if (!file_exists($filePath)) {
  http_response_code(404);
  echo json_encode(['error' => 'Soubor nenalezen']);
  exit;
}

// 4. Odeslat soubor
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $attachment['originalni_nazev_souboru'] . '"');
header('Content-Length: ' . filesize($filePath));
readfile($filePath);
exit;
```

---

### ✅ 5. AKTUALIZACE METADAT (PRIORITA 3)

```
PUT /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
```

**Body:**
```json
{
  "username": "admin",
  "token": "abc123",
  "type": "FAKTURA_OPRAVENA",
  "original_name": "nova_faktura.pdf"
}
```

**SQL:**
```sql
UPDATE `25a_faktury_prilohy` 
SET 
  typ_prilohy = :typ_prilohy,
  originalni_nazev_souboru = :original_name,
  dt_aktualizace = NOW()
WHERE id = :attachment_id AND faktura_id = :faktura_id;
```

---

### ✅ 6. VERIFY SOUBORŮ (PRIORITA 3)

```
POST /order-v2/invoices/{invoice_id}/attachments/verify
```

**Body:**
```json
{
  "username": "admin",
  "token": "abc123",
  "objednavka_id": 789
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_attachments": 5,
    "existing_files": 4,
    "missing_files": 1
  },
  "attachments": [
    {
      "attachment_id": 123,
      "file_exists": true,
      "status": "OK"
    },
    {
      "attachment_id": 124,
      "file_exists": false,
      "status": "MISSING_FILE"
    }
  ]
}
```

**PHP Implementace:**
```php
// 1. Načti přílohy
$attachments = DB::query("
  SELECT id, guid, systemova_cesta 
  FROM 25a_faktury_prilohy 
  WHERE faktura_id = :faktura_id
", [':faktura_id' => $invoiceId]);

// 2. Kontrola existence
$result = [];
$missing = 0;
foreach ($attachments as $att) {
  $filePath = $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $att['systemova_cesta'];
  $exists = file_exists($filePath);
  if (!$exists) $missing++;
  
  $result[] = [
    'attachment_id' => $att['id'],
    'guid' => $att['guid'],
    'file_exists' => $exists,
    'status' => $exists ? 'OK' : 'MISSING_FILE'
  ];
}

return [
  'success' => true,
  'summary' => [
    'total_attachments' => count($attachments),
    'existing_files' => count($attachments) - $missing,
    'missing_files' => $missing
  ],
  'attachments' => $result
];
```

---

## 🔒 BEZPEČNOST (DŮLEŽITÉ!)

```php
// 1. Validace uživatele
function validateUser($username, $token) {
  $user = DB::queryOne("
    SELECT id FROM 25_uzivatele 
    WHERE username = :username AND token = :token
  ", [':username' => $username, ':token' => $token]);
  
  if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Neautorizovaný přístup']);
    exit;
  }
  
  return $user['id'];
}

// 2. Validace typu souboru
$allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'isdoc'];
$extension = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
if (!in_array($extension, $allowedExtensions)) {
  throw new Exception('Nepodporovaný typ souboru');
}

// 3. Validace velikosti
$maxSize = 10 * 1024 * 1024; // 10 MB
if ($_FILES['file']['size'] > $maxSize) {
  throw new Exception('Soubor je příliš velký (max 10 MB)');
}

// 4. Ochrana proti path traversal
$filename = basename($_FILES['file']['name']);
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
```

---

## 🎯 TESTOVÁNÍ

Po implementaci otestuj každý endpoint pomocí cURL:

### Test 1: Seznam příloh
```bash
curl -X POST https://vase-domena.cz/api/order-v2/invoices/456/attachments \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","token":"abc123","order_id":789}'
```

### Test 2: Upload
```bash
curl -X POST https://vase-domena.cz/api/order-v2/invoices/456/attachments/upload \
  -F "file=@faktura.pdf" \
  -F "username=admin" \
  -F "token=abc123" \
  -F "order_id=789" \
  -F "typ_prilohy=FAKTURA"
```

### Test 3: Download
```bash
curl -X POST https://vase-domena.cz/api/order-v2/invoices/456/attachments/123/download \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","token":"abc123"}' \
  --output faktura.pdf
```

### Test 4: Smazání
```bash
curl -X DELETE https://vase-domena.cz/api/order-v2/invoices/456/attachments/123 \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","token":"abc123"}'
```

---

## ⚠️ NEJČASTĚJŠÍ CHYBY

1. **"Table '25_slovnik_faktura_typ_prilohy' doesn't exist"** → ❌ NEPOUŽÍVEJ LEFT JOIN na slovník! Tabulka neexistuje. Typ je přímo string.
2. **"Column not found"** → Zkontroluj názvy sloupců: `velikost_souboru_b`, `originalni_nazev_souboru`
3. **"Method not allowed"** → Použij POST (ne GET) pro seznam příloh
4. **"File not found"** → Použij absolutní cestu: `$_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $cesta`
5. **CORS error** → Přidej CORS headers:
   ```php
   header('Access-Control-Allow-Origin: *');
   header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
   ```

---

## ✅ HOTOVO KDYŽ...

- ✅ Frontend dokáže nahrát PDF → zobrazí se v seznamu
- ✅ Frontend dokáže stáhnout přílohu → stáhne se s původním názvem
- ✅ Frontend dokáže smazat přílohu → zmizí ze seznamu
- ✅ ISDOC soubor se dá nahrát → otevře se parsing dialog
- ✅ Všechny endpointy vrací správnou strukturu JSON

---

**KONEC CHECKLISTU**

*Pro detailní specifikaci viz FAKTURA-PRILOHY-KOMPLETNI-SPECIFIKACE.md*
