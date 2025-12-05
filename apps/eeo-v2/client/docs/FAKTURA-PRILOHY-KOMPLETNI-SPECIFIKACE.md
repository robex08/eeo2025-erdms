# 📎 FAKTURY PŘÍLOHY - KOMPLETNÍ SPECIFIKACE A IMPLEMENTAČNÍ PLÁN

**Datum:** 12. listopadu 2025  
**Účel:** Kompletní dokumentace systému přikládání příloh k fakturám  
**Status:** PŘIPRAVENO K IMPLEMENTACI

---

## 🎯 CÍLE IMPLEMENTACE

1. ✅ **Plně funkční upload příloh k fakturám** (PDF, ISDOC, JPG, PNG, DOC, DOCX, XLS, XLSX)
2. ✅ **Automatická klasifikace** příloh podle typu
3. ✅ **ISDOC parsing** s možností automatického vyplnění faktury
4. ✅ **Správa příloh** (download, delete, update)
5. ✅ **Validace fyzické existence** souborů na serveru
6. ✅ **Controlled component pattern** pro stabilní state management

---

## 📊 SOUČASNÝ STAV (Co už máme)

### ✅ FRONTEND KOMPONENTY
- **InvoiceAttachmentsCompact** (`src/components/invoices/InvoiceAttachmentsCompact.js`)
  - Plně funkční komponenta pro správu příloh
  - ISDOC parsing s dialogem
  - Drag & drop, validace souborů
  - Automatická klasifikace (FAKTURA, ISDOC)
  - Controlled component pattern
  
- **OrderForm25.js** - integrace v sekci Faktury
  - Renderuje InvoiceAttachmentsCompact v každé faktuře
  - Handler: `handleInvoiceAttachmentsChange(fakturaId, newAttachments)`
  - Attachments uloženy v: `formData.faktury[index].attachments[]`

### ✅ FRONTEND API SLUŽBY
- **apiOrderV2.js** (`src/services/apiOrderV2.js`)
  - `uploadInvoiceAttachment(invoiceId, orderId, file, username, token)`
  - `listInvoiceAttachments(invoiceId, username, token, orderId)`
  - `downloadInvoiceAttachment(invoiceId, attachmentId, username, token)`
  - `deleteInvoiceAttachment(invoiceId, attachmentId, username, token)`
  - `updateInvoiceAttachment(invoiceId, attachmentId, username, token, updates)`

- **api25invoices.js** (`src/services/api25invoices.js`)
  - Legacy API - používáno v InvoiceAttachmentsCompact
  - `uploadInvoiceAttachment25(...)`
  - `listInvoiceAttachments25(...)`
  - `deleteInvoiceAttachment25(...)`
  - `verifyInvoiceAttachments25(...)`

### ✅ DATABÁZE
- **Tabulka:** `25a_faktury_prilohy`
- **SQL script:** `create_faktury_prilohy_table.sql` (440 řádků)
- **Struktura:**
  ```sql
  id INT(10) AUTO_INCREMENT PRIMARY KEY
  faktura_id INT(10) NOT NULL -> FK 25a_faktury_objednavek
  objednavka_id INT(10) NOT NULL -> FK 25a_objednavky
  guid VARCHAR(50)
  typ_prilohy VARCHAR(50) -- FAKTURA, ISDOC, DOPLNEK_FA
  originalni_nazev_souboru VARCHAR(255)
  systemova_cesta VARCHAR(255)
  velikost_souboru_b INT(10)
  je_isdoc TINYINT(1) DEFAULT 0
  isdoc_parsed TINYINT(1) DEFAULT 0
  isdoc_data_json TEXT
  nahrano_uzivatel_id INT(10) -> FK 25_uzivatele
  dt_vytvoreni TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  dt_aktualizace TIMESTAMP NULL
  ```

---

## 🔥 PROBLÉM - CO BACKEND ROZBIL

**Popis:** Backend rozbitím API způsobil nefunkčnost příloh faktur.

