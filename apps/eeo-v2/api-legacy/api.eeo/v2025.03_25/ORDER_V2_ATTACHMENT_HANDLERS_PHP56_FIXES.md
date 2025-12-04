# Order V2 Attachment Handlers - PHP 5.6 Kompatibilita Opravy

## Datum: 2025-03-26
## Autor: GitHub Copilot

## Přehled provedených úprav

### 1. Přidání chybějících závislostí
- **Přidáno**: `require_once __DIR__ . "/TimezoneHelper.php";`
- **Důvod**: Attachment handlers používají TimezoneHelper funkce ale neměly include
- **Umístění**: Řádek 2 v orderV2AttachmentHandlers.php

### 2. Oprava nedefinovaných proměnných
- **Problém**: `$numeric_order_id` byla používána ale nebyla definovaná
- **Řešení**: Přidána definice `$numeric_order_id = intval($order_id);` před každé použití
- **Ovlivněné funkce**:
  - `handle_order_v2_upload_attachment()`
  - `handle_order_v2_list_attachments()`
  - `handle_order_v2_download_attachment()`
  - `handle_order_v2_delete_attachment()`
  - `handle_order_v2_update_attachment()`
  - `handle_order_v2_verify_attachments()`

### 3. Standardizace timestamp handling
- **Změna**: `date('Y-m-d H:i:s')` → `TimezoneHelper::getCurrentDateTime()`
- **Důvod**: Konzistence s ostatními Order V2 endpoints
- **Výhoda**: Jednotné timezone handling napříč celým API

### 4. Přidání podpory pro draft ID
- **Implementace**: Kontrola `strpos($order_id, "draft_") === 0`
- **Chování**: Draft objednávky vrací HTTP 422 s chybovou zprávou
- **Zpráva**: "Přílohy nejsou podporovány pro draft objednávky"
- **Důvod**: Draft objednávky ještě neexistují v databázi

## Technické detaily

### PHP 5.6 kompatibilita
- ✅ Všechny array() syntaxe zachovány
- ✅ Žádné moderní PHP funkce nepoužity
- ✅ Správné variable scoping
- ✅ Konzistentní error handling

### Draft ID handling
```php
// Kontrola draft ID
if (strpos($order_id, "draft_") === 0) {
    http_response_code(422);
    echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
    return;
}

// Konverze na numeric ID pro databázi
$numeric_order_id = intval($order_id);
```

### Timestamp konzistence
```php
// Před úpravou
'dt_vytvoreni' => date('Y-m-d H:i:s')

// Po úpravě
'dt_vytvoreni' => TimezoneHelper::getCurrentDateTime()
```

## Testování

### Kontrola syntaxe
```bash
php -l orderV2AttachmentHandlers.php
# No syntax errors detected
```

### Ovlivněné endpointy
1. `POST /api/order_v2/{id}/attachments/upload`
2. `GET /api/order_v2/{id}/attachments`
3. `GET /api/order_v2/{id}/attachments/{attachment_id}/download`
4. `DELETE /api/order_v2/{id}/attachments/{attachment_id}`
5. `PUT /api/order_v2/{id}/attachments/{attachment_id}`
6. `GET /api/order_v2/{id}/attachments/verify`

### Očekávané chování
- **Numeric ID**: `order_v2/123/attachments` → normální zpracování
- **Draft ID**: `order_v2/draft_order25_draft_new_1/attachments` → HTTP 422 error

## Kompatibilita s existujícím kódem

### ✅ Zachovává
- Všechny existující API responsy pro numeric ID
- PHP 5.6 kompatibilitu
- Stávající error handling patterns
- Database schema požadavky

### ➕ Přidává
- Podporu pro draft ID s vhodnou error response
- Konzistentní timestamp handling
- Lepší error reporting pro frontend

### 🚫 Nemění
- Database operace pro numeric ID
- File upload/download mechaniky
- Authentication flow
- Existující API contracts

## Doporučení pro frontend

### Draft ID handling
```javascript
// Frontend by měl ošetřit 422 error
fetch('/api/order_v2/draft_order25_draft_new_1/attachments')
  .then(response => {
    if (response.status === 422) {
      console.log('Attachments not supported for draft orders');
      // Skrýt attachment UI pro draft
    }
  });
```

### Migration checklist
1. ✅ Všechny attachment endpoints podporují draft ID error handling
2. ✅ PHP 5.6 kompatibilita zajištěna
3. ✅ TimezoneHelper konzistence implementována
4. ⚠️ Frontend musí ošetřit 422 errors pro draft ID

## Závěr
Všechny attachment handlers jsou nyní plně kompatibilní s PHP 5.6 a podporují draft ID pattern s vhodným error handling. Integrace s TimezoneHelper zajišťuje konzistenci napříč celým Order V2 API.