**Typické problémy:**
1. ❌ Nesprávné HTTP metody (GET místo POST, chybějící POST endpointy)
2. ❌ Nesprávná struktura response (chybějící `data.attachments[]`)
3. ❌ Chybějící parametry (`order_id` nepovinný)
4. ❌ Nesprávné názvy sloupců v SQL dotazech
5. ❌ Chybějící CORS headers
6. ❌ Špatné cesty k souborům (relativní vs absolutní)

---

## 📋 BACKEND API - DETAILNÍ SPECIFIKACE

### 🔵 BASE URL
```
https://vase-domena.cz/api/order-v2/invoices
```

### 🔵 ENDPOINT 1: Upload přílohy faktury

**URL:** `POST /order-v2/invoices/{invoice_id}/attachments/upload`

**Headers:**
```
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  file: File,              // Soubor (PDF, ISDOC, JPG, PNG, DOC, DOCX, XLS, XLSX, XML)
  username: string,        // Uživatelské jméno
  token: string,          // Auth token
  order_id: number,       // ID objednávky (POVINNÉ)
  typ_prilohy: string     // 'FAKTURA' | 'ISDOC' | 'FAKTURA_OPRAVENA' | ...
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Příloha faktury byla úspěšně nahrána",
  "priloha": {
    "id": 123,
    "faktura_id": 456,
    "objednavka_id": 789,
    "guid": "550e8400-e29b-41d4-a716-446655440000",
    "typ_prilohy": "FAKTURA",
    "originalni_nazev_souboru": "faktura_2025.pdf",
    "systemova_cesta": "faktury/2025/11/faktura_2025.pdf",
    "velikost_souboru_b": 245760,
    "je_isdoc": 0,
    "nahrano_uzivatel_id": 42,
    "dt_vytvoreni": "2025-11-12 14:30:00"
  }
}
```

**SQL Implementace:**
```sql
INSERT INTO `25a_faktury_prilohy` (
  `faktura_id`,
  `objednavka_id`,
  `guid`,
  `typ_prilohy`,
  `originalni_nazev_souboru`,
  `systemova_cesta`,
  `velikost_souboru_b`,
  `je_isdoc`,
  `nahrano_uzivatel_id`,
  `dt_vytvoreni`
) VALUES (
  :faktura_id,
  :objednavka_id,
  :guid,
  :typ_prilohy,
  :originalni_nazev_souboru,
  :systemova_cesta,
  :velikost_souboru_b,
  :je_isdoc,
  :nahrano_uzivatel_id,
  NOW()
);
```

---

### 🔵 ENDPOINT 2: Seznam příloh faktury

**URL:** `POST /order-v2/invoices/{invoice_id}/attachments`

⚠️ **DŮLEŽITÉ:** Metoda je **POST** (ne GET)! Backend to takto vyžaduje.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "token": "abc123",
  "order_id": 789
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "attachments": [
      {
        "id": 123,
        "faktura_id": 456,
        "objednavka_id": 789,
        "guid": "550e8400-e29b-41d4-a716-446655440000",
        "type": "FAKTURA",
        "typ_prilohy": "FAKTURA",
        "original_name": "faktura_2025.pdf",
        "originalni_nazev_souboru": "faktura_2025.pdf",
        "systemova_cesta": "faktury/2025/11/faktura_2025.pdf",
        "file_size": 245760,
        "velikost_souboru_b": 245760,
        "je_isdoc": 0,
        "upload_date": "2025-11-12 14:30:00",
        "dt_vytvoreni": "2025-11-12 14:30:00",
        "file_exists": true
      }
    ],
    "count": 1
  }
}
```

**SQL Implementace:**
```sql
-- ✅ OPRAVENO: Odstraněn LEFT JOIN na neexistující tabulku slovníku
SELECT 
  fp.id,
  fp.faktura_id,
  fp.objednavka_id,
  fp.guid,
  fp.typ_prilohy,
  fp.originalni_nazev_souboru,
  fp.systemova_cesta,
  fp.velikost_souboru_b,
  fp.je_isdoc,
  fp.dt_vytvoreni,
  fp.nahrano_uzivatel_id
FROM `25a_faktury_prilohy` fp
WHERE fp.faktura_id = :faktura_id
  AND fp.objednavka_id = :objednavka_id
ORDER BY fp.dt_vytvoreni DESC;
```

---

### 🔵 ENDPOINT 3: Download přílohy

**URL:** `POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "token": "abc123"
}
```

**Response (Success 200):**
```
Content-Type: application/pdf (nebo application/octet-stream)
Content-Disposition: attachment; filename="faktura_2025.pdf"
[Binary file data]
```

**PHP Implementace:**
```php
// 1. Validace parametrů a oprávnění
// 2. Načíst přílohu z DB
$attachment = DB::query("
  SELECT * FROM 25a_faktury_prilohy 
  WHERE id = :attachment_id AND faktura_id = :invoice_id
", [':attachment_id' => $attachmentId, ':invoice_id' => $invoiceId]);

// 3. Sestavit absolutní cestu k souboru
$filePath = $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $attachment['systemova_cesta'];

// 4. Kontrola existence
if (!file_exists($filePath)) {
  http_response_code(404);
  echo json_encode(['error' => 'Soubor nenalezen na serveru']);
  exit;
}

// 5. Odeslat soubor
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $attachment['originalni_nazev_souboru'] . '"');
header('Content-Length: ' . filesize($filePath));
readfile($filePath);
exit;
```

---

### 🔵 ENDPOINT 4: Smazání přílohy

**URL:** `POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/delete`

⚠️ **DŮLEŽITÉ:** Používá POST s `/delete` na konci místo DELETE metody (kvůli kompatibilitě se staršími servery bez OPTIONS).

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "token": "abc123",
  "order_id": 789,
  "hard_delete": 1
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Příloha byla úspěšně smazána"
}
```

**SQL Implementace:**
```sql
-- 1. Získat cestu k souboru
SELECT systemova_cesta FROM `25a_faktury_prilohy` 
WHERE id = :attachment_id AND faktura_id = :faktura_id;

-- 2. Smazat soubor z disku (PHP)
unlink($_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $systemova_cesta);

-- 3. Smazat záznam z DB
DELETE FROM `25a_faktury_prilohy` 
WHERE id = :attachment_id AND faktura_id = :faktura_id;
```

---

### 🔵 ENDPOINT 5: Aktualizace metadat přílohy

**URL:** `POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update`

⚠️ **DŮLEŽITÉ:** Používá POST s `/update` na konci místo PUT metody (kvůli kompatibilitě se staršími servery bez OPTIONS).

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "token": "abc123",
  "order_id": 789,
  "typ_prilohy": "FAKTURA_OPRAVENA",
  "originalni_nazev_souboru": "faktura_opravena.pdf"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Příloha byla aktualizována",
  "attachment": {
    "id": 123,
    "typ_prilohy": "FAKTURA_OPRAVENA",
    "originalni_nazev_souboru": "faktura_opravena.pdf"
  }
}
```

**SQL Implementace:**
```sql
UPDATE `25a_faktury_prilohy` 
SET 
  typ_prilohy = :typ_prilohy,
  originalni_nazev_souboru = :originalni_nazev_souboru,
  dt_aktualizace = NOW()
WHERE id = :attachment_id 
  AND faktura_id = :faktura_id;
```

---

### 🔵 ENDPOINT 6: Verify - kontrola fyzické existence souborů

**URL:** `POST /order-v2/invoices/{invoice_id}/attachments/verify`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "token": "abc123",
  "objednavka_id": 789
}
```

**Response (Success 200):**
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
      "guid": "550e8400-e29b-41d4-a716-446655440000",
      "file_exists": true,
      "status": "OK"
    },
    {
      "attachment_id": 124,
      "guid": "550e8400-e29b-41d4-a716-446655440001",
      "file_exists": false,
      "status": "MISSING_FILE"
    }
  ]
}
```

**PHP Implementace:**
```php
// 1. Načíst všechny přílohy faktury
$attachments = DB::query("
  SELECT id, guid, systemova_cesta 
  FROM 25a_faktury_prilohy 
  WHERE faktura_id = :faktura_id
", [':faktura_id' => $invoiceId]);

// 2. Kontrola existence každého souboru
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

// 3. Vrátit response
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

## 🎯 BACKEND - PROMPT PRO IMPLEMENTACI

```
ZADÁNÍ: Implementuj kompletní backend API pro správu příloh faktur podle této specifikace.

ENDPOINTY (v pořadí implementace):
1. ✅ POST /order-v2/invoices/{invoice_id}/attachments - Seznam příloh (PRIORITA 1)
2. ✅ POST /order-v2/invoices/{invoice_id}/attachments/upload - Upload (PRIORITA 1)
3. ✅ POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/delete - Smazání (PRIORITA 2) ⚠️ POST místo DELETE
4. ✅ POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download - Download (PRIORITA 2)
5. ✅ POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update - Aktualizace (PRIORITA 3) ⚠️ POST místo PUT
6. ✅ POST /order-v2/invoices/{invoice_id}/attachments/verify - Verify souborů (PRIORITA 3)

⚠️ POZNÁMKA: Všechny endpointy používají POST metodu kvůli kompatibilitě se staršími PHP servery, které nepodporují OPTIONS pro CORS preflight.

DATABÁZE:
- Tabulka: 25a_faktury_prilohy (viz SQL script create_faktury_prilohy_table.sql)
- Všechny SQL dotazy jsou ve specifikaci výše

BEZPEČNOST:
- ✅ Validace username + token (stejně jako u objednávek)
- ✅ Kontrola oprávnění uživatele k faktuře
- ✅ Validace typů souborů (PDF, ISDOC, JPG, PNG, DOC, DOCX, XLS, XLSX, XML)
- ✅ Validace velikosti (max 10 MB)
- ✅ Ochrana proti path traversal útokům

UKLÁDÁNÍ SOUBORŮ:
- Složka: /uploads/faktury/{YYYY}/{MM}/
- Název souboru: {GUID}.{extension}
- Relativní cesta do DB: faktury/{YYYY}/{MM}/{GUID}.{extension}

RESPONSE FORMÁT:
- ✅ Jednotný formát pro všechny endpointy
- ✅ Camel case i snake_case názvy (kompatibilita)
- ✅ HTTP status kódy: 200 (OK), 400 (chyba), 404 (nenalezeno), 500 (server error)
- ✅ Error messages v češtině

TESTOVÁNÍ:
Po implementaci otestuj každý endpoint pomocí Postman/cURL.
```

---

## 🎯 FRONTEND - KONTROLNÍ CHECKLIST

### ✅ Co už máme implementováno:

1. **InvoiceAttachmentsCompact komponenta**
   - ✅ Drag & drop upload
   - ✅ Validace souborů (typ, velikost)
   - ✅ Automatická klasifikace (FAKTURA, ISDOC)
   - ✅ ISDOC parsing dialog
   - ✅ Preview příloh
   - ✅ Download, delete, update
   - ✅ Controlled component pattern
   - ✅ Toast notifikace
   - ✅ Verify souborů

2. **OrderForm25 integrace**
   - ✅ `handleInvoiceAttachmentsChange(fakturaId, newAttachments)`
   - ✅ Attachments uloženy v `formData.faktury[].attachments[]`
   - ✅ Autosave po změně příloh
   - ✅ Render InvoiceAttachmentsCompact pro každou fakturu

3. **API služby**
   - ✅ `uploadInvoiceAttachment()`
   - ✅ `listInvoiceAttachments()`
   - ✅ `downloadInvoiceAttachment()`
   - ✅ `deleteInvoiceAttachment()`
   - ✅ `updateInvoiceAttachment()`
   - ✅ Error handling

### ❓ Co je potřeba otestovat po opravě backendu:

1. **Upload přílohy**
   - Test: Nahraj PDF fakturu
   - Ověř: Soubor se objeví v seznamu, má status 'uploaded'

2. **ISDOC parsing**
   - Test: Nahraj ISDOC soubor
   - Ověř: Otevře se dialog s náhledem, data se vyplní do faktury

3. **Download přílohy**
   - Test: Klikni na download u nahrané přílohy
   - Ověř: Soubor se stáhne s původním názvem

4. **Smazání přílohy**
   - Test: Smaž přílohu
   - Ověř: Příloha zmizí ze seznamu, fyzický soubor smazán

5. **Verify souborů**
   - Test: Reload faktury s přílohami
   - Ověř: Zobrazí se warning pokud nějaký soubor chybí

6. **Klasifikace**
   - Test: Změň typ přílohy (FAKTURA -> FAKTURA_OPRAVENA)
   - Ověř: Změní se klasifikace v DB

---

## 🔧 NEJČASTĚJŠÍ CHYBY A JEJICH ŘEŠENÍ

### ❌ Chyba 1: "Table '25_slovnik_faktura_typ_prilohy' doesn't exist"
**Příčina:** SQL dotaz obsahuje LEFT JOIN na neexistující tabulku slovníku  
**Řešení:** Odstraň LEFT JOIN - typ přílohy je uložen přímo jako string ('FAKTURA', 'ISDOC', atd.)

### ❌ Chyba 2: "Column 'velikost_souboru_b' not found"
**Příčina:** Chybný SQL dotaz, nesprávný název sloupce  
**Řešení:** Použij `velikost_souboru_b` (ne `file_size`)

### ❌ Chyba 3: "Method not allowed"
**Příčina:** Používá se GET místo POST  
**Řešení:** Změň endpoint na POST (viz specifikace)

### ❌ Chyba 4: "Missing parameter: order_id"
**Příčina:** Frontend neposílá `order_id`  
**Řešení:** Přidej `order_id` do všech requestů

### ❌ Chyba 5: "File not found on server"
**Příčina:** Nesprávná cesta k souboru  
**Řešení:** Použij absolutní cestu: `$_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $cesta`

### ❌ Chyba 6: "CORS error"
**Příčina:** Chybějící CORS headers  
**Řešení:** Přidej headers:
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
```

### ❌ Chyba 7: "Response data.attachments is undefined"
**Příčina:** Backend vrací špatnou strukturu  
**Řešení:** Wrap attachments v `data.attachments[]` (viz specifikace)

---

## 📞 KONTAKTY A DOKUMENTACE

**SQL Script:** `create_faktury_prilohy_table.sql` (440 řádků)  
**Frontend komponenta:** `src/components/invoices/InvoiceAttachmentsCompact.js` (1433 řádků)  
**API služby:** `src/services/apiOrderV2.js` + `src/services/api25invoices.js`  
**Integrace:** `src/forms/OrderForm25.js` (řádky 19473-20186)

---

## 🚀 PRIORITA IMPLEMENTACE

### FÁZE 1 - ZÁKLADNÍ FUNKCIONALITA (2-4 hodiny)
1. ✅ POST /invoices/{id}/attachments - Seznam příloh
2. ✅ POST /invoices/{id}/attachments/upload - Upload
3. ✅ POST /invoices/{id}/attachments/{aid}/delete - Smazání (POST místo DELETE)
4. 🧪 **TESTOVÁNÍ FÁZE 1**

### FÁZE 2 - ROZŠÍŘENÉ FUNKCE (1-2 hodiny)
5. ✅ POST /invoices/{id}/attachments/{aid}/download - Download
6. ✅ POST /invoices/{id}/attachments/{aid}/update - Aktualizace (POST místo PUT)
7. 🧪 **TESTOVÁNÍ FÁZE 2**

### FÁZE 3 - POKROČILÉ FUNKCE (1 hodina)
8. ✅ POST /invoices/{id}/attachments/verify - Verify souborů
9. 🧪 **TESTOVÁNÍ FÁZE 3**
10. 🎉 **KOMPLETNÍ E2E TEST**

---

## ✅ AKCEPTAČNÍ KRITÉRIA

Po dokončení implementace musí fungovat:

1. ✅ Upload PDF faktury → zobrazí se v seznamu
2. ✅ Upload ISDOC souboru → otevře se parsing dialog
3. ✅ Download přílohy → stáhne se s původním názvem
4. ✅ Smazání přílohy → zmizí ze seznamu + smazán fyzický soubor
5. ✅ Změna klasifikace → aktualizuje se v DB
6. ✅ Verify souborů → zobrazí warning pro chybějící soubory
7. ✅ Autosave → přílohy se uloží do konceptu objednávky
8. ✅ Reload faktury → načtou se všechny přílohy ze serveru

---

**KONEC SPECIFIKACE**

*Pro otázky nebo problémy při implementaci otevři Issue v projektu nebo kontaktuj vedoucího týmu.*
